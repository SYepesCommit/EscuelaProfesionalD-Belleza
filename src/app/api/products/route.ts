import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { recordAuditLog } from '@/lib/audit';
import { ensureSeededDatabase } from '@/lib/seed';
import { ProductItem } from '@/interfaces/inventory.interface';

const createProductSchema = z.object({
  barcode: z.string().min(3, 'Código de barras demasiado corto'),
  sku: z.string().min(2, 'SKU demasiado corto'),
  name: z.string().min(3, 'Nombre demasiado corto'),
  category: z.string().min(2, 'Categoría requerida'),
  priceCop: z.number().int().positive('El precio debe ser mayor a 0'),
  costCop: z.number().int().nonnegative(),
  stock: z.number().int().nonnegative(),
  minStock: z.number().int().positive().default(50), // Capacidad base (100%)
  alertPercent: z.number().int().min(5).max(90).default(30), // % Límite de aviso configurable
  operatorUserId: z.string().min(1),
});

const updateProductSchema = createProductSchema.extend({
  id: z.string().min(1),
});

const adjustStockSchema = z.object({
  mode: z.literal('ADJUST_STOCK').optional().default('ADJUST_STOCK'),
  productId: z.string().min(1),
  newStock: z.number().int().nonnegative(),
  operatorUserId: z.string().min(1),
  reason: z.string().min(3),
});

const updateGlobalAlertSchema = z.object({
  mode: z.literal('SET_GLOBAL_ALERT_PERCENT'),
  alertPercent: z.number().int().min(5).max(90),
  operatorUserId: z.string().min(1),
});

function mapProductWithConfigurableRule(p: {
  id: string;
  barcode: string;
  sku: string;
  name: string;
  category: string;
  priceCop: number;
  costCop: number;
  stock: number;
  baseStock: number;
  alertPercent: number;
  minStock: number;
  isActive: boolean;
}): ProductItem {
  const rawBase = Math.max(
    p.baseStock || 0,
    p.minStock <= 20 ? 40 : p.minStock,
    p.stock,
    10
  );
  const configuredPercent = Math.min(90, Math.max(5, p.alertPercent || 30));
  const alertThresholdUnits = Math.max(
    1,
    Math.ceil((rawBase * configuredPercent) / 100)
  );
  const rawPercent = Math.round((p.stock / rawBase) * 100);
  const stockPercent = Math.max(0, Math.min(100, rawPercent));
  const isLowStock = p.stock === 0 || stockPercent <= configuredPercent;

  return {
    id: p.id,
    barcode: p.barcode,
    sku: p.sku,
    name: p.name,
    category: p.category,
    priceCop: p.priceCop,
    costCop: p.costCop,
    stock: p.stock,
    minStock: rawBase,
    alertPercent: configuredPercent,
    alertThresholdUnits,
    stockPercent,
    isLowStock,
    isActive: p.isActive,
  };
}

