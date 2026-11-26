import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { recordAuditLog } from '@/lib/audit';
import { ensureSeededDatabase } from '@/lib/seed';

const emergencyOverrideSchema = z.object({
  masterRecoveryKey: z.string().min(6),
  targetRole: z.enum(['ADMIN', 'ASESOR', 'VENTA', 'CONTABILIDAD']),
  reason: z.string().min(5),
  evidencePhotoBase64: z.string().optional(),
});

/**
 * Llave Maestra Institucional de Emergencia EPB
 * Esta clave se conserva en sobre sellado en Dirección General / Rectoría.
 * Solo se utiliza si el lector biométrico USB se daña físicamente o hay fallo de hardware.
 */
const EPB_MASTER_CONTINGENCY_KEY = process.env.EPB_MASTER_KEY || 'EPB-EMERGENCY-2026-SOS';

// Memoria de intentos fallidos para enfriamiento temporal (Cooldown / Anti-Fuerza Bruta)
let failedAttemptsCount = 0;
let lockUntilTimestamp: number | null = null;

export async function POST(request: Request) {
  try {
    await ensureSeededDatabase();

    const now = Date.now();

    // 1. Verificar si el formulario de contingencia está temporalmente bloqueado por intentos reiterados
    if (lockUntilTimestamp && now < lockUntilTimestamp) {
      const remainingSeconds = Math.ceil((lockUntilTimestamp - now) / 1000);
      return NextResponse.json(
        {
          message: `BLOQUEO TEMPORAL DE SEGURIDAD: Se detectaron múltiples intentos erróneos. El formulario está bloqueado por ${remainingSeconds} segundo(s) para prevenir ataques de fuerza bruta.`,
          locked: true,
          remainingSeconds,
        },
        { status: 429 }
      );
    }

    const body: unknown = await request.json();
    const parsed = emergencyOverrideSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: 'Datos de contingencia incompletos o inválidos' },
        { status: 400 }
      );
    }

    const { masterRecoveryKey, targetRole, reason, evidencePhotoBase64 } = parsed.data;

    // Validación estricta de la Llave Maestra
    if (masterRecoveryKey.trim() !== EPB_MASTER_CONTINGENCY_KEY) {
      failedAttemptsCount += 1;

      // Si acumula 3 intentos fallidos seguidos, se activa un bloqueo temporal de 5 minutos (300 segundos)
      let lockNotice = '';
      if (failedAttemptsCount >= 3) {
        lockUntilTimestamp = now + 5 * 60 * 1000;
        failedAttemptsCount = 0;
        lockNotice = 'Se ha activado un bloqueo de seguridad de 5 minutos por 3 intentos fallidos consecutivos.';
      } else {
        lockNotice = `Intento ${failedAttemptsCount} de 3 antes de bloqueo temporal de 5 minutos.`;
      }

      // Registrar intento fallido de vulneración de contingencia con EVIDENCIA FOTOGRÁFICA
      await recordAuditLog({
        userId: 'SYSTEM',
        action: 'LOGIN_FAILED',
        entity: 'User',
        entityId: 'EMERGENCY_OVERRIDE_ATTEMPT',
        newData: {
          alert: 'ALERTA DE SEGURIDAD: Intento de adivinación de la llave maestra institucional.',
          targetRole,
          attemptedAt: new Date().toISOString(),
          hasPhotoEvidence: Boolean(evidencePhotoBase64),
          photoSnapshot: evidencePhotoBase64 || null,
          lockNotice,
        },
      });

      return NextResponse.json(
        {
          message: `LLAVE MAESTRA INCORRECTA: La clave ingresada no es válida. Fotografía archivada en la Auditoría Forense. ${lockNotice}`,
          locked: Boolean(lockUntilTimestamp && lockUntilTimestamp > now),
        },
        { status: 401 }
      );
    }

    // Si ingresó la clave correcta, reseteamos el contador de fallos
    failedAttemptsCount = 0;
    lockUntilTimestamp = null;

    // Buscar el usuario representativo del rol solicitado
    const user = await prisma.user.findFirst({
      where: {
        role: targetRole,
        isActive: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    if (!user) {
      return NextResponse.json(
        { message: `No hay un usuario activo registrado con el rol ${targetRole}` },
        { status: 404 }
      );
    }

    // Registrar Alerta Máxima en Auditoría Forense
    await recordAuditLog({
      userId: user.id,
      action: 'HARDWARE_EMERGENCY_OVERRIDE_ACTIVATED',
      entity: 'User',
      entityId: user.id,
      newData: {
        activatedForUser: user.fullName,
        role: user.role,
        reason,
        notice:
          'ALERTA: Se ha desbloqueado la plataforma mediante el Protocolo de Contingencia por Falla de Hardware Biométrico.',
        timestamp: new Date().toISOString(),
      },
    });

    return NextResponse.json({
      success: true,
      message: `Protocolo de contingencia aceptado. Sesión temporal habilitada para ${user.fullName} (${user.role}).`,
      user: {
        id: user.id,
        documentId: user.documentId,
        fullName: `${user.fullName} (MODO CONTINGENCIA)`,
        email: user.email,
        role: user.role,
        accessCode: user.accessCode,
        sellerSecretCode: user.sellerSecretCode,
        isTemporaryGuest: user.isTemporaryGuest,
        accessExpiresAt: user.accessExpiresAt ? user.accessExpiresAt.toISOString() : null,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Error al procesar contingencia' },
      { status: 500 }
    );
  }
}
