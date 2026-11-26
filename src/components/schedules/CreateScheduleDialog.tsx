'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarDays,
  Clock,
  Copy,
  DoorOpen,
  Repeat,
  Search,
  Sparkles,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import {
  ClassScheduleItem,
  CreateSchedulePayload,
  RoomItem,
  ScheduleRepeatMode,
} from '@/interfaces/schedule.interface';
import { StaffMemberItem } from '@/interfaces/staff.interface';
import { StudentItem } from '@/interfaces/student.interface';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface CreateScheduleDialogProps {
  rooms: RoomItem[];
  teachers: StaffMemberItem[];
  students: StudentItem[];
  allSchedules?: ClassScheduleItem[];
  defaultRoomId?: string;
  initialTemplate?: ClassScheduleItem | null;
  onClose: () => void;
  onSubmit: (payload: CreateSchedulePayload) => Promise<void>;
}

const QUICK_PERSON_LIMITS = [6, 10, 12, 15, 18, 20, 25];

const PROGRAM_PRESETS = [
  'Técnico Profesional en Cosmetología y Estética Integral',
  'Especialización en Diseño de Uñas Acrílicas y Nail Art',
  'Master en Colorimetría, Balayage y Alisados',
  'Peluquería Profesional & Barbería Clásica',
  'Maquillaje Profesional & Novias',
];

const TIME_BLOCK_PRESETS = [
  { label: 'Mañana (08:00 - 12:00 / 4h)', start: '08:00', end: '12:00' },
  { label: 'Tarde (14:00 - 18:00 / 4h)', start: '14:00', end: '18:00' },
  { label: 'Noche (18:00 - 21:00 / 3h)', start: '18:00', end: '21:00' },
  { label: 'Intensivo (08:00 - 16:00 / 8h)', start: '08:00', end: '16:00' },
];

const REPEAT_OPTIONS: { key: ScheduleRepeatMode; label: string; desc: string }[] = [
  { key: 'SINGLE', label: 'Solo este día', desc: '1 sesión única' },
  { key: 'DAILY_3', label: '3 Días seguidos', desc: '3 sesiones consecutivas' },
  { key: 'DAILY_5', label: '5 Días (Lun-Vie)', desc: '5 sesiones seguidas' },
  { key: 'WEEKLY_4', label: '4 Semanas', desc: 'Mismo día por 4 semanas' },
];

