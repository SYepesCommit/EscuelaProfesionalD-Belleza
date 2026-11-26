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

  // Polling Inteligente en Segundo Plano (Tiempo Real Multi-PC)
  useEffect(() => {
    const POLLING_INTERVAL_MS = 5000; // Consulta ligera cada 5 segundos

    const intervalId = setInterval(() => {
      // Solo consulta si la ventana del navegador está visible y activa
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        void loadInventory(true);
      }
    }, POLLING_INTERVAL_MS);

    // Revalidación inmediata al enfocar la ventana o cambiar de pestaña
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void loadInventory(true);
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
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
