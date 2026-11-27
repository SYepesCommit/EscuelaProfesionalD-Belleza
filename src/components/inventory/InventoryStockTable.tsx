'use client';

import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowUpCircle,
  Barcode,
  CheckCircle2,
  Edit3,
  Package,
  PackagePlus,
  RefreshCw,
  Search,
  SlidersHorizontal,
  XCircle,
} from 'lucide-react';
import {
  CreateProductPayload,
  ProductItem,
  UpdateProductPayload,
} from '@/interfaces/inventory.interface';
import { ProductFormModal } from './ProductFormModal';
import { useBarcodeScanner, normalizeBarcode } from '@/hooks/useBarcodeScanner';
import { useUiMode } from '@/hooks/useUiMode';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatCop } from '@/lib/utils';

interface InventoryStockTableProps {
  products: ProductItem[];
  operatorUserId: string;
  onCreateProduct: (payload: CreateProductPayload) => Promise<void>;
  onUpdateProduct?: (payload: UpdateProductPayload) => Promise<void>;
  onAdjustStock: (params: {
    productId: string;
    newStock: number;
    operatorUserId: string;
    reason: string;
  }) => Promise<void>;
  onUpdateGlobalAlertPercent?: (params: {
    alertPercent: number;
    operatorUserId: string;
  }) => Promise<void>;
}

const GLOBAL_PERCENT_PRESETS = [15, 20, 25, 30, 40, 50];

function getProductPercent(p: ProductItem): number {
  if (typeof p.stockPercent === 'number') return p.stockPercent;
  const base = Math.max(p.minStock, p.stock, 1);
  return Math.min(100, Math.max(0, Math.round((p.stock / base) * 100)));
}

function getProductConfiguredPercent(p: ProductItem): number {
  return p.alertPercent ?? 30;
}

function getProductAlertThreshold(p: ProductItem): number {
  if (typeof p.alertThresholdUnits === 'number') return p.alertThresholdUnits;
  const pct = getProductConfiguredPercent(p);
  return Math.max(1, Math.ceil((p.minStock * pct) / 100));
}

