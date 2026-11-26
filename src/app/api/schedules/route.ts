import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { recordAuditLog } from '@/lib/audit';
import { ensureSeededDatabase } from '@/lib/seed';
import { ClassScheduleItem, ScheduleRepeatMode } from '@/interfaces/schedule.interface';

const createScheduleSchema = z.object({
  roomId: z.string().min(1),
  teacherId: z.string().min(1),
  title: z.string().min(3),
  courseName: z.string().min(3),
  startTime: z.string().min(1),
  endTime: z.string().min(1),
  maxStudents: z.number().int().positive().default(15),
  studentIds: z.array(z.string()).default([]),
  notes: z.string().optional(),
  repeatMode: z
    .enum(['SINGLE', 'DAILY_3', 'DAILY_5', 'WEEKLY_4'])
    .optional()
    .default('SINGLE'),
  operatorUserId: z.string().min(1),
});

const updateScheduleSchema = z.object({
  scheduleId: z.string().min(1),
  roomId: z.string().min(1),
  teacherId: z.string().min(1),
  title: z.string().min(3),
  courseName: z.string().min(3),
  startTime: z.string().min(1),
  endTime: z.string().min(1),
  maxStudents: z.number().int().positive(),
  studentIds: z.array(z.string()).default([]),
  notes: z.string().optional(),
  isActive: z.boolean().optional(),
  deactivationReason: z.string().nullable().optional(),
  operatorUserId: z.string().min(1),
});

const deleteScheduleSchema = z.object({
  scheduleId: z.string().min(1),
  operatorUserId: z.string().min(1),
});

function getDayOffsetsForRepeatMode(mode: ScheduleRepeatMode): number[] {
  switch (mode) {
    case 'DAILY_3':
      return [0, 1, 2];
    case 'DAILY_5':
      return [0, 1, 2, 3, 4];
    case 'WEEKLY_4':
      return [0, 7, 14, 21];
    case 'SINGLE':
    default:
      return [0];
  }
}

function formatConflictWindow(start: Date, end: Date): string {
  const dateStr = start.toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
  });
  const sTime = start.toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const eTime = end.toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
  });
  return `${dateStr} (${sTime} - ${eTime})`;
}

async function checkScheduleOverlapConflict(params: {
  roomId: string;
  teacherId: string;
  start: Date;
  end: Date;
  excludeScheduleId?: string;
}): Promise<string | null> {
  const { roomId, teacherId, start, end, excludeScheduleId } = params;

  const roomConflict = await prisma.classSchedule.findFirst({
    where: {
      roomId,
      isActive: true,
      ...(excludeScheduleId ? { id: { not: excludeScheduleId } } : {}),
      startTime: { lt: end },
      endTime: { gt: start },
    },
    include: { room: true, teacher: true },
  });

  if (roomConflict) {
    return `Cruce de Salón: ${roomConflict.room.name} ya está ocupado el ${formatConflictWindow(
      roomConflict.startTime,
      roomConflict.endTime
    )} por la clase "${roomConflict.title}" (${roomConflict.teacher.fullName}).`;
  }

  const teacherConflict = await prisma.classSchedule.findFirst({
    where: {
      teacherId,
      isActive: true,
      ...(excludeScheduleId ? { id: { not: excludeScheduleId } } : {}),
      startTime: { lt: end },
      endTime: { gt: start },
    },
    include: { room: true, teacher: true },
  });

  if (teacherConflict) {
    return `Cruce de Docente: ${teacherConflict.teacher.fullName} ya tiene programada la clase "${teacherConflict.title}" en ${teacherConflict.room.name} el ${formatConflictWindow(
      teacherConflict.startTime,
      teacherConflict.endTime
    )}.`;
  }

  return null;
}

