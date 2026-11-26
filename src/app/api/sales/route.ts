import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { recordAuditLog } from '@/lib/audit';
import { ensureSeededDatabase } from '@/lib/seed';
import { getMonthKey } from '@/lib/utils';
import { evaluateClientProtectionState } from '@/app/api/presales/route';
import { SaleRecordItem } from '@/interfaces/sale.interface';

const createSaleSchema = z.object({
  closingSellerSecretCode: z.string().min(3),
  clientDocument: z.string().optional(),
  clientName: z.string().min(2),
  paymentMethod: z.enum(['EFECTIVO', 'TRANSFERENCIA', 'TARJETA', 'MIXTO']),
  discountCop: z.number().int().nonnegative().default(0),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.number().int().positive(),
      })
    )
    .min(1),
});

export async function GET() {
  try {
    await ensureSeededDatabase();
    const sales = await prisma.sale.findMany({
      include: {
        closingSeller: true,
        commissionedSeller: true,
        items: {
          include: {
            product: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const mapped: SaleRecordItem[] = sales.map((s) => ({
      id: s.id,
      invoiceNumber: s.invoiceNumber,
      clientName: s.clientName,
      clientDocument: s.clientDocument,
      closingSellerName: s.closingSeller.fullName,
      commissionedSellerName: s.commissionedSeller.fullName,
      protectionRuleApplied: s.protectionRuleApplied,
      subtotalCop: s.subtotalCop,
      discountCop: s.discountCop,
      totalCop: s.totalCop,
      commissionAmountCop: s.commissionAmountCop,
      paymentMethod: s.paymentMethod,
      status: s.status,
      createdAt: s.createdAt.toISOString(),
      items: s.items.map((it) => ({
        id: it.id,
        productId: it.productId,
        productName: it.product.name,
        productBarcode: it.product.barcode,
        quantity: it.quantity,
        unitPriceCop: it.unitPriceCop,
        subtotalCop: it.subtotalCop,
      })),
    }));

    return NextResponse.json(mapped);
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Error cargando ventas' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const parsed = createSaleSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: 'Datos de venta inválidos o carrito vacío' },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const closingSeller = await prisma.user.findFirst({
      where: {
        sellerSecretCode: data.closingSellerSecretCode.trim().toUpperCase(),
        isActive: true,
      },
    });

    if (!closingSeller) {
      return NextResponse.json(
        { message: 'Código secreto de vendedor inválido para cerrar venta.' },
        { status: 401 }
      );
    }

    const now = new Date();
    let commissionedSeller = closingSeller;
    let protectionRuleApplied =
      'Venta directa sin preventa activa -> Comisión asignada al vendedor que factura.';
    let presaleId: string | null = null;

    if (data.clientDocument && data.clientDocument.trim().length > 0) {
      const presale = await prisma.clientPresale.findUnique({
        where: { clientDocument: data.clientDocument.trim() },
        include: { initialSeller: true, secondSeller: true },
      });

      if (presale) {
        presaleId = presale.id;
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
          commissionedSeller = presale.initialSeller;
          protectionRuleApplied =
            closingSeller.id !== presale.initialSellerId
              ? `REGLA 3 DÍAS APLICADA: Cerrada por ${closingSeller.fullName}, pero protegida y comisionada automáticamente a ${presale.initialSeller.fullName} (Vendedor A).`
              : `Cierre dentro de primeros 3 días por el mismo Vendedor A (${presale.initialSeller.fullName}).`;
        } else if (
          evaluation.computedStatus === 'SEGUNDA_OPORTUNIDAD_24H' &&
          presale.secondSeller
        ) {
          commissionedSeller = presale.secondSeller;
          protectionRuleApplied = `REGLA 4to DÍA (2da Atención 24h): Comisión asignada a ${presale.secondSeller.fullName}.`;
        } else {
          commissionedSeller = closingSeller;
          protectionRuleApplied = `REGLA CLIENTE LIBERADO (${evaluation.statusLabel}): Comisión asignada a quien cerró la venta (${closingSeller.fullName}).`;
        }
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      let subtotalCop = 0;
      const itemsToCreate: {
        productId: string;
        quantity: number;
        unitPriceCop: number;
        subtotalCop: number;
      }[] = [];

      for (const item of data.items) {
        const product = await tx.product.findUniqueOrThrow({
          where: { id: item.productId },
        });

        if (product.stock < item.quantity) {
          throw new Error(
            `Stock insuficiente para ${product.name} (Disponible: ${product.stock})`
          );
        }

        const lineSubtotal = product.priceCop * item.quantity;
        subtotalCop += lineSubtotal;

        itemsToCreate.push({
          productId: product.id,
          quantity: item.quantity,
          unitPriceCop: product.priceCop,
          subtotalCop: lineSubtotal,
        });

        await tx.product.update({
          where: { id: product.id },
          data: { stock: product.stock - item.quantity },
        });
      }

      const totalCop = Math.max(0, subtotalCop - data.discountCop);
      const commissionAmountCop = Math.round(
        (totalCop * commissionedSeller.commissionRatePct) / 100
      );

      const invoiceNumber = `EPB-${Date.now().toString().slice(-6)}`;

      const sale = await tx.sale.create({
        data: {
          invoiceNumber,
          presaleId,
          clientName: data.clientName,
          clientDocument: data.clientDocument || null,
          closingSellerId: closingSeller.id,
          commissionedSellerId: commissionedSeller.id,
          protectionRuleApplied,
          subtotalCop,
          discountCop: data.discountCop,
          totalCop,
          commissionAmountCop,
          paymentMethod: data.paymentMethod,
          status: 'COMPLETADA',
          items: {
            create: itemsToCreate,
          },
        },
      });

      await tx.commission.create({
        data: {
          saleId: sale.id,
          sellerId: commissionedSeller.id,
          monthKey: getMonthKey(now),
          saleTotalCop: totalCop,
          percentage: commissionedSeller.commissionRatePct,
          amountCop: commissionAmountCop,
          ruleApplied: protectionRuleApplied,
        },
      });

      if (presaleId) {
        await tx.clientPresale.update({
          where: { id: presaleId },
          data: { status: 'VENTA_CERRADA' },
        });
      }

      await recordAuditLog(
        {
          userId: closingSeller.id,
          action: 'CREATE',
          entity: 'Sale',
          entityId: sale.id,
          newData: {
            invoiceNumber: sale.invoiceNumber,
            totalCop: sale.totalCop,
            subtotalCop: sale.subtotalCop,
            discountCop: sale.discountCop,
            paymentMethod: sale.paymentMethod,
            closingSeller: closingSeller.fullName,
            commissionedSeller: commissionedSeller.fullName,
            commissionAmountCop,
            protectionRuleApplied,
          },
        },
        tx
      );

      // Si se aplicó descuento manual en caja, registrar evento de auditoría específico
      if (sale.discountCop > 0) {
        await recordAuditLog(
          {
            userId: closingSeller.id,
            action: 'DISCOUNT_APPLIED',
            entity: 'Sale',
            entityId: sale.id,
            newData: {
              invoiceNumber: sale.invoiceNumber,
              discountCop: sale.discountCop,
              subtotalCop: sale.subtotalCop,
              totalCop: sale.totalCop,
              appliedBy: closingSeller.fullName,
              reason: 'Descuento manual aplicado al momento de facturar en POS',
            },
          },
          tx
        );
      }

      return sale;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Error procesando venta' },
      { status: 500 }
    );
  }
}
