'use client';

import React, { useState } from 'react';
import {
  DollarSign,
  Receipt,
  CreditCard,
  Printer,
  CheckCircle2,
  AlertCircle,
  X,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StudentItem } from '@/interfaces/student.interface';
import { formatCop } from '@/lib/utils';
import { printThermalHtml } from '@/lib/thermal-print';
import { buildPaymentReceiptMessage, buildWhatsAppUrl } from '@/lib/whatsapp';

interface RegisterStudentPaymentModalProps {
  isOpen: boolean;
  student: StudentItem | null;
  operatorName?: string;
  onClose: () => void;
  onSubmit: (payload: {
    studentId: string;
    amountCop: number;
    concept: string;
    paymentMethod: 'EFECTIVO' | 'TRANSFERENCIA' | 'TARJETA' | 'MIXTO';
    paymentReference?: string;
    notes?: string;
  }) => Promise<{
    receiptNumber: string;
    newPendingBalanceCop: number;
    unblocked: boolean;
  }>;
}

const PAYMENT_METHODS: Array<'EFECTIVO' | 'TRANSFERENCIA' | 'MIXTO'> = [
  'EFECTIVO',
  'TRANSFERENCIA',
  'MIXTO',
];

export function RegisterStudentPaymentModal({
  isOpen,
  student,
  operatorName = 'Caja General EPB',
  onClose,
  onSubmit,
}: RegisterStudentPaymentModalProps) {
  const [amountCop, setAmountCop] = useState<number>(0);
  const [concept, setConcept] = useState('Abono a cuota académica');
  const [paymentMethod, setPaymentMethod] = useState<'EFECTIVO' | 'TRANSFERENCIA' | 'TARJETA' | 'MIXTO'>('EFECTIVO');
  const [paymentReference, setPaymentReference] = useState('');
  const [notes, setNotes] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Estado para comprobante emitido
  const [completedVoucher, setCompletedVoucher] = useState<{
    receiptNumber: string;
    amountPaid: number;
    newBalance: number;
    unblocked: boolean;
    date: string;
  } | null>(null);

  React.useEffect(() => {
    if (!isOpen || !student) {
      setCompletedVoucher(null);
      setErrorMsg(null);
      return;
    }
    setAmountCop(student.pendingBalanceCop > 0 ? student.pendingBalanceCop : 50000);
    setConcept(student.pendingBalanceReason ? `Abono: ${student.pendingBalanceReason}` : 'Abono a cuota académica');
    setPaymentReference('');
    setNotes('');
    setCompletedVoucher(null);
    setErrorMsg(null);
  }, [isOpen, student]);

  if (!isOpen || !student) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amountCop <= 0) {
      setErrorMsg('El valor del abono debe ser mayor a cero.');
      return;
    }

    setIsBusy(true);
    setErrorMsg(null);
    try {
      const res = await onSubmit({
        studentId: student.id,
        amountCop: Math.round(amountCop),
        concept: concept.trim(),
        paymentMethod,
        paymentReference: paymentReference.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      setCompletedVoucher({
        receiptNumber: res.receiptNumber,
        amountPaid: amountCop,
        newBalance: res.newPendingBalanceCop,
        unblocked: res.unblocked,
        date: new Date().toLocaleString('es-CO'),
      });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error registrando abono');
    } finally {
      setIsBusy(false);
    }
  };

  const handlePrintReceipt = () => {
    if (!completedVoucher) return;
    const html = `
      <div class="center">
        <div class="title">ESCUELA PROFESIONAL D' BELLEZA</div>
        <div class="subtitle bold">NIT: 900.584.219-4 • MEDELLÍN</div>
        <div class="bold" style="margin-top:4px;">*** COMPROBANTE DE ABONO ***</div>
        <div class="bold">No. ${completedVoucher.receiptNumber}</div>
        <div class="subtitle">${completedVoucher.date}</div>
      </div>
      <div class="divider"></div>
      <div class="row"><span>Alumna:</span><span class="bold">${student.fullName}</span></div>
      <div class="row"><span>Documento:</span><span>${student.documentId}</span></div>
      <div class="row"><span>Programa:</span><span>${student.programName}</span></div>
      <div class="row"><span>Concepto:</span><span>${concept}</span></div>
      <div class="row"><span>Medio Pago:</span><span class="bold">${paymentMethod}</span></div>
      ${paymentReference ? `<div class="row"><span>Referencia:</span><span>${paymentReference}</span></div>` : ''}
      <div class="row"><span>Cajero:</span><span>${operatorName}</span></div>
      <div class="divider"></div>
      <div class="total-row">
        <span>MONTO RECIBIDO:</span>
        <span>${formatCop(completedVoucher.amountPaid)}</span>
      </div>
      <div class="row bold" style="margin-top:4px;">
        <span>Saldo Restante:</span>
        <span>${formatCop(completedVoucher.newBalance)}</span>
      </div>
      <div class="divider"></div>
      <div class="footer">Conserve este recibo como soporte de pago académico.</div>
    `;
    printThermalHtml(`Recibo_${completedVoucher.receiptNumber}`, html);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 sm:p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative flex max-h-[94vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-[#E4BDD0] bg-white text-[#141213] shadow-2xl dark:border-[#3A3035] dark:bg-[#181517] dark:text-[#F5EEF1]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E4BDD0]/80 bg-gradient-to-r from-[#ECCCD9]/60 via-[#F6E4EC] to-[#FAF2F6] px-5 py-4 dark:border-[#332B2F] dark:from-[#261F23] dark:via-[#201A1D] dark:to-[#181517]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#141213] text-[#ECCCD9] shadow-sm dark:bg-[#ECCCD9] dark:text-[#141213]">
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <span className="rounded-full bg-[#ECCCD9] px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#141213]">
                Caja Académica EPB
              </span>
              <h3 className="mt-0.5 font-serif text-base font-bold text-[#141213] dark:text-[#F5EEF1]">
                {completedVoucher ? 'Comprobante de Abono Oficial' : 'Registrar Abono a Saldo'}
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

        {/* Vista cuando el recibo ya fue emitido */}
        {completedVoucher ? (
          <div className="space-y-4 overflow-y-auto p-5 sm:p-6">
            <div className="rounded-2xl border-2 border-dashed border-[#141213] bg-[#FAF8F9] p-5 text-center dark:border-[#ECCCD9] dark:bg-[#201B1E]">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <span className="mt-2 block font-mono text-xs font-bold tracking-widest text-neutral-500 dark:text-[#C4B5BC]">
                No. {completedVoucher.receiptNumber}
              </span>
              <h4 className="font-serif text-lg font-bold text-[#141213] dark:text-[#F5EEF1]">
                Abono Registrado Exitosamente
              </h4>
              <p className="text-xs text-neutral-600 dark:text-[#C4B5BC]">
                Escuela Profesional D&apos; Belleza — Sede Principal
              </p>

              <div className="mt-4 border-t border-b border-neutral-200 py-3 text-left text-xs space-y-1.5 dark:border-[#3A3035]">
                <div className="flex justify-between">
                  <span className="font-bold text-neutral-600 dark:text-[#C4B5BC]">Alumna:</span>
                  <span className="font-black text-[#141213] dark:text-[#ECCCD9]">
                    {student.fullName} (CC: {student.documentId})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold text-neutral-600 dark:text-[#C4B5BC]">Programa:</span>
                  <span className="font-semibold">{student.programName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold text-neutral-600 dark:text-[#C4B5BC]">Concepto:</span>
                  <span className="font-semibold">{concept}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold text-neutral-600 dark:text-[#C4B5BC]">Método de Pago:</span>
                  <span className="font-semibold">{paymentMethod}</span>
                </div>
                {paymentReference && (
                  <div className="flex justify-between">
                    <span className="font-bold text-neutral-600 dark:text-[#C4B5BC]">Ref / Transacción:</span>
                    <span className="font-mono font-bold">{paymentReference}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="font-bold text-neutral-600 dark:text-[#C4B5BC]">Fecha y Hora:</span>
                  <span className="font-mono">{completedVoucher.date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold text-neutral-600 dark:text-[#C4B5BC]">Operador / Cajero:</span>
                  <span className="font-semibold">{operatorName}</span>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between">
                <span className="text-sm font-extrabold text-[#141213] dark:text-[#ECCCD9]">
                  Monto Recibido:
                </span>
                <span className="text-xl font-black text-emerald-700 dark:text-emerald-400">
                  {formatCop(completedVoucher.amountPaid)}
                </span>
              </div>

              <div className="mt-2 flex items-center justify-between text-xs">
                <span className="font-bold text-neutral-600 dark:text-[#C4B5BC]">
                  Saldo Restante:
                </span>
                <span className="font-black text-neutral-900 dark:text-white">
                  {formatCop(completedVoucher.newBalance)}
                </span>
              </div>

              {completedVoucher.unblocked && (
                <div className="mt-3 rounded-xl bg-emerald-100 p-2 text-xs font-black text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
                  ✨ Estudiante desbloqueada para ingreso a clases y certificación
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handlePrintReceipt}
                className="flex-1 gap-1.5 h-11 font-bold dark:border-[#3A3035] dark:bg-[#201B1E] dark:text-white"
              >
                <Printer className="h-4 w-4" />
                Imprimir Recibo
              </Button>
              <a
                href={buildWhatsAppUrl(
                  student.phone,
                  buildPaymentReceiptMessage({
                    studentName: student.fullName,
                    receiptNumber: completedVoucher.receiptNumber,
                    amountPaidCop: completedVoucher.amountPaid,
                    newBalanceCop: completedVoucher.newBalance,
                    concept,
                    paymentMethod,
                  })
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 h-11 text-xs font-bold text-white shadow-xs transition hover:bg-emerald-700"
              >
                Enviar por WhatsApp
              </a>
              <Button
                type="button"
                variant="pink"
                onClick={onClose}
                className="flex-1 h-11 bg-[#ECCCD9] font-black text-[#141213] hover:bg-[#E4BDD0]"
              >
                Cerrar Ventana
              </Button>
            </div>
          </div>
        ) : (
          /* Formulario de registro de abono */
          <form onSubmit={handleSubmit} className="flex-1 space-y-4 overflow-y-auto p-5 sm:p-6">
            {errorMsg && (
              <div className="flex items-center gap-2 rounded-xl border border-red-300 bg-red-50 p-3 text-xs font-bold text-red-900 dark:border-red-900/60 dark:bg-red-950/60 dark:text-red-200">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Resumen del estudiante */}
            <div className="rounded-2xl border border-[#E4BDD0] bg-[#FAF2F6]/90 p-3.5 space-y-1.5 dark:border-[#3A3035] dark:bg-[#201B1E]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-[#141213] dark:text-[#ECCCD9]">
                  {student.fullName}
                </span>
                <span className="font-mono text-xs font-bold text-neutral-500 dark:text-[#C4B5BC]">
                  CC: {student.documentId}
                </span>
              </div>
              <p className="text-xs text-neutral-600 dark:text-[#C4B5BC]">
                Programa: <strong>{student.programName}</strong>
              </p>
              <div className="flex items-center justify-between border-t border-[#E4BDD0]/60 pt-2 text-xs">
                <span className="font-bold text-neutral-700 dark:text-[#C4B5BC]">
                  Saldo Académico Actual:
                </span>
                <span className="text-base font-black text-red-700 dark:text-red-400">
                  {formatCop(student.pendingBalanceCop)}
                </span>
              </div>
              {student.pendingBalanceReason && (
                <p className="text-[11px] font-semibold text-neutral-500 dark:text-[#B8A8B0]">
                  Concepto de deuda: {student.pendingBalanceReason}
                </p>
              )}
            </div>

            {/* Monto del abono y accesos rápidos */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-black uppercase tracking-wider text-[#141213] dark:text-[#ECCCD9]">
                  Monto a Abonar (COP) *
                </Label>
                <span className="text-xs font-black text-emerald-700 dark:text-emerald-400">
                  {formatCop(amountCop)}
                </span>
              </div>
              <Input
                type="number"
                min={1000}
                step={5000}
                value={amountCop || ''}
                onChange={(e) => setAmountCop(Number(e.target.value))}
                placeholder="Ej: 50000"
                className="h-11 text-base font-black border-neutral-300 bg-white text-[#141213] dark:border-[#3A3035] dark:bg-[#161315] dark:text-white"
                required
              />

              {/* Botones de montos preconfigurados */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {student.pendingBalanceCop > 0 && (
                  <button
                    type="button"
                    onClick={() => setAmountCop(student.pendingBalanceCop)}
                    className="rounded-lg border border-[#141213] bg-[#141213] px-2.5 py-1 text-xs font-extrabold text-[#ECCCD9] transition hover:bg-neutral-800 dark:border-[#ECCCD9] dark:bg-[#ECCCD9] dark:text-[#141213]"
                  >
                    Saldar Total ({formatCop(student.pendingBalanceCop)})
                  </button>
                )}
                {student.pendingBalanceCop > 10000 && (
                  <button
                    type="button"
                    onClick={() => setAmountCop(Math.round(student.pendingBalanceCop / 2))}
                    className="rounded-lg border border-neutral-300 bg-white px-2.5 py-1 text-xs font-bold text-neutral-700 transition hover:bg-[#ECCCD9] dark:border-[#3A3035] dark:bg-[#201B1E] dark:text-[#ECCCD9]"
                  >
                    50% ({formatCop(Math.round(student.pendingBalanceCop / 2))})
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setAmountCop(50000)}
                  className="rounded-lg border border-neutral-300 bg-white px-2.5 py-1 text-xs font-bold text-neutral-700 transition hover:bg-[#ECCCD9] dark:border-[#3A3035] dark:bg-[#201B1E] dark:text-[#ECCCD9]"
                >
                  $50.000
                </button>
                <button
                  type="button"
                  onClick={() => setAmountCop(100000)}
                  className="rounded-lg border border-neutral-300 bg-white px-2.5 py-1 text-xs font-bold text-neutral-700 transition hover:bg-[#ECCCD9] dark:border-[#3A3035] dark:bg-[#201B1E] dark:text-[#ECCCD9]"
                >
                  $100.000
                </button>
              </div>
            </div>

            {/* Concepto del Abono */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-neutral-700 dark:text-[#C4B5BC]">
                Concepto del Pago *
              </Label>
              <Input
                value={concept}
                onChange={(e) => setConcept(e.target.value)}
                placeholder="Ej: Cuota 2 Matrícula, Abono Kit Uñas"
                className="h-10 text-xs font-semibold border-neutral-300 bg-white dark:border-[#3A3035] dark:bg-[#161315] dark:text-white"
                required
              />
            </div>

            {/* Método de Pago */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-neutral-700 dark:text-[#C4B5BC]">
                Medio de Recepción *
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {PAYMENT_METHODS.map((pm) => {
                  const active = paymentMethod === pm;
                  return (
                    <button
                      key={pm}
                      type="button"
                      onClick={() => setPaymentMethod(pm)}
                      className={`flex h-10 items-center justify-center rounded-xl border text-xs font-black transition ${
                        active
                          ? 'border-[#141213] bg-[#141213] text-[#ECCCD9] shadow-2xs dark:border-[#ECCCD9] dark:bg-[#ECCCD9] dark:text-[#141213]'
                          : 'border-neutral-300 bg-white text-neutral-700 hover:bg-[#ECCCD9]/40 dark:border-[#3A3035] dark:bg-[#201B1E] dark:text-[#ECCCD9]'
                      }`}
                    >
                      {pm}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Atajos Rápidos de Verificación de Transferencia (Nequi / Bancolombia / Últimos 4 dígitos / Auto-Hora) */}
            {(paymentMethod === 'TRANSFERENCIA' || paymentMethod === 'MIXTO') && (
              <div className="rounded-2xl border border-[#E4BDD0] bg-[#FAF3F6] p-3 space-y-2.5 dark:border-[#3A3035] dark:bg-[#201B1E]">
                <div className="flex flex-wrap items-center justify-between gap-1.5">
                  <span className="text-[11px] font-bold text-[#141213] dark:text-[#ECCCD9]">
                    Verificación rápida de Transferencia:
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {(['Nequi', 'Bancolombia', 'Daviplata'] as const).map((bank) => (
                      <button
                        key={bank}
                        type="button"
                        onClick={() => {
                          const timeStamp = new Date().toLocaleTimeString('es-CO', {
                            hour: '2-digit',
                            minute: '2-digit',
                          });
                          setPaymentReference(`${bank} Verificado • ${timeStamp}`);
                        }}
                        className="rounded-lg bg-emerald-600 px-2 py-1 text-[10px] font-bold text-white shadow-2xs transition hover:bg-emerald-700"
                        title={`Marcar ${bank} verificado con hora actual en 1 clic`}
                      >
                        ✓ {bank} (Auto-Hora)
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const text = await navigator.clipboard.readText();
                          if (text && text.trim()) {
                            setPaymentReference(text.trim().slice(0, 45));
                          }
                        } catch {
                          // ignore clipboard error
                        }
                      }}
                      className="rounded-lg border border-[#D9AFC2] bg-white px-2 py-1 text-[10px] font-bold text-[#141213] transition hover:bg-[#FAF0F5] dark:border-[#3A3035] dark:bg-[#161315] dark:text-[#ECCCD9]"
                    >
                      Pegar
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-12">
                  <div className="sm:col-span-5">
                    <Input
                      maxLength={6}
                      onChange={(e) => {
                        const val = e.target.value.trim();
                        setPaymentReference(val ? `Transf. Ult.4: #${val}` : '');
                      }}
                      placeholder="Últ. 4 dígitos (Ej: 4890)"
                      className="h-9 text-xs font-mono font-bold border-neutral-300 bg-white dark:border-[#3A3035] dark:bg-[#161315] dark:text-white"
                    />
                  </div>
                  <div className="sm:col-span-7 flex items-center text-[11px] text-neutral-600 dark:text-[#C4B5BC]">
                    Digite solo los últimos 4 números del comprobante/celular o use los botones de arriba en 1 clic.
                  </div>
                </div>
              </div>
            )}

            {/* Referencia de pago y observaciones */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 items-end">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-neutral-700 dark:text-[#C4B5BC]">
                  No. Recibo / Referencia
                </Label>
                <Input
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder="Ej: Nequi #M4890, Voucher #1023"
                  className="h-10 text-xs font-mono border-neutral-300 bg-white dark:border-[#3A3035] dark:bg-[#161315] dark:text-white"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-neutral-700 dark:text-[#C4B5BC]">
                  Notas / Observaciones
                </Label>
                <Input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ej: Pago acordado en Dirección"
                  className="h-10 text-xs border-neutral-300 bg-white dark:border-[#3A3035] dark:bg-[#161315] dark:text-white"
                />
              </div>
            </div>

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
                className="h-10 gap-1.5 bg-[#ECCCD9] px-5 font-black text-[#141213] hover:bg-[#E4BDD0]"
              >
                <DollarSign className="h-4 w-4" />
                {isBusy ? 'Procesando...' : `Confirmar Abono (${formatCop(amountCop)})`}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
