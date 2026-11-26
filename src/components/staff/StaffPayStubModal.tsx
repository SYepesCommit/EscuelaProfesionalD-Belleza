'use client';

import React from 'react';
import {
  CheckCircle2,
  Clock,
  FileText,
  Printer,
  TrendingUp,
  Utensils,
  Wallet,
  X,
} from 'lucide-react';
import {
  FortnightStaffPayrollSummary,
  StaffTimeLogItem,
} from '@/interfaces/staff.interface';
import {
  STAFF_ROLE_META,
  formatFortnightHumanLabel,
  formatMinutesToHoursAndMinutes,
} from './staff-role-meta';
import { Button } from '@/components/ui/button';
import { formatCop, formatDateTimeCo } from '@/lib/utils';

interface StaffPayStubModalProps {
  summary: FortnightStaffPayrollSummary | null;
  logs: StaffTimeLogItem[];
  onClose: () => void;
  onOpenSettlement?: (summary: FortnightStaffPayrollSummary) => void;
}

export function StaffPayStubModal({
  summary,
  logs,
  onClose,
  onOpenSettlement,
}: StaffPayStubModalProps) {
  if (!summary) return null;

  const roleMeta = STAFF_ROLE_META[summary.role];
  const staffLogs = logs.filter((l) => l.staffId === summary.staffId);
  const isPaid = summary.settlementStatus === 'PAGADA';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-2.5 sm:p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-[#E4BDD0] bg-white text-[#141213] shadow-2xl dark:border-[#3A3035] dark:bg-[#181517] dark:text-[#F5EEF1]">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-[#E4BDD0]/80 bg-gradient-to-r from-[#ECCCD9]/65 to-[#FAF2F6] px-4 py-3.5 sm:px-6 dark:border-[#332B2F] dark:from-[#261F23] dark:to-[#1B1719]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#ECCCD9] text-[#141213]">
              <FileText className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="truncate font-serif text-base sm:text-lg font-bold text-[#141213] dark:text-[#F5EEF1]">
                  Comprobante Quincenal de Nómina
                </h2>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-black ${
                    isPaid
                      ? 'bg-emerald-600 text-white'
                      : 'bg-amber-200 text-amber-950'
                  }`}
                >
                  {isPaid
                    ? `PAGADA (${summary.settlement?.paymentMethod ?? 'OK'})`
                    : 'PENDIENTE DE PAGO'}
                </span>
              </div>
              <p className="truncate text-xs text-neutral-600 dark:text-[#C4B5BC]">
                {formatFortnightHumanLabel(summary.fortnightKey)}
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

        {/* Body */}
        <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
          {/* Encabezado del Empleado */}
          <div className="flex flex-col justify-between gap-3 rounded-2xl border border-[#E4BDD0] bg-[#FAF2F6] p-4 sm:flex-row sm:items-center dark:border-[#3A3035] dark:bg-[#221D20]">
            <div className="min-w-0">
              <span
                className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-extrabold ${roleMeta.badgeClass}`}
              >
                {roleMeta.label}
              </span>
              <h3 className="mt-1.5 text-lg font-extrabold text-[#141213] dark:text-white">
                {summary.fullName}
              </h3>
              <p className="text-xs text-neutral-600 dark:text-[#C4B5BC]">
                C.C. {summary.documentId}
                {summary.phone ? ` • Tel: ${summary.phone}` : ''}
              </p>
              {isPaid && summary.settlement && (
                <p className="mt-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                  Pagado vía {summary.settlement.paymentMethod}
                  {summary.settlement.paymentReference
                    ? ` • Ref: ${summary.settlement.paymentReference}`
                    : ''}
                  {summary.settlement.paidAt
                    ? ` • ${formatDateTimeCo(summary.settlement.paidAt)}`
                    : ''}
                </p>
              )}
            </div>

            <div className="rounded-xl bg-[#141213] px-4 py-3 text-right text-white dark:border dark:border-[#ECCCD9]/40 dark:bg-[#141213]">
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#ECCCD9]">
                Neto Final a Pagar
              </div>
              <div className="text-xl font-black text-white">
                {formatCop(summary.totalPayCop)}
              </div>
              <div className="text-[11px] text-[#ECCCD9]/90">
                Horas + Comisiones + Bonos - Vales
              </div>
            </div>
          </div>

          {/* 4 Mini KPIs de Desglose Financiero */}
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <div className="rounded-xl border border-neutral-200 bg-white p-3 dark:border-[#332B2F] dark:bg-[#211C1F]">
              <div className="text-[11px] font-semibold text-neutral-500 dark:text-[#B8A8B0]">
                1. Pago por Horas
              </div>
              <div className="mt-0.5 text-sm font-extrabold text-[#141213] dark:text-white">
                {formatCop(summary.hoursPayCop)}
              </div>
              <div className="text-[10px] text-neutral-500 dark:text-[#B8A8B0]">
                {summary.totalWorkedHours}h × {formatCop(summary.hourlyRateCop)}/h
              </div>
            </div>

            <div className="rounded-xl border border-neutral-200 bg-white p-3 dark:border-[#332B2F] dark:bg-[#211C1F]">
              <div className="text-[11px] font-semibold text-neutral-500 dark:text-[#B8A8B0]">
                2. + Comisiones POS
              </div>
              <div className="mt-0.5 text-sm font-extrabold text-emerald-700 dark:text-emerald-400">
                +{formatCop(summary.salesCommissionCop)}
              </div>
              <div className="text-[10px] text-neutral-500 dark:text-[#B8A8B0]">
                {summary.salesCount} venta(s) ({summary.commissionRatePct}%)
              </div>
            </div>

            <div className="rounded-xl border border-neutral-200 bg-white p-3 dark:border-[#332B2F] dark:bg-[#211C1F]">
              <div className="text-[11px] font-semibold text-neutral-500 dark:text-[#B8A8B0]">
                3. + Bonos / Extras
              </div>
              <div className="mt-0.5 text-sm font-extrabold text-emerald-700 dark:text-emerald-400">
                +{formatCop(summary.bonusesCop)}
              </div>
              <div className="text-[10px] text-neutral-500 dark:text-[#B8A8B0]">
                Incentivos quincena
              </div>
            </div>

            <div className="rounded-xl border border-neutral-200 bg-white p-3 dark:border-[#332B2F] dark:bg-[#211C1F]">
              <div className="text-[11px] font-semibold text-neutral-500 dark:text-[#B8A8B0]">
                4. - Vales / Descuentos
              </div>
              <div className="mt-0.5 text-sm font-extrabold text-red-600 dark:text-red-400">
                -{formatCop(summary.deductionsCop)}
              </div>
              <div className="text-[10px] text-neutral-500 dark:text-[#B8A8B0]">
                Adelantos de nómina
              </div>
            </div>
          </div>

          {/* Detalle de Bonos, Adelantos y Descuentos si existen */}
          {summary.adjustments.length > 0 && (
            <div>
              <h4 className="mb-2 flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-neutral-700 dark:text-[#ECCCD9]">
                <TrendingUp className="h-3.5 w-3.5" />
                Bonos, Adelantos (Vales) y Descuentos ({summary.adjustments.length})
              </h4>
              <div className="space-y-1.5">
                {summary.adjustments.map((adj) => {
                  const isBonus = adj.type === 'BONO';
                  return (
                    <div
                      key={adj.id}
                      className="flex items-center justify-between rounded-xl border border-neutral-200 bg-[#FAF8F9] px-3 py-2 text-xs dark:border-[#332B2F] dark:bg-[#211C1F]"
                    >
                      <div>
                        <span className="font-bold text-[#141213] dark:text-white">
                          {adj.concept}
                        </span>
                        <span className="ml-2 rounded-full bg-neutral-200 px-2 py-0.5 text-[10px] font-bold text-neutral-700 dark:bg-[#332B2F] dark:text-[#C4B5BC]">
                          {adj.type}
                        </span>
                      </div>
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
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Detalle de Turnos */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h4 className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-neutral-700 dark:text-[#ECCCD9]">
                <Clock className="h-3.5 w-3.5" />
                Desglose de Turnos Registrados ({staffLogs.length})
              </h4>
              {summary.totalLunchDeductedMinutes > 0 && (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 dark:text-amber-300">
                  <Utensils className="h-3 w-3" />-
                  {summary.totalLunchDeductedMinutes} min almuerzo descontados
                </span>
              )}
            </div>

            {staffLogs.length === 0 ? (
              <div className="rounded-xl border border-dashed border-neutral-300 p-6 text-center text-xs text-neutral-500 dark:border-[#3A3035] dark:text-[#B8A8B0]">
                No hay turnos registrados para este empleado en la quincena{' '}
                {summary.fortnightKey}.
              </div>
            ) : (
              <div className="space-y-2">
                {staffLogs.map((log, idx) => {
                  const shiftPay = Math.round(
                    log.workedHoursDecimal * summary.hourlyRateCop
                  );
                  return (
                    <div
                      key={log.id}
                      className="flex flex-col justify-between gap-2 rounded-xl border border-neutral-200 bg-[#FAF8F9] p-3 sm:flex-row sm:items-center dark:border-[#332B2F] dark:bg-[#211C1F]"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#ECCCD9] text-[11px] font-extrabold text-[#141213]">
                            {idx + 1}
                          </span>
                          <span className="text-xs font-bold text-[#141213] dark:text-white">
                            Entrada: {formatDateTimeCo(log.checkInAt)}
                          </span>
                          {log.lunchDeductedMinutes > 0 && (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-extrabold text-amber-900 dark:bg-amber-950 dark:text-amber-300">
                              -{log.lunchDeductedMinutes}m almuerzo
                            </span>
                          )}
                        </div>
                        <div className="mt-1 pl-7 text-xs text-neutral-600 dark:text-[#C4B5BC]">
                          {log.checkOutAt ? (
                            <>Salida: {formatDateTimeCo(log.checkOutAt)}</>
                          ) : (
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">
                              • Turno actualmente en curso
                            </span>
                          )}
                          {log.notes ? ` — Nota: ${log.notes}` : ''}
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-3 border-t border-neutral-200/70 pt-2 sm:border-t-0 sm:pt-0 dark:border-[#332B2F]">
                        <span className="rounded-lg bg-white px-2.5 py-1 text-xs font-bold text-[#141213] dark:bg-[#171416] dark:text-[#E5D8DF]">
                          {log.workedHoursDecimal} hrs (
                          {formatMinutesToHoursAndMinutes(log.workedMinutes)})
                        </span>
                        <span className="text-xs font-extrabold text-[#141213] dark:text-[#ECCCD9]">
                          {formatCop(shiftPay)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-neutral-200 bg-neutral-50 px-4 py-3 sm:px-6 dark:border-[#332B2F] dark:bg-[#1D191B]">
          <div className="flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4" />
            <span>Liquidación verificada por sistema biométrico EPB</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {onOpenSettlement && (
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenSettlement(summary)}
                className="gap-1.5 border-emerald-500 text-xs font-extrabold text-emerald-800 hover:bg-emerald-50 dark:text-emerald-300"
              >
                <Wallet className="h-4 w-4" />
                {isPaid ? 'Ver / Editar Pago' : 'Marcar como Pagada'}
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={() => window.print()}
              className="gap-1.5 dark:border-[#3A3035] dark:bg-[#252023] dark:text-white"
            >
              <Printer className="h-4 w-4" />
              Imprimir Comprobante
            </Button>
            <Button
              type="button"
              variant="pink"
              onClick={onClose}
              className="bg-[#ECCCD9] font-extrabold text-[#141213] hover:bg-[#E4BDD0]"
            >
              Cerrar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