export function CreateScheduleDialog({
  rooms,
  teachers,
  students,
  allSchedules = [],
  defaultRoomId,
  initialTemplate,
  onClose,
  onSubmit,
}: CreateScheduleDialogProps) {
  const [roomId, setRoomId] = useState<string>(
    initialTemplate?.roomId || defaultRoomId || rooms[0]?.id || ''
  );
  const [teacherId, setTeacherId] = useState<string>(
    initialTemplate?.teacherId || teachers[0]?.id || ''
  );
  const [title, setTitle] = useState(
    initialTemplate
      ? initialTemplate.title.replace(/\s*\(Sesión \d+\/\d+\)$/i, '')
      : ''
  );
  const [courseName, setCourseName] = useState(
    initialTemplate?.courseName || PROGRAM_PRESETS[0]
  );

  // Fecha + Hora Inicio + Hora Fin amigables para Móvil, POS y PC
  const [classDate, setClassDate] = useState<string>(() => {
    const base = initialTemplate ? new Date(initialTemplate.startTime) : new Date();
    if (initialTemplate) {
      base.setDate(base.getDate() + 1); // Si duplica clase, sugerir el día siguiente
    }
    const yyyy = base.getFullYear();
    const mm = String(base.getMonth() + 1).padStart(2, '0');
    const dd = String(base.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });
  const [startHour, setStartHour] = useState<string>(() => {
    if (initialTemplate) {
      const d = new Date(initialTemplate.startTime);
      return `${String(d.getHours()).padStart(2, '0')}:${String(
        d.getMinutes()
      ).padStart(2, '0')}`;
    }
    return '08:00';
  });
  const [endHour, setEndHour] = useState<string>(() => {
    if (initialTemplate) {
      const d = new Date(initialTemplate.endTime);
      return `${String(d.getHours()).padStart(2, '0')}:${String(
        d.getMinutes()
      ).padStart(2, '0')}`;
    }
    return '12:00';
  });

  const [repeatMode, setRepeatMode] = useState<ScheduleRepeatMode>('SINGLE');
  const [maxStudents, setMaxStudents] = useState<number>(
    initialTemplate?.maxStudents || 15
  );
  const [selectedStudents, setSelectedStudents] = useState<string[]>(
    initialTemplate ? initialTemplate.enrolledStudents.map((s) => s.id) : []
  );
  const [notes, setNotes] = useState(initialTemplate?.notes || '');
  const [studentSearch, setStudentSearch] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!roomId && rooms.length > 0) {
      const target = defaultRoomId || rooms[0].id;
      setRoomId(target);
      const found = rooms.find((r) => r.id === target);
      if (found && !initialTemplate) setMaxStudents(found.capacity);
    }
  }, [defaultRoomId, roomId, rooms, initialTemplate]);

  useEffect(() => {
    if (!teacherId && teachers.length > 0) {
      setTeacherId(teachers[0].id);
    }
  }, [teacherId, teachers]);

  const handleSelectRoom = (id: string) => {
    setRoomId(id);
    const room = rooms.find((r) => r.id === id);
    if (room) setMaxStudents(room.capacity);
  };

  const handleToggleStudent = (id: string) => {
    setErrorMsg(null);
    setSelectedStudents((prev) => {
      if (prev.includes(id)) return prev.filter((item) => item !== id);
      if (prev.length >= maxStudents) {
        setErrorMsg(
          `El cupo máximo configurado para esta clase es de ${maxStudents} personas.`
        );
        return prev;
      }
      return [...prev, id];
    });
  };

  // Inscribir rápidamente todas las alumnas habilitadas del programa seleccionado
  const handleSelectProgramGroup = (programQuery: string) => {
    setErrorMsg(null);
    const q = programQuery.toLowerCase();
    const matchingEnabled = students.filter(
      (s) => !s.isBlocked && s.programName.toLowerCase().includes(q)
    );
    const currentSet = new Set(selectedStudents);
    for (const st of matchingEnabled) {
      if (currentSet.size >= maxStudents) break;
      currentSet.add(st.id);
    }
    setSelectedStudents(Array.from(currentSet));
  };

  // Pre-detección en vivo de cruce de salón o docente en la fecha principal
  const liveConflictWarning = useMemo(() => {
    if (!classDate || !startHour || !endHour || !roomId || !teacherId) return null;
    const startMs = new Date(`${classDate}T${startHour}:00`).getTime();
    const endMs = new Date(`${classDate}T${endHour}:00`).getTime();
    if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs <= startMs) return null;

    for (const sch of allSchedules) {
      if (sch.isActive === false) continue;
      const sMs = new Date(sch.startTime).getTime();
      const eMs = new Date(sch.endTime).getTime();
      const overlaps = sMs < endMs && eMs > startMs;
      if (!overlaps) continue;

      if (sch.roomId === roomId) {
        return `Atención: ${sch.roomName} ya tiene programada la clase "${sch.title}" (${sch.teacherName}) en ese horario.`;
      }
      if (sch.teacherId === teacherId) {
        return `Atención: El docente seleccionado ya dicta "${sch.title}" en ${sch.roomName} a esa misma hora.`;
      }
    }
    return null;
  }, [allSchedules, classDate, startHour, endHour, roomId, teacherId]);

  const filteredStudents = useMemo(() => {
    const q = studentSearch.trim().toLowerCase();
    if (!q) return students;
    return students.filter(
      (st) =>
        st.fullName.toLowerCase().includes(q) ||
        st.documentId.toLowerCase().includes(q) ||
        st.programName.toLowerCase().includes(q)
    );
  }, [students, studentSearch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!roomId || !teacherId || !title.trim() || !courseName.trim() || !classDate) {
      setErrorMsg('Complete todos los campos obligatorios.');
      return;
    }

    const startIso = new Date(`${classDate}T${startHour}:00`).toISOString();
    const endIso = new Date(`${classDate}T${endHour}:00`).toISOString();

    if (new Date(endIso) <= new Date(startIso)) {
      setErrorMsg('La hora de finalización debe ser mayor a la hora de inicio.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        roomId,
        teacherId,
        title: title.trim(),
        courseName: courseName.trim(),
        startTime: startIso,
        endTime: endIso,
        maxStudents,
        studentIds: selectedStudents,
        notes: notes.trim() || undefined,
        repeatMode,
      });
      onClose();
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'No se pudo programar la clase (verifique cruces de horario)'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-2.5 sm:p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative flex max-h-[94vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-[#E4BDD0] bg-white text-[#141213] shadow-2xl dark:border-[#3A3035] dark:bg-[#181517] dark:text-[#F5EEF1]">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-[#E4BDD0]/80 bg-gradient-to-r from-[#ECCCD9]/65 to-[#FAF2F6] px-5 py-4 dark:border-[#332B2F] dark:from-[#261F23] dark:to-[#1B1719]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#141213] text-[#ECCCD9] dark:bg-[#ECCCD9] dark:text-[#141213]">
              {initialTemplate ? (
                <Copy className="h-5 w-5" />
              ) : (
                <Sparkles className="h-5 w-5" />
              )}
            </div>
            <div className="min-w-0">
              <h2 className="truncate font-serif text-base sm:text-lg font-bold text-[#141213] dark:text-[#F5EEF1]">
                {initialTemplate
                  ? `Duplicar Clase: ${initialTemplate.title}`
                  : 'Programar Clase en Salón Físico'}
              </h2>
              <p className="truncate text-xs text-neutral-600 dark:text-[#C4B5BC]">
                Validación automática anti-cruce de salón y docente • Inscripción por grupo
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-100 dark:border-white/15 dark:bg-[#252023] dark:text-neutral-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6"
        >
          {errorMsg && (
            <div className="flex items-start gap-2.5 rounded-xl border border-red-400/70 bg-red-50 p-3.5 text-xs font-bold text-red-900 dark:border-red-500/50 dark:bg-red-950/70 dark:text-red-200">
              <AlertTriangle className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {liveConflictWarning && (
            <div className="flex items-start gap-2.5 rounded-xl border-2 border-amber-500 bg-amber-50 p-3.5 text-xs font-extrabold text-amber-950 dark:border-amber-500/60 dark:bg-amber-950/70 dark:text-amber-200">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>{liveConflictWarning}</span>
            </div>
          )}

          {/* 1. Selector Visual de Salón Físico + Cupo */}
          <div className="rounded-2xl border border-neutral-200 bg-[#FAF8F9] p-4 space-y-3 dark:border-[#332B2F] dark:bg-[#201B1E]">
            <Label className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-[#141213] dark:text-[#ECCCD9]">
              <DoorOpen className="h-4 w-4" />
              1. Elegir Salón Físico y Cupo Máximo de Personas
            </Label>

            <div className="grid gap-2 sm:grid-cols-3">
              {rooms.map((r) => {
                const isSelected = roomId === r.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => handleSelectRoom(r.id)}
                    className={`flex flex-col justify-between rounded-xl border-2 p-3 text-left transition ${
                      isSelected
                        ? 'border-[#141213] bg-[#ECCCD9] text-[#141213] shadow-xs dark:border-[#ECCCD9]'
                        : 'border-neutral-300 bg-white text-neutral-700 hover:bg-[#FAF0F5] dark:border-[#3A3035] dark:bg-[#161315] dark:text-[#E5D8DF]'
                    }`}
                  >
                    <span className="text-xs font-extrabold">{r.name}</span>
                    <span
                      className={`mt-1 text-[11px] font-semibold ${
                        isSelected
                          ? 'text-[#141213]/80'
                          : 'text-neutral-500 dark:text-[#B8A8B0]'
                      }`}
                    >
                      Capacidad base: {r.capacity} personas
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="grid gap-3 pt-1 sm:grid-cols-2">
              <div>
                <Label className="flex items-center gap-1.5 text-xs font-bold text-[#141213] dark:text-[#F5EEF1]">
                  <Users className="h-3.5 w-3.5" />
                  Cupo Máximo para esta Clase *
                </Label>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={maxStudents}
                  onChange={(e) => setMaxStudents(Number(e.target.value))}
                  className="mt-1 h-10 font-black border-neutral-300 bg-white text-[#141213] dark:border-[#3A3035] dark:bg-[#161315] dark:text-white"
                  required
                />
              </div>

              <div>
                <Label className="text-xs font-bold text-neutral-600 dark:text-[#C4B5BC]">
                  Atajos de Cupo:
                </Label>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {QUICK_PERSON_LIMITS.map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setMaxStudents(num)}
                      className={`rounded-lg border px-2.5 py-1.5 text-xs font-extrabold transition ${
                        maxStudents === num
                          ? 'border-[#141213] bg-[#141213] text-[#ECCCD9] dark:border-[#ECCCD9] dark:bg-[#ECCCD9] dark:text-[#141213]'
                          : 'border-neutral-300 bg-white text-[#141213] hover:bg-[#ECCCD9] dark:border-[#3A3035] dark:bg-[#161315] dark:text-[#E5D8DF]'
                      }`}
                    >
                      {num} pers.
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 2. Docente, Programa Académico y Tema */}
          <div className="rounded-2xl border border-neutral-200 bg-[#FAF8F9] p-4 space-y-3 dark:border-[#332B2F] dark:bg-[#201B1E]">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label className="text-xs font-bold text-[#141213] dark:text-[#F5EEF1]">
                  Docente Responsable *
                </Label>
                <select
                  className="mt-1 flex h-10 w-full rounded-xl border border-neutral-300 bg-white px-3 text-xs font-bold text-[#141213] dark:border-[#3A3035] dark:bg-[#161315] dark:text-white"
                  value={teacherId}
                  onChange={(e) => setTeacherId(e.target.value)}
                  required
                >
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.fullName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label className="text-xs font-bold text-[#141213] dark:text-[#F5EEF1]">
                  Programa / Materia *
                </Label>
                <Input
                  placeholder="Ej: Master en Colorimetría"
                  value={courseName}
                  onChange={(e) => setCourseName(e.target.value)}
                  className="mt-1 h-10 text-xs font-bold border-neutral-300 bg-white text-[#141213] dark:border-[#3A3035] dark:bg-[#161315] dark:text-white"
                  required
                />
              </div>
            </div>

            {/* Píldoras rápidas de Programa Académico */}
            <div className="flex flex-wrap gap-1.5">
              {PROGRAM_PRESETS.map((prog) => (
                <button
                  key={prog}
                  type="button"
                  onClick={() => setCourseName(prog)}
                  className={`rounded-full border px-2.5 py-1 text-[10px] font-extrabold transition ${
                    courseName === prog
                      ? 'border-[#141213] bg-[#ECCCD9] text-[#141213]'
                      : 'border-neutral-300 bg-white text-neutral-700 hover:bg-[#FAF0F5] dark:border-[#3A3035] dark:bg-[#161315] dark:text-[#C4B5BC]'
                  }`}
                >
                  {prog}
                </button>
              ))}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label className="text-xs font-bold text-[#141213] dark:text-[#F5EEF1]">
                  Tema Específico de la Clase *
                </Label>
                <Input
                  placeholder="Ej: Práctica de Balayage, Matices y Decoloración"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-1 h-10 text-xs font-semibold border-neutral-300 bg-white text-[#141213] dark:border-[#3A3035] dark:bg-[#161315] dark:text-white"
                  required
                />
              </div>

              <div>
                <Label className="text-xs font-bold text-[#141213] dark:text-[#F5EEF1]">
                  Materiales / Observaciones (Opcional)
                </Label>
                <Input
                  placeholder="Ej: Traer cabezote térmico, oxidante 20 vol y guantes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="mt-1 h-10 text-xs border-neutral-300 bg-white text-[#141213] dark:border-[#3A3035] dark:bg-[#161315] dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* 3. Fecha, Bloques Horarios Táctiles y Programación Recurrente */}
          <div className="rounded-2xl border border-[#E4BDD0] bg-[#FAF2F6]/90 p-4 space-y-3 dark:border-[#3D2E35] dark:bg-[#231B20]">
            <Label className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-[#141213] dark:text-[#ECCCD9]">
              <CalendarDays className="h-4 w-4" />
              3. Fecha, Horario y Frecuencia de Repetición
            </Label>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <Label className="text-xs font-bold text-[#141213] dark:text-[#F5EEF1]">
                  Fecha de Inicio *
                </Label>
                <Input
                  type="date"
                  value={classDate}
                  onChange={(e) => setClassDate(e.target.value)}
                  className="mt-1 h-10 font-bold border-neutral-300 bg-white text-[#141213] dark:border-[#3A3035] dark:bg-[#161315] dark:text-white"
                  required
                />
              </div>

              <div>
                <Label className="text-xs font-bold text-[#141213] dark:text-[#F5EEF1]">
                  Hora de Inicio *
                </Label>
                <Input
                  type="time"
                  value={startHour}
                  onChange={(e) => setStartHour(e.target.value)}
                  className="mt-1 h-10 font-bold border-neutral-300 bg-white text-[#141213] dark:border-[#3A3035] dark:bg-[#161315] dark:text-white"
                  required
                />
              </div>

              <div>
                <Label className="text-xs font-bold text-[#141213] dark:text-[#F5EEF1]">
                  Hora de Finalización *
                </Label>
                <Input
                  type="time"
                  value={endHour}
                  onChange={(e) => setEndHour(e.target.value)}
                  className="mt-1 h-10 font-bold border-neutral-300 bg-white text-[#141213] dark:border-[#3A3035] dark:bg-[#161315] dark:text-white"
                  required
                />
              </div>
            </div>

            {/* Botones rápidos de bloque horario */}
            <div>
              <span className="text-[11px] font-bold text-neutral-600 dark:text-[#C4B5BC]">
                Bloques horarios frecuentes:
              </span>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {TIME_BLOCK_PRESETS.map((block) => {
                  const active =
                    startHour === block.start && endHour === block.end;
                  return (
                    <button
                      key={block.label}
                      type="button"
                      onClick={() => {
                        setStartHour(block.start);
                        setEndHour(block.end);
                      }}
                      className={`inline-flex items-center gap-1 rounded-xl border px-3 py-1.5 text-xs font-extrabold transition ${
                        active
                          ? 'border-[#141213] bg-[#141213] text-[#ECCCD9] dark:border-[#ECCCD9] dark:bg-[#ECCCD9] dark:text-[#141213]'
                          : 'border-neutral-300 bg-white text-[#141213] hover:bg-[#ECCCD9] dark:border-[#3A3035] dark:bg-[#161315] dark:text-[#E5D8DF]'
                      }`}
                    >
                      <Clock className="h-3 w-3" />
                      {block.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selector de Repetición / Varios Días */}
            <div className="pt-1">
              <span className="flex items-center gap-1.5 text-[11px] font-extrabold text-[#141213] dark:text-[#ECCCD9]">
                <Repeat className="h-3.5 w-3.5" />
                ¿Repetir esta clase automáticamente con las mismas alumnas?
              </span>
              <div className="mt-1.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {REPEAT_OPTIONS.map((opt) => {
                  const active = repeatMode === opt.key;
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setRepeatMode(opt.key)}
                      className={`flex flex-col rounded-xl border p-2.5 text-left transition ${
                        active
                          ? 'border-[#141213] bg-[#ECCCD9] text-[#141213] shadow-2xs dark:border-[#ECCCD9]'
                          : 'border-neutral-300 bg-white text-neutral-700 dark:border-[#3A3035] dark:bg-[#161315] dark:text-[#C4B5BC]'
                      }`}
                    >
                      <span className="text-xs font-extrabold">{opt.label}</span>
                      <span className="text-[10px] opacity-80">{opt.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 4. Inscribir Alumnas (Individual o Por Grupo de Programa) */}
          <div className="rounded-2xl border border-neutral-200 bg-[#FAF8F9] p-4 space-y-3 dark:border-[#332B2F] dark:bg-[#201B1E]">
            <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
              <div>
                <Label className="text-xs font-extrabold uppercase tracking-wider text-[#141213] dark:text-[#ECCCD9]">
                  4. Inscribir Alumnas ({selectedStudents.length} de {maxStudents} cupos)
                </Label>
                <p className="text-[11px] text-neutral-500 dark:text-[#B8A8B0]">
                  La asistencia se validará individualmente por huella en el salón.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleSelectProgramGroup(courseName)}
                  className="inline-flex items-center gap-1 rounded-xl border border-[#141213]/20 bg-[#ECCCD9] px-3 py-1.5 text-xs font-extrabold text-[#141213] transition hover:bg-[#e4bdd0]"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Inscribir Grupo de este Programa
                </button>
                {selectedStudents.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedStudents([])}
                    className="rounded-xl border border-neutral-300 bg-white px-2.5 py-1.5 text-xs font-bold text-neutral-600 hover:bg-neutral-100 dark:border-[#3A3035] dark:bg-[#161315] dark:text-[#C4B5BC]"
                  >
                    Limpiar ({selectedStudents.length})
                  </button>
                )}
              </div>
            </div>

            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
              <Input
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                placeholder="Buscar alumna por nombre, documento o programa..."
                className="h-9 pl-9 text-xs border-neutral-300 bg-white text-[#141213] dark:border-[#3A3035] dark:bg-[#161315] dark:text-white"
              />
            </div>

            <div className="max-h-36 overflow-y-auto rounded-xl border border-neutral-200 bg-white p-2.5 dark:border-[#3A3035] dark:bg-[#161315]">
              <div className="flex flex-wrap gap-1.5">
                {filteredStudents.map((st) => {
                  const isSelected = selectedStudents.includes(st.id);
                  return (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => handleToggleStudent(st.id)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                        isSelected
                          ? 'border-[#141213] bg-[#141213] text-[#ECCCD9] shadow-2xs dark:border-[#ECCCD9] dark:bg-[#ECCCD9] dark:text-[#141213]'
                          : st.isBlocked
                            ? 'border-red-300 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/60 dark:text-red-200'
                            : 'border-neutral-300 bg-[#FAF7F9] text-[#141213] hover:bg-[#ECCCD9]/50 dark:border-[#3A3035] dark:bg-[#221D20] dark:text-[#E5D8DF]'
                      }`}
                    >
                      {st.fullName} {st.isBlocked ? '• ⚠️ Bloqueada' : ''}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 border-t border-neutral-200 pt-3.5 dark:border-[#332B2F]">
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
              disabled={isSubmitting}
              className="bg-[#ECCCD9] px-5 font-extrabold text-[#141213] hover:bg-[#E4BDD0]"
            >
              {isSubmitting
                ? 'Validando Horario...'
                : repeatMode === 'SINGLE'
                  ? 'Publicar Clase en Salón'
                  : 'Publicar Sesiones en Salón'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
