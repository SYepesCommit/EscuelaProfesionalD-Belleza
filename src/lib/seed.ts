import { prisma } from '@/lib/prisma';

/**
 * Inicializa únicamente el Administrador Principal (Santiago Yepes)
 * si la base de datos está completamente vacía (0 usuarios).
 * No puebla datos ficticios ni de prueba; todos los demás usuarios,
 * salones, alumnas y productos se crean desde los módulos del sistema.
 */
export async function ensureSeededDatabase(): Promise<void> {
  const userCount = await prisma.user.count();

  if (userCount > 0) return;

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
}
