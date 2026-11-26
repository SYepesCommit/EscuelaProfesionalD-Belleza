import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { recordAuditLog } from '@/lib/audit';

const registerAttendanceSchema = z.object({
  studentId: z.string().min(1),
  scheduleId: z.string().min(1),
  status: z.enum(['PRESENTE', 'AUSENTE', 'REPROGRAMADO']),
  verifiedByBiometry: z.boolean().default(true),
  operatorUserId: z.string().min(1),
  customFineAmountCop: z.number().int().nonnegative().optional(),
  notes: z.string().optional(),
});

const DEFAULT_FINE_AMOUNT_COP = 40000;

export async function GET() {
  try {
    const records = await prisma.attendance.findMany({
      include: {
        student: true,
        schedule: {
          include: { room: true, teacher: true },
        },
        fine: true,
      },
      orderBy: { checkInTime: 'desc' },
      take: 50,
    });

    return NextResponse.json(records);
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Error cargando asistencias' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const parsed = registerAttendanceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: 'Datos de asistencia inválidos' },
        { status: 400 }
      );
    }

    const data = parsed.data;

    const student = await prisma.student.findUnique({
      where: { id: data.studentId },
    });

    if (!student) {
      return NextResponse.json({ message: 'Estudiante no encontrado' }, { status: 404 });
    }

    // Regla estricta: si el alumno está BLOQUEADO, impedir registrar llegada a clase y auditar intento
    if (data.status === 'PRESENTE' && student.isBlocked) {
      await recordAuditLog({
        userId: data.operatorUserId,
        action: 'STUDENT_ACCESS_DENIED',
        entity: 'Student',
        entityId: student.id,
        newData: {
          studentName: student.fullName,
          documentId: student.documentId,
          scheduleId: data.scheduleId,
          blockReason: student.blockReason || 'Multa o clase sin reprogramar',
          reason: 'Intento de ingreso a salón por huella con bloqueo financiero/académico activo',
        },
      });

      return NextResponse.json(
        {
          message: `ACCESO DENEGADO: La estudiante ${student.fullName} presenta un bloqueo activo (${student.blockReason || 'Multa o clase sin reprogramar'}). Debe acercarse a Caja para liquidar y reprogramar su clase antes de ingresar.`,
        },
        { status: 403 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Asegurar matrícula en la clase
      await tx.studentEnrollment.upsert({
        where: {
          scheduleId_studentId: {
            scheduleId: data.scheduleId,
            studentId: data.studentId,
          },
        },
        update: {},
        create: {
          scheduleId: data.scheduleId,
          studentId: data.studentId,
        },
      });

      const attendance = await tx.attendance.upsert({
        where: {
          studentId_scheduleId: {
            studentId: data.studentId,
            scheduleId: data.scheduleId,
          },
        },
        update: {
          status: data.status,
          verifiedByBiometry: data.verifiedByBiometry,
          checkInTime: new Date(),
          notes: data.notes,
        },
        create: {
          studentId: data.studentId,
          scheduleId: data.scheduleId,
          status: data.status,
          verifiedByBiometry: data.verifiedByBiometry,
          checkInTime: new Date(),
          notes: data.notes,
        },
      });

      // Si es AUSENTE: Generar multa y BLOQUEAR al estudiante (protegiendo multas ya pagadas)
      if (data.status === 'AUSENTE') {
        const fineAmount = data.customFineAmountCop ?? DEFAULT_FINE_AMOUNT_COP;

        // Verificar si ya existe multa asociada a esta asistencia
        const existingFine = await tx.fine.findUnique({
          where: { attendanceId: attendance.id },
        });

        let fineRecordId = '';
        if (existingFine && existingFine.status === 'PAGADA') {
          // Multa previa ya liquidada: se respeta íntegramente
          fineRecordId = existingFine.id;
        } else if (existingFine) {
          // Multa previa pendiente o anulada: se reactiva con el monto actual
          const updated = await tx.fine.update({
            where: { id: existingFine.id },
            data: {
              amountCop: fineAmount,
              status: 'PENDIENTE',
              isClassRescheduled: false,
              reason: `Multa por inasistencia a clase (${new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(fineAmount)})`,
            },
          });
          fineRecordId = updated.id;
        } else {
          // Nueva multa
          const createdFine = await tx.fine.create({
            data: {
              studentId: data.studentId,
              attendanceId: attendance.id,
              missedScheduleId: data.scheduleId,
              amountCop: fineAmount,
              status: 'PENDIENTE',
              isClassRescheduled: false,
              reason: `Multa por inasistencia a clase (${new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(fineAmount)})`,
            },
          });
          fineRecordId = createdFine.id;
        }

        await tx.student.update({
          where: { id: data.studentId },
          data: {
            isBlocked: true,
            blockReason: `Inasistencia registrada: Multa pendiente de ${new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(fineAmount)} y clase sin reprogramar.`,
          },
        });

        await recordAuditLog(
          {
            userId: data.operatorUserId,
            action: 'FINE_CREATED',
            entity: 'Fine',
            entityId: fineRecordId,
            newData: {
              studentId: student.id,
              studentName: student.fullName,
              amountCop: fineAmount,
              autoBlocked: true,
            },
          },
          tx
        );
      } else {
        // Si se marca PRESENTE y existía una multa pendiente por error previo, revocarla
        const existingPendingFine = await tx.fine.findFirst({
          where: { attendanceId: attendance.id, status: 'PENDIENTE' },
        });
        if (existingPendingFine) {
          await tx.fine.delete({ where: { id: existingPendingFine.id } });
          const otherFines = await tx.fine.count({
            where: { studentId: data.studentId, status: 'PENDIENTE' },
          });
          if (otherFines === 0 && student.pendingBalanceCop === 0) {
            await tx.student.update({
              where: { id: data.studentId },
              data: { isBlocked: false, blockReason: null },
            });
          }
        }

        await recordAuditLog(
          {
            userId: data.operatorUserId,
            action: 'CREATE',
            entity: 'Attendance',
            entityId: attendance.id,
            newData: {
              studentId: student.id,
              studentName: student.fullName,
              status: data.status,
              verifiedByBiometry: data.verifiedByBiometry,
            },
          },
          tx
        );
      }

      return attendance;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Error registrando asistencia' },
      { status: 500 }
    );
  }
}
