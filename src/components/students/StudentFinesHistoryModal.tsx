'use client';

import React from 'react';
import { History, CheckCircle2, AlertOctagon, Calendar, UserCheck, Receipt, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StudentItem } from '@/interfaces/student.interface';
import { formatCop, formatDateTimeCo } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface StudentFinesHistoryModalProps {
  isOpen: boolean;
  student: StudentItem | null;
  onClose: () => void;
}

export function StudentFinesHistoryModal({
  isOpen,
  student,
  onClose,
}: StudentFinesHistoryModalProps) {
  if (!isOpen || !student) return null;

  const fines = student.fines ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl border border-[#ECCCD9] dark:border-white/10 bg-white dark:bg-[#1E1D1D] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-100 dark:border-white/5 bg-[#F9EFF3]/60 dark:bg-white/5 px-6 py-4 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#232222] text-[#ECCCD9]">
              <History className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold text-[#1A1A1A] dark:text-neutral-100">
                Historial de Inasistencias y Constancia de Pagos
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Alumna: <strong>{student.fullName}</strong> &bull; CC: {student.documentId}
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

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4">
          {fines.length === 0 ? (
            <div className="text-center py-10 space-y-2">
              <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto" />
              <h4 className="font-serif text-base font-bold text-neutral-800 dark:text-neutral-200">
                Sin multas ni sanciones registradas
              </h4>
              <p className="text-xs text-neutral-500">
                La estudiante tiene asistencia impecable y no registra cobros pendientes.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {fines.map((fine) => {
                const isPaid = fine.status === 'PAGADA';

                return (
                  <div
                    key={fine.id}
                    className={`rounded-2xl border p-4 transition ${
                      isPaid
                        ? 'border-emerald-200 dark:border-emerald-900/30 bg-emerald-50/20 dark:bg-emerald-950/10'
                        : 'border-red-200 dark:border-red-900/30 bg-red-50/30 dark:bg-red-950/15'
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2 border-b border-neutral-100 dark:border-white/5 pb-2.5">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-serif text-base font-bold text-[#1A1A1A] dark:text-neutral-100">
                            {fine.missedScheduleTitle || 'Clase Académica'}
                          </span>
                          <Badge
                            variant={isPaid ? 'success' : 'destructive'}
                            className="text-[10px] font-bold"
                          >
                            {isPaid ? 'PAGADA & REPROGRAMADA' : 'PENDIENTE DE PAGO'}
                          </Badge>
                        </div>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                          {fine.reason}
                        </p>
                      </div>

                      <span
                        className={`text-base font-extrabold ${
                          isPaid ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                        }`}
                      >
                        {formatCop(fine.amountCop)}
                      </span>
                    </div>

                    <div className="mt-3 grid gap-2 sm:grid-cols-2 text-xs">
                      {/* Fecha de inasistencia */}
                      <div className="flex items-center gap-1.5 text-neutral-600 dark:text-neutral-300">
                        <Calendar className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
                        <span>Falla registrada: <strong>{formatDateTimeCo(fine.createdAt)}</strong></span>
                      </div>

                      {/* Recibo / Referencia y Método */}
                      {fine.paymentReference && (
                        <div className="flex items-center gap-1.5 text-neutral-600 dark:text-neutral-300">
                          <Receipt className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
                          <span>
                            Pago ({fine.paymentMethod || 'EFECTIVO'}): <strong>{fine.paymentReference}</strong>
                          </span>
                        </div>
                      )}

                      {/* Responsable que recibió el dinero */}
                      {isPaid && (
                        <div className="flex items-center gap-1.5 sm:col-span-2 text-emerald-800 dark:text-emerald-300 bg-emerald-50/60 dark:bg-emerald-950/30 p-2 rounded-xl border border-emerald-200 dark:border-emerald-900/30">
                          <UserCheck className="h-4 w-4 shrink-0 text-emerald-600" />
                          <span>
                            Cobro recibido y validado por:{' '}
                            <strong className="underline decoration-emerald-500">
                              {fine.collectedByUserName || 'Administración EPB'}
                            </strong>
                            {fine.paidAt && ` el ${formatDateTimeCo(fine.paidAt)}`}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end border-t border-neutral-100 dark:border-white/5 p-4 bg-neutral-50 dark:bg-[#141213] shrink-0">
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
            Cerrar Historial
          </Button>
        </div>
      </div>
    </div>
  );
}
