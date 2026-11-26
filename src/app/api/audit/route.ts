import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureSeededDatabase } from '@/lib/seed';

export async function GET() {
  try {
    await ensureSeededDatabase();
    const logs = await prisma.auditLog.findMany({
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return NextResponse.json(logs);
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Error cargando auditoría' },
      { status: 500 }
    );
  }
}
