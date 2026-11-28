'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  Banknote,
  Calendar,
  CheckCircle2,
  DollarSign,
  Eye,
  Lock,
  Printer,
  TrendingDown,
  TrendingUp,
  Wallet,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { formatCop, formatDateTimeCo } from '@/lib/utils';
import { printThermalHtml } from '@/lib/thermal-print';
import { useAuthSession } from '@/hooks/useAuthSession';

interface CashRegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultCashierCode: string;
}

interface CashRegisterData {
  date: string;
  summary: {
    openingBaseCop?: number;
    collectedCashCop?: number;
    outflowsTotalCop?: number;
    expectedCashCop: number;
    expectedTransfCop: number;
    expectedCardCop: number;
    grandTotalCop: number;
  };
  outflowsList?: Array<{
    id: string;
    amountCop: number;
    concept: string;
    authorizedBy: string;
    createdAt: string;
  }>;
  breakdown: {
    sales: {
      count: number;
      cashCop: number;
      transferCop: number;
      cardCop: number;
      totalCop: number;
    };
    studentPayments: {
      count: number;
      cashCop: number;
      transferCop: number;
      cardCop: number;
      totalCop: number;
    };
    fines: {
      count: number;
      cashCop: number;
      transferCop: number;
      cardCop: number;
      totalCop: number;
    };
  };
  salesToday?: {
    id: string;
    invoiceNumber: string;
    clientName: string;
    totalCop: number;
    paymentMethod: string;
    protectionRuleApplied: string;
  }[];
}

