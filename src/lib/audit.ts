import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { RecordAuditParams } from '@/interfaces/audit.interface';

/**
 * Registra de forma inmutable un movimiento en la tabla AuditLog.
 * Valida que el userId exista en la base de datos actual (en caso de sesiones
 * guardadas en localStorage previas a un re-seed) para evitar errores de llave foránea.
 */
export async function recordAuditLog(
  params: RecordAuditParams,
  tx?: Prisma.TransactionClient
): Promise<void> {
  const client = tx ?? prisma;

  let validUserId = params.userId;

  const existingUser = validUserId
    ? await client.user.findUnique({
        where: { id: validUserId },
        select: { id: true },
      })
    : null;

  if (!existingUser) {
    const fallbackAdmin = await client.user.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });

    if (!fallbackAdmin) {
      return;
    }
    validUserId = fallbackAdmin.id;
  }

  const previousJson: Prisma.InputJsonValue | typeof Prisma.JsonNull =
    params.previousData
      ? (params.previousData as Prisma.InputJsonObject)
      : Prisma.JsonNull;

  const newJson: Prisma.InputJsonValue | typeof Prisma.JsonNull =
    params.newData ? (params.newData as Prisma.InputJsonObject) : Prisma.JsonNull;

  await client.auditLog.create({
    data: {
      userId: validUserId,
      action: params.action,
      entity: params.entity,
      entityId: params.entityId,
      previousData: previousJson,
      newData: newJson,
      ipAddress: params.ipAddress ?? null,
      userAgent: params.userAgent ?? null,
    },
  });
}
