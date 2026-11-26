import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { recordAuditLog } from '@/lib/audit';
import { ensureSeededDatabase } from '@/lib/seed';
import { StudentItem } from '@/interfaces/student.interface';

const createStudentSchema = z.object({
  documentId: z.string().min(5),
  fullName: z.string().min(3),
  phone: z.string().min(7),
  email: z.string().email().optional().or(z.literal('')),
  programName: z.string().min(3),
  fingerprintTemplate: z.string().optional(),
  pendingBalanceCop: z.number().int().nonnegative().default(0),
  pendingBalanceReason: z.string().optional(),
  operatorUserId: z.string().min(1),
});

const updateStudentSchema = z.object({
  studentId: z.string().min(1),
  documentId: z.string().min(5),
  fullName: z.string().min(3),
  phone: z.string().min(7),
  email: z.string().email().optional().or(z.literal('')),
  programName: z.string().min(3),
  pendingBalanceCop: z.number().int().nonnegative(),
  pendingBalanceReason: z.string().optional(),
  operatorUserId: z.string().min(1),
});

const registerPaymentSchema = z.object({
  action: z.literal('REGISTER_PAYMENT'),
  studentId: z.string().min(1),
  amountCop: z.number().int().positive('El monto a abonar debe ser mayor a 0'),
  concept: z.string().min(2, 'Indique el concepto del pago'),
  paymentMethod: z.enum(['EFECTIVO', 'TRANSFERENCIA', 'TARJETA', 'MIXTO']).default('EFECTIVO'),
  paymentReference: z.string().optional(),
  notes: z.string().optional(),
  operatorUserId: z.string().min(1),
});

const enrollFingerprintSchema = z.object({
  action: z.literal('ENROLL_FINGERPRINT'),
  studentId: z.string().min(1),
  fingerprintTemplate: z.string().min(6, 'Plantilla biométrica inválida o no capturada'),
  operatorUserId: z.string().min(1),
});

function getProgramRequiredHours(programName: string): number {
  const norm = programName.toLowerCase();
  if (
    norm.includes('técnico') ||
    norm.includes('tecnico') ||
    norm.includes('cosmetología') ||
    norm.includes('cosmetologia')
  ) {
    return 600;
  }
  if (
    norm.includes('peluquería') ||
    norm.includes('peluqueria') ||
    norm.includes('barbería') ||
    norm.includes('barberia')
  ) {
    return 300;
  }
  return 120;
}