function getTodayIsoDate(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function CashRegisterModal({
  isOpen,
  onClose,
  defaultCashierCode,
}: CashRegisterModalProps) {
  const { user: sessionUser } = useAuthSession();

  // Pestañas organizadas:
  // 1. 'CONSULTA': Ver cuánto se vendió en cualquier fecha (sin cerrar turno)
  // 2. 'BASE_Y_GASTOS': Registrar Base Inicial con la que arranca el cajón y Salidas de caja menor
  // 3. 'CIERRE_Z': Contar billetes al final de la jornada y guardar acta de cuadre
  const [activeTab, setActiveTab] = useState<'CONSULTA' | 'BASE_Y_GASTOS' | 'CIERRE_Z'>('CONSULTA');
  const [selectedDate, setSelectedDate] = useState<string>(getTodayIsoDate());

  const [data, setData] = useState<CashRegisterData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Importante: El dinero físico contado empieza VACÍO ('') para que el cajero cuente los billetes al final
  const [physicalCashInput, setPhysicalCashInput] = useState<string>('');
  const [openingBaseInputCop, setOpeningBaseInputCop] = useState<number>(0);
  const [outflowAmountCop, setOutflowAmountCop] = useState<number>(0);
  const [outflowConcept, setOutflowConcept] = useState<string>('');
  const [closureNotes, setClosureNotes] = useState('');
  const [closureResult, setClosureResult] = useState<{
    statusText: string;
    differenceCop: number;
    closedBy: string;
    closedAt: string;
  } | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const effectiveCashierCode =
    sessionUser?.accessCode || defaultCashierCode || 'ADMIN-01';

  const loadCashData = useCallback(async (dateStr: string) => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/cash-register?date=${encodeURIComponent(dateStr)}`, {
        cache: 'no-store',
      });
      if (!res.ok) throw new Error('Error al cargar datos de caja');
      const json = (await res.json()) as CashRegisterData;
      setData(json);
      setOpeningBaseInputCop(json.summary.openingBaseCop ?? 0);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setMessage(null);
      setClosureResult(null);
      setPhysicalCashInput('');
      setActiveTab('CONSULTA');
      void loadCashData(selectedDate);
    }
  }, [isOpen, selectedDate, loadCashData]);

  const handleSetOpeningBase = async () => {
    try {
      setIsLoading(true);
      setMessage(null);
      const res = await fetch('/api/cash-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SET_OPENING_BASE',
          cashierCode: effectiveCashierCode.trim().toUpperCase(),
          amountCop: Math.max(0, Number(openingBaseInputCop) || 0),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Error guardando base inicial');
      setMessage(json.message);
      await loadCashData(selectedDate);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Error fijando base de caja');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterOutflow = async () => {
    if (!outflowAmountCop || outflowAmountCop <= 0 || outflowConcept.trim().length < 3) {
      setMessage('Indique monto válido y concepto de la salida de caja menor');
      return;
    }
    try {
      setIsLoading(true);
      setMessage(null);
      const res = await fetch('/api/cash-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CASH_OUTFLOW',
          cashierCode: effectiveCashierCode.trim().toUpperCase(),
          amountCop: Number(outflowAmountCop),
          concept: outflowConcept.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Error registrando gasto');
      setOutflowAmountCop(0);
      setOutflowConcept('');
      setMessage(json.message);
      await loadCashData(selectedDate);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Error en salida de caja');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (physicalCashInput.trim() === '') {
      setMessage('Por favor digite cuánto dinero físico contó en la gaveta al final del turno.');
      return;
    }

    try {
      setIsLoading(true);
      setMessage(null);
      const res = await fetch('/api/cash-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CLOSE_SHIFT',
          cashierCode: effectiveCashierCode.trim().toUpperCase(),
          physicalCashCop: Math.max(0, Number(physicalCashInput) || 0),
          notes: closureNotes.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Error guardando arqueo');

      setClosureResult({
        statusText: json.report.statusText,
        differenceCop: json.report.differenceCop,
        closedBy: json.report.closedBy,
        closedAt: json.report.closedAt,
      });
      setMessage(json.message);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Error al guardar cierre');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const expectedCash = data?.summary.expectedCashCop ?? 0;
  const hasTypedPhysicalCash = physicalCashInput.trim() !== '';
  const physicalCashNum = Number(physicalCashInput) || 0;
  const difference = physicalCashNum - expectedCash;
  const isToday = selectedDate === getTodayIsoDate();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-2xl max-h-[93vh] overflow-y-auto rounded-3xl border border-[#E4BDD0] bg-white text-[#141213] shadow-2xl dark:border-[#3A3035] dark:bg-[#181517] dark:text-[#F5EEF1]">
        {/* Cabecera con Selector de Fecha */}
        <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 bg-gradient-to-r from-[#ECCCD9]/55 to-[#FAF2F6] px-5 py-4 dark:border-[#332B2F] dark:from-[#251E22] dark:to-[#1B181A]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#141213] text-[#ECCCD9] dark:bg-[#ECCCD9] dark:text-[#141213]">
              <Banknote className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-serif text-base sm:text-lg font-bold">
                Consulta de Caja, Base Inicial y Cierre Diario
              </h2>
              <p className="text-xs text-neutral-600 dark:text-[#C4B5BC]">
                Consulte las ventas de cualquier día sin cerrar turno, o realice el conteo final
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-xl border border-[#D9AFC2] bg-white px-2.5 py-1 dark:border-[#3A3035] dark:bg-[#181517]">
              <Calendar className="h-3.5 w-3.5 text-[#7A1E46] dark:text-[#ECCCD9]" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-xs font-bold text-[#141213] outline-none dark:text-white"
              />
              {!isToday && (
                <button
                  type="button"
                  onClick={() => setSelectedDate(getTodayIsoDate())}
                  className="rounded bg-[#ECCCD9] px-1.5 py-0.5 text-[10px] font-bold !text-[#141213]"
                >
                  Hoy
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-1.5 text-neutral-500 hover:bg-neutral-200 dark:hover:bg-[#332B2F]"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Barra de 3 Pestañas Claras */}
        <div className="grid grid-cols-3 gap-1.5 border-b border-[#F0DCE5] bg-[#FAF3F6] px-5 py-2.5 dark:border-[#2C2528] dark:bg-[#201B1E]">
          <button
            type="button"
            onClick={() => setActiveTab('CONSULTA')}
            className={`flex items-center justify-center gap-1.5 rounded-xl py-2 px-2 text-xs font-bold transition ${
              activeTab === 'CONSULTA'
                ? 'bg-[#141213] text-[#ECCCD9] shadow-2xs dark:bg-[#ECCCD9] dark:!text-[#141213]'
                : 'bg-white text-neutral-700 hover:bg-[#FAF0F5] dark:bg-[#161315] dark:text-[#C7B8C0]'
            }`}
          >
            <Eye className="h-3.5 w-3.5" />
            <span>1. Ver Ventas del Día</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('BASE_Y_GASTOS')}
            className={`flex items-center justify-center gap-1.5 rounded-xl py-2 px-2 text-xs font-bold transition ${
              activeTab === 'BASE_Y_GASTOS'
                ? 'bg-[#141213] text-[#ECCCD9] shadow-2xs dark:bg-[#ECCCD9] dark:!text-[#141213]'
                : 'bg-white text-neutral-700 hover:bg-[#FAF0F5] dark:bg-[#161315] dark:text-[#C7B8C0]'
            }`}
          >
            <Wallet className="h-3.5 w-3.5" />
            <span>2. Base Inicial y Gastos</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('CIERRE_Z')}
            className={`flex items-center justify-center gap-1.5 rounded-xl py-2 px-2 text-xs font-bold transition ${
              activeTab === 'CIERRE_Z'
                ? 'bg-[#141213] text-[#ECCCD9] shadow-2xs dark:bg-[#ECCCD9] dark:!text-[#141213]'
                : 'bg-white text-neutral-700 hover:bg-[#FAF0F5] dark:bg-[#161315] dark:text-[#C7B8C0]'
            }`}
          >
            <Lock className="h-3.5 w-3.5" />
            <span>3. Conteo Final (Cierre)</span>
          </button>
        </div>

        <div className="p-5 space-y-4">
          {message && (
            <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-xs font-bold text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
              {message}
            </div>
          )}

          {/* Tarjetas Superiores Siempre Visibles: ¿Cuánto hay hoy en Caja? */}
          {data && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-neutral-200 bg-[#FAF7F9] p-3 text-center dark:border-[#332B2F] dark:bg-[#221D20]">
                <span className="text-xs font-bold text-neutral-700 dark:text-[#E8DCE2] block">
                  Efectivo Esperado en Cajón
                </span>
                <span className="text-lg font-black text-emerald-700 dark:text-emerald-400">
                  {formatCop(data.summary.expectedCashCop)}
                </span>
                <span className="block text-[10px] text-neutral-500">
                  Base ({formatCop(data.summary.openingBaseCop ?? 0)}) + Efectivo - Gastos
                </span>
              </div>
              <div className="rounded-2xl border border-neutral-200 bg-[#FAF7F9] p-3 text-center dark:border-[#332B2F] dark:bg-[#221D20]">
                <span className="text-xs font-bold text-neutral-700 dark:text-[#E8DCE2] block">
                  Transferencias / Nequi
                </span>
                <span className="text-lg font-black text-sky-700 dark:text-sky-400">
                  {formatCop(data.summary.expectedTransfCop)}
                </span>
                <span className="block text-[10px] text-neutral-500">
                  Dinero en cuentas bancarias
                </span>
              </div>
              <div className="rounded-2xl border-2 border-[#E4BDD0] bg-[#ECCCD9]/40 p-3 text-center dark:border-[#3A3035] dark:bg-[#2A2226]">
                <span className="text-xs font-bold text-[#141213] dark:text-[#ECCCD9] block">
                  Total Vendido / Recaudado ({selectedDate})
                </span>
                <span className="text-xl font-black text-[#141213] dark:text-white">
                  {formatCop(data.summary.grandTotalCop)}
                </span>
                <span className="block text-[10px] text-neutral-600 dark:text-[#C4B5BC]">
                  Ventas POS + Abonos + Multas
                </span>
              </div>
            </div>
          )}

          {/* =====================================================================
              PESTAÑA 1: CONSULTA EN VIVO DE VENTAS Y TRANSFERENCIAS DE LA FECHA
              ===================================================================== */}
          {activeTab === 'CONSULTA' && data && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-neutral-200 bg-white p-4 space-y-3 text-xs dark:border-[#332B2F] dark:bg-[#221D20]">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#141213] dark:text-[#ECCCD9]">
                    Desglose de Ingresos del Día ({selectedDate}):
                  </span>
                  <Badge variant="outline" className="text-[10px]">
                    Solo Consulta • No cierra turno
                  </Badge>
                </div>

                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3 text-center">
                  <div className="rounded-xl border border-neutral-200 bg-[#FAF7F9] p-3 dark:border-neutral-800 dark:bg-[#1A1719]">
                    <span className="font-bold text-[#141213] dark:text-white block">
                      Ventas Tienda POS
                    </span>
                    <span className="text-[11px] text-neutral-500">
                      {data.breakdown.sales.count} facturas
                    </span>
                    <div className="mt-1 text-sm font-black text-[#141213] dark:text-[#ECCCD9]">
                      {formatCop(data.breakdown.sales.totalCop)}
                    </div>
                    <div className="mt-0.5 text-[10px] text-neutral-500">
                      Efec: {formatCop(data.breakdown.sales.cashCop)} • Transf:{' '}
                      {formatCop(data.breakdown.sales.transferCop)}
                    </div>
                  </div>

                  <div className="rounded-xl border border-neutral-200 bg-[#FAF7F9] p-3 dark:border-neutral-800 dark:bg-[#1A1719]">
                    <span className="font-bold text-[#141213] dark:text-white block">
                      Abonos de Alumnas
                    </span>
                    <span className="text-[11px] text-neutral-500">
                      {data.breakdown.studentPayments.count} recibos
                    </span>
                    <div className="mt-1 text-sm font-black text-emerald-700 dark:text-emerald-400">
                      {formatCop(data.breakdown.studentPayments.totalCop)}
                    </div>
                    <div className="mt-0.5 text-[10px] text-neutral-500">
                      Efec: {formatCop(data.breakdown.studentPayments.cashCop)} • Transf:{' '}
                      {formatCop(data.breakdown.studentPayments.transferCop)}
                    </div>
                  </div>

                  <div className="rounded-xl border border-neutral-200 bg-[#FAF7F9] p-3 dark:border-neutral-800 dark:bg-[#1A1719]">
                    <span className="font-bold text-[#141213] dark:text-white block">
                      Multas Pagadas
                    </span>
                    <span className="text-[11px] text-neutral-500">
                      {data.breakdown.fines.count} multas
                    </span>
                    <div className="mt-1 text-sm font-black text-rose-700 dark:text-rose-400">
                      {formatCop(data.breakdown.fines.totalCop)}
                    </div>
                    <div className="mt-0.5 text-[10px] text-neutral-500">
                      Efec: {formatCop(data.breakdown.fines.cashCop)} • Transf:{' '}
                      {formatCop(data.breakdown.fines.transferCop)}
                    </div>
                  </div>
                </div>

                {/* Lista de Transferencias Recibidas en esa Fecha */}
                {data.salesToday &&
                  data.salesToday.some((s) => s.paymentMethod === 'TRANSFERENCIA') && (
                    <div className="mt-3 rounded-xl border border-sky-200 bg-sky-50/50 p-3 space-y-1.5 dark:border-sky-900/40 dark:bg-sky-950/20">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-sky-950 dark:text-sky-200">
                        Detalle de Transferencias POS en esta fecha:
                      </div>
                      <div className="max-h-36 overflow-y-auto divide-y divide-sky-200/60 dark:divide-sky-900/40 text-xs">
                        {data.salesToday
                          .filter((s) => s.paymentMethod === 'TRANSFERENCIA')
                          .map((s) => {
                            const refMatch = s.protectionRuleApplied.split('• Cuenta/Ref:')[1];
                            return (
                              <div
                                key={s.id}
                                className="flex items-center justify-between py-1.5 gap-2"
                              >
                                <div className="truncate">
                                  <strong className="font-mono">{s.invoiceNumber}</strong> &bull;{' '}
                                  {s.clientName}{' '}
                                  {refMatch && (
                                    <span className="font-bold text-sky-800 dark:text-sky-300">
                                      [{refMatch.trim()}]
                                    </span>
                                  )}
                                </div>
                                <span className="font-bold text-sky-900 dark:text-sky-200 shrink-0">
                                  {formatCop(s.totalCop)}
                                </span>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  )}
              </div>

              <div className="flex items-center justify-between pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const html = `
                      <div class="center">
                        <div class="title">ESCUELA PROFESIONAL D' BELLEZA</div>
                        <div class="subtitle bold">CONSULTA PARCIAL DE CAJA (${selectedDate})</div>
                      </div>
                      <div class="divider"></div>
                      <div class="row"><span>Base Inicial:</span><span>${formatCop(data.summary.openingBaseCop ?? 0)}</span></div>
                      <div class="row"><span>Recaudo Efectivo:</span><span>${formatCop(data.summary.collectedCashCop ?? 0)}</span></div>
                      <div class="row"><span>Salidas Caja Menor:</span><span>-${formatCop(data.summary.outflowsTotalCop ?? 0)}</span></div>
                      <div class="row bold"><span>Efectivo Esperado:</span><span>${formatCop(data.summary.expectedCashCop)}</span></div>
                      <div class="row"><span>Transferencias:</span><span>${formatCop(data.summary.expectedTransfCop)}</span></div>
                      <div class="divider"></div>
                      <div class="total-row"><span>TOTAL DÍA:</span><span>${formatCop(data.summary.grandTotalCop)}</span></div>
                    `;
                    printThermalHtml('Consulta_Parcial_Caja_EPB', html);
                  }}
                  className="text-xs font-bold gap-1.5"
                >
                  <Printer className="h-3.5 w-3.5" />
                  Imprimir Resumen del Día (80mm)
                </Button>

                <Button
                  type="button"
                  variant="pink"
                  onClick={onClose}
                  className="bg-[#ECCCD9] text-xs font-bold text-[#141213]"
                >
                  Cerrar Consulta
                </Button>
              </div>
            </div>
          )}

          {/* =====================================================================
              PESTAÑA 2: BASE INICIAL DE APERTURA (+) Y GASTOS DE CAJA MENOR (-)
              ===================================================================== */}
          {activeTab === 'BASE_Y_GASTOS' && data && (
            <div className="space-y-4">
              {/* Bloque A: Base Inicial de Apertura */}
              <div className="rounded-2xl border border-[#E4BDD0] bg-[#FDF8FA] p-4 space-y-3 text-xs dark:border-[#3A3035] dark:bg-[#1E1A1C]">
                <div>
                  <h3 className="text-sm font-bold text-[#141213] dark:text-white">
                    1. Base Inicial del Cajón (Dinero Sencillo al Abrir en la Mañana)
                  </h3>
                  <p className="text-[11px] text-neutral-600 dark:text-[#B8A9B1]">
                    Es el efectivo con el que empieza la caja para dar devueltas. Se suma al efectivo esperado pero <strong>no</strong> llena el conteo final.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {[50000, 100000, 150000, 200000].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setOpeningBaseInputCop(preset)}
                      className="rounded-lg border border-[#E2B5C9] bg-white px-3 py-1.5 text-xs font-bold text-[#141213] hover:bg-[#FAF0F5] dark:border-[#382F34] dark:bg-[#141213] dark:text-[#ECCCD9]"
                    >
                      {formatCop(preset)}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    step={10000}
                    value={openingBaseInputCop || ''}
                    onChange={(e) => setOpeningBaseInputCop(Number(e.target.value))}
                    placeholder="Monto de la base inicial ($)"
                    className="h-10 max-w-xs text-sm font-bold"
                  />
                  <Button
                    type="button"
                    onClick={handleSetOpeningBase}
                    disabled={isLoading}
                    className="h-10 bg-[#141213] text-xs font-bold text-[#ECCCD9] dark:bg-[#ECCCD9] dark:!text-[#141213]"
                  >
                    Guardar Base Inicial
                  </Button>
                </div>
              </div>

              {/* Bloque B: Salidas / Gastos de Caja Menor */}
              <div className="rounded-2xl border border-neutral-200 bg-white p-4 space-y-3 text-xs dark:border-[#332B2F] dark:bg-[#221D20]">
                <div>
                  <h3 className="text-sm font-bold text-rose-700 dark:text-rose-400">
                    2. Registrar Salida o Gasto de Caja Menor (-)
                  </h3>
                  <p className="text-[11px] text-neutral-600 dark:text-[#B8A9B1]">
                    Si sacas efectivo del cajón para pagar un domicilio, agua o papelería, regístralo aquí para que se descuente del efectivo esperado.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-12">
                  <div className="sm:col-span-4">
                    <Input
                      type="number"
                      min={1000}
                      step={1000}
                      value={outflowAmountCop || ''}
                      onChange={(e) => setOutflowAmountCop(Number(e.target.value))}
                      placeholder="Valor en COP ($)"
                      className="h-10 text-xs font-bold"
                    />
                  </div>
                  <div className="sm:col-span-5">
                    <Input
                      value={outflowConcept}
                      onChange={(e) => setOutflowConcept(e.target.value)}
                      placeholder="Motivo (Ej: Domicilio insumos)"
                      className="h-10 text-xs"
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleRegisterOutflow}
                      disabled={isLoading}
                      className="h-10 w-full border-rose-300 text-xs font-bold text-rose-700 hover:bg-rose-50"
                    >
                      - Descontar Gasto
                    </Button>
                  </div>
                </div>

                {data.outflowsList && data.outflowsList.length > 0 && (
                  <div className="mt-2 divide-y divide-neutral-200 border-t border-neutral-200 pt-2 dark:divide-[#332B2F] dark:border-[#332B2F]">
                    {data.outflowsList.map((out) => (
                      <div key={out.id} className="flex items-center justify-between py-1.5">
                        <span>
                          <strong>{out.concept}</strong> ({out.authorizedBy})
                        </span>
                        <span className="font-bold text-rose-600">
                          -{formatCop(out.amountCop)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* =====================================================================
              PESTAÑA 3: CONTEO FÍSICO AL FINAL DEL DÍA (CIERRE DE TURNO Z)
              ===================================================================== */}
          {activeTab === 'CIERRE_Z' && (
            <>
              {!closureResult ? (
                <form onSubmit={handleCloseShift} className="space-y-4">
                  <div className="rounded-2xl border-2 border-[#E4BDD0] bg-[#FAF2F6]/60 p-4 space-y-3 dark:border-[#3A3035] dark:bg-[#251E22]">
                    <div className="text-xs text-neutral-600 dark:text-[#C4B5BC]">
                      <strong>¿Qué hace este cierre?</strong> Al terminar la jornada, cuente los billetes y monedas que hay físicamente en la gaveta y escríbalos abajo. El sistema comparará lo que usted contó contra los{' '}
                      <strong>{formatCop(expectedCash)}</strong> esperados y guardará el comprobante en Auditoría.
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <Label className="text-xs font-black text-[#141213] dark:text-[#F5EEF1] flex items-center gap-1.5">
                        <DollarSign className="h-4 w-4 text-emerald-600" />
                        Dinero Físico Contado al Final del Turno (COP):
                      </Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setPhysicalCashInput(String(expectedCash))}
                        className="h-7 text-[10px] font-bold"
                      >
                        Igualar a Esperado ({formatCop(expectedCash)})
                      </Button>
                    </div>

                    <Input
                      type="number"
                      min={0}
                      step={500}
                      value={physicalCashInput}
                      onChange={(e) => setPhysicalCashInput(e.target.value)}
                      placeholder="Escriba aquí cuánto dinero contó en el cajón..."
                      required
                      className="h-12 text-xl font-black tracking-tight text-right border-neutral-300 bg-white text-[#141213] dark:border-[#3A3035] dark:bg-[#181517] dark:text-white"
                    />

                    {/* Termómetro de Cuadre (Solo aparece cuando ya escribió lo que contó) */}
                    {hasTypedPhysicalCash && (
                      <div className="flex items-center justify-between pt-1 text-xs">
                        <span className="font-bold text-neutral-600 dark:text-[#C4B5BC]">
                          Resultado (Contado - Esperado):
                        </span>
                        <div className="flex items-center gap-1.5 font-black">
                          {difference === 0 ? (
                            <span className="text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                              <CheckCircle2 className="h-4 w-4" /> CUADRE EXACTO ($0 COP)
                            </span>
                          ) : difference > 0 ? (
                            <span className="text-sky-700 dark:text-sky-400 flex items-center gap-1">
                              <TrendingUp className="h-4 w-4" /> SOBRANTE: +{formatCop(difference)}
                            </span>
                          ) : (
                            <span className="text-rose-700 dark:text-rose-400 flex items-center gap-1">
                              <TrendingDown className="h-4 w-4" /> FALTANTE: {formatCop(difference)}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-[#141213] dark:text-[#F5EEF1]">
                      Observaciones del Cierre (Opcional):
                    </Label>
                    <Input
                      value={closureNotes}
                      onChange={(e) => setClosureNotes(e.target.value)}
                      placeholder="Ej: Turno entregado cuadrado, se deja base de $100.000 para mañana"
                      className="h-10 text-xs"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setActiveTab('CONSULTA')}
                      className="font-bold text-xs"
                    >
                      Volver a Consulta
                    </Button>
                    <Button
                      type="submit"
                      variant="pink"
                      disabled={isLoading || !hasTypedPhysicalCash}
                      className="bg-gradient-to-r from-[#ECCCD9] to-[#E4BDD0] !text-[#141213] border border-[#D9AFC2] font-extrabold gap-2 text-xs"
                    >
                      <Lock className="h-4 w-4 text-[#141213]" />
                      <span>GUARDAR ACTA DE CIERRE DIARIO (REPORTE Z)</span>
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-3 rounded-2xl border border-neutral-300 bg-[#FAF7F9] p-5 font-mono text-xs dark:border-[#3A3035] dark:bg-[#201B1E]">
                    <div className="text-center">
                      <div className="font-serif text-base font-black">
                        ESCUELA PROFESIONAL D&apos; BELLEZA
                      </div>
                      <div className="text-[11px] font-bold text-[#141213] dark:text-[#ECCCD9] mt-1">
                        *** ACTA DE CIERRE DIARIO (REPORTE Z) ***
                      </div>
                      <div className="text-[10px] text-neutral-500">
                        {formatDateTimeCo(closureResult.closedAt)}
                      </div>
                    </div>

                    <div className="space-y-1 border-y border-dashed border-neutral-300 py-2 dark:border-[#3A3035]">
                      <div className="flex justify-between">
                        <span>Responsable:</span>
                        <strong>{closureResult.closedBy}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Efectivo Esperado en Gaveta:</span>
                        <span>{formatCop(expectedCash)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Efectivo Físico Contado:</span>
                        <strong>{formatCop(physicalCashNum)}</strong>
                      </div>
                      <div className="flex justify-between border-t border-neutral-200 pt-1 font-bold">
                        <span>Resultado de Cuadre:</span>
                        <span>{closureResult.statusText}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        const html = `
                          <div class="center">
                            <div class="title">ESCUELA PROFESIONAL D' BELLEZA</div>
                            <div class="bold" style="margin-top:4px;">*** CIERRE DIARIO (REPORTE Z) ***</div>
                            <div class="subtitle">${formatDateTimeCo(closureResult.closedAt)}</div>
                          </div>
                          <div class="divider"></div>
                          <div class="row"><span>Responsable:</span><span class="bold">${closureResult.closedBy}</span></div>
                          <div class="row"><span>Efectivo Esperado:</span><span>${formatCop(expectedCash)}</span></div>
                          <div class="row"><span>Efectivo Contado:</span><span class="bold">${formatCop(physicalCashNum)}</span></div>
                          <div class="row bold"><span>Cuadre:</span><span>${closureResult.statusText}</span></div>
                          <div class="divider"></div>
                          <div class="total-row"><span>TOTAL DÍA:</span><span>${formatCop(data?.summary.grandTotalCop ?? 0)}</span></div>
                        `;
                        printThermalHtml('Reporte_Z_EPB', html);
                      }}
                      className="font-bold gap-1.5 text-xs"
                    >
                      <Printer className="h-4 w-4" />
                      Imprimir Reporte Z (80mm)
                    </Button>
                    <Button
                      type="button"
                      variant="pink"
                      onClick={onClose}
                      className="bg-[#ECCCD9] font-extrabold text-[#141213] text-xs"
                    >
                      Finalizar
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
