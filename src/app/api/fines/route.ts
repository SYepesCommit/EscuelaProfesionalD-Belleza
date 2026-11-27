import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { recordAuditLog } from '@/lib/audit';

const payAndRescheduleSchema = z.object({
  action: z.literal('PAY_AND_RESCHEDULE').optional(),
  fineId: z.string().min(1),
  rescheduledScheduleId: z.string().min(1),
  paymentReference: z.string().min(2),
  paymentMethod: z.enum(['EFECTIVO', 'TRANSFERENCIA', 'TARJETA', 'MIXTO']).default('EFECTIVO'),
  operatorUserId: z.string().min(1),
});

const cancelFineSchema = z.object({
  action: z.literal('CANCEL_FINE'),
  fineId: z.string().min(1),
  reason: z.string().min(3, 'Indique el motivo de reubicación, salto de clase o condonación'),
  rescheduledScheduleId: z.string().optional(),
  operatorUserId: z.string().min(1),
});

export async function GET() {
  try {
    const fines = await prisma.fine.findMany({
      include: {
        student: true,
        missedSchedule: true,
        rescheduledSchedule: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(fines);
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Error cargando multas' },
      { status: 500 }
    );
  }
}

/**
 * Liquida o Anula multas de estudiantes y actualiza el estado de bloqueo coherentemente.
 */
export async function PATCH(request: Request) {
  try {
    const rawBody: any = await request.json();

    // 1. ANULAR / CONDONAR MULTA (Solo autorizados / administradores)
    if (rawBody.action === 'CANCEL_FINE') {
      const parsed = cancelFineSchema.safeParse(rawBody);
      if (!parsed.success) {
        return NextResponse.json(
          { message: parsed.error.issues[0]?.message || 'Datos de anulación inválidos' },
          { status: 400 }
        );
      }

      const { fineId, reason, rescheduledScheduleId, operatorUserId } = parsed.data;

      const result = await prisma.$transaction(async (tx) => {
        const existingFine = await tx.fine.findUniqueOrThrow({
          where: { id: fineId },
          include: { student: true },
        });

        const operator = await tx.user.findUnique({
          where: { id: operatorUserId },
        });

        const updatedFine = await tx.fine.update({
          where: { id: fineId },
          data: {
            status: 'ANULADA',
            isClassRescheduled: true,
            rescheduledScheduleId: rescheduledScheduleId || null,
            reason: rescheduledScheduleId
              ? `Reubicada sin multa: ${reason}`
              : `Clase Saltada / Exonerada: ${reason}`,
          },
        });

        // Si se eligió un salón/horario para reubicar la clase sin cobrar multa, inscribirla:
        if (rescheduledScheduleId) {
          await tx.studentEnrollment.upsert({
            where: {
              scheduleId_studentId: {
                scheduleId: rescheduledScheduleId,
                studentId: existingFine.studentId,
              },
            },
            update: {},
            create: {
              scheduleId: rescheduledScheduleId,
              studentId: existingFine.studentId,
            },
          });
        }

        // Verificar si quedan otras multas pendientes para este estudiante
        const remainingOpenFines = await tx.fine.count({
          where: {
            studentId: existingFine.studentId,
            status: 'PENDIENTE',
          },
        });

        if (remainingOpenFines === 0 && existingFine.student.pendingBalanceCop === 0) {
          await tx.student.update({
            where: { id: existingFine.studentId },
            data: {
              isBlocked: false,
              blockReason: null,
            },
          });

          await recordAuditLog(
            {
              userId: operatorUserId,
              action: 'STUDENT_UNBLOCKED',
              entity: 'Student',
              entityId: existingFine.studentId,
              previousData: { isBlocked: true },
              newData: {
                isBlocked: false,
                reason: `Desbloqueado tras anulación de multa: ${reason}`,
              },
            },
            tx
          );
        }

        await recordAuditLog(
          {
            userId: operatorUserId,
            action: 'FINE_CANCELLED',
            entity: 'Fine',
            entityId: fineId,
            previousData: {
              status: existingFine.status,
              amountCop: existingFine.amountCop,
            },
            newData: {
              status: 'ANULADA',
              cancellationReason: reason,
              cancelledByUserId: operator?.id ?? null,
              cancelledByUserName: operator?.fullName ?? null,
            },
          },
          tx
        );

        return updatedFine;
      });

      return NextResponse.json(result);
    }

    // 2. LIQUIDAR Y REPROGRAMAR MULTA
    const parsed = payAndRescheduleSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { message: 'Debe seleccionar el salón/clase de reposición y referencia de pago' },
        { status: 400 }
      );
    }

    const { fineId, rescheduledScheduleId, paymentReference, paymentMethod, operatorUserId } =
      parsed.data;

    const result = await prisma.$transaction(async (tx) => {
      const existingFine = await tx.fine.findUniqueOrThrow({
        where: { id: fineId },
        include: { student: true },
      });

      const operator = await tx.user.findUnique({
        where: { id: operatorUserId },
      });

      const updatedFine = await tx.fine.update({
        where: { id: fineId },
        data: {
          status: 'PAGADA',
          isClassRescheduled: true,
          rescheduledScheduleId,
          paidAt: new Date(),
          paymentReference,
          paymentMethod,
          collectedByUserId: operator?.id ?? null,
        },
      });

      // Inscribir al alumno en la clase de reposición
      await tx.studentEnrollment.upsert({
        where: {
          scheduleId_studentId: {
            scheduleId: rescheduledScheduleId,
            studentId: existingFine.studentId,
          },
        },
        update: {},
        create: {
          scheduleId: rescheduledScheduleId,
          studentId: existingFine.studentId,
        },
      });

      // Verificar si quedan otras multas pendientes o sin reprogramar para este estudiante
      const remainingOpenFines = await tx.fine.count({
        where: {
          studentId: existingFine.studentId,
          OR: [{ status: 'PENDIENTE' }, { isClassRescheduled: false }],
        },
      });

      // Solo desbloquear si además no tiene saldo académico pendiente
      if (remainingOpenFines === 0 && existingFine.student.pendingBalanceCop === 0) {
        await tx.student.update({
          where: { id: existingFine.studentId },
          data: {
            isBlocked: false,
            blockReason: null,
          },
        });

        await recordAuditLog(
          {
            userId: operatorUserId,
            action: 'STUDENT_UNBLOCKED',
            entity: 'Student',
            entityId: existingFine.studentId,
            previousData: { isBlocked: true, fineStatus: 'PENDIENTE' },
            newData: {
              isBlocked: false,
              finePaidCop: existingFine.amountCop,
              paymentReference,
              rescheduledScheduleId,
            },
          },
          tx
        );
      } else if (remainingOpenFines === 0 && existingFine.student.pendingBalanceCop > 0) {
        // Actualizar motivo del bloqueo indicando que solo resta el saldo académico
        await tx.student.update({
          where: { id: existingFine.studentId },
          data: {
            blockReason: `Saldo académico pendiente de ${new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(existingFine.student.pendingBalanceCop)} (${existingFine.student.pendingBalanceReason || 'Matrícula/Cuota'})`,
          },
        });
      }

      await recordAuditLog(
        {
          userId: operatorUserId,
          action: 'FINE_PAID',
          entity: 'Fine',
          entityId: fineId,
          previousData: {
            status: existingFine.status,
            isClassRescheduled: existingFine.isClassRescheduled,
          },
          newData: {
            status: 'PAGADA',
            isClassRescheduled: true,
            amountCop: existingFine.amountCop,
            paymentReference,
            paymentMethod,
            rescheduledScheduleId,
            collectedByUserId: operator?.id ?? null,
            collectedByUserName: operator?.fullName ?? null,
          },
        },
        tx
      );

      return updatedFine;
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Error procesando pago de multa' },
      { status: 500 }
    );
  }
}
