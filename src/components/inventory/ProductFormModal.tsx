'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Barcode,
  CheckCircle2,
  DollarSign,
  Layers,
  PackageCheck,
  PackagePlus,
  RefreshCw,
  Save,
  SlidersHorizontal,
  Tag,
  TrendingUp,
  X,
} from 'lucide-react';
import {
  CreateProductPayload,
  ProductItem,
  UpdateProductPayload,
} from '@/interfaces/inventory.interface';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatCop } from '@/lib/utils';

interface ProductFormModalProps {
  isOpen: boolean;
  editingProduct: ProductItem | null;
  existingProducts?: ProductItem[];
  prefilledBarcode?: string;
  operatorUserId: string;
  onClose: () => void;
  onCreate: (payload: CreateProductPayload) => Promise<void>;
  onUpdate: (payload: UpdateProductPayload) => Promise<void>;
}

const DEFAULT_CATEGORIES = [
  'Uñas y Nail Art',
  'Colorimetría',
  'Estética Facial',
  'Dotación Académica',
  'Peluquería & Barbería',
  'Kits Académicos',
];

const CATEGORIES_STORAGE_KEY = 'epb_product_categories';

const ALERT_PERCENT_PRESETS = [15, 20, 25, 30, 40, 50];

export function ProductFormModal({
  isOpen,
  editingProduct,
  existingProducts = [],
  prefilledBarcode,
  operatorUserId,
  onClose,
  onCreate,
  onUpdate,
}: ProductFormModalProps) {
  const [barcode, setBarcode] = useState('');
  const [registrationMode, setRegistrationMode] = useState<'NEW' | 'REPLACE_BARCODE'>('NEW');
  const [linkedExistingId, setLinkedExistingId] = useState<string>('');
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Uñas y Nail Art');
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [priceCop, setPriceCop] = useState<number>(45000);
  const [costCop, setCostCop] = useState<number>(22000);
  const [stock, setStock] = useState<number>(40);
  const [baseCapacity, setBaseCapacity] = useState<number>(50);
  const [alertPercent, setAlertPercent] = useState<number>(30);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const wasOpenRef = useRef<boolean>(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(CATEGORIES_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCategories(parsed);
        }
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  const saveCategoriesList = (next: string[]) => {
    setCategories(next);
    try {
      window.localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore storage errors
    }
  };

  const handleAddCategory = () => {
    const clean = category.trim();
    if (!clean) return;
    if (!categories.includes(clean)) {
      saveCategoriesList([...categories, clean]);
    }
  };

  const handleDeleteCategory = (catToRemove: string) => {
    const next = categories.filter((c) => c !== catToRemove);
    saveCategoriesList(next);
    if (category === catToRemove) {
      setCategory(next[0] ?? '');
    }
  };

  // Inicializar el formulario ÚNICAMENTE cuando el modal pasa de cerrado a abierto
  useEffect(() => {
    if (!isOpen) {
      wasOpenRef.current = false;
      return;
    }

    if (!wasOpenRef.current) {
      wasOpenRef.current = true;
      setErrorMsg(null);
      setRegistrationMode('NEW');
      setLinkedExistingId('');
      if (editingProduct) {
        setBarcode(editingProduct.barcode);
        setSku(editingProduct.sku);
        setName(editingProduct.name);
        setDescription(editingProduct.description ?? '');
        setCategory(editingProduct.category);
        setPriceCop(editingProduct.priceCop);
        setCostCop(editingProduct.costCop);
        setStock(editingProduct.stock);
        setBaseCapacity(
          Math.max(editingProduct.minStock, editingProduct.stock, 10)
        );
        setAlertPercent(editingProduct.alertPercent ?? 30);
      } else {
        setBarcode(prefilledBarcode || '');
        setSku('');
        setName('');
        setDescription('');
        setCategory('Uñas y Nail Art');
        setPriceCop(45000);
        setCostCop(22000);
        setStock(40);
        setBaseCapacity(50);
        setAlertPercent(30);
      }
    }
  }, [isOpen, editingProduct, prefilledBarcode]);

  // Si el modal YA está abierto y se escanea un nuevo código de barras, solo actualiza el campo barcode
  // sin reiniciar la pestaña elegida (Producto Nuevo vs Reemplazar Código) ni borrar los demás datos
  useEffect(() => {
    if (isOpen && wasOpenRef.current && prefilledBarcode) {
      setBarcode(prefilledBarcode);
    }
  }, [isOpen, prefilledBarcode]);

  const handleLinkToExistingProduct = (productId: string) => {
    setLinkedExistingId(productId);
    if (!productId) {
      setSku('');
      setName('');
      setDescription('');
      return;
    }
    const found = existingProducts.find((p) => p.id === productId);
    if (found) {
      setSku(found.sku);
      setName(found.name);
      setDescription(found.description ?? '');
      setCategory(found.category);
      setPriceCop(found.priceCop);
      setCostCop(found.costCop);
      setStock(found.stock);
      setBaseCapacity(Math.max(found.minStock, found.stock, 10));
      setAlertPercent(found.alertPercent ?? 30);
    }
  };

  if (!isOpen) return null;

  const numPrice = Math.max(0, Number(priceCop) || 0);
  const numCost = Math.max(0, Number(costCop) || 0);
  const profitPerUnit = Math.max(0, numPrice - numCost);
  const marginPct =
    numPrice > 0 ? Math.round((profitPerUnit / numPrice) * 100) : 0;

  const numStock = Math.max(0, Math.round(Number(stock) || 0));
  const safeBase = Math.max(
    Math.round(Number(baseCapacity) || 1),
    numStock,
    1
  );
  const safeAlertPct = Math.min(90, Math.max(5, Math.round(Number(alertPercent) || 30)));
  const alertUnitsAtThreshold = Math.max(
    1,
    Math.ceil((safeBase * safeAlertPct) / 100)
  );
  const currentPercent = Math.min(
    100,
    Math.max(0, Math.round((numStock / safeBase) * 100))
  );
  const isZero = numStock === 0;
  const isAlertActive = !isZero && currentPercent <= safeAlertPct;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!barcode.trim() || !name.trim() || !category.trim()) {
      setErrorMsg('Complete el código de barras, nombre y categoría.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: CreateProductPayload = {
        barcode: barcode.trim(),
        sku: sku.trim().toUpperCase(),
        name: name.trim(),
        description: description.trim() || null,
        category: category.trim(),
        priceCop: Math.max(100, Math.round(numPrice)),
        costCop: Math.max(0, Math.round(numCost)),
        stock: numStock,
        minStock: safeBase,
        alertPercent: safeAlertPct,
        operatorUserId,
      };

      const targetUpdateId = editingProduct?.id || linkedExistingId;
      if (targetUpdateId) {
        await onUpdate({ ...payload, id: targetUpdateId });
      } else {
        await onCreate(payload);
      }
      onClose();
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Error guardando producto'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-2.5 sm:p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative flex max-h-[94vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-[#E4BDD0] bg-white text-[#141213] shadow-2xl dark:border-[#3A3035] dark:bg-[#181517] dark:text-[#F5EEF1]">
        {/* Header Elegante */}
        <div className="flex items-center justify-between gap-3 border-b border-[#E4BDD0]/80 bg-gradient-to-r from-[#ECCCD9]/65 via-[#F6E4EC] to-[#FAF2F6] px-5 py-4 sm:px-6 dark:border-[#332B2F] dark:from-[#261F23] dark:via-[#201A1D] dark:to-[#181517]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#141213] text-[#ECCCD9] shadow-sm dark:bg-[#ECCCD9] dark:text-[#141213]">
              {editingProduct ? (
                <PackageCheck className="h-5 w-5" />
              ) : (
                <PackagePlus className="h-5 w-5" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-[#ECCCD9] px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-[#141213]">
                  {editingProduct ? 'Edición de Catálogo' : 'Nuevo Registro'}
                </span>
                {editingProduct && (
                  <span className="font-mono text-[11px] font-bold text-neutral-500 dark:text-[#C4B5BC]">
                    {editingProduct.sku}
                  </span>
                )}
              </div>
              <h2 className="mt-0.5 truncate font-serif text-base sm:text-lg font-bold text-[#141213] dark:text-[#F5EEF1]">
                {editingProduct
                  ? editingProduct.name
                  : 'Registrar Producto o Kit en Inventario'}
              </h2>
              <p className="mt-0.5 truncate text-xs font-medium text-neutral-600 dark:text-[#C4B5BC]">
                Aviso automático configurable al llegar al{' '}
                <strong className="font-black text-[#141213] dark:text-[#ECCCD9]">{safeAlertPct}%</strong>{' '}
                de su capacidad base ({alertUnitsAtThreshold} {alertUnitsAtThreshold === 1 ? 'unidad' : 'unidades'})
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-neutral-300 bg-white text-neutral-700 transition hover:bg-neutral-100 dark:border-white/15 dark:bg-[#252023] dark:text-neutral-200 dark:hover:bg-[#322B2F]"
            title="Cerrar ventana"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <form
          onSubmit={handleSubmit}
          className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6"
        >
          {errorMsg && (
            <div className="rounded-xl border border-red-400/60 bg-red-50 px-4 py-2.5 text-xs font-semibold text-red-900 dark:border-red-500/40 dark:bg-red-950/60 dark:text-red-200">
              {errorMsg}
            </div>
          )}

          {/* Decisión de Tipo de Operación: Producto Nuevo vs. Reemplazo de Código */}
          {!editingProduct && existingProducts.length > 0 && (
            <div className="rounded-2xl border border-[#E4BDD0] bg-[#FAF3F6] p-3.5 space-y-3 dark:border-[#3A3035] dark:bg-[#201B1E]">
              <div className="text-xs font-bold text-[#141213] dark:text-[#ECCCD9]">
                Tipo de operación en inventario
              </div>

              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => {
                    setRegistrationMode('NEW');
                    handleLinkToExistingProduct('');
                  }}
                  className={`flex items-start gap-3 rounded-xl border p-3 text-left transition ${
                    registrationMode === 'NEW'
                      ? 'border-[#141213] bg-[#141213] text-white shadow-xs dark:border-[#ECCCD9] dark:bg-[#ECCCD9] dark:!text-[#141213]'
                      : 'border-[#E2B5C9] bg-white text-[#141213] hover:bg-[#FAF0F5] dark:border-[#3A3035] dark:bg-[#161315] dark:text-white'
                  }`}
                >
                  <div
                    className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                      registrationMode === 'NEW'
                        ? 'bg-[#ECCCD9] text-[#141213] dark:bg-[#141213] dark:!text-[#ECCCD9]'
                        : 'bg-[#F5DCE7] text-[#141213] dark:bg-[#2A2327] dark:text-[#ECCCD9]'
                    }`}
                  >
                    <PackagePlus className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold">Producto Nuevo</div>
                    <div
                      className={`mt-0.5 text-[11px] leading-snug ${
                        registrationMode === 'NEW'
                          ? 'text-[#ECCCD9] dark:!text-[#141213]/80'
                          : 'text-neutral-500 dark:text-[#B8A9B1]'
                      }`}
                    >
                      Crear una referencia nueva desde cero
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setRegistrationMode('REPLACE_BARCODE');
                    if (!linkedExistingId && existingProducts[0]) {
                      handleLinkToExistingProduct(existingProducts[0].id);
                    }
                  }}
                  className={`flex items-start gap-3 rounded-xl border p-3 text-left transition ${
                    registrationMode === 'REPLACE_BARCODE'
                      ? 'border-[#141213] bg-[#141213] text-white shadow-xs dark:border-[#ECCCD9] dark:bg-[#ECCCD9] dark:!text-[#141213]'
                      : 'border-[#E2B5C9] bg-white text-[#141213] hover:bg-[#FAF0F5] dark:border-[#3A3035] dark:bg-[#161315] dark:text-white'
                  }`}
                >
                  <div
                    className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                      registrationMode === 'REPLACE_BARCODE'
                        ? 'bg-[#ECCCD9] text-[#141213] dark:bg-[#141213] dark:!text-[#ECCCD9]'
                        : 'bg-[#F5DCE7] text-[#141213] dark:bg-[#2A2327] dark:text-[#ECCCD9]'
                    }`}
                  >
                    <RefreshCw className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold">Reemplazar Código de Existente</div>
                    <div
                      className={`mt-0.5 text-[11px] leading-snug ${
                        registrationMode === 'REPLACE_BARCODE'
                          ? 'text-[#ECCCD9] dark:!text-[#141213]/80'
                          : 'text-neutral-500 dark:text-[#B8A9B1]'
                      }`}
                    >
                      El producto ya existe y cambió de código
                    </div>
                  </div>
                </button>
              </div>

              {registrationMode === 'REPLACE_BARCODE' && (
                <div className="space-y-1.5 border-t border-[#E8C8D7] pt-2.5 dark:border-[#332B2F]">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#141213] dark:text-[#ECCCD9]">
                    Seleccione el producto del catálogo al que se le actualizará el código:
                  </label>
                  <select
                    value={linkedExistingId}
                    onChange={(e) => handleLinkToExistingProduct(e.target.value)}
                    className="flex h-10 w-full rounded-xl border border-[#D9AFC2] bg-white px-3 text-xs font-bold text-[#141213] dark:border-[#3A3035] dark:bg-[#161315] dark:text-white"
                  >
                    {existingProducts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} — Cód. actual: {p.barcode} ({p.stock} uds)
                      </option>
                    ))}
                  </select>
                  {linkedExistingId && (
                    <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                      Se conservará el historial del producto seleccionado y se actualizará su código de barras.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Bloque 1: Identificación y Nombre */}
          <div className="rounded-2xl border border-neutral-200/90 bg-[#FAF8F9] p-4 space-y-3.5 dark:border-[#332B2F] dark:bg-[#201B1E]">
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <div className="flex flex-col">
                <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-[#141213] dark:text-[#ECCCD9]">
                  <Barcode className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">Código de Barras (USB) *</span>
                </label>
                <Input
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                    }
                  }}
                  placeholder="Ej: 770100100101"
                  className="h-10 font-mono text-sm font-bold border-neutral-300 bg-white text-[#141213] dark:border-[#3A3035] dark:bg-[#161315] dark:text-white"
                  required
                />
              </div>

              <div className="flex flex-col">
                <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-[#141213] dark:text-[#ECCCD9]">
                  <Tag className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">Referencia / SKU (Opcional)</span>
                </label>
                <Input
                  value={sku}
                  onChange={(e) => setSku(e.target.value.toUpperCase())}
                  placeholder="Opcional (ej: EPB-KIT-ACR)"
                  className="h-10 font-mono text-sm font-bold border-neutral-300 bg-white text-[#141213] dark:border-[#3A3035] dark:bg-[#161315] dark:text-white"
                />
              </div>
            </div>

            <div className="flex flex-col">
              <label className="mb-1.5 text-[11px] font-extrabold uppercase tracking-wider text-[#141213] dark:text-[#ECCCD9]">
                Nombre Comercial del Producto o Kit *
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Kit Profesional Acrílico & Monómero Organic EPB"
                className="h-10 text-sm font-semibold border-neutral-300 bg-white text-[#141213] dark:border-[#3A3035] dark:bg-[#161315] dark:text-white"
                required
              />
            </div>

            <div className="flex flex-col">
              <label className="mb-1.5 text-[11px] font-extrabold uppercase tracking-wider text-[#141213] dark:text-[#ECCCD9]">
                Descripción del Producto (Opcional)
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ej: Presentación 500ml, incluye activador y brocha..."
                className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-xs font-medium text-[#141213] outline-none transition focus:border-[#141213] dark:border-[#3A3035] dark:bg-[#161315] dark:text-white dark:focus:border-[#ECCCD9]"
              />
            </div>

            <div className="flex flex-col">
              <label className="mb-1.5 text-[11px] font-extrabold uppercase tracking-wider text-[#141213] dark:text-[#ECCCD9]">
                Categoría *
              </label>
              <div className="flex gap-2">
                <Input
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Escriba una nueva categoría o seleccione abajo"
                  className="h-10 text-sm font-semibold border-neutral-300 bg-white text-[#141213] dark:border-[#3A3035] dark:bg-[#161315] dark:text-white"
                  required
                />
                {category.trim() && !categories.includes(category.trim()) && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddCategory}
                    className="h-10 shrink-0 border-[#141213] bg-[#ECCCD9]/60 px-3 text-xs font-extrabold text-[#141213] hover:bg-[#ECCCD9]"
                  >
                    + Guardar Categoría
                  </Button>
                )}
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {categories.map((cat) => {
                  const active = category === cat;
                  return (
                    <div
                      key={cat}
                      className={`inline-flex items-center gap-1 rounded-full border pl-3 pr-1.5 py-1 text-[11px] font-extrabold transition ${
                        active
                          ? 'border-[#141213] bg-[#ECCCD9] text-[#141213] shadow-2xs'
                          : 'border-neutral-300 bg-white text-neutral-700 hover:bg-[#FAF0F5] dark:border-[#3A3035] dark:bg-[#161315] dark:text-[#E5D8DF]'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setCategory(cat)}
                        className="leading-none"
                      >
                        {cat}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteCategory(cat)}
                        title={`Eliminar categoría ${cat}`}
                        className="ml-0.5 rounded-full p-0.5 text-neutral-500 hover:bg-red-100 hover:text-red-700 dark:hover:bg-red-950/60 dark:hover:text-red-300"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Bloque 2: Precios y Rentabilidad (2 columnas simétricas) */}
          <div className="rounded-2xl border border-neutral-200/90 bg-[#FAF8F9] p-4 space-y-3 dark:border-[#332B2F] dark:bg-[#201B1E]">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-[#141213] dark:text-[#ECCCD9]">
                <DollarSign className="h-4 w-4" />
                Precios y Rentabilidad Unitaria
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-extrabold text-emerald-900 dark:bg-emerald-950/80 dark:text-emerald-300">
                <TrendingUp className="h-3 w-3" />
                Utilidad: {formatCop(profitPerUnit)} ({marginPct}%)
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <div className="flex flex-col">
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="text-xs font-bold text-neutral-900 dark:text-white">
                    Precio de Venta (COP) *
                  </label>
                  <span className="text-xs font-black text-[#141213] dark:text-[#ECCCD9]">
                    {formatCop(numPrice)}
                  </span>
                </div>
                <Input
                  type="number"
                  min={0}
                  step={500}
                  value={priceCop}
                  onChange={(e) => setPriceCop(Number(e.target.value))}
                  className="h-10 text-sm font-extrabold border-neutral-300 bg-white text-[#141213] dark:border-[#3A3035] dark:bg-[#161315] dark:text-white"
                  required
                />
              </div>

              <div className="flex flex-col">
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="text-xs font-bold text-neutral-900 dark:text-white">
                    Costo Base / Compra (COP)
                  </label>
                  <span className="text-xs font-black text-[#141213] dark:text-white">
                    {formatCop(numCost)}
                  </span>
                </div>
                <Input
                  type="number"
                  min={0}
                  step={500}
                  value={costCop}
                  onChange={(e) => setCostCop(Number(e.target.value))}
                  className="h-10 text-sm font-bold border-neutral-300 bg-white text-[#141213] dark:border-[#3A3035] dark:bg-[#161315] dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Bloque 3: Control de Stock y Límite de Aviso Configurable */}
          <div className="rounded-2xl border border-[#E4BDD0] bg-[#FAF2F6]/90 p-4 space-y-3.5 dark:border-[#3D2E35] dark:bg-[#231B20]">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-[#141213] dark:text-[#ECCCD9]">
                <Layers className="h-4 w-4" />
                Control de Existencias y Límite de Aviso (%)
              </span>
              <div className="flex items-center gap-1.5">
                {numStock < safeBase && (
                  <button
                    type="button"
                    onClick={() => setStock(safeBase)}
                    className="rounded-full border border-[#141213]/20 bg-white px-2.5 py-0.5 text-[11px] font-extrabold text-[#141213] transition hover:bg-[#ECCCD9] dark:border-white/20 dark:bg-[#161315] dark:text-[#ECCCD9]"
                  >
                    Igualar al 100% ({safeBase} uds)
                  </button>
                )}
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-black ${
                    isZero
                      ? 'bg-red-600 text-white'
                      : isAlertActive
                        ? 'bg-amber-500 text-[#141213]'
                        : 'bg-emerald-600 text-white'
                  }`}
                >
                  Nivel Actual: {currentPercent}%
                </span>
              </div>
            </div>

            {/* 3 Columnas Simétricas: Stock Actual | Capacidad Tope 100% | % Límite de Aviso */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="flex flex-col">
                <label className="mb-1.5 text-[11px] font-bold text-neutral-700 dark:text-[#C4B5BC]">
                  Stock Físico Actual *
                </label>
                <Input
                  type="number"
                  min={0}
                  value={stock}
                  onChange={(e) => setStock(Number(e.target.value))}
                  className="h-10 text-base font-black border-neutral-300 bg-white text-[#141213] dark:border-[#3A3035] dark:bg-[#161315] dark:text-white"
                  required
                />
              </div>

              <div className="flex flex-col">
                <label className="mb-1.5 text-[11px] font-bold text-neutral-700 dark:text-[#C4B5BC]">
                  Capacidad Tope 100% *
                </label>
                <Input
                  type="number"
                  min={1}
                  value={baseCapacity}
                  onChange={(e) => setBaseCapacity(Number(e.target.value))}
                  className="h-10 text-base font-black border-neutral-300 bg-white text-[#141213] dark:border-[#3A3035] dark:bg-[#161315] dark:text-white"
                  required
                />
              </div>

              <div className="flex flex-col">
                <label className="mb-1.5 flex items-center gap-1 text-[11px] font-extrabold text-[#141213] dark:text-[#ECCCD9]">
                  <SlidersHorizontal className="h-3 w-3" />
                  Límite de Aviso (%) *
                </label>
                <Input
                  type="number"
                  min={5}
                  max={90}
                  value={alertPercent}
                  onChange={(e) => setAlertPercent(Number(e.target.value))}
                  className="h-10 text-base font-black border-[#141213] bg-white text-[#141213] dark:border-[#ECCCD9] dark:bg-[#161315] dark:text-[#ECCCD9]"
                  required
                />
              </div>
            </div>

            {/* Píldoras rápidas para elegir el porcentaje límite de aviso */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] font-bold text-neutral-600 dark:text-[#C4B5BC]">
                Porcentaje rápido de aviso:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {ALERT_PERCENT_PRESETS.map((pctPreset) => {
                  const active = safeAlertPct === pctPreset;
                  return (
                    <button
                      key={pctPreset}
                      type="button"
                      onClick={() => setAlertPercent(pctPreset)}
                      className={`rounded-lg border px-2.5 py-1 text-xs font-extrabold transition ${
                        active
                          ? 'border-[#141213] bg-[#141213] text-[#ECCCD9] shadow-2xs dark:border-[#ECCCD9] dark:bg-[#ECCCD9] dark:text-[#141213]'
                          : 'border-neutral-300 bg-white text-neutral-700 hover:bg-[#ECCCD9]/50 dark:border-[#3A3035] dark:bg-[#161315] dark:text-[#E5D8DF]'
                      }`}
                    >
                      {pctPreset}%
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Barra de Progreso Mejorada con Línea Dinámica al % Configurado */}
            <div className="space-y-1.5 rounded-xl border border-[#E4BDD0]/80 bg-white p-3 dark:border-[#332B2F] dark:bg-[#171416]">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="flex items-center gap-1.5 font-extrabold text-[#141213] dark:text-white">
                  {isZero || isAlertActive ? (
                    <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  )}
                  Avisará cuando queden &le; {alertUnitsAtThreshold} unidades (
                  {safeAlertPct}% de {safeBase})
                </span>
                <span
                  className={`text-[11px] font-extrabold ${
                    isZero
                      ? 'text-red-600 dark:text-red-400'
                      : isAlertActive
                        ? 'text-amber-700 dark:text-amber-300'
                        : 'text-emerald-700 dark:text-emerald-400'
                  }`}
                >
                  {isZero
                    ? 'AGOTADO (0%)'
                    : isAlertActive
                      ? `En zona de alerta (≤ ${safeAlertPct}%)`
                      : `Stock óptimo (> ${safeAlertPct}%)`}
                </span>
              </div>

              <div className="relative h-3 w-full overflow-hidden rounded-full border border-neutral-300/80 bg-neutral-200 p-0.5 dark:border-[#3A3035] dark:bg-[#262023]">
                {/* Marcador vertical dinámico según el % configurado */}
                <div
                  className="absolute inset-y-0 z-10 w-0.5 bg-[#141213] transition-all duration-300 dark:bg-white"
                  style={{ left: `${safeAlertPct}%` }}
                />
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    isZero
                      ? 'bg-red-600'
                      : isAlertActive
                        ? 'bg-gradient-to-r from-red-500 to-amber-500'
                        : 'bg-gradient-to-r from-emerald-600 to-emerald-500'
                  }`}
                  style={{ width: `${Math.max(4, currentPercent)}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[10px] font-semibold text-neutral-500 dark:text-[#B8A8B0]">
                <span>0 uds (0%)</span>
                <span className="font-extrabold text-amber-800 dark:text-amber-300">
                  ▲ Alerta {safeAlertPct}% ({alertUnitsAtThreshold} uds)
                </span>
                <span>Tope: {safeBase} uds (100%)</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2.5 border-t border-neutral-200 pt-3.5 dark:border-[#332B2F]">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="h-10 px-4 font-bold dark:border-[#3A3035] dark:bg-[#221D20] dark:text-neutral-200"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="pink"
              disabled={isSubmitting}
              className="h-10 gap-1.5 bg-[#ECCCD9] px-5 font-extrabold text-[#141213] hover:bg-[#E4BDD0]"
            >
              <Save className="h-4 w-4" />
              {isSubmitting
                ? 'Guardando...'
                : editingProduct
                  ? 'Actualizar Producto'
                  : 'Guardar Producto'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
