import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { recordAuditLog } from '@/lib/audit';
import { ensureSeededDatabase } from '@/lib/seed';
import {
  ClientPresaleItem,
  ClientProtectionStatusType,
} from '@/interfaces/sale.interface';

const registerPresaleSchema = z.object({
  sellerSecretCode: z.string().min(3),
  clientDocument: z.string().min(5),
  clientName: z.string().min(3),
  clientPhone: z.string().min(7),
  clientEmail: z.string().optional(),
  interestedCourseOrItem: z.string().min(3),
  notes: z.string().optional(),
});

/**
 * Motor puro de evaluación de la Regla de Protección de Clientes EPB:
 * 1) Primeros 3 días (0 a 72h desde atención inicial): PROTEGIDO_3_DIAS -> Comisión es del Vendedor Inicial (A).
 * 2) Al 4to día (>= 72h sin cierre) y sin segunda atención: LIBERADO_DIA_4 -> Cliente sin atención previa.
 * 3) Segunda oportunidad (0 a 24h desde segunda atención): SEGUNDA_OPORTUNIDAD_24H -> Comisión es del Segundo Vendedor.
 * 4) Pasadas 24h de la segunda atención sin cierre: LIBRE_DEFINITIVO -> Cualquier vendedor que cierre gana la comisión.
 */
export function evaluateClientProtectionState(presale: {
  status: ClientProtectionStatusType;
  initialSellerId: string;
  initialSellerName: string;
  initialAttentionAt: Date;
  protectedUntilDay3: Date;
  secondSellerId: string | null;
  secondSellerName: string | null;
  secondAttentionAt: Date | null;
  secondWindowUntil24h: Date | null;
}, now: Date = new Date()): {
  computedStatus: ClientProtectionStatusType;
  statusLabel: string;
  effectiveSellerId: string;
  effectiveSellerName: string;
  explanation: string;
} {
  if (presale.status === 'VENTA_CERRADA') {
    return {
      computedStatus: 'VENTA_CERRADA',
      statusLabel: 'Venta Cerrada',
      effectiveSellerId: presale.secondSellerId ?? presale.initialSellerId,
      effectiveSellerName: presale.secondSellerName ?? presale.initialSellerName,
      explanation: 'El cliente ya concretó su compra.',
    };
  }

  // Caso 1: Dentro de los primeros 3 días de protección inicial
  if (now.getTime() <= presale.protectedUntilDay3.getTime()) {
    return {
      computedStatus: 'PROTEGIDO_3_DIAS',
      statusLabel: 'Protegido (Primeros 3 Días)',
      effectiveSellerId: presale.initialSellerId,
      effectiveSellerName: presale.initialSellerName,
      explanation: `Blindado a favor de ${presale.initialSellerName}. Si otro vendedor factura dentro de estos 3 días, la venta y comisión se asignan automáticamente a ${presale.initialSellerName}.`,
    };
  }

  // Caso 2: Ya pasaron los 3 días. Verificamos si tuvo segunda atención
  if (!presale.secondSellerId || !presale.secondWindowUntil24h) {
    return {
      computedStatus: 'LIBERADO_DIA_4',
      statusLabel: 'Día 4 • Liberado (Sin atención previa)',
      effectiveSellerId: '',
      effectiveSellerName: 'Disponible para siguiente vendedor',
      explanation:
        'Cumplió el 4to día sin cierre. El siguiente vendedor que lo atienda con su código secreto toma la segunda oportunidad (24h).',
    };
  }

  // Caso 3: Tiene segunda atención y está dentro de las 24 horas
  if (now.getTime() <= presale.secondWindowUntil24h.getTime()) {
    return {
      computedStatus: 'SEGUNDA_OPORTUNIDAD_24H',
      statusLabel: '2da Oportunidad Activa (Ventana 24h)',
      effectiveSellerId: presale.secondSellerId,
      effectiveSellerName: presale.secondSellerName ?? 'Segundo Vendedor',
      explanation: `Asignado en 2da atención a ${presale.secondSellerName} por 24 horas.`,
    };
  }

  // Caso 4: Pasaron las 24 horas de la segunda atención sin cierre -> Libre definitivo
  return {
    computedStatus: 'LIBRE_DEFINITIVO',
    statusLabel: 'Libre Definitivo (Cualquier Vendedor)',
    effectiveSellerId: '',
    effectiveSellerName: 'Libre para quien facture',
    explanation:
      'Venció la ventana de 24h de la segunda atención sin cierre. Cualquier vendedor que cierre la venta recibe la comisión.',
  };
}