export async function GET(request: Request) {
  try {
    await ensureSeededDatabase();
    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get('roomId');

    const schedules = await prisma.classSchedule.findMany({
      where: roomId ? { roomId } : undefined,
      include: {
        room: true,
        teacher: true,
        enrollments: {
          include: {
            student: true,
          },
        },
        attendances: true,
      },
      orderBy: { startTime: 'asc' },
    });

    const mapped: ClassScheduleItem[] = schedules.map((s) => ({
      id: s.id,
      roomId: s.roomId,
      roomName: s.room.name,
      teacherId: s.teacherId,
      teacherName: s.teacher.fullName,
      title: s.title,
      courseName: s.courseName,
      startTime: s.startTime.toISOString(),
      endTime: s.endTime.toISOString(),
      maxStudents: s.maxStudents,
      enrolledCount: s.enrollments.length,
      enrolledStudents: s.enrollments.map((e) => {
        const att = s.attendances.find((a) => a.studentId === e.student.id);
        return {
          id: e.student.id,
          documentId: e.student.documentId,
          fullName: e.student.fullName,
          isBlocked: e.student.isBlocked,
          attendanceStatus: att ? att.status : null,
        };
      }),
      notes: s.notes,
      isActive: s.isActive,
      deactivationReason: s.deactivationReason,
      deactivatedByName: s.deactivatedByName,
      deactivatedAt: s.deactivatedAt ? s.deactivatedAt.toISOString() : null,
    }));

    return NextResponse.json(mapped);
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Error cargando agendas' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const parsed = createScheduleSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: 'Datos de agenda inválidos', errors: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const baseStart = new Date(data.startTime);
    const baseEnd = new Date(data.endTime);

    if (
      Number.isNaN(baseStart.getTime()) ||
      Number.isNaN(baseEnd.getTime()) ||
      baseEnd <= baseStart
    ) {
      return NextResponse.json(
        { message: 'La hora de finalización debe ser posterior a la hora de inicio.' },
        { status: 400 }
      );
    }

    if (data.studentIds.length > data.maxStudents) {
      return NextResponse.json(
        {
          message: `El salón/clase tiene límite de ${data.maxStudents} personas y seleccionó ${data.studentIds.length}.`,
        },
        { status: 400 }
      );
    }

    const offsets = getDayOffsetsForRepeatMode(data.repeatMode);
    const sessionsToCreate = offsets.map((dayOffset) => {
      const s = new Date(baseStart);
      s.setDate(s.getDate() + dayOffset);
      const e = new Date(baseEnd);
      e.setDate(e.getDate() + dayOffset);
      return { start: s, end: e, dayOffset };
    });

    // Validar que ninguna de las sesiones generadas tenga cruce de salón ni de docente
    for (const session of sessionsToCreate) {
      const conflictMsg = await checkScheduleOverlapConflict({
        roomId: data.roomId,
        teacherId: data.teacherId,
        start: session.start,
        end: session.end,
      });
      if (conflictMsg) {
        return NextResponse.json({ message: conflictMsg }, { status: 409 });
      }
    }

    const createdList = await prisma.$transaction(async (tx) => {
      const results = [];
      for (let i = 0; i < sessionsToCreate.length; i++) {
        const session = sessionsToCreate[i];
        const sessionTitle =
          sessionsToCreate.length > 1
            ? `${data.title} (Sesión ${i + 1}/${sessionsToCreate.length})`
            : data.title;

        const schedule = await tx.classSchedule.create({
          data: {
            roomId: data.roomId,
            teacherId: data.teacherId,
            title: sessionTitle,
            courseName: data.courseName,
            startTime: session.start,
            endTime: session.end,
            maxStudents: data.maxStudents,
            notes: data.notes,
          },
        });

        if (data.studentIds.length > 0) {
          await tx.studentEnrollment.createMany({
            data: data.studentIds.map((studentId) => ({
              scheduleId: schedule.id,
              studentId,
            })),
            skipDuplicates: true,
          });
        }

        await recordAuditLog(
          {
            userId: data.operatorUserId,
            action: 'CREATE',
            entity: 'ClassSchedule',
            entityId: schedule.id,
            newData: {
              roomId: schedule.roomId,
              title: schedule.title,
              courseName: schedule.courseName,
              maxStudents: schedule.maxStudents,
              enrolledStudentsCount: data.studentIds.length,
              repeatMode: data.repeatMode,
            },
          },
          tx
        );

        results.push(schedule);
      }
      return results;
    });

    return NextResponse.json(createdList[0], { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Error creando clase' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body: unknown = await request.json();
    const parsed = updateScheduleSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: 'Datos de actualización de clase inválidos' },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const start = new Date(data.startTime);
    const end = new Date(data.endTime);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
      return NextResponse.json(
        { message: 'La hora de finalización debe ser posterior a la hora de inicio.' },
        { status: 400 }
      );
    }

    // Verificar rol del operador si intenta cambiar el estado isActive (desactivar/reactivar)
    const operator = await prisma.user.findUnique({
      where: { id: data.operatorUserId },
    });

    if (data.isActive !== undefined) {
      if (!operator || operator.role !== 'ADMIN') {
        return NextResponse.json(
          { message: 'Acceso denegado: Solo un Administrador puede desactivar o reactivar clases.' },
          { status: 403 }
        );
      }

      if (data.isActive === false && (!data.deactivationReason || !data.deactivationReason.trim())) {
        return NextResponse.json(
          { message: 'Debe especificar obligatoriamente el motivo por el cual se desactiva la clase.' },
          { status: 400 }
        );
      }
    }

    if (data.studentIds.length > data.maxStudents) {
      return NextResponse.json(
        {
          message: `El cupo máximo es de ${data.maxStudents} personas y seleccionó ${data.studentIds.length}.`,
        },
        { status: 400 }
      );
    }

    // Si la clase sigue o pasa a estar activa, validar que no choque con otra clase en ese salón o docente
    if (data.isActive !== false) {
      const conflictMsg = await checkScheduleOverlapConflict({
        roomId: data.roomId,
        teacherId: data.teacherId,
        start,
        end,
        excludeScheduleId: data.scheduleId,
      });
      if (conflictMsg) {
        return NextResponse.json({ message: conflictMsg }, { status: 409 });
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const prev = await tx.classSchedule.findUniqueOrThrow({
        where: { id: data.scheduleId },
      });

      const isChangingActiveState =
        data.isActive !== undefined && data.isActive !== prev.isActive;

      const schedule = await tx.classSchedule.update({
        where: { id: data.scheduleId },
        data: {
          roomId: data.roomId,
          teacherId: data.teacherId,
          title: data.title,
          courseName: data.courseName,
          startTime: start,
          endTime: end,
          maxStudents: data.maxStudents,
          notes: data.notes ?? null,
          ...(data.isActive !== undefined
            ? {
                isActive: data.isActive,
                deactivationReason:
                  data.isActive === false
                    ? data.deactivationReason?.trim() ?? prev.deactivationReason
                    : null,
                deactivatedByName:
                  data.isActive === false
                    ? operator?.fullName ?? 'Administración'
                    : null,
                deactivatedAt: data.isActive === false ? new Date() : null,
              }
            : {}),
        },
      });

      await tx.studentEnrollment.deleteMany({
        where: { scheduleId: data.scheduleId },
      });

      if (data.studentIds.length > 0) {
        await tx.studentEnrollment.createMany({
          data: data.studentIds.map((studentId) => ({
            scheduleId: data.scheduleId,
            studentId,
          })),
          skipDuplicates: true,
        });
      }

      await recordAuditLog(
        {
          userId: data.operatorUserId,
          action: isChangingActiveState
            ? data.isActive
              ? 'SCHEDULE_REACTIVATED'
              : 'SCHEDULE_DEACTIVATED'
            : 'UPDATE',
          entity: 'ClassSchedule',
          entityId: schedule.id,
          previousData: {
            roomId: prev.roomId,
            title: prev.title,
            maxStudents: prev.maxStudents,
            isActive: prev.isActive,
            deactivationReason: prev.deactivationReason,
          },
          newData: {
            roomId: schedule.roomId,
            title: schedule.title,
            maxStudents: schedule.maxStudents,
            enrolledCount: data.studentIds.length,
            isActive: schedule.isActive,
            deactivationReason: schedule.deactivationReason,
            deactivatedByName: schedule.deactivatedByName,
          },
        },
        tx
      );

      return schedule;
    });

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Error actualizando clase' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const body: unknown = await request.json();
    const parsed = deleteScheduleSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: 'Datos para eliminar clase inválidos' },
        { status: 400 }
      );
    }

    const { scheduleId, operatorUserId } = parsed.data;

    const operator = await prisma.user.findUnique({
      where: { id: operatorUserId },
    });

    if (!operator || operator.role !== 'ADMIN') {
      return NextResponse.json(
        { message: 'Operación denegada. Solo los Administradores pueden eliminar clases o agendas.' },
        { status: 403 }
      );
    }

    await prisma.$transaction(async (tx) => {
      const prev = await tx.classSchedule.findUniqueOrThrow({
        where: { id: scheduleId },
      });

      await tx.studentEnrollment.deleteMany({ where: { scheduleId } });
      await tx.attendance.deleteMany({ where: { scheduleId } });
      await tx.classSchedule.delete({ where: { id: scheduleId } });

      await recordAuditLog(
        {
          userId: operatorUserId,
          action: 'DELETE',
          entity: 'ClassSchedule',
          entityId: scheduleId,
          previousData: {
            roomId: prev.roomId,
            title: prev.title,
            courseName: prev.courseName,
          },
        },
        tx
      );
    });

    return NextResponse.json({ success: true, deletedScheduleId: scheduleId });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Error eliminando clase' },
      { status: 500 }
    );
  }
}
