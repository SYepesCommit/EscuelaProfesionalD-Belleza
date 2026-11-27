import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { ensureSeededDatabase } from '@/lib/seed';

const biometricVerifySchema = z.object({
  template: z.string().min(3),
  requiredRoles: z.array(z.enum(['ADMIN', 'ASESOR', 'VENTA', 'CONTABILIDAD'])).optional(),
});

export async function POST(request: Request) {
  try {
    await ensureSeededDatabase();
    const body: unknown = await request.json();
    const parsed = biometricVerifySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: 'Parámetros de huella dactilar inválidos' },
        { status: 400 }
      );
    }

    const { template, requiredRoles } = parsed.data;

    const cleanInput = template.trim();

    // Buscar usuario por plantilla de huella USB o por credencial de terminal sin huellero
    const user = await prisma.user.findFirst({
      where: {
        isActive: true,
        OR: [
          { fingerprintTemplate: cleanInput },
          { accessCode: cleanInput.toUpperCase() },
          { sellerSecretCode: cleanInput.toUpperCase() },
        ],
      },
    });

    if (!user) {
      return NextResponse.json(
        {
          message:
            'Huella no reconocida: el patrón dactilar no coincide con ningún funcionario activo del sistema.',
        },
        { status: 404 }
      );
    }

    // Verificar si se exigen roles específicos (ej: Solo ADMIN para autorizar descuentos > 10%)
    if (requiredRoles && requiredRoles.length > 0 && !requiredRoles.includes(user.role as any)) {
      return NextResponse.json(
        {
          message: `Nivel de seguridad insuficiente: La huella de ${user.fullName} (${user.role}) no tiene los permisos requeridos (${requiredRoles.join(
            ', '
          )}).`,
        },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        userId: user.id,
        fullName: user.fullName,
        role: user.role,
        fingerprintTemplate: user.fingerprintTemplate,
        sellerSecretCode: user.sellerSecretCode,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Error al verificar huella' },
      { status: 500 }
    );
  }
}
