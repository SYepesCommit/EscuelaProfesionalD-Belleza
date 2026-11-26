'use client';

import React, { useCallback, useMemo, useState } from 'react';
import {
  Banknote,
  Barcode,
  CheckCircle2,
  CreditCard,
  Fingerprint,
  KeyRound,
  Lock,
  Plus,
  Printer,
  Receipt,
  Search,
  ShieldAlert,
  ShieldCheck,
  ShoppingCart,
  Smartphone,
  Sparkles,
  Trash2,
  Unlock,
  Vault,
  X,
} from 'lucide-react';
import {
  BiometricActionConfirmModal,
  AuthorizedUserResult,
} from '@/components/auth/BiometricActionConfirmModal';
import { ProductItem } from '@/interfaces/inventory.interface';
import {
  CartSaleItem,
  CreateSalePayload,
  PaymentMethodType,
  SaleRecordItem,
} from '@/interfaces/sale.interface';
import { useBarcodeScanner } from '@/hooks/useBarcodeScanner';
import { useUiMode } from '@/hooks/useUiMode';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TouchNumpad } from '@/components/ui/touch-numpad';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatCop, formatDateTimeCo } from '@/lib/utils';
import { CashRegisterModal } from './CashRegisterModal';
import { ThermalTicketModal } from './ThermalTicketModal';

interface PosBarcodeCheckoutProps {
  products: ProductItem[];
  cart: CartSaleItem[];
  sales: SaleRecordItem[];
  onAddProduct: (product: ProductItem) => void;
  onRemoveItem: (productId: string) => void;
  onCompleteSale: (payload: Omit<CreateSalePayload, 'items'>) => Promise<void>;
}

const CASH_DENOMINATIONS_COP = [20000, 50000, 100000, 150000, 200000];

