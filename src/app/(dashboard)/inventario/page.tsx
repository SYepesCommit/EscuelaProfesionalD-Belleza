'use client';

import React from 'react';
import { InventoryStockTable } from '@/components/inventory/InventoryStockTable';
import { PageLoading } from '@/components/ui/page-loading';
import { useSharedInventory } from '@/context/InventoryContext';
import { useAuthSession } from '@/hooks/useAuthSession';

export default function InventarioPage() {
  const { user } = useAuthSession();
  const {
    products,
    isLoading,
    createProduct,
    updateProduct,
    adjustStock,
    updateGlobalAlertPercent,
  } = useSharedInventory();

  if (isLoading && products.length === 0) {
    return (
      <PageLoading
        title="Cargando Catálogo e Inventario de Tienda..."
        subtitle="Verificando códigos de barras y límites configurados de aviso de stock"
      />
    );
  }

  return (
    <div className="space-y-5 min-w-0">
      <InventoryStockTable
        products={products}
        operatorUserId={user?.id ?? ''}
        onCreateProduct={createProduct}
        onUpdateProduct={updateProduct}
        onAdjustStock={adjustStock}
        onUpdateGlobalAlertPercent={updateGlobalAlertPercent}
      />
    </div>
  );
}