export async function GET() {
  try {
    await ensureSeededDatabase();
    const products = await prisma.product.findMany({
      where: { isActive: true },
      orderBy: [{ stock: 'asc' }, { name: 'asc' }],
    });

    const mapped: ProductItem[] = products.map(mapProductWithConfigurableRule);
    const lowStockItems = mapped.filter((p) => p.isLowStock);

    // Determinar el porcentaje configurado predominante (por defecto 30)
    const activeThresholdPct =
      mapped.length > 0 ? mapped[0].alertPercent : 30;

    return NextResponse.json({
      products: mapped,
      lowStockSummary: {
        criticalCount: lowStockItems.length,
        thresholdPercent: activeThresholdPct,
        threshold: activeThresholdPct,
        items: lowStockItems,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Error cargando inventario' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const parsed = createProductSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: 'Datos de producto inválidos', errors: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    const dupBarcode = await prisma.product.findUnique({
      where: { barcode: data.barcode.trim() },
    });
    if (dupBarcode) {
      return NextResponse.json(
        { message: 'Ya existe un producto con ese código de barras.' },
        { status: 400 }
      );
    }

    const dupSku = await prisma.product.findUnique({
      where: { sku: data.sku.trim().toUpperCase() },
    });
    if (dupSku) {
      return NextResponse.json(
        { message: 'Ya existe un producto con ese código SKU.' },
        { status: 400 }
      );
    }

    const baseCapacity = Math.max(data.minStock, data.stock, 1);
    const alertUnits = Math.max(
      1,
      Math.ceil((baseCapacity * data.alertPercent) / 100)
    );

    const created = await prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          barcode: data.barcode.trim(),
          sku: data.sku.trim().toUpperCase(),
          name: data.name.trim(),
          category: data.category.trim(),
          priceCop: data.priceCop,
          costCop: data.costCop,
          stock: data.stock,
          baseStock: baseCapacity,
          alertPercent: data.alertPercent,
          minStock: alertUnits,
        },
      });

      await recordAuditLog(
        {
          userId: data.operatorUserId,
          action: 'CREATE',
          entity: 'Product',
          entityId: product.id,
          newData: {
            barcode: product.barcode,
            sku: product.sku,
            name: product.name,
            stock: product.stock,
            baseStock: product.baseStock,
            alertPercent: product.alertPercent,
            priceCop: product.priceCop,
          },
        },
        tx
      );

      return product;
    });

    return NextResponse.json(mapProductWithConfigurableRule(created), {
      status: 201,
    });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Error creando producto' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body: unknown = await request.json();
    const parsed = updateProductSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: 'Datos para actualizar producto inválidos' },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const existing = await prisma.product.findUnique({ where: { id: data.id } });
    if (!existing) {
      return NextResponse.json({ message: 'Producto no encontrado' }, { status: 404 });
    }

    const baseCapacity = Math.max(data.minStock, data.stock, 1);
    const alertUnits = Math.max(
      1,
      Math.ceil((baseCapacity * data.alertPercent) / 100)
    );

    const updated = await prisma.$transaction(async (tx) => {
      const prod = await tx.product.update({
        where: { id: data.id },
        data: {
          barcode: data.barcode.trim(),
          sku: data.sku.trim().toUpperCase(),
          name: data.name.trim(),
          category: data.category.trim(),
          priceCop: data.priceCop,
          costCop: data.costCop,
          stock: data.stock,
          baseStock: baseCapacity,
          alertPercent: data.alertPercent,
          minStock: alertUnits,
        },
      });

      const isPriceChanged =
        existing.priceCop !== prod.priceCop || existing.costCop !== prod.costCop;

      await recordAuditLog(
        {
          userId: data.operatorUserId,
          action: isPriceChanged ? 'PRODUCT_PRICE_CHANGED' : 'UPDATE',
          entity: 'Product',
          entityId: prod.id,
          previousData: {
            barcode: existing.barcode,
            name: existing.name,
            priceCop: existing.priceCop,
            costCop: existing.costCop,
            stock: existing.stock,
            baseStock: existing.baseStock,
            alertPercent: existing.alertPercent,
          },
          newData: {
            barcode: prod.barcode,
            name: prod.name,
            priceCop: prod.priceCop,
            costCop: prod.costCop,
            stock: prod.stock,
            baseStock: prod.baseStock,
            alertPercent: prod.alertPercent,
            reason: isPriceChanged ? 'Modificación de precio de venta / costo base' : null,
          },
        },
        tx
      );

      return prod;
    });

    return NextResponse.json(mapProductWithConfigurableRule(updated));
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Error actualizando producto' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;

    // 1. Modo Configuración Global del Límite de Aviso (%) para todos los productos
    if (body.mode === 'SET_GLOBAL_ALERT_PERCENT') {
      const parsedGlobal = updateGlobalAlertSchema.safeParse(body);
      if (!parsedGlobal.success) {
        return NextResponse.json(
          { message: 'El porcentaje de límite de aviso debe estar entre 5% y 90%.' },
          { status: 400 }
        );
      }

      const { alertPercent, operatorUserId } = parsedGlobal.data;

      await prisma.$transaction(async (tx) => {
        const allProducts = await tx.product.findMany();
        for (const prod of allProducts) {
          const base = Math.max(
            prod.baseStock || 0,
            prod.minStock <= 20 ? 40 : prod.minStock,
            prod.stock,
            10
          );
          const alertUnits = Math.max(1, Math.ceil((base * alertPercent) / 100));
          await tx.product.update({
            where: { id: prod.id },
            data: {
              baseStock: base,
              alertPercent,
              minStock: alertUnits,
            },
          });
        }

        await recordAuditLog(
          {
            userId: operatorUserId,
            action: 'STOCK_ADJUSTED',
            entity: 'Product',
            entityId: 'GLOBAL_ALERT_THRESHOLD',
            newData: {
              globalAlertPercent: alertPercent,
              updatedProductsCount: allProducts.length,
            },
          },
          tx
        );
      });

      return NextResponse.json({ updated: true, alertPercent });
    }

    // 2. Modo Ajuste Individual de Stock
    const parsed = adjustStockSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: 'Datos de ajuste inválidos' }, { status: 400 });
    }

    const { productId, newStock, operatorUserId, reason } = parsed.data;

    const updated = await prisma.$transaction(async (tx) => {
      const prev = await tx.product.findUniqueOrThrow({ where: { id: productId } });
      const updatedBaseCapacity = Math.max(
        prev.baseStock || 0,
        prev.minStock <= 20 ? 40 : prev.minStock,
        newStock
      );
      const alertUnits = Math.max(
        1,
        Math.ceil((updatedBaseCapacity * (prev.alertPercent || 30)) / 100)
      );

      const prod = await tx.product.update({
        where: { id: productId },
        data: {
          stock: newStock,
          baseStock: updatedBaseCapacity,
          minStock: alertUnits,
        },
      });

      await recordAuditLog(
        {
          userId: operatorUserId,
          action: 'STOCK_ADJUSTED',
          entity: 'Product',
          entityId: productId,
          previousData: { name: prev.name, stock: prev.stock, baseStock: prev.baseStock },
          newData: { name: prod.name, stock: prod.stock, baseStock: prod.baseStock, reason },
        },
        tx
      );

      return prod;
    });

    return NextResponse.json(mapProductWithConfigurableRule(updated));
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Error ajustando stock' },
      { status: 500 }
    );
  }
}