export async function GET() {
  try {
    await ensureSeededDatabase();
    const presales = await prisma.clientPresale.findMany({
      include: {
        initialSeller: true,
        secondSeller: true,
      },
      orderBy: { updatedAt: 'desc' },
    });

    const now = new Date();
    const mapped: ClientPresaleItem[] = presales.map((p) => {
      const evaluation = evaluateClientProtectionState(
        {
          status: p.status,
          initialSellerId: p.initialSellerId,
          initialSellerName: p.initialSeller.fullName,
          initialAttentionAt: p.initialAttentionAt,
          protectedUntilDay3: p.protectedUntilDay3,
          secondSellerId: p.secondSellerId,
          secondSellerName: p.secondSeller?.fullName ?? null,
          secondAttentionAt: p.secondAttentionAt,
          secondWindowUntil24h: p.secondWindowUntil24h,
        },
        now
      );

      return {
        id: p.id,
        clientDocument: p.clientDocument,
        clientName: p.clientName,
        clientPhone: p.clientPhone,
        clientEmail: p.clientEmail,
        interestedCourseOrItem: p.interestedCourseOrItem,
        status: evaluation.computedStatus,
        statusLabel: evaluation.statusLabel,
        initialSellerId: p.initialSellerId,
        initialSellerName: p.initialSeller.fullName,
        initialAttentionAt: p.initialAttentionAt.toISOString(),
        protectedUntilDay3: p.protectedUntilDay3.toISOString(),
        secondSellerId: p.secondSellerId,
        secondSellerName: p.secondSeller?.fullName ?? null,
        secondAttentionAt: p.secondAttentionAt
          ? p.secondAttentionAt.toISOString()
          : null,
        secondWindowUntil24h: p.secondWindowUntil24h
          ? p.secondWindowUntil24h.toISOString()
          : null,
        effectiveCommissionSellerId: evaluation.effectiveSellerId,
        effectiveCommissionSellerName: evaluation.effectiveSellerName,
        protectionRuleExplanation: evaluation.explanation,
        notes: p.notes,
        remainingMs:
          evaluation.computedStatus === 'PROTEGIDO_3_DIAS'
            ? Math.max(0, p.protectedUntilDay3.getTime() - now.getTime())
            : evaluation.computedStatus === 'SEGUNDA_OPORTUNIDAD_24H' && p.secondWindowUntil24h
            ? Math.max(0, p.secondWindowUntil24h.getTime() - now.getTime())
            : 0,
      };
    });

    return NextResponse.json(mapped);
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Error cargando preventas' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const parsed = registerPresaleSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: 'Revise los campos de la preventa y su código secreto' },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const seller = await prisma.user.findFirst({
      where: {
        sellerSecretCode: data.sellerSecretCode.trim().toUpperCase(),
        isActive: true,
      },
    });

    if (!seller) {
      return NextResponse.json(
        { message: 'Código secreto de vendedor inválido o no autorizado.' },
        { status: 401 }
      );
    }

    const now = new Date();
    const existing = await prisma.clientPresale.findUnique({
      where: { clientDocument: data.clientDocument.trim() },
      include: { initialSeller: true, secondSeller: true },
    });

    // Si no existe el cliente, se registra con Protección Inicial de 3 días (Vendedor A)
    if (!existing) {
      const protectedUntilDay3 = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

      const created = await prisma.$transaction(async (tx) => {
        const presale = await tx.clientPresale.create({
          data: {
            clientDocument: data.clientDocument.trim(),
            clientName: data.clientName,
            clientPhone: data.clientPhone,
            clientEmail: data.clientEmail || null,
            interestedCourseOrItem: data.interestedCourseOrItem,
            status: 'PROTEGIDO_3_DIAS',
            initialSellerId: seller.id,
            initialAttentionAt: now,
            protectedUntilDay3,
            notes: data.notes,
          },
        });

        await recordAuditLog(
          {
            userId: seller.id,
            action: 'CREATE',
            entity: 'ClientPresale',
            entityId: presale.id,
            newData: {
              clientDocument: presale.clientDocument,
              clientName: presale.clientName,
              status: 'PROTEGIDO_3_DIAS',
              protectedUntilDay3: protectedUntilDay3.toISOString(),
            },
          },
          tx
        );

        return presale;
      });

      return NextResponse.json(created, { status: 201 });
    }

    // Si ya existe, evaluamos su ventana de tiempo actual
    const evaluation = evaluateClientProtectionState(
      {
        status: existing.status,
        initialSellerId: existing.initialSellerId,
        initialSellerName: existing.initialSeller.fullName,
        initialAttentionAt: existing.initialAttentionAt,
        protectedUntilDay3: existing.protectedUntilDay3,
        secondSellerId: existing.secondSellerId,
        secondSellerName: existing.secondSeller?.fullName ?? null,
        secondAttentionAt: existing.secondAttentionAt,
        secondWindowUntil24h: existing.secondWindowUntil24h,
      },
      now
    );

    if (evaluation.computedStatus === 'PROTEGIDO_3_DIAS') {
      return NextResponse.json(
        {
          message: `CLIENTE PROTEGIDO (Primeros 3 días): Este cliente fue atendido por ${existing.initialSeller.fullName}. Si cierras la venta hoy en POS, la comisión se asignará automáticamente a ${existing.initialSeller.fullName}.`,
        },
        { status: 409 }
      );
    }

    // Si está en Día 4 (Liberado), el vendedor actual toma la Segunda Atención por 24 horas
    if (evaluation.computedStatus === 'LIBERADO_DIA_4') {
      const secondWindowUntil24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const updated = await prisma.$transaction(async (tx) => {
        const p = await tx.clientPresale.update({
          where: { id: existing.id },
          data: {
            status: 'SEGUNDA_OPORTUNIDAD_24H',
            secondSellerId: seller.id,
            secondAttentionAt: now,
            secondWindowUntil24h,
            interestedCourseOrItem: data.interestedCourseOrItem,
          },
        });

        await recordAuditLog(
          {
            userId: seller.id,
            action: 'PRESALE_SELLER_TRANSFERRED',
            entity: 'ClientPresale',
            entityId: p.id,
            previousData: {
              clientName: p.clientName,
              clientDocument: p.clientDocument,
              initialSellerName: existing.initialSeller.fullName,
              status: 'LIBERADO_DIA_4',
            },
            newData: {
              clientName: p.clientName,
              clientDocument: p.clientDocument,
              secondSellerName: seller.fullName,
              status: 'SEGUNDA_OPORTUNIDAD_24H',
              secondWindowUntil24h: secondWindowUntil24h.toISOString(),
              reason: `Atención en 4to día: el cliente fue tomado por ${seller.fullName} activando ventana de 24h`,
            },
          },
          tx
        );

        return p;
      });

      return NextResponse.json(updated);
    }

    return NextResponse.json(
      {
        message: `El cliente se encuentra en estado: ${evaluation.statusLabel}. Puede facturar directamente en Caja POS.`,
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Error registrando preventa' },
      { status: 500 }
    );
  }
}

const patchPresaleSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('CLAIM_OPPORTUNITY'),
    presaleId: z.string(),
    sellerSecretCode: z.string().min(3),
    note: z.string().optional(),
  }),
  z.object({
    action: z.literal('UPDATE_NOTES'),
    presaleId: z.string(),
    notes: z.string(),
  }),
]);

export async function PATCH(request: Request) {
  try {
    const body: unknown = await request.json();
    const parsed = patchPresaleSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: 'Datos inválidos para la operación sobre preventa.' },
        { status: 400 }
      );
    }

    const payload = parsed.data;

    // Caso 1: Tomar oportunidad de cliente liberado
    if (payload.action === 'CLAIM_OPPORTUNITY') {
      const seller = await prisma.user.findFirst({
        where: {
          sellerSecretCode: payload.sellerSecretCode.trim().toUpperCase(),
          isActive: true,
        },
      });

      if (!seller) {
        return NextResponse.json(
          { message: 'Código secreto de vendedor no encontrado o inactivo.' },
          { status: 401 }
        );
      }

      const presale = await prisma.clientPresale.findUnique({
        where: { id: payload.presaleId },
        include: { initialSeller: true, secondSeller: true },
      });

      if (!presale) {
        return NextResponse.json(
          { message: 'Prospecto de preventa no encontrado.' },
          { status: 404 }
        );
      }

      const now = new Date();
      const evaluation = evaluateClientProtectionState(
        {
          status: presale.status,
          initialSellerId: presale.initialSellerId,
          initialSellerName: presale.initialSeller.fullName,
          initialAttentionAt: presale.initialAttentionAt,
          protectedUntilDay3: presale.protectedUntilDay3,
          secondSellerId: presale.secondSellerId,
          secondSellerName: presale.secondSeller?.fullName ?? null,
          secondAttentionAt: presale.secondAttentionAt,
          secondWindowUntil24h: presale.secondWindowUntil24h,
        },
        now
      );

      if (evaluation.computedStatus === 'PROTEGIDO_3_DIAS') {
        return NextResponse.json(
          {
            message: `Acción bloqueada: El cliente aún se encuentra en sus primeros 3 días blindado a nombre de ${presale.initialSeller.fullName}.`,
          },
          { status: 409 }
        );
      }

      // Activar ventana de 24 horas para el nuevo vendedor
      const secondWindowUntil24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const updatedNotes = payload.note
        ? `${presale.notes ? presale.notes + '\n' : ''}[${now.toLocaleDateString('es-CO')} ${now.toLocaleTimeString('es-CO')}] Tomado por ${seller.fullName}: ${payload.note}`
        : presale.notes;

      const updated = await prisma.$transaction(async (tx) => {
        const res = await tx.clientPresale.update({
          where: { id: presale.id },
          data: {
            status: 'SEGUNDA_OPORTUNIDAD_24H',
            secondSellerId: seller.id,
            secondAttentionAt: now,
            secondWindowUntil24h,
            notes: updatedNotes,
          },
        });

        await recordAuditLog(
          {
            userId: seller.id,
            action: 'PRESALE_SELLER_TRANSFERRED',
            entity: 'ClientPresale',
            entityId: res.id,
            previousData: {
              clientName: res.clientName,
              clientDocument: res.clientDocument,
              initialSellerName: presale.initialSeller.fullName,
              status: evaluation.computedStatus,
            },
            newData: {
              clientName: res.clientName,
              clientDocument: res.clientDocument,
              secondSellerName: seller.fullName,
              status: 'SEGUNDA_OPORTUNIDAD_24H',
              secondWindowUntil24h: secondWindowUntil24h.toISOString(),
              reason: `Oportunidad tomada manualmente por ${seller.fullName} activando ventana de 24h.`,
            },
          },
          tx
        );

        return res;
      });

      return NextResponse.json(updated);
    }

    // Caso 2: Actualizar notas de seguimiento comercial
    if (payload.action === 'UPDATE_NOTES') {
      const presale = await prisma.clientPresale.findUnique({
        where: { id: payload.presaleId },
      });

      if (!presale) {
        return NextResponse.json(
          { message: 'Prospecto de preventa no encontrado.' },
          { status: 404 }
        );
      }

      const updated = await prisma.clientPresale.update({
        where: { id: payload.presaleId },
        data: {
          notes: payload.notes,
        },
      });

      return NextResponse.json(updated);
    }

    return NextResponse.json({ message: 'Acción no soportada.' }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Error actualizando preventa' },
      { status: 500 }
    );
  }
}
