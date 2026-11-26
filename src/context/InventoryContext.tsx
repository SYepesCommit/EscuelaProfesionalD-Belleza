'use client';

import React, { createContext, useContext } from 'react';
import { useInventory } from '@/hooks/useInventory';
import {
  CreateProductPayload,
  LowStockSummary,
  ProductItem,
  UpdateProductPayload,
} from '@/interfaces/inventory.interface';

interface InventoryContextValue {
  products: ProductItem[];
  lowStockSummary: LowStockSummary | null;
  isLoading: boolean;
  error: string | null;
  reloadInventory: () => Promise<void>;
  createProduct: (payload: CreateProductPayload) => Promise<void>;
  updateProduct: (payload: UpdateProductPayload) => Promise<void>;
  adjustStock: (params: {
    productId: string;
    newStock: number;
    operatorUserId: string;
    reason: string;
  }) => Promise<void>;
  updateGlobalAlertPercent: (params: {
    alertPercent: number;
    operatorUserId: string;
  }) => Promise<void>;
}

const InventoryContext = createContext<InventoryContextValue | null>(null);

export function InventoryProvider({ children }: { children: React.ReactNode }) {
  const inventory = useInventory();

  return (
    <InventoryContext.Provider value={inventory}>
      {children}
    </InventoryContext.Provider>
  );
}

export function useSharedInventory(): InventoryContextValue {
  const context = useContext(InventoryContext);
  if (!context) {
    throw new Error('useSharedInventory must be used within an InventoryProvider');
  }
  return context;
}
