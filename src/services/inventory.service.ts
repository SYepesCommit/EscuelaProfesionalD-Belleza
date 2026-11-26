import {
  CreateProductPayload,
  LowStockSummary,
  ProductItem,
  UpdateProductPayload,
} from '@/interfaces/inventory.interface';

export interface InventoryApiResponse {
  products: ProductItem[];
  lowStockSummary: LowStockSummary;
}

export async function fetchInventory(): Promise<InventoryApiResponse> {
  const res = await fetch('/api/products', { cache: 'no-store' });
  if (!res.ok) {
    throw new Error('No se pudo cargar el inventario');
  }
  return (await res.json()) as InventoryApiResponse;
}

export async function createProductRequest(
  payload: CreateProductPayload
): Promise<ProductItem> {
  const res = await fetch('/api/products', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = (await res.json()) as { message?: string };
    throw new Error(err.message ?? 'Error creando producto');
  }
  return (await res.json()) as ProductItem;
}

export async function updateProductRequest(
  payload: UpdateProductPayload
): Promise<ProductItem> {
  const res = await fetch('/api/products', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = (await res.json()) as { message?: string };
    throw new Error(err.message ?? 'Error actualizando producto');
  }
  return (await res.json()) as ProductItem;
}

export async function adjustProductStockRequest(params: {
  productId: string;
  newStock: number;
  operatorUserId: string;
  reason: string;
}): Promise<void> {
  const res = await fetch('/api/products', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode: 'ADJUST_STOCK', ...params }),
  });
  if (!res.ok) {
    throw new Error('Error actualizando stock');
  }
}

export async function updateGlobalAlertPercentRequest(params: {
  alertPercent: number;
  operatorUserId: string;
}): Promise<void> {
  const res = await fetch('/api/products', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode: 'SET_GLOBAL_ALERT_PERCENT', ...params }),
  });
  if (!res.ok) {
    const err = (await res.json()) as { message?: string };
    throw new Error(err.message ?? 'Error actualizando límite global de aviso');
  }
}
