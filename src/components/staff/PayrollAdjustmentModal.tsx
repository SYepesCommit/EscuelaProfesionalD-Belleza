'use client';

import React, { useEffect, useState } from 'react';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  CheckCircle2,
  CreditCard,
  Plus,
  Trash2,
  Wallet,
  X,
} from 'lucide-react';
import {
  CreatePayrollAdjustmentPayload,
  FortnightStaffPayrollSummary,
  PayrollAdjustmentType,
  PayrollPaymentMethod,
  SettleFortnightPayrollPayload,
} from '@/interfaces/staff.interface';
import { formatFortnightHumanLabel } from './staff-role-meta';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCop } from '@/lib/utils';

interface PayrollAdjustmentModalProps {
  isOpen: boolean;
  summary: FortnightStaffPayrollSummary | null;
  initialTab?: 'ADJUSTMENTS' | 'SETTLEMENT';
  operatorUserId: string;
  onClose: () => void;
  onCreateAdjustment: (payload: CreatePayrollAdjustmentPayload) => Promise<void>;
  onDeleteAdjustment: (adjustmentId: string, operatorUserId: string) => Promise<void>;
  onSettleFortnight: (payload: SettleFortnightPayrollPayload) => Promise<void>;
}

const CONCEPT_PRESETS: Record<PayrollAdjustmentType, string[]> = {
  BONO: [
    'Bono por Meta de Matrículas',
    'Incentivo Puntualidad Quincenal',
    'Taller Especial / Horas Extra',
  ],
  ADELANTO: [
    'Vale / Adelanto de Quincena en Efectivo',
    'Anticipo Transferencia Nequi',
  ],
  DESCUENTO: [
    'Producto o Kit Sacado de Inventario',
    'Descuento por Insumos / Uniforme',
  ],
};

const AMOUNT_PRESETS = [20000, 30000, 50000, 100000, 150000];

const PAYMENT_METHODS: { key: PayrollPaymentMethod; label: string }[] = [
  { key: 'NEQUI', label: 'Nequi' },
  { key: 'BANCOLOMBIA', label: 'Bancolombia' },
  { key: 'EFECTIVO', label: 'Efectivo en Caja' },
  { key: 'DAVIPLATA', label: 'Daviplata' },
  { key: 'TRANSFERENCIA', label: 'Otra Transferencia' },
];

