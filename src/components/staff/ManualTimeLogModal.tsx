'use client';

import React, { useEffect, useState } from 'react';
import { CalendarClock, Clock, PlusCircle, Utensils, X } from 'lucide-react';
import {
  CloseOpenShiftPayload,
  ManualTimeLogPayload,
  StaffMemberItem,
} from '@/interfaces/staff.interface';
import { STAFF_ROLE_META, formatMinutesToHoursAndMinutes } from './staff-role-meta';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCop } from '@/lib/utils';

interface ManualTimeLogModalProps {
  isOpen: boolean;
  staffMembers: StaffMemberItem[];
  preselectedStaffId?: string;
  closingOpenShift?: {
    logId: string;
    staffId: string;
    checkInAt: string;
  } | null;
  operatorUserId: string;
  onClose: () => void;
  onSaveManualShift: (payload: ManualTimeLogPayload) => Promise<unknown>;
  onCloseOpenShift?: (payload: CloseOpenShiftPayload) => Promise<unknown>;
}

export function ManualTimeLogModal({
  isOpen,
  staffMembers,
  preselectedStaffId,
  closingOpenShift,
  operatorUserId,
  onClose,
  onSaveManualShift,
  onCloseOpenShift,
}: ManualTimeLogModalProps) {
  const [staffId, setStaffId] = useState('');
  const [shiftDate, setShiftDate] = useState('');
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('17:00');
  const [deductLunchHour, setDeductLunchHour] = useState(false);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setErrorMsg(null);

    if (closingOpenShift) {
      setStaffId(closingOpenShift.staffId);
      const checkInDate = new Date(closingOpenShift.checkInAt);
      const yyyy = checkInDate.getFullYear();
      const mm = String(checkInDate.getMonth() + 1).padStart(2, '0');
      const dd = String(checkInDate.getDate()).padStart(2, '0');
      const hh = String(checkInDate.getHours()).padStart(2, '0');
      const min = String(checkInDate.getMinutes()).padStart(2, '0');
      setShiftDate(`${yyyy}-${mm}-${dd}`);
      setStartTime(`${hh}:${min}`);
      // Sugerir 8 horas después o 17:00
      const suggestedEndH = Math.min(22, checkInDate.getHours() + 8);
      setEndTime(`${String(suggestedEndH).padStart(2, '0')}:${min}`);
      setDeductLunchHour(true);
      setNotes('Cierre ajustado de turno abierto');
      return;
    }

    const todayIso = new Date().toISOString().slice(0, 10);
    setShiftDate(todayIso);
    setStartTime('08:00');
    setEndTime('17:00');
    setDeductLunchHour(true);
    setNotes('');
    if (preselectedStaffId) {
      setStaffId(preselectedStaffId);
    } else if (staffMembers.length > 0) {
      setStaffId(staffMembers[0].id);
    }
  }, [isOpen, preselectedStaffId, closingOpenShift, staffMembers]);

  if (!isOpen) return null;

  const selectedStaff = staffMembers.find((s) => s.id === staffId) ?? null;

  // Calcular vista previa de minutos brutos, almuerzo, horas netas y valor en COP
  let rawMinutes = 0;
  let lunchMinutes = 0;
  let previewMinutes = 0;
  let previewHours = 0;
  let previewPayCop = 0;

  if (shiftDate && startTime && endTime) {
    const start = closingOpenShift
      ? new Date(closingOpenShift.checkInAt)
      : new Date(`${shiftDate}T${startTime}:00`);
    const end = new Date(`${shiftDate}T${endTime}:00`);
    if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && end > start) {
      rawMinutes = Math.round((end.getTime() - start.getTime()) / 60000);
      lunchMinutes = deductLunchHour && rawMinutes > 60 ? 60 : 0;
      previewMinutes = Math.max(1, rawMinutes - lunchMinutes);
      previewHours = Number((previewMinutes / 60).toFixed(2));
      previewPayCop = Math.round(previewHours * (selectedStaff?.hourlyRateCop ?? 0));
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!staffId) {
      setErrorMsg('Seleccione un empleado.');
      return;
    }
    if (!shiftDate || !startTime || !endTime) {
      setErrorMsg('Complete la fecha, hora de entrada y hora de salida.');
      return;
    }

    const checkInIso = closingOpenShift
      ? new Date(closingOpenShift.checkInAt).toISOString()
      : new Date(`${shiftDate}T${startTime}:00`).toISOString();
    const checkOutIso = new Date(`${shiftDate}T${endTime}:00`).toISOString();

    if (previewMinutes <= 0) {
      setErrorMsg('La hora de salida debe ser mayor a la hora de entrada.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (closingOpenShift && onCloseOpenShift) {
        await onCloseOpenShift({
          logId: closingOpenShift.logId,
          checkOutAt: checkOutIso,
          deductLunchHour,
          notes: notes.trim() || 'Cierre ajustado de turno abierto',
          operatorUserId,
        });
      } else {
        await onSaveManualShift({
          staffId,
          checkInAt: checkInIso,
          checkOutAt: checkOutIso,
          deductLunchHour,
          notes: notes.trim() || 'Turno registrado manualmente',
          operatorUserId,
        });
      }
      onClose();
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Error guardando turno'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 sm:p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-[#E4BDD0] bg-white text-[#141213] shadow-2xl dark:border-[#3A3035] dark:bg-[#181517] dark:text-[#F5EEF1]">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-[#E4BDD0]/80 bg-gradient-to-r from-[#ECCCD9]/60 to-[#FAF2F6] px-4 py-3.5 sm:px-5 dark:border-[#332B2F] dark:from-[#261F23] dark:to-[#1B1719]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#ECCCD9] text-[#141213]">
              <CalendarClock className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="truncate font-serif text-base font-bold text-[#141213] dark:text-[#F5EEF1]">
                {closingOpenShift
                  ? 'Cerrar y Ajustar Turno Abierto'
                  : 'Registrar Turno / Horas Manualmente'}
              </h2>
              <p className="truncate text-xs text-neutral-600 dark:text-[#C4B5BC]">
                {closingOpenShift
                  ? 'Defina la hora real en que salió el empleado y descuento de almuerzo'
                  : 'Para reposición de marcación o ajuste de horas autorizadas'}
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

        <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto p-4 sm:p-5">
          {errorMsg && (
            <div className="rounded-xl border border-red-400/60 bg-red-50 px-3.5 py-2.5 text-xs font-semibold text-red-900 dark:border-red-500/40 dark:bg-red-950/60 dark:text-red-200">
              {errorMsg}
            </div>
          )}

          <div>
            <Label className="text-xs font-bold text-[#141213] dark:text-[#F5EEF1]">
              Empleado / Docente
            </Label>
            <select
              value={staffId}
              disabled={Boolean(closingOpenShift)}
              onChange={(e) => setStaffId(e.target.value)}
              className="mt-1 h-11 w-full rounded-xl border border-neutral-300 bg-white px-3 text-sm font-semibold text-[#141213] disabled:opacity-70 dark:border-[#3A3035] dark:bg-[#211C1F] dark:text-white"
            >
              {staffMembers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.fullName} — {STAFF_ROLE_META[s.role].shortLabel} ({formatCop(s.hourlyRateCop)}/h)
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <Label className="text-xs font-bold text-[#141213] dark:text-[#F5EEF1]">
                Fecha Salida
              </Label>
              <Input
                type="date"
                value={shiftDate}
                onChange={(e) => setShiftDate(e.target.value)}
                className="mt-1 border-neutral-300 bg-white text-[#141213] dark:border-[#3A3035] dark:bg-[#211C1F] dark:text-white"
                required
              />
            </div>

            <div>
              <Label className="text-xs font-bold text-[#141213] dark:text-[#F5EEF1]">
                Hora Entrada
              </Label>
              <Input
                type="time"
                value={startTime}
                disabled={Boolean(closingOpenShift)}
                onChange={(e) => setStartTime(e.target.value)}
                className="mt-1 border-neutral-300 bg-white text-[#141213] disabled:opacity-70 dark:border-[#3A3035] dark:bg-[#211C1F] dark:text-white"
                required
              />
            </div>

            <div>
              <Label className="text-xs font-bold text-[#141213] dark:text-[#F5EEF1]">
                Hora Salida Real
              </Label>
              <Input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="mt-1 border-neutral-300 bg-white text-[#141213] dark:border-[#3A3035] dark:bg-[#211C1F] dark:text-white"
                required
              />
            </div>
          </div>

          {/* Atajos de duración */}
          <div>
            <span className="text-[11px] font-semibold text-neutral-600 dark:text-[#C4B5BC]">
              Atajos rápidos de jornada:
            </span>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {[
                { label: 'Mañana (8am-12pm / 4h)', start: '08:00', end: '12:00', lunch: false },
                { label: 'Tarde (2pm-6pm / 4h)', start: '14:00', end: '18:00', lunch: false },
                { label: 'Jornada 6h (8am-2pm)', start: '08:00', end: '14:00', lunch: false },
                { label: 'Completa 8h netas (8am-5pm -1h alm.)', start: '08:00', end: '17:00', lunch: true },
              ].map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    if (!closingOpenShift) setStartTime(preset.start);
                    setEndTime(preset.end);
                    setDeductLunchHour(preset.lunch);
                  }}
                  className="rounded-lg border border-neutral-300 bg-[#FAF7F9] px-2.5 py-1 text-[11px] font-bold text-[#141213] transition hover:bg-[#ECCCD9] dark:border-[#3A3035] dark:bg-[#211C1F] dark:text-[#E5D8DF] dark:hover:bg-[#ECCCD9] dark:hover:text-[#141213]"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Check de Descuento Opcional de Hora de Almuerzo (-60 min) */}
          <button
            type="button"
            onClick={() => setDeductLunchHour(!deductLunchHour)}
            className={`flex w-full items-center justify-between rounded-xl border p-3 text-left transition ${
              deductLunchHour
                ? 'border-[#141213] bg-[#ECCCD9]/60 text-[#141213] dark:border-[#ECCCD9] dark:bg-[#2A2025] dark:text-white'
                : 'border-neutral-300 bg-white text-neutral-700 dark:border-[#3A3035] dark:bg-[#211C1F] dark:text-[#C4B5BC]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                  deductLunchHour
                    ? 'bg-[#141213] text-[#ECCCD9] dark:bg-[#ECCCD9] dark:text-[#141213]'
                    : 'bg-neutral-100 text-neutral-500 dark:bg-[#181517]'
                }`}
              >
                <Utensils className="h-4 w-4" />
              </div>
              <div>
                <div className="text-xs font-extrabold">
                  Descontar 1 Hora de Almuerzo (-60 min)
                </div>
                <div className="text-[11px] opacity-80">
                  Ideal para jornadas continuas (ej. 8:00 AM a 5:00 PM = 8h netas)
                </div>
              </div>
            </div>
            <span
              className={`rounded-full px-2.5 py-0.5 text-[10px] font-black ${
                deductLunchHour
                  ? 'bg-[#141213] text-[#ECCCD9] dark:bg-[#ECCCD9] dark:text-[#141213]'
                  : 'bg-neutral-200 text-neutral-600 dark:bg-[#332B2F] dark:text-neutral-300'
              }`}
            >
              {deductLunchHour ? 'ACTIVO (-1h)' : 'NO'}
            </span>
          </button>

          {/* Resumen Calculado */}
          <div className="rounded-xl border border-[#E4BDD0] bg-[#FAF2F6] p-3.5 space-y-1.5 dark:border-[#3A3035] dark:bg-[#221D20]">
            {lunchMinutes > 0 && (
              <div className="flex items-center justify-between text-[11px] text-neutral-600 dark:text-[#B8A8B0]">
                <span>Tiempo en reloj ({formatMinutesToHoursAndMinutes(rawMinutes)}):</span>
                <span className="font-bold text-amber-800 dark:text-amber-300">
                  - 60 min almuerzo
                </span>
              </div>
            )}
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 font-semibold text-neutral-700 dark:text-[#C4B5BC]">
                <Clock className="h-3.5 w-3.5" />
                Tiempo Neto Liquidable:
              </span>
              <span className="font-extrabold text-[#141213] dark:text-white">
                {previewHours} hrs ({formatMinutesToHoursAndMinutes(previewMinutes)})
              </span>
            </div>
            <div className="flex items-center justify-between border-t border-[#E4BDD0]/60 pt-1.5 text-xs dark:border-[#332B2F]">
              <span className="font-semibold text-neutral-700 dark:text-[#C4B5BC]">
                Valor del Turno ({formatCop(selectedStaff?.hourlyRateCop ?? 0)}/h):
              </span>
              <span className="text-sm font-extrabold text-[#141213] dark:text-[#ECCCD9]">
                {formatCop(previewPayCop)}
              </span>
            </div>
          </div>

          <div>
            <Label className="text-xs font-bold text-[#141213] dark:text-[#F5EEF1]">
              Motivo / Observación de Auditoría
            </Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej: Reposición de clase práctica / Olvido de marcación de salida"
              className="mt-1 border-neutral-300 bg-white text-[#141213] dark:border-[#3A3035] dark:bg-[#211C1F] dark:text-white"
            />
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-neutral-200 pt-3 dark:border-[#332B2F]">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="dark:border-[#3A3035] dark:bg-[#221D20] dark:text-neutral-200"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="pink"
              disabled={isSubmitting || previewMinutes <= 0}
              className="gap-1.5 bg-[#ECCCD9] font-extrabold text-[#141213] hover:bg-[#E4BDD0]"
            >
              <PlusCircle className="h-4 w-4" />
              {isSubmitting
                ? 'Guardando...'
                : closingOpenShift
                  ? 'Cerrar Turno y Liquidar'
                  : 'Guardar Turno y Horas'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
