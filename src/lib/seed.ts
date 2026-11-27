import { prisma } from '@/lib/prisma';

let isSeedVerified = false;

/**
 * Inicializa únicamente el Administrador Principal (Santiago Yepes)
 * si la base de datos está completamente vacía (0 usuarios).
 * Usa caché en memoria para no ejecutar COUNT(*) en cada petición HTTP.
 */
export async function ensureSeededDatabase(): Promise<void> {
  if (isSeedVerified) return;

  const userCount = await prisma.user.count();

  if (userCount > 0) {
    isSeedVerified = true;
    return;
  }

  await prisma.user.create({
    data: {
      documentId: '1000000001',
      fullName: 'Santiago Yepes',
      email: 'admin@epbelleza.edu.co',
      phone: '3000000000',
      role: 'ADMIN',
      accessCode: 'ADMIN-01',
      sellerSecretCode: 'SEC-ADMIN',
      fingerprintTemplate: 'FP_ADMIN_01',
      hourlyRateCop: 0,
      commissionRatePct: 0,
      isActive: true,
    },
  });

  isSeedVerified = true;
}
