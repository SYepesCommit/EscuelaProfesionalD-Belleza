import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { recordAuditLog } from '@/lib/audit';
import { ensureSeededDatabase } from '@/lib/seed';

const createRoomSchema = z.object({
  name: z.string().min(3),
  code: z.string().min(2),
  capacity: z.number().int().positive(),
  description: z.string().optional(),
  operatorUserId: z.string().min(1),
});

const updateRoomSchema = z.object({
  roomId: z.string().min(1),
  name: z.string().min(3),
  capacity: z.number().int().positive(),
  description: z.string().optional(),
  operatorUserId: z.string().min(1),
});

const deleteRoomSchema = z.object({
  roomId: z.string().min(1),
  operatorUserId: z.string().min(1),
});

export async function GET() {
  try {
    await ensureSeededDatabase();
    const rooms = await prisma.room.findMany({
      where: { isActive: true },
      include: {
        _count: {
          select: { schedules: true },
        },
      },
      orderBy: { code: 'asc' },
    });

    const mapped = rooms.map((r) => ({
      id: r.id,
      name: r.name,
      code: r.code,
      capacity: r.capacity,
      description: r.description,
      isActive: r.isActive,
      activeSchedulesCount: r._count.schedules,
    }));

    return NextResponse.json(mapped);
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Error cargando salones' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const parsed = createRoomSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ message: 'Datos de salón inválidos' }, { status: 400 });
    }

    const { name, code, capacity, description, operatorUserId } = parsed.data;

    const room = await prisma.$transaction(async (tx) => {
      const created = await tx.room.create({
        data: { name, code: code.toUpperCase(), capacity, description },
      });

      await recordAuditLog(
        {
          userId: operatorUserId,
          action: 'CREATE',
          entity: 'Room',
          entityId: created.id,
          newData: { name: created.name, code: created.code, capacity: created.capacity },
        },
        tx
      );

      return created;
    });

    return NextResponse.json(room, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Error creando salón' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body: unknown = await request.json();
    const parsed = updateRoomSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ message: 'Datos de edición de salón inválidos' }, { status: 400 });
    }

    const { roomId, name, capacity, description, operatorUserId } = parsed.data;

    const updated = await prisma.$transaction(async (tx) => {
      const prev = await tx.room.findUniqueOrThrow({ where: { id: roomId } });
      const room = await tx.room.update({
        where: { id: roomId },
        data: {
          name,
          capacity,
          description: description ?? null,
        },
      });

      await recordAuditLog(
        {
          userId: operatorUserId,
          action: 'UPDATE',
          entity: 'Room',
          entityId: room.id,
          previousData: { name: prev.name, capacity: prev.capacity },
          newData: { name: room.name, capacity: room.capacity },
        },
        tx
      );

      return room;
    });

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Error actualizando salón' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const body: unknown = await request.json();
    const parsed = deleteRoomSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: 'ID de salón u operador inválido' },
        { status: 400 }
      );
    }

    const { roomId, operatorUserId } = parsed.data;

    // Verificar que el usuario tenga rol de ADMIN
    const operator = await prisma.user.findUnique({
      where: { id: operatorUserId },
    });

    if (!operator || operator.role !== 'ADMIN') {
      return NextResponse.json(
        { message: 'Operación denegada. Solo los Administradores pueden eliminar salones.' },
        { status: 403 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const room = await tx.room.findUniqueOrThrow({
        where: { id: roomId },
      });

      // Se desactiva el salón y se remueven sus clases programadas
      await tx.classSchedule.deleteMany({
        where: { roomId },
      });

      const updated = await tx.room.update({
        where: { id: roomId },
        data: { isActive: false },
      });

      await recordAuditLog(
        {
          userId: operatorUserId,
          action: 'DELETE',
          entity: 'Room',
          entityId: room.id,
          previousData: { name: room.name, code: room.code, capacity: room.capacity },
          newData: { isActive: false },
        },
        tx
      );

      return updated;
    });

    return NextResponse.json({ success: true, deletedRoomId: result.id });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Error eliminando salón' },
      { status: 500 }
    );
  }
}
