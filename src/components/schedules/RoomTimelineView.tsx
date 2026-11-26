'use client';

import React from 'react';
import {
  ArrowUpRight,
  Clock,
  Copy,
  Fingerprint,
  User,
  Users,
} from 'lucide-react';
import { ClassScheduleItem } from '@/interfaces/schedule.interface';
import { Badge } from '@/components/ui/badge';
import { formatTimeCo } from '@/lib/utils';

interface RoomTimelineViewProps {
  schedules: ClassScheduleItem[];
  onSelectSchedule?: (schedule: ClassScheduleItem) => void;
  onDuplicateSchedule?: (schedule: ClassScheduleItem) => void;
}

export function RoomTimelineView({
  schedules,
  onSelectSchedule,
  onDuplicateSchedule,
}: RoomTimelineViewProps) {
  if (schedules.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#E4BDD0] dark:border-[#3A3035] bg-white/80 dark:bg-[#1B181A] p-12 text-center">
        <Clock className="mb-3 h-10 w-10 text-neutral-400" />
        <h3 className="font-serif text-xl font-bold text-[#141213] dark:text-[#F5EEF1]">
          No hay clases programadas en este horario
        </h3>
        <p className="mt-1 max-w-sm text-sm text-neutral-500 dark:text-[#C4B5BC]">
          Seleccione otro salón o programe una nueva clase usando el botón superior.
        </p>
      </div>
    );
  }

  const groupedByDate: Record<string, ClassScheduleItem[]> = {};
  schedules.forEach((sch) => {
    const dateKey = new Date(sch.startTime).toLocaleDateString('es-CO', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    if (!groupedByDate[dateKey]) groupedByDate[dateKey] = [];
    groupedByDate[dateKey].push(sch);
  });

  return (
    <div className="space-y-7">
      {Object.entries(groupedByDate).map(([dateLabel, items]) => (
        <div key={dateLabel} className="space-y-4">
          <div className="flex items-center gap-2.5 border-b border-[#E4BDD0]/80 dark:border-[#332B2F] pb-2.5">
            <div className="h-3 w-3 rounded-full bg-[#141213] dark:bg-[#ECCCD9]" />
            <h3 className="font-serif text-lg font-bold capitalize text-[#141213] dark:text-[#F5EEF1]">
              {dateLabel}
            </h3>
            <span className="text-sm font-medium text-neutral-500 dark:text-[#C4B5BC]">
              ({items.length} bloque{items.length > 1 ? 's' : ''})
            </span>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {items.map((sch) => {
              const occupancyPct = Math.min(
                100,
                Math.round((sch.enrolledCount / sch.maxStudents) * 100)
              );
              const isFull = sch.enrolledCount >= sch.maxStudents;
              const now = Date.now();
              const startMs = new Date(sch.startTime).getTime();
              const endMs = new Date(sch.endTime).getTime();
              const isManuallyDisabled = sch.isActive === false;
              const isFinished = isManuallyDisabled || endMs < now;
              const isOngoing =
                !isManuallyDisabled && startMs <= now && endMs >= now;

              const presentCount = sch.enrolledStudents.filter(
                (s) => s.attendanceStatus === 'PRESENTE'
              ).length;
              const absentCount = sch.enrolledStudents.filter(
                (s) => s.attendanceStatus === 'AUSENTE'
              ).length;
              const pendingCount = Math.max(
                0,
                sch.enrolledCount - presentCount - absentCount
              );

              return (
                <div
                  key={sch.id}
                  onClick={() => onSelectSchedule?.(sch)}
                  className={`group relative flex min-w-0 overflow-hidden cursor-pointer flex-col justify-between rounded-2xl border p-4 sm:p-5 shadow-xs transition-all hover:shadow-md active:scale-[0.99] ${
                    isFinished
                      ? 'border-neutral-200 dark:border-[#2C2629] bg-neutral-50/80 dark:bg-[#171416] opacity-85 hover:opacity-100'
                      : isOngoing
                        ? 'border-emerald-400 dark:border-emerald-500/60 bg-white dark:bg-[#1B181A] ring-1 ring-emerald-400/30'
                        : 'border-[#E4BDD0] dark:border-[#332B2F] bg-white dark:bg-[#1B181A] hover:border-[#141213] dark:hover:border-[#ECCCD9]/60'
                  }`}
                >
                  <div className="space-y-3.5">
                    {/* Fila superior: Salón, Estado temporal y Horario */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-100 dark:border-[#2C2629] pb-3">
                      <div className="flex items-center gap-1.5">
                        <Badge
                          variant="pink"
                          className="text-xs px-2.5 py-1 font-bold"
                        >
                          {sch.roomName}
                        </Badge>
                        {isManuallyDisabled ? (
                          <Badge
                            variant="secondary"
                            className="text-[10px] font-bold"
                          >
                            Desactivada
                          </Badge>
                        ) : isOngoing ? (
                          <Badge
                            variant="success"
                            className="text-[10px] font-bold"
                          >
                            ● En Curso
                          </Badge>
                        ) : isFinished ? (
                          <Badge
                            variant="secondary"
                            className="text-[10px] font-semibold"
                          >
                            Finalizada
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-[10px] font-semibold"
                          >
                            Próxima
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#141213] dark:text-[#E5D8DF]">
                        <Clock className="h-3.5 w-3.5 text-neutral-400" />
                        <span>
                          {formatTimeCo(sch.startTime)} –{' '}
                          {formatTimeCo(sch.endTime)}
                        </span>
                      </div>
                    </div>

                    {/* Contenido: Materia, Título de la Clase y Docente */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-[#C4B5BC]">
                          {sch.courseName}
                        </span>
                        {onDuplicateSchedule && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDuplicateSchedule(sch);
                            }}
                            className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-[#E4BDD0] bg-[#FAF2F6] px-2 py-0.5 text-[10px] font-extrabold text-[#141213] hover:bg-[#ECCCD9] dark:border-[#3A3035] dark:bg-[#252023] dark:text-[#ECCCD9]"
                            title="Duplicar clase para otra fecha"
                          >
                            <Copy className="h-2.5 w-2.5" />
                            Duplicar
                          </button>
                        )}
                      </div>
                      <h4 className="font-serif text-lg font-bold text-[#141213] dark:text-white transition-colors group-hover:text-[#7A1E46] dark:group-hover:text-[#ECCCD9] leading-snug">
                        {sch.title}
                      </h4>
                      <p className="flex items-center gap-2 text-xs sm:text-sm text-neutral-600 dark:text-[#C4B5BC] pt-0.5">
                        <User className="h-4 w-4 text-neutral-400 shrink-0" />
                        <span className="font-semibold truncate">
                          {sch.teacherName}
                        </span>
                      </p>

                      {isManuallyDisabled && sch.deactivationReason && (
                        <div className="mt-2 rounded-xl border border-neutral-200 dark:border-[#332B2F] bg-neutral-100/80 dark:bg-[#221D20] px-3 py-1.5 text-[11px] text-neutral-700 dark:text-[#E5D8DF]">
                          <strong>Motivo desactivación:</strong>{' '}
                          {sch.deactivationReason}
                          {sch.deactivatedByName
                            ? ` (${sch.deactivatedByName})`
                            : ''}
                        </div>
                      )}
                    </div>

                    {/* Resumen de Asistencia Biométrica Individual */}
                    {sch.enrolledCount > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[10px] font-extrabold">
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-900 dark:bg-emerald-950/80 dark:text-emerald-300">
                          <Fingerprint className="h-2.5 w-2.5" />✓{' '}
                          {presentCount} Presente(s)
                        </span>
                        {absentCount > 0 && (
                          <span className="rounded-full bg-red-100 px-2 py-0.5 text-red-900 dark:bg-red-950/80 dark:text-red-300">
                            ✕ {absentCount} Ausente(s)
                          </span>
                        )}
                        {pendingCount > 0 && (
                          <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-neutral-600 dark:bg-[#252023] dark:text-[#C4B5BC]">
                            {pendingCount} por huella
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Barra de ocupación y enlace de gestión */}
                  <div className="mt-4 space-y-2 border-t border-neutral-100 dark:border-[#2C2629] pt-3.5">
                    <div className="flex items-center justify-between text-xs sm:text-sm">
                      <span className="flex items-center gap-1.5 text-neutral-600 dark:text-[#C4B5BC] font-bold">
                        <Users className="h-4 w-4 text-neutral-400" />
                        {sch.enrolledCount} / {sch.maxStudents} personas
                      </span>
                      <span className="flex items-center gap-1 text-xs font-extrabold text-neutral-600 group-hover:text-[#141213] dark:text-[#ECCCD9] transition-colors">
                        {isFull ? (
                          <span className="text-red-600 dark:text-red-400 font-black">
                            Cupo Lleno
                          </span>
                        ) : (
                          <>
                            <span>Gestionar</span>
                            <ArrowUpRight className="h-4 w-4" />
                          </>
                        )}
                      </span>
                    </div>

                    <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-[#262023]">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isFull
                            ? 'bg-red-600'
                            : 'bg-gradient-to-r from-[#ECCCD9] to-[#D99BB7]'
                        }`}
                        style={{ width: `${Math.max(6, occupancyPct)}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
