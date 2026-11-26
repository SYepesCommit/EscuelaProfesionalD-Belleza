import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { recordAuditLog } from '@/lib/audit';
import { ensureSeededDatabase } from '@/lib/seed';
import { getFortnightKey } from '@/lib/utils';
import {
  FortnightStaffPayrollSummary,
  PayrollAdjustmentType,
  PayrollPaymentMethod,
  StaffFortnightSettlementItem,
  StaffMemberItem,
  StaffPayrollAdjustmentItem,
  StaffTimeLogItem,
} from '@/interfaces/staff.interface';

const OVERDUE_SHIFT_MINUTES = 600; // 10 horas abierto = alerta de turno olvidado

const biometricCheckSchema = z.object({
  mode: z.literal('CLOCK').optional().default('CLOCK'),
  staffId: z.string().optional(),
  identifier: z.string().optional(),
  actionType: z.enum(['ENTRADA', 'SALIDA', 'AUTO']).default('AUTO'),
  verifiedByBiometry: z.boolean().default(true),
  deductLunchHour: z.boolean().optional().default(false),
  notes: z.string().optional(),
  operatorUserId: z.string().min(1),
});

const manualShiftSchema = z.object({
  mode: z.literal('MANUAL_SHIFT'),
  staffId: z.string().min(1),
  checkInAt: z.string().min(1),
  checkOutAt: z.string().min(1),
  deductLunchHour: z.boolean().optional().default(false),
  notes: z.string().optional(),
  operatorUserId: z.string().min(1),
});

const closeOpenShiftSchema = z.object({
  mode: z.literal('CLOSE_OPEN_SHIFT'),
  logId: z.string().min(1),
  checkOutAt: z.string().min(1),
  deductLunchHour: z.boolean().optional().default(false),
  notes: z.string().optional(),
  operatorUserId: z.string().min(1),
});

const addAdjustmentSchema = z.object({
  mode: z.literal('ADD_ADJUSTMENT'),
  staffId: z.string().min(1),
  fortnightKey: z.string().min(4),
  type: z.enum(['BONO', 'ADELANTO', 'DESCUENTO']),
  concept: z.string().min(2, 'Ingrese el concepto'),
  amountCop: z.number().int().min(100, 'El monto debe ser mayor a 0'),
  notes: z.string().optional(),
  operatorUserId: z.string().min(1),
});

const settleFortnightSchema = z.object({
  mode: z.literal('SETTLE_FORTNIGHT'),
  staffId: z.string().min(1),
  fortnightKey: z.string().min(4),
  status: z.enum(['PENDIENTE', 'PAGADA']),
  paidAmountCop: z.number().int().min(0),
  paymentMethod: z.enum([
    'EFECTIVO',
    'NEQUI',
    'BANCOLOMBIA',
    'DAVIPLATA',
    'TRANSFERENCIA',
  ]),
  paymentReference: z.string().optional(),
  notes: z.string().optional(),
  operatorUserId: z.string().min(1),
});

const upsertStaffSchema = z.object({
  id: z.string().optional(),
  documentId: z.string().min(4, 'Documento inválido'),
  fullName: z.string().min(3, 'Nombre demasiado corto'),
  role: z.enum(['ADMIN', 'ASESOR', 'VENTA', 'CONTABILIDAD', 'PROFESOR']),
  phone: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  accessCode: z.string().optional(),
  hourlyRateCop: z.number().int().min(0, 'El valor por hora no puede ser negativo'),
  commissionRatePct: z.number().min(0).max(100).optional().default(0),
  isActive: z.boolean().optional().default(true),
  operatorUserId: z.string().min(1),
});

function buildRecentFortnightKeys(currentKey: string): string[] {
  const keys = new Set<string>([currentKey]);
  const now = new Date();
  for (let offset = -3; offset <= 1; offset++) {
    const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    keys.add(`${yyyy}-${mm}-Q1`);
    keys.add(`${yyyy}-${mm}-Q2`);
  }
  return Array.from(keys).sort().reverse();
}

