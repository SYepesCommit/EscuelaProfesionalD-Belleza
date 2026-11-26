'use client';

import React, { useState } from 'react';
import {
  DollarSign,
  CalendarCheck,
  CheckCircle2,
  X,
  ShieldAlert,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FineItem, StudentItem } from '@/interfaces/student.interface';
import { ClassScheduleItem } from '@/interfaces/schedule.interface';
import { formatCop } from '@/lib/utils';

interface PayFineModalProps {
  isOpen: boolean;
  fine: FineItem | null;
  student: StudentItem | null;
  schedules: ClassScheduleItem[];
  operatorName?: string;
  isAdmin?: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    fineId: string;
    rescheduledScheduleId: string;
    paymentReference: string;
    paymentMethod: 'EFECTIVO' | 'TRANSFERENCIA' | 'TARJETA' | 'MIXTO';
  }) => Promise<void>;
  onCancelFine?: (payload: { fineId: string; reason: string }) => Promise<void>;
}

export function PayFineModal({
  isOpen,
  fine,
  student,
  schedules,
  operatorName,
  isAdmin = true,
  onClose,
  onSubmit,
  onCancelFine,
}: PayFineModalProps) {
  const [mode, setMode] = useState<'PAY' | 'CANCEL'>('PAY');
  const [rescheduledScheduleId, setRescheduledScheduleId] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<
    'EFECTIVO' | 'TRANSFERENCIA' | 'TARJETA' | 'MIXTO'
  >('EFECTIVO');
  const [cancellationReason, setCancellationReason] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  React.useEffect(() => {
    if (!isOpen) {
      setMode('PAY');
      setRescheduledScheduleId('');
      setPaymentReference('');
      setCancellationReason('');
      setErrorMsg(null);
    }
  }, [isOpen]);

  if (!isOpen || !fine || !student) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === 'CANCEL') {
      if (!cancellationReason.trim()) {
        setErrorMsg('Debe ingresar obligatoriamente el motivo de la anulación o condonación.');
        return;
      }
      if (!onCancelFine) {
        setErrorMsg('Operación de anulación no configurada.');
        return;
      }

      setIsBusy(true);
      setErrorMsg(null);
      try {
        await onCancelFine({
          fineId: fine.id,
          reason: cancellationReason.trim(),
        });
        onClose();
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : 'Error al anular multa');
      } finally {
        setIsBusy(false);
      }
      return;
    }

    if (!rescheduledScheduleId) {
      setErrorMsg('Debe seleccionar obligatoriamente una clase de reposición.');
      return;
    }
    if (!paymentReference.trim()) {
      setErrorMsg('Debe ingresar el número de recibo o referencia de pago.');
      return;
    }

    setIsBusy(true);
    setErrorMsg(null);
    try {
      await onSubmit({
        fineId: fine.id,
        rescheduledScheduleId,
        paymentReference: paymentReference.trim(),
        paymentMethod,
      });
      onClose();
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Error al procesar el pago de la multa'
      );
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 sm:p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative flex max-h-[94vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-[#E4BDD0] bg-white text-[#141213] shadow-2xl dark:border-[#3A3035] dark:bg-[#181517] dark:text-[#F5EEF1]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E4BDD0]/80 bg-gradient-to-r from-[#ECCCD9]/60 via-[#F6E4EC] to-[#FAF2F6] px-5 py-4 dark:border-[#332B2F] dark:from-[#261F23] dark:via-[#201A1D] dark:to-[#181517]">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl shadow-sm ${
                mode === 'CANCEL'
                  ? 'bg-amber-600 text-white'
                  : 'bg-emerald-600 text-white'
              }`}
            >
              {mode === 'CANCEL' ? (
                <ShieldAlert className="h-5 w-5" />
              ) : (
                <DollarSign className="h-5 w-5" />
              )}
            </div>
            <div>
              <span className="rounded-full bg-[#ECCCD9] px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#141213]">
                Gestión de Multas EPB
              </span>
              <h3 className="mt-0.5 font-serif text-base font-bold text-[#141213] dark:text-[#F5EEF1]">
                {mode === 'CANCEL'
                  ? 'Anular o Condonar Multa'
                  : 'Cobrar Multa y Reprogramar Clase'}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-neutral-300 bg-white text-neutral-700 transition hover:bg-neutral-100 dark:border-white/15 dark:bg-[#252023] dark:text-neutral-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Toggle para Modo Administrador */}
        {isAdmin && onCancelFine && (
          <div className="flex border-b border-neutral-200 bg-[#FAF8F9] px-5 py-2.5 dark:border-[#332B2F] dark:bg-[#201B1E]">
            <div className="flex w-full rounded-xl bg-neutral-200/80 p-1 dark:bg-[#151214]">
              <button
                type="button"
                onClick={() => setMode('PAY')}
                className={`flex-1 rounded-lg py-1.5 text-xs font-black transition ${
                  mode === 'PAY'
                    ? 'bg-white text-[#141213] shadow-xs dark:bg-[#282125] dark:text-white'
                    : 'text-neutral-600 dark:text-[#B8A8B0]'
                }`}
              >
                Cobro y Reposición Normal
              </button>
              <button
                type="button"
                onClick={() => setMode('CANCEL')}
                className={`flex-1 rounded-lg py-1.5 text-xs font-black transition ${
                  mode === 'CANCEL'
                    ? 'bg-amber-500 text-[#141213] shadow-xs'
                    : 'text-neutral-600 dark:text-[#B8A8B0]'
                }`}
              >
                Condonar / Anular Multa (Admin)
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 overflow-y-auto">
          {errorMsg && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-800 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300">
              {errorMsg}
            </div>
          )}

          {/* Tarjeta de la multa */}
          <div className="rounded-2xl border border-red-200 bg-red-50/70 p-4 space-y-1.5 dark:border-red-900/30 dark:bg-red-950/20">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-red-700 dark:text-red-400">
                Inasistencia de {student.fullName}
              </span>
              <span className="font-mono text-xs font-bold text-neutral-500 dark:text-[#C4B5BC]">
                CC: {student.documentId}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-serif text-base font-bold text-red-950 dark:text-red-200">
                {fine.missedScheduleTitle || 'Clase Académica'}
              </span>
              <span className="text-lg font-black text-red-700 dark:text-red-400">
                {formatCop(fine.amountCop)}
              </span>
            </div>
            <p className="text-xs text-neutral-600 dark:text-neutral-400">
              {fine.reason}
            </p>
          </div>

          {mode === 'CANCEL' ? (
            /* Modo Condonación / Anulación */
            <div className="space-y-3 rounded-2xl border border-amber-300 bg-amber-50/60 p-4 dark:border-amber-900/40 dark:bg-amber-950/30">
              <div className="flex items-center gap-2 text-xs font-black text-amber-900 dark:text-amber-300">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                <span>Autorización Especial de Condonación</span>
              </div>
              <p className="text-xs text-amber-800 dark:text-amber-200">
                La multa quedará en estado <strong>ANULADA</strong>, no se exigirá
                comprobante de pago y, si la alumna no tiene más deudas, se desbloqueará de inmediato.
              </p>
              <div className="space-y-1.5 pt-1">
                <Label className="text-xs font-black text-amber-950 dark:text-amber-200">
                  Justificación Obligatoria *
                </Label>
                <Input
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  placeholder="Ej: Incapacidad médica certificada por EPS / Autorización de Rectoría"
                  className="h-10 text-xs border-amber-300 bg-white font-semibold text-neutral-900 dark:border-amber-800 dark:bg-[#191517] dark:text-white"
                  required
                />
              </div>
            </div>
          ) : (
            /* Modo Pago y Reprogramación */
            <>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-neutral-700 dark:text-[#C4B5BC] flex items-center gap-1.5">
                  <CalendarCheck className="h-4 w-4 text-[#141213] dark:text-[#ECCCD9]" />
                  <span>Clase de Reposición Asignada (Obligatoria) *</span>
                </Label>
                <select
                  required
                  className="flex h-10 w-full rounded-xl border border-neutral-300 bg-white px-3 text-xs font-semibold text-[#141213] dark:border-[#3A3035] dark:bg-[#161315] dark:text-white"
                  value={rescheduledScheduleId}
                  onChange={(e) => setRescheduledScheduleId(e.target.value)}
                >
                  <option value="">Seleccione el salón y horario de reposición...</option>
                  {schedules.map((sch) => (
                    <option key={sch.id} value={sch.id}>
                      {sch.roomName} — {sch.title} ({sch.courseName})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-neutral-700 dark:text-[#C4B5BC]">
                    Medio de Pago *
                  </Label>
                  <select
                    className="flex h-10 w-full rounded-xl border border-neutral-300 bg-white px-3 text-xs font-semibold text-[#141213] dark:border-[#3A3035] dark:bg-[#161315] dark:text-white"
                    value={paymentMethod}
                    onChange={(e) =>
                      setPaymentMethod(
                        e.target.value as
                          | 'EFECTIVO'
                          | 'TRANSFERENCIA'
                          | 'TARJETA'
                          | 'MIXTO'
                      )
                    }
                  >
                    <option value="EFECTIVO">EFECTIVO</option>
                    <option value="TRANSFERENCIA">TRANSFERENCIA (Nequi / Bancolombia)</option>
                    <option value="TARJETA">TARJETA DÉBITO / CRÉDITO</option>
                    <option value="MIXTO">MIXTO</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-neutral-700 dark:text-[#C4B5BC]">
                    No. Recibo / Referencia *
                  </Label>
                  <Input
                    required
                    placeholder="Ej: REC-4921 o Ref Nequi"
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    className="h-10 text-xs font-mono border-neutral-300 bg-white dark:border-[#3A3035] dark:bg-[#161315] dark:text-white"
                  />
                </div>
              </div>
            </>
          )}

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 border-t border-neutral-200 pt-4 dark:border-[#3A3035]">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isBusy}
              className="h-10 px-4 font-bold dark:border-[#3A3035] dark:bg-[#201B1E] dark:text-white"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="pink"
              disabled={isBusy}
              className={`h-10 gap-1.5 px-5 font-black text-[#141213] ${
                mode === 'CANCEL'
                  ? 'bg-amber-400 hover:bg-amber-500'
                  : 'bg-[#ECCCD9] hover:bg-[#E4BDD0]'
              }`}
            >
              <CheckCircle2 className="h-4 w-4" />
              {isBusy
                ? 'Procesando...'
                : mode === 'CANCEL'
                  ? 'Confirmar Condonación'
                  : `Liquidar y Reprogramar (${formatCop(fine.amountCop)})`}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
