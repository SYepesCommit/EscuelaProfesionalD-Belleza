import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { recordAuditLog } from '@/lib/audit';
import { ensureSeededDatabase } from '@/lib/seed';
import { getColombiaDayBounds } from '@/lib/utils';

// Esquema para acciones de caja: arqueo/cierre de caja, base inicial, salida de caja menor y apertura manual de gaveta
const cashRegisterActionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('SET_OPENING_BASE'),
    cashierCode: z.string().min(3),
    amountCop: z.number().int().nonnegative(),
    notes: z.string().optional(),
  }),
  z.object({
    action: z.literal('DRAWER_OPEN'),
    cashierCode: z.string().min(3),
    reason: z.string().min(3),
  }),
  z.object({
    action: z.literal('CASH_OUTFLOW'),
    cashierCode: z.string().min(3),
    amountCop: z.number().int().positive(),
    concept: z.string().min(3),
  }),
  z.object({
    action: z.literal('CLOSE_SHIFT'),
    cashierCode: z.string().min(3),
    physicalCashCop: z.number().int().nonnegative(),
    notes: z.string().optional(),
  }),
]);

export async function GET(request: Request) {
  try {
    await ensureSeededDatabase();
    const url = new URL(request.url);
    const dateQuery = url.searchParams.get('date');

    const targetDate = dateQuery ? new Date(dateQuery) : new Date();
    const { startOfDay, endOfDay } = getColombiaDayBounds(targetDate);

    // Ventas del día
    const salesToday = await prisma.sale.findMany({
      where: {
        createdAt: { gte: startOfDay, lte: endOfDay },
        status: 'COMPLETADA',
      },
      include: {
        closingSeller: true,
        commissionedSeller: true,
        items: {
          include: { product: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Abonos de alumnos del día
    const studentPaymentsToday = await prisma.studentPayment.findMany({
      where: {
        createdAt: { gte: startOfDay, lte: endOfDay },
      },
      include: {
        student: true,
        operatorUser: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Multas pagadas del día
    const finesPaidToday = await prisma.fine.findMany({
      where: {
        paidAt: { gte: startOfDay, lte: endOfDay },
        status: 'PAGADA',
      },
      include: {
        student: true,
        collectedByUser: true,
      },
      orderBy: { paidAt: 'desc' },
    });

    // Totales por medio de pago en ventas
    let salesCashCop = 0;
    let salesTransfCop = 0;
    let salesCardCop = 0;
    let salesTotalCop = 0;

    for (const s of salesToday) {
      salesTotalCop += s.totalCop;
      if (s.paymentMethod === 'EFECTIVO') salesCashCop += s.totalCop;
      else if (s.paymentMethod === 'TRANSFERENCIA') salesTransfCop += s.totalCop;
      else if (s.paymentMethod === 'TARJETA') salesCardCop += s.totalCop;
      else salesCashCop += s.totalCop; // fallback
    }

    // Totales de abonos académicos de alumnos
    let studentCashCop = 0;
    let studentTransfCop = 0;
    let studentCardCop = 0;
    let studentTotalCop = 0;

    for (const sp of studentPaymentsToday) {
      studentTotalCop += sp.amountCop;
      if (sp.paymentMethod === 'EFECTIVO') studentCashCop += sp.amountCop;
      else if (sp.paymentMethod === 'TRANSFERENCIA') studentTransfCop += sp.amountCop;
      else if (sp.paymentMethod === 'TARJETA') studentCardCop += sp.amountCop;
      else studentCashCop += sp.amountCop;
    }

    // Totales de multas cobradas en mostrador
    let finesCashCop = 0;
    let finesTransfCop = 0;
    let finesCardCop = 0;
    let finesTotalCop = 0;

    for (const f of finesPaidToday) {
      finesTotalCop += f.amountCop;
      if (f.paymentMethod === 'EFECTIVO') finesCashCop += f.amountCop;
      else if (f.paymentMethod === 'TRANSFERENCIA') finesTransfCop += f.amountCop;
      else if (f.paymentMethod === 'TARJETA') finesCardCop += f.amountCop;
      else finesCashCop += f.amountCop;
    }

    // Gran total consolidado en caja esperado
    const collectedCashCop = salesCashCop + studentCashCop + finesCashCop;
    const expectedTransfCop = salesTransfCop + studentTransfCop + finesTransfCop;
    const expectedCardCop = salesCardCop + studentCardCop + finesCardCop;
    const grandTotalCop = salesTotalCop + studentTotalCop + finesTotalCop;

    // Consultar Base Inicial del Día y Salidas de Caja Menor en AuditLog
    const [openingBaseLog, outflowLogs] = await Promise.all([
      prisma.auditLog.findFirst({
        where: {
          action: 'CASH_REGISTER_OPENING_BASE',
          createdAt: { gte: startOfDay, lte: endOfDay },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.auditLog.findMany({
        where: {
          action: 'CASH_DRAWER_OUTFLOW',
          createdAt: { gte: startOfDay, lte: endOfDay },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const openingBaseCop =
      openingBaseLog &&
      openingBaseLog.newData &&
      typeof openingBaseLog.newData === 'object' &&
      'amountCop' in openingBaseLog.newData
        ? Number((openingBaseLog.newData as { amountCop?: number }).amountCop || 0)
        : 0;

    const outflowsList = outflowLogs.map((log) => {
      const nd = (log.newData || {}) as {
        amountCop?: number;
        concept?: string;
        authorizedBy?: string;
      };
      return {
        id: log.id,
        amountCop: Number(nd.amountCop || 0),
        concept: nd.concept || 'Salida de caja menor',
        authorizedBy: nd.authorizedBy || 'Caja',
        createdAt: log.createdAt.toISOString(),
      };
    });

    const outflowsTotalCop = outflowsList.reduce((acc, item) => acc + item.amountCop, 0);
    const expectedCashCop = Math.max(0, openingBaseCop + collectedCashCop - outflowsTotalCop);

    return NextResponse.json({
      date: startOfDay.toISOString(),
      summary: {
        openingBaseCop,
        collectedCashCop,
        outflowsTotalCop,
        expectedCashCop,
        expectedTransfCop,
        expectedCardCop,
        grandTotalCop,
      },
      outflowsList,
      breakdown: {
        sales: {
          count: salesToday.length,
          cashCop: salesCashCop,
          transferCop: salesTransfCop,
          cardCop: salesCardCop,
          totalCop: salesTotalCop,
        },
        studentPayments: {
          count: studentPaymentsToday.length,
          cashCop: studentCashCop,
          transferCop: studentTransfCop,
          cardCop: studentCardCop,
          totalCop: studentTotalCop,
        },
        fines: {
          count: finesPaidToday.length,
          cashCop: finesCashCop,
          transferCop: finesTransfCop,
          cardCop: finesCardCop,
          totalCop: finesTotalCop,
        },
      },
      salesToday,
    });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Error cargando datos de caja' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await ensureSeededDatabase();
    const body: unknown = await request.json();
    const parsed = cashRegisterActionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: 'Datos de operación de caja inválidos', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const payload = parsed.data;

    // Buscar cajero/usuario por código secreto o código de acceso
    const cashier = await prisma.user.findFirst({
      where: {
        OR: [
          { sellerSecretCode: payload.cashierCode.trim().toUpperCase() },
          { accessCode: payload.cashierCode.trim().toUpperCase() },
        ],
        isActive: true,
      },
    });

    if (!cashier) {
      return NextResponse.json(
        { message: 'Código de cajero/autorizador inválido o inactivo' },
        { status: 401 }
      );
    }

    const now = new Date();

    if (payload.action === 'SET_OPENING_BASE') {
      await recordAuditLog({
        userId: cashier.id,
        action: 'CASH_REGISTER_OPENING_BASE',
        entity: 'CashRegister',
        entityId: `BASE-${Date.now()}`,
        newData: {
          registeredBy: cashier.fullName,
          amountCop: payload.amountCop,
          notes: payload.notes || 'Base inicial de apertura de turno',
          timestamp: now.toISOString(),
        },
      });

      return NextResponse.json({
        success: true,
        message: `Base inicial de caja fijada en $${payload.amountCop.toLocaleString('es-CO')} COP por ${cashier.fullName}`,
      });
    }

    if (payload.action === 'DRAWER_OPEN') {
      // Registrar apertura física de gaveta en auditoría forense
      await recordAuditLog({
        userId: cashier.id,
        action: 'DRAWER_OPEN_NO_SALE',
        entity: 'CashRegister',
        entityId: `DRAWER-${Date.now()}`,
        newData: {
          openedBy: cashier.fullName,
          reason: payload.reason,
          timestamp: now.toISOString(),
        },
      });

      return NextResponse.json({
        success: true,
        message: `Apertura de gaveta autorizada por ${cashier.fullName}`,
      });
    }

    if (payload.action === 'CASH_OUTFLOW') {
      // Salida de caja menor / gastos inmediatos
      await recordAuditLog({
        userId: cashier.id,
        action: 'CASH_DRAWER_OUTFLOW',
        entity: 'CashRegister',
        entityId: `OUTFLOW-${Date.now()}`,
        newData: {
          authorizedBy: cashier.fullName,
          amountCop: payload.amountCop,
          concept: payload.concept,
          timestamp: now.toISOString(),
        },
      });

      return NextResponse.json({
        success: true,
        message: `Salida de efectivo registrada: $${payload.amountCop.toLocaleString('es-CO')} COP por concepto de "${payload.concept}"`,
      });
    }

    if (payload.action === 'CLOSE_SHIFT') {
      // Arqueo y Cierre de Caja (Siempre en hora oficial de Colombia UTC-5)
      const { startOfDay, endOfDay } = getColombiaDayBounds(now);

      // Calcular ventas en efectivo
      const cashSales = await prisma.sale.aggregate({
        where: {
          createdAt: { gte: startOfDay, lte: endOfDay },
          paymentMethod: 'EFECTIVO',
          status: 'COMPLETADA',
        },
        _sum: { totalCop: true },
      });

      // Calcular abonos de alumnos en efectivo
      const cashStudentPayments = await prisma.studentPayment.aggregate({
        where: {
          createdAt: { gte: startOfDay, lte: endOfDay },
          paymentMethod: 'EFECTIVO',
        },
        _sum: { amountCop: true },
      });

      // Calcular multas en efectivo
      const cashFines = await prisma.fine.aggregate({
        where: {
          paidAt: { gte: startOfDay, lte: endOfDay },
          paymentMethod: 'EFECTIVO',
          status: 'PAGADA',
        },
        _sum: { amountCop: true },
      });

      const [openingBaseLog, outflowLogs] = await Promise.all([
        prisma.auditLog.findFirst({
          where: {
            action: 'CASH_REGISTER_OPENING_BASE',
            createdAt: { gte: startOfDay, lte: endOfDay },
          },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.auditLog.findMany({
          where: {
            action: 'CASH_DRAWER_OUTFLOW',
            createdAt: { gte: startOfDay, lte: endOfDay },
          },
        }),
      ]);

      const openingBaseCop =
        openingBaseLog &&
        openingBaseLog.newData &&
        typeof openingBaseLog.newData === 'object' &&
        'amountCop' in openingBaseLog.newData
          ? Number((openingBaseLog.newData as { amountCop?: number }).amountCop || 0)
          : 0;

      const outflowsTotalCop = outflowLogs.reduce((acc, log) => {
        const nd = (log.newData || {}) as { amountCop?: number };
        return acc + Number(nd.amountCop || 0);
      }, 0);

      const collectedCashCop =
        (cashSales._sum.totalCop ?? 0) +
        (cashStudentPayments._sum.amountCop ?? 0) +
        (cashFines._sum.amountCop ?? 0);

      const expectedCashCop = Math.max(0, openingBaseCop + collectedCashCop - outflowsTotalCop);

      const differenceCop = payload.physicalCashCop - expectedCashCop;
      const statusText =
        differenceCop === 0
          ? 'CUADRE EXACTO'
          : differenceCop > 0
          ? `SOBRANTE (+${differenceCop.toLocaleString('es-CO')} COP)`
          : `FALTANTE (${differenceCop.toLocaleString('es-CO')} COP)`;

      const closureReport = {
        closedBy: cashier.fullName,
        closedAt: now.toISOString(),
        expectedCashCop,
        physicalCashCop: payload.physicalCashCop,
        differenceCop,
        statusText,
        notes: payload.notes || 'Cierre de turno habitual',
      };

      await recordAuditLog({
        userId: cashier.id,
        action: 'CASH_REGISTER_Z_REPORT',
        entity: 'CashRegister',
        entityId: `CLOSE-${Date.now()}`,
        newData: closureReport,
      });

      return NextResponse.json({
        success: true,
        report: closureReport,
        message: `Arqueo finalizado con éxito: ${statusText}`,
      });
    }

    return NextResponse.json({ message: 'Acción no soportada' }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Error en operación de caja' },
      { status: 500 }
    );
  }
}