export async function GET(request: Request) {
  try {
    await ensureSeededDatabase();
    const { searchParams } = new URL(request.url);
    const currentFortnightKey = getFortnightKey();
    const fortnightKey = searchParams.get('fortnightKey') || currentFortnightKey;
    const includeInactive = searchParams.get('includeInactive') === 'true';

    const [
      staffUsers,
      timeLogs,
      openLogs,
      distinctFortnights,
      adjustmentsRaw,
      settlementsRaw,
      completedSales,
    ] = await Promise.all([
      prisma.user.findMany({
        where: includeInactive ? {} : { isActive: true },
        orderBy: [{ isActive: 'desc' }, { role: 'asc' }, { fullName: 'asc' }],
      }),
      prisma.staffTimeLog.findMany({
        where: { fortnightKey },
        include: { staff: true },
        orderBy: { checkInAt: 'desc' },
      }),
      prisma.staffTimeLog.findMany({
        where: { checkOutAt: null },
        include: { staff: true },
        orderBy: { checkInAt: 'desc' },
      }),
      prisma.staffTimeLog.findMany({
        select: { fortnightKey: true },
        distinct: ['fortnightKey'],
      }),
      prisma.staffPayrollAdjustment.findMany({
        where: { fortnightKey },
        include: { staff: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.staffFortnightSettlement.findMany({
        where: { fortnightKey },
      }),
      prisma.sale.findMany({
        where: { status: 'COMPLETADA' },
        select: {
          id: true,
          commissionedSellerId: true,
          commissionAmountCop: true,
          createdAt: true,
        },
      }),
    ]);

    const nowMs = Date.now();

    const openLogMap = new Map<
      string,
      { id: string; checkInAt: string; elapsedMinutes: number; isOverdue: boolean }
    >();
    for (const open of openLogs) {
      if (!openLogMap.has(open.staffId)) {
        const elapsedMinutes = Math.max(
          1,
          Math.round((nowMs - open.checkInAt.getTime()) / 60000)
        );
        openLogMap.set(open.staffId, {
          id: open.id,
          checkInAt: open.checkInAt.toISOString(),
          elapsedMinutes,
          isOverdue: elapsedMinutes >= OVERDUE_SHIFT_MINUTES,
        });
      }
    }

    const availableSet = new Set<string>(buildRecentFortnightKeys(currentFortnightKey));
    availableSet.add(fortnightKey);
    for (const item of distinctFortnights) {
      availableSet.add(item.fortnightKey);
    }
    const availableFortnights = Array.from(availableSet).sort().reverse();

    const staffMembers: StaffMemberItem[] = staffUsers.map((u) => {
      const openInfo = openLogMap.get(u.id);
      return {
        id: u.id,
        documentId: u.documentId,
        fullName: u.fullName,
        role: u.role,
        phone: u.phone,
        email: u.email,
        accessCode: u.accessCode,
        hourlyRateCop: u.hourlyRateCop,
        commissionRatePct: u.commissionRatePct,
        hasFingerprint: Boolean(u.fingerprintTemplate),
        isActive: u.isActive,
        openLogId: openInfo?.id ?? null,
        openCheckInAt: openInfo?.checkInAt ?? null,
        openElapsedMinutes: openInfo?.elapsedMinutes ?? 0,
        isOverdueShift: openInfo?.isOverdue ?? false,
      };
    });

    // Combinar logs de la quincena con posibles turnos abiertos de otra quincena para que sean visibles
    const logIdsInFortnight = new Set(timeLogs.map((l) => l.id));
    const mergedRawLogs = [
      ...openLogs.filter((ol) => !logIdsInFortnight.has(ol.id)),
      ...timeLogs,
    ];

    const mappedLogs: StaffTimeLogItem[] = mergedRawLogs.map((l) => {
      const elapsedIfOpen =
        l.checkOutAt === null
          ? Math.max(1, Math.round((nowMs - l.checkInAt.getTime()) / 60000))
          : 0;
      return {
        id: l.id,
        staffId: l.staffId,
        staffName: l.staff.fullName,
        staffDocumentId: l.staff.documentId,
        staffRole: l.staff.role,
        checkInAt: l.checkInAt.toISOString(),
        checkOutAt: l.checkOutAt ? l.checkOutAt.toISOString() : null,
        workedMinutes: l.workedMinutes,
        lunchDeductedMinutes: l.lunchDeductedMinutes ?? 0,
        workedHoursDecimal: l.workedHoursDecimal,
        verifiedByBiometry: l.verifiedByBiometry,
        fortnightKey: l.fortnightKey,
        notes: l.notes,
        isOverdueOpen: l.checkOutAt === null && elapsedIfOpen >= OVERDUE_SHIFT_MINUTES,
      };
    });

    const mappedAdjustments: StaffPayrollAdjustmentItem[] = adjustmentsRaw.map((a) => ({
      id: a.id,
      staffId: a.staffId,
      staffName: a.staff.fullName,
      fortnightKey: a.fortnightKey,
      type: a.type as PayrollAdjustmentType,
      concept: a.concept,
      amountCop: a.amountCop,
      notes: a.notes,
      createdAt: a.createdAt.toISOString(),
    }));

    const settlementMap = new Map<string, StaffFortnightSettlementItem>();
    for (const s of settlementsRaw) {
      settlementMap.set(s.staffId, {
        id: s.id,
        staffId: s.staffId,
        fortnightKey: s.fortnightKey,
        status: s.status === 'PAGADA' ? 'PAGADA' : 'PENDIENTE',
        paidAmountCop: s.paidAmountCop,
        paymentMethod: (s.paymentMethod as PayrollPaymentMethod) || 'TRANSFERENCIA',
        paymentReference: s.paymentReference,
        paidAt: s.paidAt ? s.paidAt.toISOString() : null,
        notes: s.notes,
      });
    }

    // Filtrar ventas completadas que caen dentro de la quincena seleccionada
    const fortnightSales = completedSales.filter(
      (sale) => getFortnightKey(sale.createdAt) === fortnightKey
    );

    const payrollSummary: FortnightStaffPayrollSummary[] = staffUsers.map((u) => {
      const userLogs = timeLogs.filter((l) => l.staffId === u.id);
      const completedShifts = userLogs.filter((l) => l.checkOutAt !== null).length;
      const openShifts = userLogs.filter((l) => l.checkOutAt === null).length;
      const totalWorkedMinutes = userLogs.reduce((acc, l) => acc + l.workedMinutes, 0);
      const totalLunchDeductedMinutes = userLogs.reduce(
        (acc, l) => acc + (l.lunchDeductedMinutes ?? 0),
        0
      );
      const totalWorkedHours = Number(
        userLogs.reduce((acc, l) => acc + l.workedHoursDecimal, 0).toFixed(2)
      );
      const hoursPayCop = Math.round(totalWorkedHours * u.hourlyRateCop);

      // Comisiones de venta de este empleado en la quincena
      const sellerSales = fortnightSales.filter(
        (sale) => sale.commissionedSellerId === u.id
      );
      const salesCount = sellerSales.length;
      const salesCommissionCop = sellerSales.reduce(
        (acc, sale) => acc + sale.commissionAmountCop,
        0
      );

      // Ajustes (Bonos, Adelantos, Descuentos)
      const userAdjustments = mappedAdjustments.filter((a) => a.staffId === u.id);
      const bonusesCop = userAdjustments
        .filter((a) => a.type === 'BONO')
        .reduce((acc, a) => acc + a.amountCop, 0);
      const deductionsCop = userAdjustments
        .filter((a) => a.type === 'ADELANTO' || a.type === 'DESCUENTO')
        .reduce((acc, a) => acc + a.amountCop, 0);

      const totalPayCop = Math.max(
        0,
        hoursPayCop + salesCommissionCop + bonusesCop - deductionsCop
      );

      const settlement = settlementMap.get(u.id) ?? null;

      return {
        staffId: u.id,
        documentId: u.documentId,
        fullName: u.fullName,
        role: u.role,
        phone: u.phone,
        email: u.email,
        fortnightKey,
        totalShifts: userLogs.length,
        completedShifts,
        openShifts,
        totalWorkedMinutes,
        totalLunchDeductedMinutes,
        totalWorkedHours,
        hourlyRateCop: u.hourlyRateCop,
        commissionRatePct: u.commissionRatePct,
        hoursPayCop,
        salesCount,
        salesCommissionCop,
        bonusesCop,
        deductionsCop,
        adjustments: userAdjustments,
        totalPayCop,
        settlementStatus: settlement?.status ?? 'PENDIENTE',
        settlement,
        isActive: u.isActive,
      };
    });

    return NextResponse.json({
      fortnightKey,
      availableFortnights,
      staffMembers,
      timeLogs: mappedLogs,
      payrollSummary,
    });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Error cargando personal' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;

    // 1. Modo Registro Manual de Turno Completo (Entrada + Salida + Almuerzo opcional)
    if (body.mode === 'MANUAL_SHIFT') {
      const parsedManual = manualShiftSchema.safeParse(body);
      if (!parsedManual.success) {
        return NextResponse.json(
          { message: 'Datos del turno manual inválidos.' },
          { status: 400 }
        );
      }

      const {
        staffId,
        checkInAt,
        checkOutAt,
        deductLunchHour,
        notes,
        operatorUserId,
      } = parsedManual.data;
      const start = new Date(checkInAt);
      const end = new Date(checkOutAt);

      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
        return NextResponse.json(
          { message: 'La hora de salida debe ser posterior a la hora de entrada.' },
          { status: 400 }
        );
      }

      const staffUser = await prisma.user.findUnique({ where: { id: staffId } });
      if (!staffUser) {
        return NextResponse.json({ message: 'Empleado no encontrado.' }, { status: 404 });
      }

      const diffMs = Math.max(60000, end.getTime() - start.getTime());
      const rawMinutes = Math.round(diffMs / 60000);
      const lunchDeductedMinutes = deductLunchHour && rawMinutes > 60 ? 60 : 0;
      const workedMinutes = Math.max(1, rawMinutes - lunchDeductedMinutes);
      const workedHoursDecimal = Number((workedMinutes / 60).toFixed(2));
      const targetFortnightKey = getFortnightKey(start);

      const created = await prisma.$transaction(async (tx) => {
        const log = await tx.staffTimeLog.create({
          data: {
            staffId,
            checkInAt: start,
            checkOutAt: end,
            workedMinutes,
            lunchDeductedMinutes,
            workedHoursDecimal,
            verifiedByBiometry: false,
            fortnightKey: targetFortnightKey,
            notes:
              notes?.trim() ||
              (lunchDeductedMinutes > 0
                ? 'Turno manual (-1h almuerzo)'
                : 'Turno registrado manualmente por administración'),
          },
        });

        await recordAuditLog(
          {
            userId: operatorUserId,
            action: 'STAFF_TIME_MANUALLY_ADJUSTED',
            entity: 'StaffTimeLog',
            entityId: log.id,
            newData: {
              staffId,
              staffName: staffUser.fullName,
              type: 'TURNO_MANUAL',
              workedMinutes,
              lunchDeductedMinutes,
              workedHoursDecimal,
              fortnightKey: targetFortnightKey,
              notes: log.notes,
              reason: 'Registro o ajuste manual de horas/turno por administración',
            },
          },
          tx
        );

        return log;
      });

      return NextResponse.json(
        {
          log: created,
          staffName: staffUser.fullName,
          staffRole: staffUser.role,
          resolvedAction: 'SALIDA',
          workedHoursDecimal,
          workedMinutes,
          lunchDeductedMinutes,
          earnedCop: Math.round(workedHoursDecimal * staffUser.hourlyRateCop),
        },
        { status: 201 }
      );
    }

    // 2. Modo Cerrar Turno Abierto / Olvidado ajustando hora real de salida
    if (body.mode === 'CLOSE_OPEN_SHIFT') {
      const parsedClose = closeOpenShiftSchema.safeParse(body);
      if (!parsedClose.success) {
        return NextResponse.json(
          { message: 'Datos para cerrar turno inválidos.' },
          { status: 400 }
        );
      }

      const { logId, checkOutAt, deductLunchHour, notes, operatorUserId } =
        parsedClose.data;
      const openLog = await prisma.staffTimeLog.findUnique({
        where: { id: logId },
        include: { staff: true },
      });

      if (!openLog) {
        return NextResponse.json({ message: 'Turno no encontrado.' }, { status: 404 });
      }

      const end = new Date(checkOutAt);
      if (Number.isNaN(end.getTime()) || end <= openLog.checkInAt) {
        return NextResponse.json(
          { message: 'La hora de salida debe ser mayor a la hora de entrada del turno.' },
          { status: 400 }
        );
      }

      const diffMs = Math.max(60000, end.getTime() - openLog.checkInAt.getTime());
      const rawMinutes = Math.round(diffMs / 60000);
      const lunchDeductedMinutes = deductLunchHour && rawMinutes > 60 ? 60 : 0;
      const workedMinutes = Math.max(1, rawMinutes - lunchDeductedMinutes);
      const workedHoursDecimal = Number((workedMinutes / 60).toFixed(2));
      const earnedCop = Math.round(workedHoursDecimal * openLog.staff.hourlyRateCop);

      const updated = await prisma.$transaction(async (tx) => {
        const log = await tx.staffTimeLog.update({
          where: { id: logId },
          data: {
            checkOutAt: end,
            workedMinutes,
            lunchDeductedMinutes,
            workedHoursDecimal,
            notes:
              notes?.trim() ||
              openLog.notes ||
              'Cierre ajustado por administración',
          },
        });

        await recordAuditLog(
          {
            userId: operatorUserId,
            action: 'UPDATE',
            entity: 'StaffTimeLog',
            entityId: log.id,
            newData: {
              staffId: openLog.staffId,
              staffName: openLog.staff.fullName,
              type: 'CIERRE_TURNO_AJUSTADO',
              workedMinutes,
              lunchDeductedMinutes,
              workedHoursDecimal,
              earnedCop,
            },
          },
          tx
        );

        return log;
      });

      return NextResponse.json({
        log: updated,
        staffName: openLog.staff.fullName,
        staffRole: openLog.staff.role,
        resolvedAction: 'SALIDA',
        workedHoursDecimal,
        workedMinutes,
        lunchDeductedMinutes,
        earnedCop,
      });
    }

    // 3. Modo Agregar Bono / Adelanto (Vale) / Descuento a la Quincena
    if (body.mode === 'ADD_ADJUSTMENT') {
      const parsedAdj = addAdjustmentSchema.safeParse(body);
      if (!parsedAdj.success) {
        return NextResponse.json(
          { message: 'Datos del concepto de nómina inválidos.' },
          { status: 400 }
        );
      }

      const { staffId, fortnightKey, type, concept, amountCop, notes, operatorUserId } =
        parsedAdj.data;

      const staffUser = await prisma.user.findUnique({ where: { id: staffId } });
      if (!staffUser) {
        return NextResponse.json({ message: 'Empleado no encontrado.' }, { status: 404 });
      }

      const createdAdj = await prisma.$transaction(async (tx) => {
        const adj = await tx.staffPayrollAdjustment.create({
          data: {
            staffId,
            fortnightKey,
            type,
            concept: concept.trim(),
            amountCop,
            notes: notes?.trim() || null,
          },
        });

        await recordAuditLog(
          {
            userId: operatorUserId,
            action: 'CREATE',
            entity: 'StaffPayrollAdjustment',
            entityId: adj.id,
            newData: {
              staffName: staffUser.fullName,
              fortnightKey,
              type,
              concept: adj.concept,
              amountCop,
            },
          },
          tx
        );

        return adj;
      });

      return NextResponse.json(createdAdj, { status: 201 });
    }

    // 4. Modo Liquidar / Marcar Quincena como Pagada o Pendiente
    if (body.mode === 'SETTLE_FORTNIGHT') {
      const parsedSettle = settleFortnightSchema.safeParse(body);
      if (!parsedSettle.success) {
        return NextResponse.json(
          { message: 'Datos de pago de quincena inválidos.' },
          { status: 400 }
        );
      }

      const {
        staffId,
        fortnightKey,
        status,
        paidAmountCop,
        paymentMethod,
        paymentReference,
        notes,
        operatorUserId,
      } = parsedSettle.data;

      const staffUser = await prisma.user.findUnique({ where: { id: staffId } });
      if (!staffUser) {
        return NextResponse.json({ message: 'Empleado no encontrado.' }, { status: 404 });
      }

      const settlement = await prisma.$transaction(async (tx) => {
        const record = await tx.staffFortnightSettlement.upsert({
          where: {
            staffId_fortnightKey: {
              staffId,
              fortnightKey,
            },
          },
          update: {
            status,
            paidAmountCop,
            paymentMethod,
            paymentReference: paymentReference?.trim() || null,
            paidAt: status === 'PAGADA' ? new Date() : null,
            notes: notes?.trim() || null,
          },
          create: {
            staffId,
            fortnightKey,
            status,
            paidAmountCop,
            paymentMethod,
            paymentReference: paymentReference?.trim() || null,
            paidAt: status === 'PAGADA' ? new Date() : null,
            notes: notes?.trim() || null,
          },
        });

        await recordAuditLog(
          {
            userId: operatorUserId,
            action: 'UPDATE',
            entity: 'StaffFortnightSettlement',
            entityId: record.id,
            newData: {
              staffName: staffUser.fullName,
              fortnightKey,
              status,
              paidAmountCop,
              paymentMethod,
              paymentReference: record.paymentReference,
            },
          },
          tx
        );

        return record;
      });

      return NextResponse.json(settlement);
    }

    // 5. Modo Marcación de Reloj Biométrico / Cédula / Código (ENTRADA | SALIDA | AUTO)
    const parsed = biometricCheckSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: 'Datos de marcación biométrica inválidos' },
        { status: 400 }
      );
    }

    const {
      staffId,
      identifier,
      actionType,
      verifiedByBiometry,
      deductLunchHour,
      notes,
      operatorUserId,
    } = parsed.data;

    let targetUser = null;
    if (staffId) {
      targetUser = await prisma.user.findUnique({ where: { id: staffId } });
    } else if (identifier && identifier.trim()) {
      const clean = identifier.trim();
      targetUser = await prisma.user.findFirst({
        where: {
          OR: [
            { documentId: { equals: clean, mode: 'insensitive' } },
            { accessCode: { equals: clean, mode: 'insensitive' } },
            { fullName: { contains: clean, mode: 'insensitive' } },
          ],
        },
      });
    }

    if (!targetUser) {
      return NextResponse.json(
        { message: 'No se encontró ningún empleado con esa cédula, código o nombre.' },
        { status: 404 }
      );
    }

    const openLog = await prisma.staffTimeLog.findFirst({
      where: { staffId: targetUser.id, checkOutAt: null },
      orderBy: { checkInAt: 'desc' },
    });

    const resolvedAction: 'ENTRADA' | 'SALIDA' =
      actionType === 'AUTO' ? (openLog ? 'SALIDA' : 'ENTRADA') : actionType;

    const now = new Date();
    const fortnightKey = getFortnightKey(now);

    if (resolvedAction === 'ENTRADA') {
      if (openLog) {
        return NextResponse.json(
          {
            message: `${targetUser.fullName} ya tiene un turno de entrada abierto desde las ${openLog.checkInAt.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}. Debe registrar su Salida.`,
          },
          { status: 400 }
        );
      }

      const created = await prisma.$transaction(async (tx) => {
        const log = await tx.staffTimeLog.create({
          data: {
            staffId: targetUser.id,
            checkInAt: now,
            verifiedByBiometry,
            fortnightKey,
            notes: notes?.trim() || null,
          },
        });

        await recordAuditLog(
          {
            userId: operatorUserId,
            action: 'CREATE',
            entity: 'StaffTimeLog',
            entityId: log.id,
            newData: {
              staffId: targetUser.id,
              staffName: targetUser.fullName,
              type: 'ENTRADA',
              fortnightKey,
            },
          },
          tx
        );

        return log;
      });

      return NextResponse.json(
        {
          log: created,
          staffName: targetUser.fullName,
          staffRole: targetUser.role,
          resolvedAction: 'ENTRADA',
          workedHoursDecimal: 0,
          workedMinutes: 0,
          lunchDeductedMinutes: 0,
          earnedCop: 0,
        },
        { status: 201 }
      );
    }

    // SALIDA: calcular minutos, descuento opcional de almuerzo y horas trabajadas
    if (!openLog) {
      return NextResponse.json(
        {
          message: `${targetUser.fullName} no tiene ningún turno de entrada abierto para registrar salida.`,
        },
        { status: 400 }
      );
    }

    const diffMs = Math.max(60000, now.getTime() - openLog.checkInAt.getTime());
    const rawMinutes = Math.round(diffMs / 60000);
    const lunchDeductedMinutes = deductLunchHour && rawMinutes > 60 ? 60 : 0;
    const workedMinutes = Math.max(1, rawMinutes - lunchDeductedMinutes);
    const workedHoursDecimal = Number((workedMinutes / 60).toFixed(2));
    const earnedCop = Math.round(workedHoursDecimal * targetUser.hourlyRateCop);

    const updated = await prisma.$transaction(async (tx) => {
      const log = await tx.staffTimeLog.update({
        where: { id: openLog.id },
        data: {
          checkOutAt: now,
          workedMinutes,
          lunchDeductedMinutes,
          workedHoursDecimal,
          notes:
            notes?.trim() ||
            (lunchDeductedMinutes > 0
              ? `${openLog.notes ? `${openLog.notes} • ` : ''}-1h almuerzo`
              : openLog.notes),
        },
      });

      await recordAuditLog(
        {
          userId: operatorUserId,
          action: 'UPDATE',
          entity: 'StaffTimeLog',
          entityId: log.id,
          newData: {
            staffId: targetUser.id,
            staffName: targetUser.fullName,
            type: 'SALIDA',
            workedMinutes,
            lunchDeductedMinutes,
            workedHoursDecimal,
            earnedCop,
          },
        },
        tx
      );

      return log;
    });

    return NextResponse.json({
      log: updated,
      staffName: targetUser.fullName,
      staffRole: targetUser.role,
      resolvedAction: 'SALIDA',
      workedHoursDecimal,
      workedMinutes,
      lunchDeductedMinutes,
      earnedCop,
    });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Error en operación de personal' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body: unknown = await request.json();
    const parsed = upsertStaffSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: 'Datos del empleado inválidos.', errors: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    if (data.id) {
      const existing = await prisma.user.findUnique({ where: { id: data.id } });
      if (!existing) {
        return NextResponse.json({ message: 'Empleado no encontrado.' }, { status: 404 });
      }

      const duplicateDoc = await prisma.user.findFirst({
        where: {
          documentId: data.documentId.trim(),
          id: { not: data.id },
        },
      });
      if (duplicateDoc) {
        return NextResponse.json(
          { message: 'Ya existe otro empleado con ese documento de identidad.' },
          { status: 400 }
        );
      }

      const updated = await prisma.$transaction(async (tx) => {
        const user = await tx.user.update({
          where: { id: data.id },
          data: {
            documentId: data.documentId.trim(),
            fullName: data.fullName.trim(),
            role: data.role,
            phone: data.phone?.trim() || null,
            email: data.email?.trim() || null,
            hourlyRateCop: data.hourlyRateCop,
            commissionRatePct: data.commissionRatePct ?? existing.commissionRatePct,
            isActive: data.isActive ?? existing.isActive,
            ...(data.accessCode && data.accessCode.trim()
              ? { accessCode: data.accessCode.trim().toUpperCase() }
              : {}),
          },
        });

        const isCommissionChanged =
          existing.commissionRatePct !== user.commissionRatePct;

        await recordAuditLog(
          {
            userId: data.operatorUserId,
            action: isCommissionChanged ? 'COMMISSION_RATE_CHANGED' : 'UPDATE',
            entity: 'User',
            entityId: user.id,
            previousData: {
              fullName: existing.fullName,
              role: existing.role,
              hourlyRateCop: existing.hourlyRateCop,
              commissionRatePct: existing.commissionRatePct,
              isActive: existing.isActive,
            },
            newData: {
              fullName: user.fullName,
              role: user.role,
              hourlyRateCop: user.hourlyRateCop,
              commissionRatePct: user.commissionRatePct,
              isActive: user.isActive,
              reason: isCommissionChanged ? 'Modificación de tasa de comisión de ventas' : null,
            },
          },
          tx
        );

        return user;
      });

      return NextResponse.json(updated);
    }

    const existingDoc = await prisma.user.findUnique({
      where: { documentId: data.documentId.trim() },
    });
    if (existingDoc) {
      return NextResponse.json(
        { message: 'Ya existe un empleado registrado con ese número de documento.' },
        { status: 400 }
      );
    }

    const generatedCode =
      data.accessCode?.trim().toUpperCase() ||
      `${data.role.slice(0, 4)}-${data.documentId.trim().slice(-4)}`;

    const created = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          documentId: data.documentId.trim(),
          fullName: data.fullName.trim(),
          role: data.role,
          phone: data.phone?.trim() || null,
          email: data.email?.trim() || null,
          accessCode: generatedCode,
          fingerprintTemplate: `FP_${data.role}_${data.documentId.trim()}`,
          hourlyRateCop: data.hourlyRateCop,
          commissionRatePct: data.commissionRatePct ?? 0,
          isActive: data.isActive ?? true,
        },
      });

      await recordAuditLog(
        {
          userId: data.operatorUserId,
          action: 'CREATE',
          entity: 'User',
          entityId: user.id,
          newData: {
            fullName: user.fullName,
            documentId: user.documentId,
            role: user.role,
            hourlyRateCop: user.hourlyRateCop,
            commissionRatePct: user.commissionRatePct,
          },
        },
        tx
      );

      return user;
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Error guardando empleado' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const logId = searchParams.get('logId');
    const adjustmentId = searchParams.get('adjustmentId');
    const operatorUserId = searchParams.get('operatorUserId');

    if (!operatorUserId || (!logId && !adjustmentId)) {
      return NextResponse.json(
        { message: 'Faltan parámetros para eliminar el registro.' },
        { status: 400 }
      );
    }

    if (adjustmentId) {
      const existingAdj = await prisma.staffPayrollAdjustment.findUnique({
        where: { id: adjustmentId },
        include: { staff: true },
      });
      if (!existingAdj) {
        return NextResponse.json({ message: 'Concepto no encontrado.' }, { status: 404 });
      }

      await prisma.$transaction(async (tx) => {
        await tx.staffPayrollAdjustment.delete({ where: { id: adjustmentId } });
        await recordAuditLog(
          {
            userId: operatorUserId,
            action: 'DELETE',
            entity: 'StaffPayrollAdjustment',
            entityId: adjustmentId,
            previousData: {
              staffName: existingAdj.staff.fullName,
              type: existingAdj.type,
              concept: existingAdj.concept,
              amountCop: existingAdj.amountCop,
            },
          },
          tx
        );
      });

      return NextResponse.json({ deleted: true });
    }

    const existingLog = await prisma.staffTimeLog.findUnique({
      where: { id: logId! },
      include: { staff: true },
    });

    if (!existingLog) {
      return NextResponse.json({ message: 'Registro de turno no encontrado.' }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.staffTimeLog.delete({ where: { id: logId! } });

      await recordAuditLog(
        {
          userId: operatorUserId,
          action: 'DELETE',
          entity: 'StaffTimeLog',
          entityId: logId!,
          previousData: {
            staffName: existingLog.staff.fullName,
            checkInAt: existingLog.checkInAt.toISOString(),
            checkOutAt: existingLog.checkOutAt?.toISOString() ?? null,
            workedHoursDecimal: existingLog.workedHoursDecimal,
          },
        },
        tx
      );
    });

    return NextResponse.json({ deleted: true });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Error eliminando registro' },
      { status: 500 }
    );
  }
}