export function PosBarcodeCheckout({
  products,
  cart,
  sales,
  onAddProduct,
  onRemoveItem,
  onCompleteSale,
}: PosBarcodeCheckoutProps) {
  const { isTouchMode } = useUiMode();

  const [manualBarcode, setManualBarcode] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [closingSellerSecretCode, setClosingSellerSecretCode] =
    useState('CAMILA-888');
  const [clientDocument, setClientDocument] = useState('');
  const [clientName, setClientName] = useState('');
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethodType>('EFECTIVO');
  const [discountCop, setDiscountCop] = useState<number>(0);
  const [cashReceivedCop, setCashReceivedCop] = useState<number>(0);
  const [activeNumpadField, setActiveNumpadField] = useState<
    'barcode' | 'document'
  >('document');
  const [lastScannedNotice, setLastScannedNotice] = useState<string | null>(
    null
  );
  const [selectedTicketSale, setSelectedTicketSale] =
    useState<SaleRecordItem | null>(null);

  // Estados de Caja Registradora, Gaveta y Candado de Descuentos
  const [isCashRegisterOpen, setIsCashRegisterOpen] = useState(false);
  const [isDiscountUnlocked, setIsDiscountUnlocked] = useState(false);
  const [discountSupervisorName, setDiscountSupervisorName] = useState<string | null>(null);
  const [isDrawerOpening, setIsDrawerOpening] = useState(false);

  // Modales Biométricos para Acciones Financieras
  const [biometricModal, setBiometricModal] = useState<{
    isOpen: boolean;
    purpose: 'CASHIER_LOGIN' | 'OPEN_DRAWER' | 'AUTHORIZE_DISCOUNT';
    title: string;
    description: string;
    requiredRoles?: ('ADMIN' | 'ASESOR' | 'VENTA' | 'CONTABILIDAD')[];
  }>({
    isOpen: false,
    purpose: 'CASHIER_LOGIN',
    title: '',
    description: '',
  });

  const [activeCashierName, setActiveCashierName] = useState<string>('Laura Ríos (Ejecutiva A)');

  const handleBarcodeLookup = useCallback(
    (code: string) => {
      const clean = code.trim();
      if (!clean) return;
      const found = products.find((p) => p.barcode === clean);
      if (found) {
        onAddProduct(found);
        setLastScannedNotice(
          `Agregado al carrito: ${found.name} (${formatCop(found.priceCop)})`
        );
      } else {
        setLastScannedNotice(`Código de barras ${clean} no registrado`);
      }
    },
    [onAddProduct, products]
  );

  useBarcodeScanner({
    onScan: (ev) => handleBarcodeLookup(ev.barcode),
  });

  const categories = useMemo(() => {
    const s = new Set<string>();
    products.forEach((p) => s.add(p.category));
    return Array.from(s);
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (categoryFilter !== 'ALL' && p.category !== categoryFilter) return false;
      if (productSearch.trim()) {
        const q = productSearch.toLowerCase();
        const mName = p.name.toLowerCase().includes(q);
        const mCode = p.barcode.toLowerCase().includes(q);
        const mSku = p.sku.toLowerCase().includes(q);
        if (!mName && !mCode && !mSku) return false;
      }
      return true;
    });
  }, [products, categoryFilter, productSearch]);

  const subtotalCop = useMemo(
    () =>
      cart.reduce((acc, item) => acc + item.unitPriceCop * item.quantity, 0),
    [cart]
  );
  const maxAllowedDiscountWithoutPin = Math.floor(subtotalCop * 0.1); // Máximo 10% libre
  const isDiscountOverLimit = discountCop > maxAllowedDiscountWithoutPin;

  const handleTriggerOpenDrawer = () => {
    setBiometricModal({
      isOpen: true,
      purpose: 'OPEN_DRAWER',
      title: 'Apertura de Gaveta de Dinero (Cajón Monedero)',
      description:
        'Por seguridad antifraude y control financiero, la apertura manual de la gaveta exige confirmación por huella dactilar del cajero o administrador.',
      requiredRoles: ['ADMIN', 'VENTA'],
    });
  };

  const executeDrawerOpen = async (user: AuthorizedUserResult) => {
    try {
      setIsDrawerOpening(true);
      const res = await fetch('/api/cash-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'DRAWER_OPEN',
          cashierCode: user.sellerSecretCode || user.userId,
          reason: `Apertura manual autorizada por huella dactilar de ${user.fullName} (${user.role})`,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      setLastScannedNotice(`Gaveta abierta: Autorizado por huella de ${user.fullName}`);
    } catch (err) {
      setLastScannedNotice(
        err instanceof Error ? err.message : 'Error al abrir gaveta'
      );
    } finally {
      setIsDrawerOpening(false);
    }
  };

  const handleTriggerDiscountAuthorization = () => {
    setBiometricModal({
      isOpen: true,
      purpose: 'AUTHORIZE_DISCOUNT',
      title: 'Autorización de Descuento Especial (> 10%)',
      description:
        'El descuento solicitado supera el límite permitido. Exige validación obligatoria con huella dactilar de un Administrador / Supervisor.',
      requiredRoles: ['ADMIN'],
    });
  };

  const executeDiscountAuthorization = (user: AuthorizedUserResult) => {
    setIsDiscountUnlocked(true);
    setDiscountSupervisorName(user.fullName);
    setLastScannedNotice(
      `Descuento especial superior al 10% autorizado con huella de ${user.fullName} (Administración).`
    );
  };

  const handleTriggerChangeCashier = () => {
    setBiometricModal({
      isOpen: true,
      purpose: 'CASHIER_LOGIN',
      title: 'Cambio de Cajero por Huella Dactilar',
      description:
        'Identifíquese con su huella biométrica para registrar sus ventas y comisiones.',
      requiredRoles: ['ADMIN', 'VENTA', 'ASESOR'],
    });
  };

  const executeCashierLogin = (user: AuthorizedUserResult) => {
    setClosingSellerSecretCode(user.sellerSecretCode || 'LAURA-777');
    setActiveCashierName(user.fullName);
    setLastScannedNotice(`Cajero activo cambiado a: ${user.fullName}`);
  };

  const handleBiometricAuthorized = async (user: AuthorizedUserResult) => {
    if (biometricModal.purpose === 'OPEN_DRAWER') {
      await executeDrawerOpen(user);
    } else if (biometricModal.purpose === 'AUTHORIZE_DISCOUNT') {
      executeDiscountAuthorization(user);
    } else if (biometricModal.purpose === 'CASHIER_LOGIN') {
      executeCashierLogin(user);
    }
  };

  const safeDiscountCop = isDiscountOverLimit && !isDiscountUnlocked
    ? maxAllowedDiscountWithoutPin
    : Math.min(subtotalCop, Math.max(0, Number(discountCop) || 0));

  const totalToPayCop = Math.max(0, subtotalCop - safeDiscountCop);
  const changeToReturnCop =
    paymentMethod === 'EFECTIVO' && cashReceivedCop > totalToPayCop
      ? cashReceivedCop - totalToPayCop
      : 0;

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;
    try {
      await onCompleteSale({
        closingSellerSecretCode: closingSellerSecretCode.trim().toUpperCase(),
        clientDocument: clientDocument.trim() || undefined,
        clientName: clientName.trim() || 'Cliente Mostrador',
        paymentMethod,
        discountCop: safeDiscountCop,
      });
      setDiscountCop(0);
      setCashReceivedCop(0);
      setLastScannedNotice(
        'Venta facturada con éxito. Comisión asignada según regla de blindaje.'
      );
    } catch (err) {
      setLastScannedNotice(
        err instanceof Error ? err.message : 'Error al facturar'
      );
    }
  };

  return (
    <div className="space-y-6 min-w-0">
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Columna Izquierda (2/3): Muro POS de Productos y Escáner */}
        <Card className="overflow-hidden border-[#E4BDD0] bg-white lg:col-span-2 dark:border-[#332B2F] dark:bg-[#1B181A]">
          <CardHeader className="border-b border-[#E4BDD0]/60 bg-gradient-to-r from-[#ECCCD9]/50 to-[#FAF2F6] p-4 sm:p-5 dark:border-[#332B2F] dark:from-[#241E21] dark:to-[#1B181A]">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg font-bold text-[#141213] dark:text-[#F5EEF1]">
                  <Barcode className="h-5 w-5 text-[#141213] dark:text-[#ECCCD9]" />
                  {isTouchMode
                    ? 'Muro Táctil POS de Productos & Escáner USB'
                    : 'Terminal Punto de Venta (POS) con Escáner USB'}
                </CardTitle>
                <CardDescription className="text-xs text-neutral-600 dark:text-[#C4B5BC]">
                  {isTouchMode
                    ? 'Toque cualquier producto con el dedo o pistolee el código de barras'
                    : 'Pistolee el código de barras o haga clic en un producto para agregarlo'}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleTriggerOpenDrawer}
                  disabled={isDrawerOpening}
                  className="h-8 gap-1.5 text-xs font-bold border-neutral-300 bg-white text-[#141213] hover:bg-[#FAF2F6] dark:border-[#3A3035] dark:bg-[#252023] dark:text-[#ECCCD9]"
                  title="Apertura física de gaveta de dinero con confirmación de huella (queda registrado en auditoría)"
                >
                  <Fingerprint className="h-3.5 w-3.5 text-emerald-600" />
                  <span>{isDrawerOpening ? 'Abriendo...' : 'Abrir Gaveta'}</span>
                </Button>
                <Button
                  type="button"
                  variant="pink"
                  size="sm"
                  onClick={() => setIsCashRegisterOpen(true)}
                  className="h-8 gap-1.5 text-xs font-black bg-gradient-to-r from-[#ECCCD9] to-[#E4BDD0] !text-[#141213] border border-[#D9AFC2] shadow-xs hover:brightness-95 dark:from-[#ECCCD9] dark:to-[#E4BDD0] dark:!text-[#141213]"
                >
                  <Banknote className="h-3.5 w-3.5 text-[#141213]" />
                  <span>Arqueo y Cierre Z</span>
                </Button>
                <span className="hidden sm:inline-block rounded-full bg-[#ECCCD9] px-3 py-1 text-xs font-extrabold text-[#141213]">
                  {isTouchMode ? 'Modo Táctil POS' : 'Modo Escritorio'}
                </span>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4 p-4 sm:p-5">
            {/* Barra de Pistoleo Manual y Búsqueda */}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div className="flex gap-2">
                <Input
                  placeholder="Pistolear código (Ej: 770100100101)..."
                  value={manualBarcode}
                  onFocus={() => setActiveNumpadField('barcode')}
                  onChange={(e) => setManualBarcode(e.target.value)}
                  className={`border-neutral-300 bg-white font-mono text-xs text-[#141213] dark:border-[#3A3035] dark:bg-[#221D20] dark:text-white ${
                    isTouchMode ? 'h-12 text-sm' : 'h-10'
                  }`}
                />
                <Button
                  type="button"
                  variant="pink"
                  onClick={() => {
                    handleBarcodeLookup(manualBarcode);
                    setManualBarcode('');
                  }}
                  className={`shrink-0 bg-[#ECCCD9] font-extrabold text-[#141213] hover:bg-[#E4BDD0] ${
                    isTouchMode ? 'h-12 px-4' : 'h-10 px-3 text-xs'
                  }`}
                >
                  <Barcode className="h-4 w-4" />
                  <span>+ Código</span>
                </Button>
              </div>

              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                <Input
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Filtrar productos por nombre o SKU..."
                  className={`border-neutral-300 bg-white pl-9 text-xs text-[#141213] dark:border-[#3A3035] dark:bg-[#221D20] dark:text-white ${
                    isTouchMode ? 'h-12 text-sm' : 'h-10'
                  }`}
                />
              </div>
            </div>

            {/* Píldoras de Categorías */}
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCategoryFilter('ALL')}
                className={`rounded-xl border px-3 py-1 text-xs font-extrabold transition ${
                  categoryFilter === 'ALL'
                    ? 'border-[#141213] bg-[#ECCCD9] text-[#141213]'
                    : 'border-neutral-200 bg-[#FAF7F9] text-neutral-700 dark:border-[#3A3035] dark:bg-[#221D20] dark:text-[#E5D8DF]'
                }`}
              >
                Todos ({products.length})
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoryFilter(cat)}
                  className={`rounded-xl border px-3 py-1 text-xs font-extrabold transition ${
                    categoryFilter === cat
                      ? 'border-[#141213] bg-[#ECCCD9] text-[#141213]'
                      : 'border-neutral-200 bg-[#FAF7F9] text-neutral-700 hover:bg-[#FAF0F5] dark:border-[#3A3035] dark:bg-[#221D20] dark:text-[#E5D8DF]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {lastScannedNotice && (
              <div className="flex items-center justify-between gap-2 rounded-xl border border-[#E4BDD0] bg-[#FAF2F6] px-4 py-2.5 text-xs font-bold text-[#141213] dark:border-[#3A3035] dark:bg-[#252023] dark:text-[#ECCCD9]">
                <div className="flex items-center gap-2 min-w-0">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <span className="truncate">{lastScannedNotice}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setLastScannedNotice(null)}
                  className="underline shrink-0"
                >
                  Ocultar
                </button>
              </div>
            )}

            {/* Muro de Productos: Tarjetas Táctiles */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {filteredProducts.map((p) => {
                const isOut = p.stock <= 0;
                return (
                  <button
                    key={p.id}
                    type="button"
                    disabled={isOut}
                    onClick={() => handleBarcodeLookup(p.barcode)}
                    className={`flex min-w-0 flex-col justify-between rounded-2xl border-2 text-left shadow-xs transition active:scale-[0.98] ${
                      isOut
                        ? 'cursor-not-allowed border-neutral-200 bg-neutral-100 opacity-55 dark:border-[#2C2528] dark:bg-[#161315]'
                        : isTouchMode
                          ? 'min-h-[120px] border-[#E4BDD0] bg-white p-4 hover:border-[#141213] dark:border-[#3A3035] dark:bg-[#221D20] dark:hover:border-[#ECCCD9]'
                          : 'border-neutral-200 bg-white p-3.5 hover:border-[#141213] hover:bg-[#FAF2F6]/40 dark:border-[#332B2F] dark:bg-[#221D20] dark:hover:border-[#ECCCD9]'
                    }`}
                  >
                    <div className="flex w-full items-start justify-between gap-2">
                      <span className="font-mono text-[11px] font-bold text-neutral-500 dark:text-[#C4B5BC]">
                        {p.barcode}
                      </span>
                      <Badge
                        variant={
                          isOut
                            ? 'destructive'
                            : p.isLowStock
                              ? 'warning'
                              : 'secondary'
                        }
                      >
                        Stock: {p.stock}
                      </Badge>
                    </div>

                    <div
                      className={`mt-1.5 font-extrabold text-[#141213] dark:text-white ${
                        isTouchMode ? 'text-base leading-snug' : 'text-xs'
                      }`}
                    >
                      {p.name}
                    </div>

                    <div className="mt-2.5 flex w-full items-center justify-between border-t border-neutral-100 pt-2 dark:border-[#332B2F]">
                      <span
                        className={`font-serif font-black text-[#141213] dark:text-[#ECCCD9] ${
                          isTouchMode ? 'text-xl' : 'text-sm'
                        }`}
                      >
                        {formatCop(p.priceCop)}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-xl bg-[#ECCCD9] px-2.5 py-1 text-[11px] font-extrabold text-[#141213]">
                        <Plus className="h-3.5 w-3.5" />
                        {isTouchMode ? 'TOCAR +1' : 'Agregar'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Teclado Numérico Táctil en Pantalla (Solo en Modo Táctil POS) */}
            {isTouchMode && (
              <div className="pt-2">
                <div className="mb-2 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={
                      activeNumpadField === 'document' ? 'pink' : 'outline'
                    }
                    onClick={() => setActiveNumpadField('document')}
                    className="font-extrabold"
                  >
                    Digitar Cédula Cliente en Pantalla
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={
                      activeNumpadField === 'barcode' ? 'pink' : 'outline'
                    }
                    onClick={() => setActiveNumpadField('barcode')}
                    className="font-extrabold"
                  >
                    Digitar Código de Barras en Pantalla
                  </Button>
                </div>

                <TouchNumpad
                  label={
                    activeNumpadField === 'document'
                      ? 'Teclado Táctil: Cédula del Cliente'
                      : 'Teclado Táctil: Código de Barras'
                  }
                  value={
                    activeNumpadField === 'document'
                      ? clientDocument
                      : manualBarcode
                  }
                  onChange={(val) =>
                    activeNumpadField === 'document'
                      ? setClientDocument(val)
                      : setManualBarcode(val)
                  }
                  onConfirm={
                    activeNumpadField === 'barcode'
                      ? () => {
                          handleBarcodeLookup(manualBarcode);
                          setManualBarcode('');
                        }
                      : undefined
                  }
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Columna Derecha (1/3): Carrito, Calculadora de Efectivo y Cobro */}
        <Card className="overflow-hidden border-[#E4BDD0] bg-white dark:border-[#3A3035] dark:bg-[#1B181A]">
          <CardHeader className="border-b border-[#E4BDD0]/60 bg-gradient-to-r from-[#ECCCD9]/60 to-[#FAF2F6] p-4 text-[#141213] dark:border-[#332B2F] dark:from-[#251E22] dark:to-[#1B181A] dark:text-[#F5EEF1]">
            <CardTitle className="flex items-center justify-between text-base font-bold text-[#141213] dark:text-[#F5EEF1]">
              <span>Resumen de Compra y Cobro</span>
              <ShoppingCart className="h-5 w-5 text-[#141213] dark:text-[#ECCCD9]" />
            </CardTitle>
            <CardDescription className="text-xs font-medium text-neutral-600 dark:text-[#C4B5BC]">
              Valida automáticamente si el cliente tiene protección de 3 días / 24h
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 p-4">
            {/* Items del Carrito */}
            <div className="max-h-56 space-y-2 overflow-y-auto">
              {cart.map((item) => (
                <div
                  key={item.productId}
                  className="flex items-center justify-between gap-2 rounded-xl border border-neutral-200 bg-[#FAF7F9] p-3 text-xs dark:border-[#332B2F] dark:bg-[#221D20]"
                >
                  <div className="min-w-0">
                    <div className="truncate font-extrabold text-[#141213] dark:text-white">
                      {item.name}
                    </div>
                    <div className="text-neutral-600 dark:text-[#C4B5BC]">
                      {item.quantity} × {formatCop(item.unitPriceCop)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-black text-[#141213] dark:text-[#ECCCD9]">
                      {formatCop(item.quantity * item.unitPriceCop)}
                    </span>
                    <button
                      type="button"
                      onClick={() => onRemoveItem(item.productId)}
                      className="rounded-lg bg-red-100 p-1.5 text-red-700 hover:bg-red-200 dark:bg-red-950/70 dark:text-red-300"
                      title="Quitar producto"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
              {cart.length === 0 && (
                <div className="rounded-xl border border-dashed border-neutral-300 py-8 text-center text-xs text-neutral-500 dark:border-[#3A3035] dark:text-[#B8A8B0]">
                  Toque o pistolee un producto para iniciar la venta
                </div>
              )}
            </div>

            <form
              onSubmit={handleCheckout}
              className="space-y-3 border-t border-neutral-200 pt-3 dark:border-[#332B2F]"
            >
              {/* Cajero / Vendedor Responsable de Facturar (Biométrico) */}
              <div className="space-y-1.5 rounded-xl border border-neutral-200 bg-[#FAF7F9] p-3 dark:border-[#332B2F] dark:bg-[#201C1E]">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-[#141213] dark:text-[#F5EEF1] flex items-center gap-1.5">
                    <Fingerprint className="h-4 w-4 text-emerald-600" />
                    Cajero Identificado por Huella:
                  </Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleTriggerChangeCashier}
                    className="h-7 text-[10px] font-bold gap-1 border-neutral-300 dark:border-[#3A3035]"
                  >
                    <Fingerprint className="h-3 w-3" />
                    Cambiar Huella
                  </Button>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="font-extrabold text-xs text-[#141213] dark:text-white">
                    {activeCashierName}
                  </span>
                  <Badge variant="pink" className="text-[10px] font-bold">
                    Autenticado por Biometría USB
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-[#141213] dark:text-[#F5EEF1]">
                    Cédula Cliente (Opcional)
                  </Label>
                  <Input
                    value={clientDocument}
                    onFocus={() => setActiveNumpadField('document')}
                    onChange={(e) => setClientDocument(e.target.value)}
                    placeholder="Ej: 1055889900"
                    className="h-9 text-xs font-bold border-neutral-300 bg-white text-[#141213] dark:border-[#3A3035] dark:bg-[#221D20] dark:text-white"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold text-[#141213] dark:text-[#F5EEF1]">
                    Nombre Cliente
                  </Label>
                  <Input
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Cliente Mostrador (por defecto)"
                    className="h-9 text-xs border-neutral-300 bg-white text-[#141213] dark:border-[#3A3035] dark:bg-[#221D20] dark:text-white"
                  />
                </div>
              </div>

              {/* Medio de Pago */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-[#141213] dark:text-[#F5EEF1]">
                  Medio de Pago
                </Label>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { id: 'EFECTIVO', label: 'Efectivo', icon: Banknote },
                      {
                        id: 'TRANSFERENCIA',
                        label: 'Nequi/Transf',
                        icon: Smartphone,
                      },
                      { id: 'TARJETA', label: 'Tarjeta', icon: CreditCard },
                    ] as const
                  ).map((m) => {
                    const Icon = m.icon;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setPaymentMethod(m.id)}
                        className={`flex flex-col items-center justify-center gap-1 rounded-xl border py-2.5 text-xs font-extrabold transition ${
                          paymentMethod === m.id
                            ? 'border-[#141213] bg-[#ECCCD9] text-[#141213]'
                            : 'border-neutral-300 bg-white text-neutral-700 dark:border-[#3A3035] dark:bg-[#221D20] dark:text-[#E5D8DF]'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        <span>{m.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Descuento Opcional con Candado de Autorización si supera el 10% */}
              <div className="space-y-1.5 rounded-xl border border-neutral-200 bg-[#FAF7F9] p-2.5 dark:border-[#332B2F] dark:bg-[#201C1E]">
                <div className="flex items-center justify-between gap-2">
                  <Label className="text-xs font-bold text-neutral-600 dark:text-[#C4B5BC] flex items-center gap-1">
                    {isDiscountOverLimit && !isDiscountUnlocked ? (
                      <Lock className="h-3.5 w-3.5 text-amber-600" />
                    ) : (
                      <Unlock className="h-3.5 w-3.5 text-emerald-600" />
                    )}
                    Descuento (COP):
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    step={1000}
                    value={discountCop || ''}
                    onChange={(e) => {
                      setDiscountCop(Number(e.target.value));
                      if (Number(e.target.value) <= maxAllowedDiscountWithoutPin) {
                        setIsDiscountUnlocked(false);
                      }
                    }}
                    placeholder="0"
                    className="h-8 w-32 text-right text-xs font-bold border-neutral-300 bg-white text-[#141213] dark:border-[#3A3035] dark:bg-[#221D20] dark:text-white"
                  />
                </div>

                {isDiscountOverLimit && !isDiscountUnlocked ? (
                  <div className="rounded-lg border border-amber-300 bg-amber-50 p-2.5 text-[11px] text-amber-900 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-200 space-y-2">
                    <div className="flex items-center gap-1 font-bold">
                      <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0" />
                      Supera el 10% permitido ({formatCop(maxAllowedDiscountWithoutPin)}). Exige Huella de Supervisor:
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleTriggerDiscountAuthorization}
                      className="h-8 w-full gap-2 text-xs font-extrabold bg-amber-600 hover:bg-amber-700 text-white shadow-sm"
                    >
                      <Fingerprint className="h-4 w-4" />
                      Autorizar Descuento con Huella
                    </Button>
                  </div>
                ) : isDiscountUnlocked && discountSupervisorName ? (
                  <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-2 text-[11px] font-bold text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200 flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Descuento autorizado por huella de {discountSupervisorName}</span>
                  </div>
                ) : null}
              </div>

              {/* Calculadora de Billetes y Cambio en Efectivo */}
              {paymentMethod === 'EFECTIVO' && totalToPayCop > 0 && (
                <div className="space-y-2 rounded-xl border border-[#E4BDD0] bg-[#FAF2F6] p-3 dark:border-[#3A3035] dark:bg-[#221D20]">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[#141213] dark:text-[#ECCCD9]">
                      Efectivo Recibido (COP):
                    </span>
                    <Input
                      type="number"
                      min={0}
                      step={1000}
                      value={cashReceivedCop || ''}
                      onChange={(e) =>
                        setCashReceivedCop(Number(e.target.value))
                      }
                      placeholder={String(totalToPayCop)}
                      className="h-8 w-32 text-right text-xs font-extrabold border-neutral-300 bg-white text-[#141213] dark:border-[#3A3035] dark:bg-[#171416] dark:text-white"
                    />
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <button
                      type="button"
                      onClick={() => setCashReceivedCop(totalToPayCop)}
                      className="rounded-lg border border-neutral-300 bg-white px-2 py-0.5 text-[10px] font-extrabold text-[#141213] dark:border-[#3A3035] dark:bg-[#171416] dark:text-[#ECCCD9]"
                    >
                      Exacto
                    </button>
                    {CASH_DENOMINATIONS_COP.map((bill) => (
                      <button
                        key={bill}
                        type="button"
                        onClick={() => setCashReceivedCop(bill)}
                        className="rounded-lg border border-neutral-300 bg-white px-2 py-0.5 text-[10px] font-bold text-[#141213] hover:bg-[#ECCCD9] dark:border-[#3A3035] dark:bg-[#171416] dark:text-white"
                      >
                        {formatCop(bill)}
                      </button>
                    ))}
                  </div>
                  {cashReceivedCop >= totalToPayCop && (
                    <div className="flex items-center justify-between border-t border-[#E4BDD0]/60 pt-1.5 text-xs dark:border-[#332B2F]">
                      <span className="font-bold text-emerald-800 dark:text-emerald-300">
                        Cambio a Devolver:
                      </span>
                      <span className="text-sm font-black text-emerald-700 dark:text-emerald-300">
                        {formatCop(changeToReturnCop)}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Total a Cobrar */}
              <div className="flex items-center justify-between rounded-xl bg-gradient-to-r from-[#ECCCD9]/40 to-[#FAF2F6] border-2 border-[#E4BDD0] p-3.5 text-[#141213] dark:border-[#3A3035] dark:from-[#251E22] dark:to-[#1B181A] dark:text-white">
                <span className="text-xs font-black uppercase text-[#141213] dark:text-[#ECCCD9]">
                  Total a Cobrar:
                </span>
                <span className="text-2xl font-black tracking-tight text-[#141213] dark:text-white">
                  {formatCop(totalToPayCop)}
                </span>
              </div>

              <Button
                type="submit"
                variant="pink"
                className={`w-full gap-2 bg-[#ECCCD9] font-extrabold text-[#141213] hover:bg-[#E4BDD0] ${
                  isTouchMode ? 'h-14 text-base' : 'h-11 text-sm'
                }`}
                disabled={cart.length === 0}
              >
                <KeyRound className="h-5 w-5" />
                <span>COBRAR Y LIQUIDAR COMISIÓN</span>
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Historial de Ventas y Trazabilidad de Comisiones */}
      <Card className="overflow-hidden border-[#E4BDD0] bg-white dark:border-[#332B2F] dark:bg-[#1B181A]">
        <CardHeader className="border-b border-[#E4BDD0]/60 bg-[#FAF2F6]/60 p-4 sm:p-5 dark:border-[#332B2F] dark:bg-[#221D20]">
          <CardTitle className="flex items-center gap-2 text-base font-bold text-[#141213] dark:text-[#F5EEF1]">
            <Receipt className="h-5 w-5 text-[#141213] dark:text-[#ECCCD9]" />
            Historial de Facturas POS y Trazabilidad de Comisiones ({sales.length})
          </CardTitle>
        </CardHeader>

        <CardContent className="p-0">
          {/* Vista Móvil (< md) */}
          <div className="divide-y divide-neutral-200 md:hidden dark:divide-[#332B2F]">
            {sales.map((sale) => (
              <div key={sale.id} className="space-y-2 p-4 text-xs">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-mono font-extrabold text-[#141213] dark:text-[#ECCCD9]">
                      {sale.invoiceNumber}
                    </span>
                    <div className="text-[11px] text-neutral-500 dark:text-[#B8A8B0]">
                      {formatDateTimeCo(sale.createdAt)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-base font-black text-[#141213] dark:text-white">
                      {formatCop(sale.totalCop)}
                    </div>
                    <div className="text-xs font-black text-emerald-800 dark:text-emerald-400">
                      Comisión: {formatCop(sale.commissionAmountCop)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-neutral-700 dark:text-[#E5D8DF]">
                  <span>Cliente: <strong>{sale.clientName}</strong></span>
                  <span className="rounded-full bg-[#ECCCD9] px-2 py-0.5 text-[10px] font-extrabold text-[#141213]">
                    Comisión: {sale.commissionedSellerName}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-neutral-500 dark:text-[#B8A8B0]">
                    {sale.protectionRuleApplied}
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedTicketSale(sale)}
                    className="h-7 gap-1 px-2 text-[11px] font-bold dark:border-[#3A3035] dark:bg-[#252023] dark:text-white"
                  >
                    <Printer className="h-3 w-3" />
                    Ticket
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Vista Desktop (>= md) */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow className="border-neutral-200 bg-[#FAF7F9] dark:border-[#332B2F] dark:bg-[#221D20]">
                  <TableHead className="font-bold text-[#141213] dark:text-[#ECCCD9]">
                    Factura / Fecha
                  </TableHead>
                  <TableHead className="font-bold text-[#141213] dark:text-[#ECCCD9]">
                    Cliente
                  </TableHead>
                  <TableHead className="font-bold text-[#141213] dark:text-[#ECCCD9]">
                    Cerró en Caja
                  </TableHead>
                  <TableHead className="font-bold text-[#141213] dark:text-[#ECCCD9]">
                    Recibe la Comisión
                  </TableHead>
                  <TableHead className="font-bold text-[#141213] dark:text-[#ECCCD9]">
                    Regla de Protección Aplicada
                  </TableHead>
                  <TableHead className="text-right font-bold text-[#141213] dark:text-[#ECCCD9]">
                    Total / Comisión
                  </TableHead>
                  <TableHead className="text-right font-bold text-[#141213] dark:text-[#ECCCD9]">
                    Ticket
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.map((sale) => (
                  <TableRow
                    key={sale.id}
                    className="border-neutral-200 dark:border-[#332B2F]"
                  >
                    <TableCell>
                      <div className="font-mono text-xs font-extrabold text-[#141213] dark:text-[#ECCCD9]">
                        {sale.invoiceNumber}
                      </div>
                      <div className="text-[11px] text-neutral-500 dark:text-[#B8A8B0]">
                        {formatDateTimeCo(sale.createdAt)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-bold text-[#141213] dark:text-white">
                        {sale.clientName}
                      </div>
                      <div className="text-xs text-neutral-500 dark:text-[#B8A8B0]">
                        CC: {sale.clientDocument ?? 'Mostrador'}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs font-semibold text-[#141213] dark:text-[#E5D8DF]">
                      {sale.closingSellerName}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex rounded-full bg-[#ECCCD9] px-2.5 py-0.5 text-xs font-extrabold text-[#141213]">
                        {sale.commissionedSellerName}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-xs text-xs text-neutral-600 dark:text-[#C4B5BC]">
                      {sale.protectionRuleApplied}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="font-black text-[#141213] dark:text-white">
                        {formatCop(sale.totalCop)}
                      </div>
                      <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                        Comisión: {formatCop(sale.commissionAmountCop)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedTicketSale(sale)}
                        className="h-8 gap-1 text-xs font-bold dark:border-[#3A3035] dark:bg-[#252023] dark:text-white"
                      >
                        <Printer className="h-3.5 w-3.5" />
                        <span>Ticket</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Modal de Tirilla / Ticket Térmico POS (80mm con detalle de productos y datos de la escuela) */}
      <ThermalTicketModal
        sale={selectedTicketSale}
        onClose={() => setSelectedTicketSale(null)}
      />

      {/* Modal de Arqueo y Cierre Diario de Caja (Turno Z) */}
      <CashRegisterModal
        isOpen={isCashRegisterOpen}
        onClose={() => setIsCashRegisterOpen(false)}
        defaultCashierCode={closingSellerSecretCode}
      />

      {/* Modal de Confirmación y Autorización Biométrica por Huella USB */}
      <BiometricActionConfirmModal
        isOpen={biometricModal.isOpen}
        title={biometricModal.title}
        description={biometricModal.description}
        requiredRoles={biometricModal.requiredRoles}
        onClose={() => setBiometricModal((prev) => ({ ...prev, isOpen: false }))}
        onAuthorized={handleBiometricAuthorized}
      />
    </div>
  );
}