export function InventoryStockTable({
  products,
  operatorUserId,
  onCreateProduct,
  onUpdateProduct,
  onAdjustStock,
  onUpdateGlobalAlertPercent,
}: InventoryStockTableProps) {
  const { isTouchMode } = useUiMode();

  const activeGlobalPercent = useMemo(
    () => (products.length > 0 ? getProductConfiguredPercent(products[0]) : 30),
    [products]
  );

  const [filterMode, setFilterMode] = useState<'ALL' | 'LOW' | 'ZERO'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [stockInputMap, setStockInputMap] = useState<Record<string, string>>({});
  const [scanNotice, setScanNotice] = useState<string | null>(null);

  // Configuración Global del Límite de Aviso (%)
  const [showGlobalConfig, setShowGlobalConfig] = useState(false);
  const [customGlobalPct, setCustomGlobalPct] = useState<number>(30);
  const [isSavingGlobalPct, setIsSavingGlobalPct] = useState(false);

  // Modal Crear / Editar
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);
  const [prefilledBarcode, setPrefilledBarcode] = useState<string | undefined>(
    undefined
  );

  // Escucha de lector de código de barras USB en la vista de inventario
  useBarcodeScanner({
    onScan: (ev) => {
      const code = ev.barcode.trim();
      // Si el modal de producto ya está abierto, solo actualiza el código escaneado sin cambiar de modo
      if (isModalOpen) {
        setPrefilledBarcode(code);
        return;
      }
      const found = products.find((p) => p.barcode === code);
      if (found) {
        setSearchQuery(code);
        setScanNotice(
          `Producto localizado por escáner: ${found.name} (${getProductPercent(found)}% • ${found.stock}/${found.minStock} uds)`
        );
      } else {
        setPrefilledBarcode(code);
        setEditingProduct(null);
        setIsModalOpen(true);
        setScanNotice(
          `Código ${code} no registrado. Formulario abierto para crearlo.`
        );
      }
    },
  });

  const outOfStockCount = useMemo(
    () => products.filter((p) => p.stock === 0).length,
    [products]
  );
  const lowStockCount = useMemo(
    () =>
      products.filter(
        (p) =>
          p.stock > 0 &&
          getProductPercent(p) <= getProductConfiguredPercent(p)
      ).length,
    [products]
  );
  const healthyStockCount = useMemo(
    () =>
      products.filter(
        (p) => getProductPercent(p) > getProductConfiguredPercent(p)
      ).length,
    [products]
  );
  const totalInventorySaleValueCop = useMemo(
    () => products.reduce((acc, p) => acc + p.stock * p.priceCop, 0),
    [products]
  );
  const totalUnitsCount = useMemo(
    () => products.reduce((acc, p) => acc + p.stock, 0),
    [products]
  );

  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => set.add(p.category));
    return Array.from(set);
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const pct = getProductPercent(p);
      const limitPct = getProductConfiguredPercent(p);
      if (filterMode === 'ZERO' && p.stock !== 0) return false;
      if (filterMode === 'LOW' && pct > limitPct) return false;
      if (categoryFilter !== 'ALL' && p.category !== categoryFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = p.name.toLowerCase().includes(q);
        const matchBarcode = p.barcode.toLowerCase().includes(q);
        const matchSku = p.sku.toLowerCase().includes(q);
        const matchCat = p.category.toLowerCase().includes(q);
        if (!matchName && !matchBarcode && !matchSku && !matchCat) return false;
      }
      return true;
    });
  }, [products, filterMode, categoryFilter, searchQuery]);

  const openCreateModal = () => {
    setEditingProduct(null);
    setPrefilledBarcode(undefined);
    setIsModalOpen(true);
  };

  const openEditModal = (product: ProductItem) => {
    setEditingProduct(product);
    setPrefilledBarcode(undefined);
    setIsModalOpen(true);
  };

  const handleApplyGlobalPercent = async (targetPct: number) => {
    if (!onUpdateGlobalAlertPercent) return;
    const safePct = Math.min(90, Math.max(5, Math.round(targetPct)));
    setIsSavingGlobalPct(true);
    try {
      await onUpdateGlobalAlertPercent({
        alertPercent: safePct,
        operatorUserId,
      });
      setCustomGlobalPct(safePct);
      setScanNotice(
        `Límite global de aviso actualizado al ${safePct}% para todos los productos.`
      );
      setShowGlobalConfig(false);
    } finally {
      setIsSavingGlobalPct(false);
    }
  };

  const renderStockProgressBar = (product: ProductItem) => {
    const isZero = product.stock === 0;
    const pct = getProductPercent(product);
    const limitPct = getProductConfiguredPercent(product);
    const isWarning = !isZero && pct <= limitPct;
    const thresholdUnits = getProductAlertThreshold(product);
    const missingToFull = Math.max(0, product.minStock - product.stock);

    return (
      <div className="space-y-1.5">
        <div className="flex flex-wrap items-center justify-between gap-1.5">
          {isZero ? (
            <Badge variant="destructive" className="gap-1 font-extrabold">
              <XCircle className="h-3 w-3" />
              0% &bull; AGOTADO (0/{product.minStock} uds)
            </Badge>
          ) : isWarning ? (
            <Badge variant="warning" className="gap-1 font-extrabold">
              <AlertTriangle className="h-3 w-3" />
              {pct}% &bull; Quedan {product.stock} de {product.minStock} uds
            </Badge>
          ) : (
            <Badge variant="success" className="gap-1 font-extrabold">
              <CheckCircle2 className="h-3 w-3" />
              {pct}% &bull; {product.stock} de {product.minStock} uds
            </Badge>
          )}
        </div>

        {/* Barra de Progreso Mejorada con Línea Divisoria al % Configurado */}
        <div className="relative h-3 w-full overflow-hidden rounded-full border border-neutral-300/80 bg-neutral-200/90 p-0.5 dark:border-[#3A3035] dark:bg-[#171416]">
          {/* Marcador vertical dinámico */}
          <div
            className="absolute inset-y-0 z-10 w-0.5 bg-[#141213]/75 transition-all duration-300 dark:bg-white/80"
            style={{ left: `${limitPct}%` }}
            title={`Umbral de alerta ${limitPct}% (${thresholdUnits} uds)`}
          />
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              isZero
                ? 'bg-red-600'
                : isWarning
                  ? 'bg-gradient-to-r from-red-500 via-amber-500 to-amber-400'
                  : 'bg-gradient-to-r from-emerald-600 to-emerald-500'
            }`}
            style={{ width: `${Math.max(isZero ? 4 : 6, pct)}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[10px] text-neutral-500 dark:text-[#B8A8B0]">
          <span>0%</span>
          <span className="font-bold text-amber-800 dark:text-amber-300">
            ▲ {limitPct}% ({thresholdUnits} uds)
          </span>
          <span>
            {missingToFull > 0
              ? `Faltan ${missingToFull} uds para 100%`
              : 'Capacidad al 100%'}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5 min-w-0">
      {/* Encabezado Superior + Botón de Configurar Límite de Aviso */}
      <div className="rounded-2xl border border-[#E4BDD0] bg-white p-4 shadow-xs dark:border-[#332B2F] dark:bg-[#1B181A]">
        <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
          <div className="min-w-0">
            <h1 className="font-serif text-xl sm:text-2xl font-bold text-[#141213] dark:text-[#F5EEF1]">
              Inventario de Tienda, Códigos de Barras y Límite de Aviso
            </h1>
            <p className="mt-0.5 text-xs text-neutral-600 dark:text-[#C4B5BC]">
              El sistema avisa cuando un producto cae al{' '}
              <strong>{activeGlobalPercent}% o menos</strong> de su capacidad (configurable globalmente o por producto).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setCustomGlobalPct(activeGlobalPercent);
                setShowGlobalConfig(!showGlobalConfig);
              }}
              className={`gap-1.5 border-[#E4BDD0] bg-[#FAF2F6] font-extrabold text-[#141213] hover:bg-[#ECCCD9] dark:border-[#3A3035] dark:bg-[#252023] dark:text-[#ECCCD9] ${
                isTouchMode ? 'h-12 px-4 text-sm' : 'h-10 px-3.5 text-xs'
              }`}
            >
              <SlidersHorizontal className="h-4 w-4" />
              <span>Límite de Aviso: {activeGlobalPercent}%</span>
            </Button>

            <Button
              type="button"
              variant="pink"
              onClick={openCreateModal}
              className={`gap-1.5 bg-[#ECCCD9] font-extrabold text-[#141213] hover:bg-[#E4BDD0] ${
                isTouchMode ? 'h-12 px-5 text-sm' : 'h-10 px-4 text-xs'
              }`}
            >
              <PackagePlus className="h-4 w-4" />
              <span>+ Nuevo Producto / Kit</span>
            </Button>
          </div>
        </div>

        {/* Panel Desplegable para Configurar el Límite Global de Aviso (%) */}
        {showGlobalConfig && (
          <div className="mt-4 rounded-2xl border border-[#E4BDD0] bg-[#FAF2F6] p-4 dark:border-[#3A3035] dark:bg-[#231B20]">
            <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
              <div>
                <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-[#141213] dark:text-[#ECCCD9]">
                  <SlidersHorizontal className="h-4 w-4" />
                  Configurar Límite Global de Aviso de Agotamiento (%)
                </div>
                <p className="mt-0.5 text-xs text-neutral-600 dark:text-[#C4B5BC]">
                  Elija a qué porcentaje de su capacidad total debe encenderse la alerta de abastecimiento en todos los productos.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {GLOBAL_PERCENT_PRESETS.map((pctPreset) => {
                  const isCurrent = customGlobalPct === pctPreset;
                  return (
                    <button
                      key={pctPreset}
                      type="button"
                      disabled={isSavingGlobalPct}
                      onClick={() => void handleApplyGlobalPercent(pctPreset)}
                      className={`rounded-xl border px-3 py-1.5 text-xs font-extrabold transition ${
                        isCurrent
                          ? 'border-[#141213] bg-[#141213] text-[#ECCCD9] shadow-xs dark:border-[#ECCCD9] dark:bg-[#ECCCD9] dark:text-[#141213]'
                          : 'border-neutral-300 bg-white text-[#141213] hover:bg-[#ECCCD9] dark:border-[#3A3035] dark:bg-[#171416] dark:text-white'
                      }`}
                    >
                      {pctPreset}%
                    </button>
                  );
                })}

                <div className="flex items-center gap-1.5 pl-1">
                  <Input
                    type="number"
                    min={5}
                    max={90}
                    value={customGlobalPct}
                    onChange={(e) => setCustomGlobalPct(Number(e.target.value))}
                    className="h-9 w-20 border-neutral-300 bg-white text-center text-xs font-black text-[#141213] dark:border-[#3A3035] dark:bg-[#171416] dark:text-white"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="pink"
                    disabled={isSavingGlobalPct}
                    onClick={() => void handleApplyGlobalPercent(customGlobalPct)}
                    className="h-9 bg-[#ECCCD9] text-xs font-extrabold text-[#141213] hover:bg-[#E4BDD0]"
                  >
                    {isSavingGlobalPct ? 'Aplicando...' : 'Aplicar %'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {scanNotice && (
        <div className="flex items-center justify-between gap-2 rounded-xl border border-[#E4BDD0] bg-[#FAF2F6] px-4 py-2.5 text-xs font-bold text-[#141213] dark:border-[#3A3035] dark:bg-[#241E21] dark:text-[#ECCCD9]">
          <div className="flex items-center gap-2 min-w-0">
            <Barcode className="h-4 w-4 shrink-0" />
            <span className="truncate">{scanNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setScanNotice(null)}
            className="underline shrink-0"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* Semáforo Visual de 4 Tarjetas con Límite Configurable */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <button
          type="button"
          onClick={() => setFilterMode(filterMode === 'ZERO' ? 'ALL' : 'ZERO')}
          className={`flex items-center justify-between rounded-2xl border-2 p-4 text-left transition ${
            filterMode === 'ZERO'
              ? 'border-red-600 bg-red-50 shadow-md dark:border-red-500 dark:bg-red-950/60'
              : 'border-red-200 bg-white hover:bg-red-50/40 dark:border-red-900/50 dark:bg-[#1B181A] dark:hover:bg-red-950/30'
          }`}
        >
          <div>
            <span className="text-xs font-extrabold uppercase tracking-wider text-red-700 dark:text-red-300">
              1. Agotados (0%)
            </span>
            <div className="mt-1 text-xl sm:text-2xl font-black tracking-tight text-red-800 dark:text-red-200">
              {outOfStockCount} productos
            </div>
            <span className="text-[11px] text-neutral-500 dark:text-[#B8A8B0]">
              0 unidades disponibles
            </span>
          </div>
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-200">
            <XCircle className="h-6 w-6" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => setFilterMode(filterMode === 'LOW' ? 'ALL' : 'LOW')}
          className={`flex items-center justify-between rounded-2xl border-2 p-4 text-left transition ${
            filterMode === 'LOW'
              ? 'border-amber-500 bg-amber-50 shadow-md dark:border-amber-400 dark:bg-amber-950/60'
              : 'border-amber-200 bg-white hover:bg-amber-50/40 dark:border-amber-900/50 dark:bg-[#1B181A] dark:hover:bg-amber-950/30'
          }`}
        >
          <div>
            <span className="text-xs font-extrabold uppercase tracking-wider text-amber-800 dark:text-amber-300">
              2. Alerta Crítica (&le; {activeGlobalPercent}%)
            </span>
            <div className="mt-1 text-xl sm:text-2xl font-black tracking-tight text-amber-900 dark:text-amber-200">
              {lowStockCount} productos
            </div>
            <span className="text-[11px] text-neutral-500 dark:text-[#B8A8B0]">
              En o debajo del {activeGlobalPercent}% configurado
            </span>
          </div>
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">
            <AlertTriangle className="h-6 w-6" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => setFilterMode('ALL')}
          className={`flex items-center justify-between rounded-2xl border-2 p-4 text-left transition ${
            filterMode === 'ALL'
              ? 'border-[#141213] bg-[#FAF2F6] shadow-md dark:border-[#ECCCD9] dark:bg-[#261F23]'
              : 'border-emerald-200 bg-white hover:bg-emerald-50/40 dark:border-emerald-900/50 dark:bg-[#1B181A]'
          }`}
        >
          <div>
            <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
              3. Stock Óptimo (&gt; {activeGlobalPercent}%)
            </span>
            <div className="mt-1 text-xl sm:text-2xl font-black tracking-tight text-emerald-900 dark:text-emerald-200">
              {healthyStockCount} productos
            </div>
            <span className="text-[11px] text-neutral-500 dark:text-[#B8A8B0]">
              Ver catálogo ({products.length} total)
            </span>
          </div>
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200">
            <CheckCircle2 className="h-6 w-6" />
          </div>
        </button>

        <div className="flex items-center justify-between rounded-2xl border-2 border-[#D9AFC2] bg-gradient-to-br from-[#FAF0F5] via-white to-[#ECCCD9]/40 p-4 text-[#141213] shadow-xs dark:border-[#ECCCD9]/40 dark:bg-[#231D20] dark:text-white">
          <div className="min-w-0">
            <span className="text-xs font-black uppercase tracking-wider text-[#7A1E46] dark:text-[#ECCCD9]">
              4. Valorizado Tienda
            </span>
            <div className="mt-1 truncate text-lg sm:text-xl font-black tracking-tight text-[#141213] dark:text-white">
              {formatCop(totalInventorySaleValueCop)}
            </div>
            <span className="text-[11px] font-semibold text-neutral-600 dark:text-[#ECCCD9]/90">
              {totalUnitsCount} unidades físicas en bodega
            </span>
          </div>
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#ECCCD9] text-[#141213] shadow-xs dark:bg-[#382630] dark:text-[#ECCCD9]">
            <Package className="h-6 w-6 text-[#7A1E46] dark:text-[#ECCCD9]" />
          </div>
        </div>
      </div>

      {/* Barra de Filtros por Categoría y Buscador */}
      <Card className="overflow-hidden border-[#E4BDD0] bg-white dark:border-[#332B2F] dark:bg-[#1B181A]">
        <CardHeader className="border-b border-[#E4BDD0]/60 bg-[#FAF2F6]/60 p-4 dark:border-[#332B2F] dark:bg-[#221D20]">
          <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCategoryFilter('ALL')}
                className={`rounded-xl border px-3 py-1.5 text-xs font-extrabold transition ${
                  categoryFilter === 'ALL'
                    ? 'border-[#141213] bg-[#ECCCD9] text-[#141213] dark:border-[#ECCCD9]'
                    : 'border-neutral-200 bg-white text-neutral-700 dark:border-[#3A3035] dark:bg-[#181517] dark:text-[#E5D8DF]'
                }`}
              >
                Todas las Categorías ({products.length})
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoryFilter(cat)}
                  className={`rounded-xl border px-3 py-1.5 text-xs font-extrabold transition ${
                    categoryFilter === cat
                      ? 'border-[#141213] bg-[#ECCCD9] text-[#141213] dark:border-[#ECCCD9]'
                      : 'border-neutral-200 bg-white text-neutral-700 hover:bg-[#FAF0F5] dark:border-[#3A3035] dark:bg-[#181517] dark:text-[#E5D8DF]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="relative w-full lg:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(normalizeBarcode(e.target.value))}
                placeholder="Buscar por nombre, código o SKU..."
                className="h-9 border-neutral-300 bg-white pl-9 text-xs text-[#141213] dark:border-[#3A3035] dark:bg-[#181517] dark:text-white"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {filteredProducts.length === 0 ? (
            <div className="p-8 text-center text-xs text-neutral-500 dark:text-[#B8A8B0]">
              No se encontraron productos con los filtros seleccionados.
            </div>
          ) : (
            <>
              {/* Vista Móvil (< md): Tarjetas apiladas sin desborde */}
              <div className="divide-y divide-neutral-200 md:hidden dark:divide-[#332B2F]">
                {filteredProducts.map((product) => {
                  const isZero = product.stock === 0;
                  const pct = getProductPercent(product);
                  const limitPct = getProductConfiguredPercent(product);

                  return (
                    <div
                      key={product.id}
                      className={`space-y-3 p-4 ${
                        isZero
                          ? 'bg-red-50/50 dark:bg-red-950/20'
                          : pct <= limitPct
                            ? 'bg-amber-50/35 dark:bg-amber-950/15'
                            : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 rounded-md bg-neutral-100 px-2 py-0.5 font-mono text-[11px] font-bold text-[#141213] dark:bg-[#262023] dark:text-[#ECCCD9]">
                              <Barcode className="h-3 w-3" />
                              {product.barcode}
                            </span>
                            <span className="text-[11px] text-neutral-500 dark:text-[#B8A8B0]">
                              {product.sku}
                            </span>
                          </div>
                          <h3 className="mt-1 font-extrabold text-[#141213] dark:text-white">
                            {product.name}
                          </h3>
                          <span className="inline-block rounded-full border border-[#E4BDD0] bg-[#FAF2F6] px-2.5 py-0.5 text-[10px] font-bold text-[#141213] dark:border-[#3A3035] dark:bg-[#252023] dark:text-[#E5D8DF]">
                            {product.category}
                          </span>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="text-lg font-black text-[#141213] dark:text-[#ECCCD9]">
                            {formatCop(product.priceCop)}
                          </div>
                          <div className="text-xs font-extrabold text-neutral-800 dark:text-[#E8DCE2] mt-0.5">
                            Costo: <span className="font-black text-[#141213] dark:text-white">{formatCop(product.costCop)}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => openEditModal(product)}
                            className="mt-1.5 inline-flex items-center gap-1 text-xs font-bold text-neutral-800 underline dark:text-white"
                          >
                            <Edit3 className="h-3 w-3" />
                            Editar / %
                          </button>
                        </div>
                      </div>

                      {/* Barra de nivel de stock con marcador al % configurado */}
                      {renderStockProgressBar(product)}

                      {/* Acciones de abastecimiento en móvil */}
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        {product.stock < product.minStock && (
                          <Button
                            type="button"
                            size="sm"
                            variant="pink"
                            className="h-9 gap-1 bg-[#ECCCD9] text-xs font-extrabold text-[#141213]"
                            onClick={() =>
                              void onAdjustStock({
                                productId: product.id,
                                newStock: product.minStock,
                                operatorUserId,
                                reason: `Abastecimiento al 100% (${product.minStock} uds)`,
                              })
                            }
                          >
                            <ArrowUpCircle className="h-3.5 w-3.5" />
                            Llenar 100%
                          </Button>
                        )}
                        <Input
                          type="number"
                          className="h-9 w-24 border-neutral-300 bg-white text-xs text-[#141213] dark:border-[#3A3035] dark:bg-[#181517] dark:text-white"
                          placeholder={String(product.stock)}
                          value={stockInputMap[product.id] ?? ''}
                          onChange={(e) =>
                            setStockInputMap((prev) => ({
                              ...prev,
                              [product.id]: e.target.value,
                            }))
                          }
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-9 text-xs font-bold dark:border-[#3A3035] dark:bg-[#252023] dark:text-white"
                          onClick={() => {
                            const raw = stockInputMap[product.id];
                            if (!raw) return;
                            void onAdjustStock({
                              productId: product.id,
                              newStock: Number(raw),
                              operatorUserId,
                              reason: 'Ajuste manual de stock en inventario',
                            });
                          }}
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                          Fijar Stock
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Vista Tablet / PC / POS (>= md): Tabla completa */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow className="border-neutral-200 bg-[#FAF7F9] dark:border-[#332B2F] dark:bg-[#221D20]">
                      <TableHead className="font-bold text-[#141213] dark:text-[#ECCCD9]">
                        Código de Barras / SKU
                      </TableHead>
                      <TableHead className="font-bold text-[#141213] dark:text-[#ECCCD9]">
                        Producto y Categoría
                      </TableHead>
                      <TableHead className="font-bold text-[#141213] dark:text-[#ECCCD9]">
                        Precio Venta (COP)
                      </TableHead>
                      <TableHead className="font-bold text-[#141213] dark:text-[#ECCCD9]">
                        Nivel de Stock y Límite de Aviso
                      </TableHead>
                      <TableHead className="text-right font-bold text-[#141213] dark:text-[#ECCCD9]">
                        Abastecimiento Rápido & Edición
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.map((product) => {
                      const isZero = product.stock === 0;
                      const pct = getProductPercent(product);
                      const limitPct = getProductConfiguredPercent(product);

                      return (
                        <TableRow
                          key={product.id}
                          className={`border-neutral-200 dark:border-[#332B2F] ${
                            isZero
                              ? 'bg-red-50/60 dark:bg-red-950/25'
                              : pct <= limitPct
                                ? 'bg-amber-50/35 dark:bg-amber-950/15'
                                : ''
                          }`}
                        >
                          <TableCell>
                            <div className="flex items-center gap-1.5 font-mono text-xs font-extrabold text-[#141213] dark:text-[#ECCCD9]">
                              <Barcode className="h-3.5 w-3.5" />
                              {product.barcode}
                            </div>
                            <div className="text-[11px] text-neutral-500 dark:text-[#B8A8B0]">
                              {product.sku}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-extrabold text-[#141213] dark:text-white">
                              {product.name}
                            </div>
                            <span className="mt-1 inline-block rounded-full border border-[#E4BDD0] bg-[#FAF2F6] px-2.5 py-0.5 text-[10px] font-bold text-[#141213] dark:border-[#3A3035] dark:bg-[#252023] dark:text-[#E5D8DF]">
                              {product.category}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="text-base font-black text-[#141213] dark:text-[#ECCCD9]">
                              {formatCop(product.priceCop)}
                            </div>
                            <div className="text-xs font-extrabold text-neutral-800 dark:text-[#E8DCE2] mt-0.5">
                              Costo: <span className="text-[#141213] dark:text-white font-black">{formatCop(product.costCop)}</span>
                            </div>
                          </TableCell>
                          <TableCell className="min-w-[260px]">
                            {renderStockProgressBar(product)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Input
                                type="number"
                                min={0}
                                className={`w-20 border-neutral-300 bg-white text-center text-xs font-bold text-[#141213] dark:border-[#3A3035] dark:bg-[#181517] dark:text-white ${
                                  isTouchMode ? 'h-9' : 'h-8'
                                }`}
                                placeholder={String(product.stock)}
                                value={stockInputMap[product.id] ?? ''}
                                onChange={(e) =>
                                  setStockInputMap((prev) => ({
                                    ...prev,
                                    [product.id]: e.target.value,
                                  }))
                                }
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    const raw = stockInputMap[product.id];
                                    if (!raw) return;
                                    void onAdjustStock({
                                      productId: product.id,
                                      newStock: Number(raw),
                                      operatorUserId,
                                      reason: 'Ajuste manual de stock en inventario',
                                    });
                                    setStockInputMap((prev) => ({
                                      ...prev,
                                      [product.id]: '',
                                    }));
                                  }
                                }}
                              />
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className={`text-xs font-bold dark:border-[#3A3035] dark:bg-[#252023] dark:text-white ${
                                  isTouchMode ? 'h-9 px-3' : 'h-8 px-2.5'
                                }`}
                                onClick={() => {
                                  const raw = stockInputMap[product.id];
                                  if (!raw) return;
                                  void onAdjustStock({
                                    productId: product.id,
                                    newStock: Number(raw),
                                    operatorUserId,
                                    reason: 'Ajuste manual de stock en inventario',
                                  });
                                  setStockInputMap((prev) => ({
                                    ...prev,
                                    [product.id]: '',
                                  }));
                                }}
                              >
                                <RefreshCw className="h-3 w-3" />
                                Fijar
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => openEditModal(product)}
                                className={`px-2.5 dark:border-[#3A3035] dark:bg-[#252023] dark:text-[#ECCCD9] ${
                                  isTouchMode ? 'h-9' : 'h-8'
                                }`}
                                title="Editar producto, descripción y límite de aviso (%)"
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <ProductFormModal
        isOpen={isModalOpen}
        editingProduct={editingProduct}
        existingProducts={products}
        prefilledBarcode={prefilledBarcode}
        operatorUserId={operatorUserId}
        onClose={() => setIsModalOpen(false)}
        onCreate={onCreateProduct}
        onUpdate={
          onUpdateProduct ??
          (async () => {
            /* fallback */
          })
        }
      />
    </div>
  );
}
