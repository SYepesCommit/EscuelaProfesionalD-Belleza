'use client';

import React from 'react';
import { PosBarcodeCheckout } from '@/components/sales/PosBarcodeCheckout';
import { PageLoading } from '@/components/ui/page-loading';
import { useSharedInventory } from '@/context/InventoryContext';
import { useSalesAndPresales } from '@/hooks/useSalesAndPresales';

export default function VentasPage() {
  const {
    products,
    isLoading: isLoadingInventory,
    reloadInventory,
  } = useSharedInventory();
  const {
    cart,
    sales,
    isLoading: isLoadingSales,
    addProductToCart,
    removeFromCart,
    updateCartQuantity,
    clearCart,
    completeSale,
    voidSale,
  } = useSalesAndPresales();

  if ((isLoadingInventory || isLoadingSales) && products.length === 0) {
    return (
      <PageLoading
        title="Iniciando Terminal Caja POS y Escáner USB..."
        subtitle="Sincronizando catálogo de productos, lector de código de barras y reglas de comisión"
      />
    );
  }

  return (
    <div className="space-y-5 min-w-0">
      <div>
        <h1 className="font-serif text-xl sm:text-2xl font-bold text-[#141213] dark:text-[#F5EEF1]">
          Caja POS, Escáner de Código de Barras y Liquidación de Comisiones
        </h1>
        <p className="mt-0.5 text-xs sm:text-sm text-neutral-600 dark:text-[#C4B5BC]">
          Facturación híbrida (Táctil POS / PC / Móvil) con calculadora de cambio en COP y asignación automática al vendedor protegido.
        </p>
      </div>

      <PosBarcodeCheckout
        products={products}
        cart={cart}
        sales={sales}
        onAddProduct={addProductToCart}
        onRemoveItem={removeFromCart}
        onUpdateQuantity={updateCartQuantity}
        onClearCart={clearCart}
        onCompleteSale={async (payload) => {
          await completeSale(payload);
          await reloadInventory();
        }}
        onVoidSale={async (params) => {
          await voidSale(params);
          await reloadInventory();
        }}
      />
    </div>
  );
}