export function PayrollAdjustmentModal({
  isOpen,
  summary,
  initialTab = 'ADJUSTMENTS',
  operatorUserId,
  onClose,
  onCreateAdjustment,
  onDeleteAdjustment,
  onSettleFortnight,
}: PayrollAdjustmentModalProps) {
  const [activeTab, setActiveTab] = useState<'ADJUSTMENTS' | 'SETTLEMENT'>(
    initialTab
  );
  const [type, setType] = useState<PayrollAdjustmentType>('ADELANTO');
  const [concept, setConcept] = useState('');
  const [amountCop, setAmountCop] = useState<number>(50000);
  const [notes, setNotes] = useState('');

  // Estados de liquidación / pago
  const [paymentMethod, setPaymentMethod] =
    useState<PayrollPaymentMethod>('NEQUI');
  const [paymentReference, setPaymentReference] = useState('');
  const [settlementNotes, setSettlementNotes] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !summary) return;
    setActiveTab(initialTab);
    setErrorMsg(null);
    setType('ADELANTO');
    setConcept('Vale / Adelanto de Quincena en Efectivo');
    setAmountCop(50000);
    setNotes('');
    setPaymentMethod(summary.settlement?.paymentMethod ?? 'NEQUI');
    setPaymentReference(summary.settlement?.paymentReference ?? '');
    setSettlementNotes(summary.settlement?.notes ?? '');
  }, [isOpen, summary, initialTab]);

  if (!isOpen || !summary) return null;

  const handleAddAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!concept.trim()) {
      setErrorMsg('Escriba o seleccione un concepto.');
      return;
    }
    if (amountCop <= 0) {
      setErrorMsg('El monto debe ser mayor a $0 COP.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onCreateAdjustment({
        staffId: summary.staffId,
        fortnightKey: summary.fortnightKey,
        type,
        concept: concept.trim(),
        amountCop: Number(amountCop),
        notes: notes.trim() || undefined,
        operatorUserId,
      });
      setNotes('');
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Error agregando concepto'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSettle = async (targetStatus: 'PAGADA' | 'PENDIENTE') => {
    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      await onSettleFortnight({
        staffId: summary.staffId,
        fortnightKey: summary.fortnightKey,
        status: targetStatus,
        paidAmountCop: summary.totalPayCop,
        paymentMethod,
        paymentReference: paymentReference.trim() || undefined,
        notes: settlementNotes.trim() || undefined,
        operatorUserId,
      });
      if (targetStatus === 'PAGADA') {
        onClose();
      }
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Error registrando pago de quincena'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-2.5 sm:p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-[#E4BDD0] bg-white text-[#141213] shadow-2xl dark:border-[#3A3035] dark:bg-[#181517] dark:text-[#F5EEF1]">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-[#E4BDD0]/80 bg-gradient-to-r from-[#ECCCD9]/65 to-[#FAF2F6] px-4 py-3.5 sm:px-6 dark:border-[#332B2F] dark:from-[#261F23] dark:to-[#1B1719]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#141213] text-[#ECCCD9] dark:bg-[#ECCCD9] dark:text-[#141213]">
              <Wallet className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="truncate font-serif text-base sm:text-lg font-bold text-[#141213] dark:text-[#F5EEF1]">
                {summary.fullName}
              </h2>
              <p className="truncate text-xs text-neutral-600 dark:text-[#C4B5BC]">
                {formatFortnightHumanLabel(summary.fortnightKey)} • Neto:{' '}
                <strong className="text-[#141213] dark:text-[#ECCCD9]">
                  {formatCop(summary.totalPayCop)}
                </strong>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-100 dark:border-white/15 dark:bg-[#252023] dark:text-neutral-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Selector de Pestaña: Bonos/Vales vs Pagar Quincena */}
        <div className="grid grid-cols-2 border-b border-neutral-200 bg-[#FAF7F9] p-1.5 dark:border-[#332B2F] dark:bg-[#221D20]">
          <button
            type="button"
            onClick={() => setActiveTab('ADJUSTMENTS')}
            className={`rounded-xl py-2 text-xs font-extrabold transition ${
              activeTab === 'ADJUSTMENTS'
                ? 'bg-[#141213] text-[#ECCCD9] shadow-xs dark:bg-[#ECCCD9] dark:text-[#141213]'
                : 'text-neutral-600 hover:text-[#141213] dark:text-[#C4B5BC]'
            }`}
          >
            1. Bonos, Vales y Descuentos ({summary.adjustments.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('SETTLEMENT')}
            className={`rounded-xl py-2 text-xs font-extrabold transition ${
              activeTab === 'SETTLEMENT'
                ? 'bg-[#141213] text-[#ECCCD9] shadow-xs dark:bg-[#ECCCD9] dark:text-[#141213]'
                : 'text-neutral-600 hover:text-[#141213] dark:text-[#C4B5BC]'
            }`}
          >
            2. Pagar / Cerrar Quincena ({summary.settlementStatus})
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
          {errorMsg && (
            <div className="rounded-xl border border-red-400/60 bg-red-50 px-3.5 py-2.5 text-xs font-semibold text-red-900 dark:border-red-500/40 dark:bg-red-950/60 dark:text-red-200">
              {errorMsg}
            </div>
          )}

          {/* Barra Resumen de Liquidación en Tiempo Real */}
          <div className="grid grid-cols-2 gap-2 rounded-2xl border border-[#E4BDD0] bg-[#FAF2F6] p-3 text-xs sm:grid-cols-4 dark:border-[#3A3035] dark:bg-[#221D20]">
            <div>
              <div className="text-[10px] text-neutral-500 dark:text-[#B8A8B0]">
                Horas ({summary.totalWorkedHours}h)
              </div>
              <div className="font-extrabold text-[#141213] dark:text-white">
                {formatCop(summary.hoursPayCop)}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-neutral-500 dark:text-[#B8A8B0]">
                + Comisiones ({summary.salesCount})
              </div>
              <div className="font-extrabold text-emerald-700 dark:text-emerald-400">
                +{formatCop(summary.salesCommissionCop)}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-neutral-500 dark:text-[#B8A8B0]">
                + Bonos / - Vales
              </div>
              <div className="font-extrabold text-[#141213] dark:text-white">
                <span className="text-emerald-700 dark:text-emerald-400">
                  +{formatCop(summary.bonusesCop)}
                </span>{' '}
                /{' '}
                <span className="text-red-600 dark:text-red-400">
                  -{formatCop(summary.deductionsCop)}
                </span>
              </div>
            </div>
            <div className="rounded-xl bg-[#141213] px-2.5 py-1.5 text-right text-white dark:bg-[#141213] dark:border dark:border-[#ECCCD9]/40">
              <div className="text-[9px] font-bold uppercase text-[#ECCCD9]">
                Neto a Pagar
              </div>
              <div className="text-sm font-black text-white">
                {formatCop(summary.totalPayCop)}
              </div>
            </div>
          </div>

          {activeTab === 'ADJUSTMENTS' ? (
            <>
              <form
                onSubmit={handleAddAdjustment}
                className="space-y-3 rounded-2xl border border-neutral-200 bg-[#FAF8F9] p-4 dark:border-[#332B2F] dark:bg-[#201B1E]"
              >
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      {
                        key: 'ADELANTO',
                        label: 'Vale / Adelanto (-)',
                        activeClass: 'border-red-600 bg-red-600 text-white',
                      },
                      {
                        key: 'DESCUENTO',
                        label: 'Descuento (-)',
                        activeClass: 'border-amber-600 bg-amber-500 text-[#141213]',
                      },
                      {
                        key: 'BONO',
                        label: 'Bono / Extra (+)',
                        activeClass: 'border-emerald-600 bg-emerald-600 text-white',
                      },
                    ] as const
                  ).map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => {
                        setType(item.key);
                        setConcept(CONCEPT_PRESETS[item.key][0]);
                      }}
                      className={`rounded-xl border py-2 text-xs font-extrabold transition ${
                        type === item.key
                          ? item.activeClass
                          : 'border-neutral-300 bg-white text-neutral-700 dark:border-[#3A3035] dark:bg-[#161315] dark:text-[#C4B5BC]'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                <div>
                  <Label className="text-xs font-bold text-[#141213] dark:text-[#F5EEF1]">
                    Concepto / Motivo *
                  </Label>
                  <Input
                    value={concept}
                    onChange={(e) => setConcept(e.target.value)}
                    placeholder="Ej: Vale de quincena / Bono por cumplimiento"
                    className="mt-1 h-9 border-neutral-300 bg-white text-xs font-semibold text-[#141213] dark:border-[#3A3035] dark:bg-[#161315] dark:text-white"
                    required
                  />
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {CONCEPT_PRESETS[type].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setConcept(preset)}
                        className="rounded-full border border-neutral-300 bg-white px-2.5 py-0.5 text-[10px] font-bold text-neutral-700 hover:bg-[#ECCCD9] hover:text-[#141213] dark:border-[#3A3035] dark:bg-[#161315] dark:text-[#E5D8DF]"
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <Label className="text-xs font-bold text-[#141213] dark:text-[#F5EEF1]">
                      Valor en COP * ({formatCop(amountCop)})
                    </Label>
                    <Input
                      type="number"
                      min={100}
                      step={1000}
                      value={amountCop}
                      onChange={(e) => setAmountCop(Number(e.target.value))}
                      className="mt-1 h-9 border-neutral-300 bg-white text-sm font-black text-[#141213] dark:border-[#3A3035] dark:bg-[#161315] dark:text-white"
                      required
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-bold text-[#141213] dark:text-[#F5EEF1]">
                      Nota Opcional
                    </Label>
                    <Input
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Autorizado por dirección..."
                      className="mt-1 h-9 border-neutral-300 bg-white text-xs text-[#141213] dark:border-[#3A3035] dark:bg-[#161315] dark:text-white"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <div className="flex flex-wrap gap-1">
                    {AMOUNT_PRESETS.map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setAmountCop(amt)}
                        className="rounded-lg border border-neutral-300 bg-white px-2 py-0.5 text-[10px] font-extrabold text-[#141213] hover:bg-[#ECCCD9] dark:border-[#3A3035] dark:bg-[#161315] dark:text-[#ECCCD9]"
                      >
                        {formatCop(amt)}
                      </button>
                    ))}
                  </div>

                  <Button
                    type="submit"
                    size="sm"
                    variant="pink"
                    disabled={isSubmitting}
                    className="gap-1 bg-[#ECCCD9] font-extrabold text-[#141213] hover:bg-[#E4BDD0]"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Agregar a Quincena
                  </Button>
                </div>
              </form>

              {/* Lista de conceptos cargados en esta quincena */}
              <div className="space-y-2">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-neutral-600 dark:text-[#C4B5BC]">
                  Conceptos Registrados en {summary.fortnightKey} (
                  {summary.adjustments.length})
                </h4>
                {summary.adjustments.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-neutral-300 p-4 text-center text-xs text-neutral-500 dark:border-[#3A3035] dark:text-[#B8A8B0]">
                    No hay bonos, vales ni descuentos registrados para este empleado en esta quincena.
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {summary.adjustments.map((adj) => {
                      const isBonus = adj.type === 'BONO';
                      return (
                        <div
                          key={adj.id}
                          className="flex items-center justify-between gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs dark:border-[#332B2F] dark:bg-[#211C1F]"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {isBonus ? (
                              <ArrowUpCircle className="h-4 w-4 shrink-0 text-emerald-600" />
                            ) : (
                              <ArrowDownCircle className="h-4 w-4 shrink-0 text-red-600" />
                            )}
                            <div className="min-w-0">
                              <div className="truncate font-bold text-[#141213] dark:text-white">
                                {adj.concept}
                              </div>
                              <div className="text-[10px] text-neutral-500 dark:text-[#B8A8B0]">
                                {adj.type}
                                {adj.notes ? ` • ${adj.notes}` : ''}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span
                              className={`font-extrabold ${
                                isBonus
                                  ? 'text-emerald-700 dark:text-emerald-400'
                                  : 'text-red-600 dark:text-red-400'
                              }`}
                            >
                              {isBonus ? '+' : '-'}
                              {formatCop(adj.amountCop)}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                onDeleteAdjustment(adj.id, operatorUserId)
                              }
                              className="rounded-lg p-1 text-neutral-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                              title="Eliminar concepto"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="space-y-4 rounded-2xl border border-neutral-200 bg-[#FAF8F9] p-4 dark:border-[#332B2F] dark:bg-[#201B1E]">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-extrabold text-[#141213] dark:text-white">
                    Estado de Pago de la Quincena
                  </h4>
                  <p className="text-xs text-neutral-600 dark:text-[#C4B5BC]">
                    Registre el medio por el cual se desembolsó el neto quincenal.
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-black ${
                    summary.settlementStatus === 'PAGADA'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-amber-100 text-amber-950 dark:bg-amber-950 dark:text-amber-200'
                  }`}
                >
                  {summary.settlementStatus === 'PAGADA'
                    ? 'QUINCENA PAGADA'
                    : 'PENDIENTE DE PAGO'}
                </span>
              </div>

              <div>
                <Label className="text-xs font-bold text-[#141213] dark:text-[#F5EEF1]">
                  Medio de Pago Utilizado
                </Label>
                <div className="mt-1.5 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {PAYMENT_METHODS.map((pm) => (
                    <button
                      key={pm.key}
                      type="button"
                      onClick={() => setPaymentMethod(pm.key)}
                      className={`flex items-center justify-center gap-1.5 rounded-xl border py-2 text-xs font-extrabold transition ${
                        paymentMethod === pm.key
                          ? 'border-[#141213] bg-[#ECCCD9] text-[#141213] shadow-2xs'
                          : 'border-neutral-300 bg-white text-neutral-700 dark:border-[#3A3035] dark:bg-[#161315] dark:text-[#C4B5BC]'
                      }`}
                    >
                      <CreditCard className="h-3.5 w-3.5" />
                      {pm.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <Label className="text-xs font-bold text-[#141213] dark:text-[#F5EEF1]">
                    Comprobante / Referencia (Nequi / Banco)
                  </Label>
                  <Input
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    placeholder="Ej: M1928374 / Efectivo Caja"
                    className="mt-1 h-9 border-neutral-300 bg-white text-xs text-[#141213] dark:border-[#3A3035] dark:bg-[#161315] dark:text-white"
                  />
                </div>
                <div>
                  <Label className="text-xs font-bold text-[#141213] dark:text-[#F5EEF1]">
                    Observación de Pago
                  </Label>
                  <Input
                    value={settlementNotes}
                    onChange={(e) => setSettlementNotes(e.target.value)}
                    placeholder="Pagado a satisfacción..."
                    className="mt-1 h-9 border-neutral-300 bg-white text-xs text-[#141213] dark:border-[#3A3035] dark:bg-[#161315] dark:text-white"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
                {summary.settlementStatus === 'PAGADA' && (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isSubmitting}
                    onClick={() => handleSettle('PENDIENTE')}
                    className="text-xs font-bold"
                  >
                    Reabrir como Pendiente
                  </Button>
                )}
                <Button
                  type="button"
                  variant="pink"
                  disabled={isSubmitting}
                  onClick={() => handleSettle('PAGADA')}
                  className="gap-1.5 bg-emerald-600 text-xs font-extrabold text-white hover:bg-emerald-700"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Confirmar Pago de {formatCop(summary.totalPayCop)} ({paymentMethod})
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
