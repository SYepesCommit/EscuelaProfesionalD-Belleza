import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { recordAuditLog } from '@/lib/audit';
import { ensureSeededDatabase } from '@/lib/seed';

const loginSchema = z.object({
  accessCode: z.string().optional(),
  fingerprintTemplate: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    await ensureSeededDatabase();
    const { searchParams } = new URL(request.url);
    const accessCode = searchParams.get('accessCode');

    if (accessCode) {
      const user = await prisma.user.findFirst({
        where: { accessCode: accessCode.toUpperCase(), isActive: true },
      });

      if (user) {
        return NextResponse.json({
          authenticated: true,
          user: {
            id: user.id,
            documentId: user.documentId,
            fullName: user.fullName,
            email: user.email,
            role: user.role,
            accessCode: user.accessCode,
            sellerSecretCode: user.sellerSecretCode,
            isTemporaryGuest: user.isTemporaryGuest,
            accessExpiresAt: user.accessExpiresAt
              ? user.accessExpiresAt.toISOString()
              : null,
          },
        });
      }
    }

    return NextResponse.json({ authenticated: false, user: null });
  } catch (error) {
    return NextResponse.json(
      {
        authenticated: false,
        user: null,
        message: error instanceof Error ? error.message : 'Error de conexión a BD',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await ensureSeededDatabase();
    const body: unknown = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { authenticated: false, user: null, message: 'Datos de acceso inválidos' },
        { status: 400 }
      );
    }

    const { accessCode, fingerprintTemplate } = parsed.data;

    const user = await prisma.user.findFirst({
      where: {
        isActive: true,
        ...(accessCode
          ? { accessCode: accessCode.trim().toUpperCase() }
          : { fingerprintTemplate: fingerprintTemplate ?? '' }),
      },
    });

    if (!user) {
      return NextResponse.json(
        {
          authenticated: false,
          user: null,
          message: 'Huella o código personal no encontrado o usuario desactivado.',
        },
        { status: 401 }
      );
    }

    // Validación estricta de fecha de expiración para Invitado / Contabilidad
    if (
      user.accessExpiresAt &&
      new Date().getTime() > user.accessExpiresAt.getTime()
    ) {
      await recordAuditLog({
        userId: user.id,
        action: 'LOGIN_FAILED',
        entity: 'User',
        entityId: user.id,
        newData: {
          reason: 'Acceso temporal de Contabilidad/Invitado expirado',
          expiredAt: user.accessExpiresAt.toISOString(),
        },
      });

      return NextResponse.json(
        {
          authenticated: false,
          user: null,
          message: `ACCESO EXPIRADO: El pase temporal para ${user.fullName} venció el ${user.accessExpiresAt.toLocaleString('es-CO')}. Solicite renovación al Administrador.`,
        },
        { status: 403 }
      );
    }

    await recordAuditLog({
      userId: user.id,
      action: 'LOGIN_SUCCESS',
      entity: 'User',
      entityId: user.id,
      newData: {
        method: fingerprintTemplate ? 'BIOMETRIA_USB' : 'CODIGO_PERSONAL',
        role: user.role,
        isTemporaryGuest: user.isTemporaryGuest,
      },
    });

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        documentId: user.documentId,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        accessCode: user.accessCode,
        sellerSecretCode: user.sellerSecretCode,
        isTemporaryGuest: user.isTemporaryGuest,
        accessExpiresAt: user.accessExpiresAt
          ? user.accessExpiresAt.toISOString()
          : null,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        authenticated: false,
        user: null,
        message: error instanceof Error ? error.message : 'Error interno de autenticación',
      },
      { status: 500 }
    );
  }
}
