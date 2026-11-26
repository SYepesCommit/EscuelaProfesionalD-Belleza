'use client';

import React, { useState } from 'react';
import { UserX, AlertTriangle, CheckCircle2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StudentItem } from '@/interfaces/student.interface';
import { ClassScheduleItem } from '@/interfaces/schedule.interface';

interface ApplyFineModalProps {
  isOpen: boolean;
  student: StudentItem | null;
  schedules: ClassScheduleItem[];
  defaultScheduleId?: string;
  onClose: () => void;
  onSubmit: (payload: {
    studentId: string;
    scheduleId: string;
    customFineAmountCop: number;
    notes?: string;
  }) => Promise<void>;
}

export function ApplyFineModal({
  isOpen,
  student,
  schedules,
  defaultScheduleId,
  onClose,
  onSubmit,
}: ApplyFineModalProps) {
  const [scheduleId, setScheduleId] = useState(defaultScheduleId || schedules[0]?.id || '');
  const [customFineAmountCop, setCustomFineAmountCop] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen || !student) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduleId) {
      setErrorMsg('Debe seleccionar la clase donde ocurrió la inasistencia.');
      return;
    }
    const fineNum = customFineAmountCop === '' ? 0 : Number(customFineAmountCop);
    if (isNaN(fineNum) || fineNum < 0) {
      setErrorMsg('El valor de la multa no puede ser negativo.');
      return;
    }

    setIsBusy(true);
    setErrorMsg(null);
    try {
      await onSubmit({
        studentId: student.id,
        scheduleId,
        customFineAmountCop: fineNum,
        notes: notes.trim() || undefined,
      });
      onClose();
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Error al aplicar la multa'
      );
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-2xl border border-[#ECCCD9] dark:border-white/10 bg-white dark:bg-[#1E1D1D] shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-neutral-100 dark:border-white/5 bg-[#F9EFF3]/60 dark:bg-white/5 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-600 text-white">
              <UserX className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold text-[#1A1A1A] dark:text-neutral-100">
                Registrar Falla y Aplicar Multa
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Alumna: <strong>{student.fullName}</strong> (CC: {student.documentId})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-neutral-200 dark:border-white/10 p-2 text-neutral-400 hover:text-black dark:hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-800 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300">
              {errorMsg}
            </div>
          )}

          <div className="rounded-xl border border-amber-200 dark:border-amber-900/30 bg-amber-50/70 dark:bg-amber-950/20 p-3 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
            <span>
              Al aplicar esta inasistencia, la alumna quedará <strong>BLOQUEADA</strong> de futuras clases hasta que abone la multa y reprograme la sesión.
            </span>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Clase donde faltó la alumna</Label>
            <select
              required
              className="flex h-10 w-full rounded-xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-[#141213] px-3 text-xs font-semibold"
              value={scheduleId}
              onChange={(e) => setScheduleId(e.target.value)}
            >
              {schedules.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.roomName} — {s.title} ({s.courseName})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">
              Valor de la Multa (Editable en COP)
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-xs font-bold text-neutral-400">
                $ COP
              </span>
              <Input
                type="number"
                min={0}
                step={5000}
                placeholder="Ingrese valor (ej: 40000)"
                value={customFineAmountCop}
                onChange={(e) => setCustomFineAmountCop(e.target.value)}
                className="pl-14 text-sm font-bold text-red-700 dark:text-red-400"
              />
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={() => setCustomFineAmountCop('40000')}
                className="text-[11px] rounded-lg border border-neutral-200 dark:border-white/10 px-2 py-0.5 font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                $40.000 (Estándar EPB)
              </button>
              <button
                type="button"
                onClick={() => setCustomFineAmountCop('20000')}
                className="text-[11px] rounded-lg border border-neutral-200 dark:border-white/10 px-2 py-0.5 font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                $20.000 (Media Falla)
              </button>
              <button
                type="button"
                onClick={() => setCustomFineAmountCop('0')}
                className="text-[11px] rounded-lg border border-neutral-200 dark:border-white/10 px-2 py-0.5 font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                $0 (Excusada)
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Motivo u Observación</Label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Escriba aquí los detalles u observaciones de la inasistencia (ej: No asistió al examen de colorimetría)..."
              className="w-full rounded-xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-[#141213] p-3 text-xs leading-relaxed outline-none focus:border-[#232222] dark:focus:border-[#ECCCD9] resize-none"
            />
          </div>

          <div className="mt-6 flex items-center justify-end gap-3 border-t border-neutral-100 dark:border-white/5 pt-4">
            <Button
              type="button"
              variant="outline"
              disabled={isBusy}
              onClick={onClose}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={isBusy}
              className="text-xs font-bold gap-1.5"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>Confirmar Inasistencia y Bloqueo</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
