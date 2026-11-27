'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  CartSaleItem,
  ClientPresaleItem,
  CreateSalePayload,
  RegisterPresalePayload,
  SaleRecordItem,
  SellerMonthlyCommissionSummary,
  MonthlyFinancialOverview,
} from '@/interfaces/sale.interface';
import { ProductItem } from '@/interfaces/inventory.interface';
import {
  createSaleRequest,
  claimPresaleOpportunityRequest,
  updatePresaleNotesRequest,
  fetchMonthlyCommissionsReport,
  fetchPresales,
  fetchSales,
  registerPresaleRequest,
  voidSaleRequest,
} from '@/services/sale.service';

export function useSalesAndPresales() {
  const [presales, setPresales] = useState<ClientPresaleItem[]>([]);
  const [sales, setSales] = useState<SaleRecordItem[]>([]);
  const [monthlyReport, setMonthlyReport] = useState<
    SellerMonthlyCommissionSummary[]
  >([]);
  const [financialOverview, setFinancialOverview] = useState<MonthlyFinancialOverview | null>(null);
  const [monthKey, setMonthKey] = useState<string>('');
  const [cart, setCart] = useState<CartSaleItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadAll = useCallback(async (selectedMonth?: string, isBackground = false) => {
    if (!isBackground) {
      setIsLoading(true);
    }
    setError(null);
    try {
      const [presalesData, salesData, reportData] = await Promise.all([
        fetchPresales(),
        fetchSales(),
        fetchMonthlyCommissionsReport(selectedMonth),
      ]);
      setPresales(presalesData);
      setSales(salesData);
      setMonthlyReport(reportData.summary);
      setFinancialOverview(reportData.financialOverview || null);
      setMonthKey(reportData.monthKey);
    } catch (err) {
      if (!isBackground) {
        setError(
          err instanceof Error ? err.message : 'Error cargando ventas y preventas'
        );
      }
    } finally {
      if (!isBackground) {
        setIsLoading(false);
      }
    }
  }, []);

  // Carga inicial
  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  // Polling Inteligente en Segundo Plano para Preventas y Ventas POS
  useEffect(() => {
    const POLLING_INTERVAL_MS = 6000; // Consulta cada 6 segundos

    const intervalId = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        void loadAll(monthKey || undefined, true);
      }
    }, POLLING_INTERVAL_MS);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void loadAll(monthKey || undefined, true);
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
    };
  }, [loadAll, monthKey]);

  const registerPresale = useCallback(
    async (payload: RegisterPresalePayload) => {
      await registerPresaleRequest(payload);
      await loadAll(monthKey || undefined);
    },
    [loadAll, monthKey]
  );

  const claimPresaleOpportunity = useCallback(
    async (presaleId: string, sellerSecretCode: string, note?: string) => {
      await claimPresaleOpportunityRequest(presaleId, sellerSecretCode, note);
      await loadAll(monthKey || undefined);
    },
    [loadAll, monthKey]
  );

  const updatePresaleNotes = useCallback(
    async (presaleId: string, notes: string) => {
      await updatePresaleNotesRequest(presaleId, notes);
      await loadAll(monthKey || undefined);
    },
    [loadAll, monthKey]
  );

  const addProductToCart = useCallback((product: ProductItem) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) return prev;
        return prev.map((i) =>
          i.productId === product.id
            ? { ...i, quantity: i.quantity + 1 }
            : i
        );
      }
      if (product.stock <= 0) return prev;
      return [
        ...prev,
        {
          productId: product.id,
          barcode: product.barcode,
          name: product.name,
          unitPriceCop: product.priceCop,
          quantity: 1,
          maxStock: product.stock,
        },
      ];
    });
  }, []);

  const removeFromCart = useCallback((productId: string) => {
    setCart((prev) => prev.filter((i) => i.productId !== productId));
  }, []);

  const updateCartQuantity = useCallback((productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.productId !== productId) return item;
          const nextQty = Math.min(item.maxStock, item.quantity + delta);
          return nextQty > 0 ? { ...item, quantity: nextQty } : null;
        })
        .filter((item): item is CartSaleItem => item !== null)
    );
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  const completeSale = useCallback(
    async (payload: Omit<CreateSalePayload, 'items'>) => {
      if (cart.length === 0) {
        throw new Error('El carrito de venta está vacío');
      }
      await createSaleRequest({
        ...payload,
        items: cart.map((c) => ({
          productId: c.productId,
          quantity: c.quantity,
        })),
      });
      setCart([]);
      await loadAll(monthKey || undefined);
    },
    [cart, loadAll, monthKey]
  );

  const voidSale = useCallback(
    async (params: {
      saleId: string;
      voidReason: string;
      operatorSecretCode: string;
    }) => {
      await voidSaleRequest(params);
      await loadAll(monthKey || undefined);
    },
    [loadAll, monthKey]
  );

  return {
    presales,
    sales,
    monthlyReport,
    financialOverview,
    monthKey,
    setMonthKey,
    cart,
    isLoading,
    error,
    reloadSalesData: () => loadAll(monthKey || undefined),
    registerPresale,
    claimPresaleOpportunity,
    updatePresaleNotes,
    addProductToCart,
    removeFromCart,
    updateCartQuantity,
    clearCart,
    completeSale,
    voidSale,
  };
}