export async function GET() {
  try {
    await ensureSeededDatabase();
    const students = await prisma.student.findMany({
      where: { isActive: true },
      include: {
        fines: {
          include: {
            missedSchedule: true,
            rescheduledSchedule: true,
            collectedByUser: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        attendances: {
          where: { status: 'PRESENTE' },
          include: {
            schedule: true,
          },
        },
        payments: {
          include: {
            operatorUser: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: [{ isBlocked: 'desc' }, { fullName: 'asc' }],
    });

    const mapped: StudentItem[] = students.map((s) => {
      const pendingFines = s.fines.filter(
        (f) => f.status === 'PENDIENTE' || !f.isClassRescheduled
      );
      const pendingFinesTotalCop = s.fines
        .filter((f) => f.status === 'PENDIENTE')
        .reduce((acc, f) => acc + f.amountCop, 0);

      const totalProgramHours = getProgramRequiredHours(s.programName);
      const attendedHours = s.attendances.reduce((sum, att) => {
        const start = new Date(att.schedule.startTime).getTime();
        const end = new Date(att.schedule.endTime).getTime();
        const hrs = Math.max(1, Math.round((end - start) / (1000 * 60 * 60)));
        return sum + hrs;
      }, 0);
      const attendancePercentage = Math.min(
        100,
        Math.round((attendedHours / totalProgramHours) * 100)
      );

      return {
        id: s.id,
        documentId: s.documentId,
        fullName: s.fullName,
        phone: s.phone,
        email: s.email,
        programName: s.programName,
        hasFingerprint: Boolean(s.fingerprintTemplate),
        fingerprintTemplate: s.fingerprintTemplate,
        isBlocked: s.isBlocked,
        blockReason: s.blockReason,
        pendingBalanceCop: s.pendingBalanceCop,
        pendingBalanceReason: s.pendingBalanceReason,
        pendingFinesCount: pendingFines.length,
        pendingFinesTotalCop,
        attendedHours,
        totalProgramHours,
        attendancePercentage,
        isActive: s.isActive,
        fines: s.fines.map((f) => ({
          id: f.id,
          studentId: f.studentId,
          studentName: s.fullName,
          missedScheduleId: f.missedScheduleId,
          missedScheduleTitle: f.missedSchedule.title,
          rescheduledScheduleId: f.rescheduledScheduleId,
          amountCop: f.amountCop,
          status: f.status,
          isClassRescheduled: f.isClassRescheduled,
          paidAt: f.paidAt ? f.paidAt.toISOString() : null,
          paymentReference: f.paymentReference,
          paymentMethod: f.paymentMethod,
          collectedByUserId: f.collectedByUserId,
          collectedByUserName: f.collectedByUser ? f.collectedByUser.fullName : null,
          reason: f.reason,
          createdAt: f.createdAt.toISOString(),
        })),
        payments: s.payments.map((p) => ({
          id: p.id,
          studentId: p.studentId,
          amountCop: p.amountCop,
          concept: p.concept,
          paymentMethod: p.paymentMethod,
          paymentReference: p.paymentReference,
          receiptNumber: p.receiptNumber,
          notes: p.notes,
          operatorUserId: p.operatorUserId,
          operatorUserName: p.operatorUser ? p.operatorUser.fullName : null,
          createdAt: p.createdAt.toISOString(),
        })),
      };
    });

    return NextResponse.json(mapped);
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Error cargando estudiantes' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const parsed = createStudentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message || 'Datos de estudiante inválidos' },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Verificar si ya existe estudiante con la misma cédula
    const existing = await prisma.student.findUnique({
      where: { documentId: data.documentId },
    });
    if (existing) {
      return NextResponse.json(
        {
          message: `Ya existe una estudiante registrada con la cédula o documento No. ${data.documentId} (${existing.fullName}). Verifique el número ingresado.`,
        },
        { status: 400 }
      );
    }

    const student = await prisma.$transaction(async (tx) => {
      const created = await tx.student.create({
        data: {
          documentId: data.documentId,
          fullName: data.fullName,
          phone: data.phone,
          email: data.email || null,
          programName: data.programName,
          fingerprintTemplate: data.fingerprintTemplate || null,
          pendingBalanceCop: data.pendingBalanceCop,
          pendingBalanceReason: data.pendingBalanceReason || null,
          isBlocked: data.pendingBalanceCop > 0,
          blockReason:
            data.pendingBalanceCop > 0
              ? `Saldo académico pendiente de registro inicial: ${new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(data.pendingBalanceCop)}`
              : null,
        },
      });

      await recordAuditLog(
        {
          userId: data.operatorUserId,
          action: 'CREATE',
          entity: 'Student',
          entityId: created.id,
          newData: {
            documentId: created.documentId,
            fullName: created.fullName,
            programName: created.programName,
            pendingBalanceCop: created.pendingBalanceCop,
          },
        },
        tx
      );

      return created;
    });

    return NextResponse.json(student, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Error matriculando alumno' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const rawBody: any = await request.json();

    // 1. REGISTRAR ABONO / PAGO AL SALDO ACADÉMICO
    if (rawBody.action === 'REGISTER_PAYMENT') {
      const parsed = registerPaymentSchema.safeParse(rawBody);
      if (!parsed.success) {
        return NextResponse.json(
          { message: parsed.error.issues[0]?.message || 'Datos de abono inválidos' },
          { status: 400 }
        );
      }

      const { studentId, amountCop, concept, paymentMethod, paymentReference, notes, operatorUserId } =
        parsed.data;

      const result = await prisma.$transaction(async (tx) => {
        const student = await tx.student.findUniqueOrThrow({
          where: { id: studentId },
        });

        const operator = await tx.user.findUnique({
          where: { id: operatorUserId },
        });

        const receiptNumber = `REC-EPB-${Date.now().toString().slice(-6)}`;
        const newBalance = Math.max(0, student.pendingBalanceCop - amountCop);

        // Crear registro de abono
        const payment = await tx.studentPayment.create({
          data: {
            studentId,
            amountCop,
            concept,
            paymentMethod,
            paymentReference: paymentReference || null,
            receiptNumber,
            notes: notes || null,
            operatorUserId,
          },
        });

        // Verificar si quedan multas pendientes
        const remainingOpenFines = await tx.fine.count({
          where: {
            studentId,
            OR: [{ status: 'PENDIENTE' }, { isClassRescheduled: false }],
          },
        });

        const shouldUnblock = newBalance === 0 && remainingOpenFines === 0;

        await tx.student.update({
          where: { id: studentId },
          data: {
            pendingBalanceCop: newBalance,
            pendingBalanceReason: newBalance === 0 ? null : student.pendingBalanceReason,
            isBlocked: shouldUnblock ? false : student.isBlocked,
            blockReason: shouldUnblock
              ? null
              : newBalance === 0
                ? student.blockReason
                : `Saldo pendiente: ${new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(newBalance)} (${student.pendingBalanceReason || 'Matrícula/Kit'})`,
          },
        });

        await recordAuditLog(
          {
            userId: operatorUserId,
            action: 'STUDENT_PAYMENT_REGISTERED',
            entity: 'StudentPayment',
            entityId: payment.id,
            newData: {
              studentId,
              studentName: student.fullName,
              amountCop,
              newPendingBalanceCop: newBalance,
              paymentMethod,
              receiptNumber,
              unblocked: shouldUnblock,
              operatorName: operator?.fullName ?? null,
            },
          },
          tx
        );

        return {
          payment,
          newPendingBalanceCop: newBalance,
          unblocked: shouldUnblock,
          receiptNumber,
        };
      });

      return NextResponse.json(result);
    }

    // 2. ENROLAR HUELLA DACTILAR
    if (rawBody.action === 'ENROLL_FINGERPRINT') {
      const parsed = enrollFingerprintSchema.safeParse(rawBody);
      if (!parsed.success) {
        return NextResponse.json(
          { message: parsed.error.issues[0]?.message || 'Datos biométricos inválidos' },
          { status: 400 }
        );
      }

      const { studentId, fingerprintTemplate, operatorUserId } = parsed.data;

      const result = await prisma.$transaction(async (tx) => {
        const student = await tx.student.findUniqueOrThrow({
          where: { id: studentId },
        });

        const updated = await tx.student.update({
          where: { id: studentId },
          data: {
            fingerprintTemplate,
          },
        });

        await recordAuditLog(
          {
            userId: operatorUserId,
            action: 'STUDENT_FINGERPRINT_ENROLLED',
            entity: 'Student',
            entityId: studentId,
            newData: {
              studentName: student.fullName,
              documentId: student.documentId,
              enrolled: true,
            },
          },
          tx
        );

        return updated;
      });

      return NextResponse.json(result);
    }

    // 3. ACTUALIZACIÓN ESTÁNDAR DE FICHA DE ESTUDIANTE
    const parsed = updateStudentSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message || 'Datos de edición de estudiante inválidos' },
        { status: 400 }
      );
    }

    const data = parsed.data;

    const updated = await prisma.$transaction(async (tx) => {
      const prev = await tx.student.findUniqueOrThrow({
        where: { id: data.studentId },
      });

      // Validar si el nuevo documentId choca con otro estudiante
      if (data.documentId !== prev.documentId) {
        const docCollision = await tx.student.findUnique({
          where: { documentId: data.documentId },
        });
        if (docCollision) {
          throw new Error(
            `El documento No. ${data.documentId} ya se encuentra asignado a otra estudiante (${docCollision.fullName}).`
          );
        }
      }

      const student = await tx.student.update({
        where: { id: data.studentId },
        data: {
          documentId: data.documentId,
          fullName: data.fullName,
          phone: data.phone,
          email: data.email || null,
          programName: data.programName,
          pendingBalanceCop: data.pendingBalanceCop,
          pendingBalanceReason: data.pendingBalanceReason || null,
        },
      });

      await recordAuditLog(
        {
          userId: data.operatorUserId,
          action: 'UPDATE',
          entity: 'Student',
          entityId: student.id,
          previousData: {
            documentId: prev.documentId,
            fullName: prev.fullName,
            phone: prev.phone,
            programName: prev.programName,
            pendingBalanceCop: prev.pendingBalanceCop,
            pendingBalanceReason: prev.pendingBalanceReason,
          },
          newData: {
            documentId: student.documentId,
            fullName: student.fullName,
            phone: student.phone,
            programName: student.programName,
            pendingBalanceCop: student.pendingBalanceCop,
            pendingBalanceReason: student.pendingBalanceReason,
          },
        },
        tx
      );

      return student;
    });

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Error actualizando estudiante' },
      { status: 400 }
    );
  }
}
