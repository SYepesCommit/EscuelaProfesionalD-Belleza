export interface ProductItem {
  id: string;
  barcode: string;
  sku: string;
  name: string;
  description?: string | null;
  category: string;
  priceCop: number;
  costCop: number;
  stock: number;
  minStock: number; // Capacidad base / Stock ideal (100%)
  alertPercent: number; // Porcentaje límite de aviso configurable (ej: 30%)
  alertThresholdUnits: number; // Unidades donde avisa (calculado según alertPercent)
  stockPercent: number; // Porcentaje actual de stock (0% a 100%)
  isLowStock: boolean; // true cuando stockPercent <= alertPercent
  isActive: boolean;
}

export interface CreateProductPayload {
  barcode: string;
  sku: string;
  name: string;
  description?: string | null;
  category: string;
  priceCop: number;
  costCop: number;
  stock: number;
  minStock?: number; // Capacidad base 100%
  alertPercent?: number; // % Límite de aviso para este producto (default 30)
  operatorUserId: string;
}

export interface UpdateProductPayload extends CreateProductPayload {
  id: string;
}

export interface LowStockSummary {
  criticalCount: number;
  thresholdPercent: number; // % Límite de aviso general/promedio activo
  threshold: number;
  items: ProductItem[];
}
