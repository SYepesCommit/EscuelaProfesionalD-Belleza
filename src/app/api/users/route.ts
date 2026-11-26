import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { recordAuditLog } from '@/lib/audit';
import { ensureSeededDatabase } from '@/lib/seed';

const createUserSchema = z.object({
  documentId: z.string().min(4),
  fullName: z.string().min(3),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  role: z.enum(['ADMIN', 'ASESOR', 'VENTA', 'CONTABILIDAD', 'PROFESOR']),
  accessCode: z.string().min(3),
  sellerSecretCode: z.string().optional(),
  fingerprintTemplate: z.string().optional(),
  hourlyRateCop: z.number().int().nonnegative().default(0),
  commissionRatePct: z.number().nonnegative().default(0),
  isTemporaryGuest: z.boolean().default(false),
  accessExpiresAt: z.string().nullable().optional(),
  operatorUserId: z.string().min(1),
});

const toggleUserSchema = z.object({
  targetUserId: z.string().min(1),
  isActive: z.boolean(),
  accessExpiresAt: z.string().nullable().optional(),
  operatorUserId: z.string().min(1),
});

export async function GET() {
  try {
    await ensureSeededDatabase();
    const users = await prisma.user.findMany({
      orderBy: [{ role: 'asc' }, { fullName: 'asc' }],
    });

    return NextResponse.json(
      users.map((u) => ({
        id: u.id,
        documentId: u.documentId,
        fullName: u.fullName,
        email: u.email,
        phone: u.phone,
        role: u.role,
        accessCode: u.accessCode,
        sellerSecretCode: u.sellerSecretCode,
        hasFingerprint: Boolean(u.fingerprintTemplate),
        hourlyRateCop: u.hourlyRateCop,
        commissionRatePct: u.commissionRatePct,
        isTemporaryGuest: u.isTemporaryGuest,
        accessExpiresAt: u.accessExpiresAt
          ? u.accessExpiresAt.toISOString()
          : null,
        isActive: u.isActive,
      }))
    );
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Error listando usuarios' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const parsed = createUserSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: 'Datos de usuario o rol inválidos', errors: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const operator = await prisma.user.findUnique({
      where: { id: data.operatorUserId },
    });

    if (!operator || operator.role !== 'ADMIN') {
      return NextResponse.json(
        { message: 'Solo un usuario con rol ADMIN puede crear usuarios o accesos temporales.' },
        { status: 403 }
      );
    }

    const created = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          documentId: data.documentId.trim(),
          fullName: data.fullName.trim(),
          email: data.email || null,
          phone: data.phone || null,
          role: data.role,
          accessCode: data.accessCode.trim().toUpperCase(),
          sellerSecretCode: data.sellerSecretCode
            ? data.sellerSecretCode.trim().toUpperCase()
            : null,
          fingerprintTemplate:
            data.fingerprintTemplate ||
            `FP_${data.role}_${data.documentId.trim()}`,
          hourlyRateCop: data.hourlyRateCop,
          commissionRatePct: data.commissionRatePct,
          isTemporaryGuest:
            data.role === 'CONTABILIDAD' ? true : data.isTemporaryGuest,
          accessExpiresAt: data.accessExpiresAt
            ? new Date(data.accessExpiresAt)
            : null,
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
            role: user.role,
            accessCode: user.accessCode,
            isTemporaryGuest: user.isTemporaryGuest,
            accessExpiresAt: user.accessExpiresAt
              ? user.accessExpiresAt.toISOString()
              : null,
          },
        },
        tx
      );

      return user;
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Error creando usuario' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body: unknown = await request.json();
    const parsed = toggleUserSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: 'Datos de actualización inválidos' },
        { status: 400 }
      );
    }

    const { targetUserId, isActive, accessExpiresAt, operatorUserId } =
      parsed.data;

    const updated = await prisma.$transaction(async (tx) => {
      const prev = await tx.user.findUniqueOrThrow({
        where: { id: targetUserId },
      });

      const user = await tx.user.update({
        where: { id: targetUserId },
        data: {
          isActive,
          ...(accessExpiresAt !== undefined
            ? {
                accessExpiresAt: accessExpiresAt
                  ? new Date(accessExpiresAt)
                  : null,
              }
            : {}),
        },
      });

      await recordAuditLog(
        {
          userId: operatorUserId,
          action: 'UPDATE',
          entity: 'User',
          entityId: user.id,
          previousData: {
            isActive: prev.isActive,
            accessExpiresAt: prev.accessExpiresAt
              ? prev.accessExpiresAt.toISOString()
              : null,
          },
          newData: {
            isActive: user.isActive,
            accessExpiresAt: user.accessExpiresAt
              ? user.accessExpiresAt.toISOString()
              : null,
          },
        },
        tx
      );

      return user;
    });

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Error actualizando acceso' },
      { status: 500 }
    );
  }
}
