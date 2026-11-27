'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  CreateProductPayload,
  LowStockSummary,
  ProductItem,
  UpdateProductPayload,
} from '@/interfaces/inventory.interface';
import {
  adjustProductStockRequest,
  createProductRequest,
  fetchInventory,
  updateGlobalAlertPercentRequest,
  updateProductRequest,
} from '@/services/inventory.service';

export function useInventory() {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [lowStockSummary, setLowStockSummary] = useState<LowStockSummary | null>(
    null
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadInventory = useCallback(async (isBackground = false) => {
    if (!isBackground) {
      setIsLoading(true);
    }
    setError(null);
    try {
      const data = await fetchInventory();
      setProducts(data.products);
      setLowStockSummary(data.lowStockSummary);
    } catch (err) {
      if (!isBackground) {
        setError(err instanceof Error ? err.message : 'Error cargando inventario');
      }
    } finally {
      if (!isBackground) {
        setIsLoading(false);
      }
    }
  }, []);

  // Carga inicial
  useEffect(() => {
    void loadInventory();
  }, [loadInventory]);

  // Actualización bajo demanda cuando el usuario pulsa "Actualizar Datos" en la barra superior
  useEffect(() => {
    const handleManualRefresh = () => {
      void loadInventory(true);
    };

    window.addEventListener('epb:manual-refresh', handleManualRefresh);
    return () => {
      window.removeEventListener('epb:manual-refresh', handleManualRefresh);
    };
  }, [loadInventory]);

  const createProduct = useCallback(
    async (payload: CreateProductPayload) => {
      await createProductRequest(payload);
      await loadInventory();
    },
    [loadInventory]
  );

  const updateProduct = useCallback(
    async (payload: UpdateProductPayload) => {
      await updateProductRequest(payload);
      await loadInventory();
    },
    [loadInventory]
  );

  const adjustStock = useCallback(
    async (params: {
      productId: string;
      newStock: number;
      operatorUserId: string;
      reason: string;
    }) => {
      await adjustProductStockRequest(params);
      await loadInventory();
    },
    [loadInventory]
  );

  const updateGlobalAlertPercent = useCallback(
    async (params: { alertPercent: number; operatorUserId: string }) => {
      await updateGlobalAlertPercentRequest(params);
      await loadInventory();
    },
    [loadInventory]
  );

  return {
    products,
    lowStockSummary,
    isLoading,
    error,
    reloadInventory: loadInventory,
    createProduct,
    updateProduct,
    adjustStock,
    updateGlobalAlertPercent,
  };
}
