'use client';

import React, { useMemo, useState } from 'react';
import {
  BookOpen,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  DoorOpen,
  Edit3,
  Fingerprint,
  Plus,
  Search,
  Trash2,
  User,
  UserCheck,
  UserPlus,
  Users,
  UserX,
  X,
} from 'lucide-react';
import {
  ClassScheduleItem,
  RoomItem,
  UpdateSchedulePayload,
} from '@/interfaces/schedule.interface';
import { StaffMemberItem } from '@/interfaces/staff.interface';
import {
  RegisterAttendancePayload,
  StudentItem,
} from '@/interfaces/student.interface';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { ApplyFineModal } from '@/components/students/ApplyFineModal';
import { formatDateTimeCo, formatTimeCo } from '@/lib/utils';

interface ManageScheduleModalProps {
  schedule: ClassScheduleItem;
  rooms: RoomItem[];
  teachers: StaffMemberItem[];
  students: StudentItem[];
  operatorUserId: string;
  isAdmin?: boolean;
  onClose: () => void;
  onDuplicateSchedule?: (template: ClassScheduleItem) => void;
  onUpdateSchedule: (payload: UpdateSchedulePayload) => Promise<void>;
  onDeleteSchedule: (scheduleId: string) => Promise<void>;
  onRegisterAttendance: (payload: RegisterAttendancePayload) => Promise<void>;
}

const extractDateStr = (iso: string): string => {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const extractTimeStr = (iso: string): string => {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const TIME_BLOCK_PRESETS = [
  { label: 'Mañana (08:00 - 12:00)', start: '08:00', end: '12:00' },
  { label: 'Tarde (14:00 - 18:00)', start: '14:00', end: '18:00' },
  { label: 'Noche (18:00 - 21:00)', start: '18:00', end: '21:00' },
  { label: 'Intensivo (08:00 - 16:00)', start: '08:00', end: '16:00' },
];

export function ManageScheduleModal({
  schedule,
  rooms,
  teachers,
  students,
  operatorUserId,
  isAdmin = false,
  onClose,
  onDuplicateSchedule,
  onUpdateSchedule,
  onDeleteSchedule,
  onRegisterAttendance,
}: ManageScheduleModalProps) {
  const [activeTab, setActiveTab] = useState<'attendance' | 'enroll' | 'edit'>(
    'attendance'
  );
  const [roomId, setRoomId] = useState(schedule.roomId);
  const [teacherId, setTeacherId] = useState(schedule.teacherId);
  const [title, setTitle] = useState(schedule.title);
  const [courseName, setCourseName] = useState(schedule.courseName);
  const [classDate, setClassDate] = useState(extractDateStr(schedule.startTime));
  const [startHour, setStartHour] = useState(extractTimeStr(schedule.startTime));
  const [endHour, setEndHour] = useState(extractTimeStr(schedule.endTime));
  const [maxStudents, setMaxStudents] = useState(schedule.maxStudents);
  const [notes, setNotes] = useState(schedule.notes ?? '');
  const [isActive, setIsActive] = useState(schedule.isActive ?? true);
  const [deactivationReason, setDeactivationReason] = useState(
    schedule.deactivationReason ?? ''
  );
  const [isDeactivatePromptOpen, setIsDeactivatePromptOpen] = useState(false);

  const [enrollSearch, setEnrollSearch] = useState('');
  const [enrolledSearch, setEnrolledSearch] = useState('');
  const [fineTargetStudent, setFineTargetStudent] =
    useState<StudentItem | null>(null);

  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>(
    schedule.enrolledStudents.map((s) => s.id)
  );
  const [feedback, setFeedback] = useState<{
    type: 'ok' | 'err';
    text: string;
  } | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);

  // Contadores de asistencia individual verificada
  const presentCount = useMemo(
    () =>
      schedule.enrolledStudents.filter(
        (s) => s.attendanceStatus === 'PRESENTE'
      ).length,
    [schedule.enrolledStudents]
  );
  const absentCount = useMemo(
    () =>
      schedule.enrolledStudents.filter((s) => s.attendanceStatus === 'AUSENTE')
        .length,
    [schedule.enrolledStudents]
  );
  const pendingCount = Math.max(
    0,
    schedule.enrolledStudents.length - presentCount - absentCount
  );

  const toggleStudent = (id: string) => {
    setSelectedStudentIds((prev) => {
      if (prev.includes(id)) return prev.filter((item) => item !== id);
      if (prev.length >= maxStudents) {
        setFeedback({
          type: 'err',
          text: `Cupo lleno: esta clase admite máximo ${maxStudents} personas.`,
        });
        return prev;
      }
      return [...prev, id];
    });
  };

  const handleSelectProgramGroup = () => {
    const q = courseName.trim().toLowerCase();
    const matching = students.filter(
      (s) => !s.isBlocked && (!q || s.programName.toLowerCase().includes(q))
    );
    const nextSet = new Set(selectedStudentIds);
    for (const st of matching) {
      if (nextSet.size >= maxStudents) break;
      nextSet.add(st.id);
    }
    setSelectedStudentIds(Array.from(nextSet));
  };

  const handleSaveChanges = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsBusy(true);
    setFeedback(null);

    const startIso = new Date(`${classDate}T${startHour}:00`).toISOString();
    const endIso = new Date(`${classDate}T${endHour}:00`).toISOString();

    if (new Date(endIso) <= new Date(startIso)) {
      setFeedback({
        type: 'err',
        text: 'La hora de finalización debe ser posterior a la hora de inicio.',
      });
      setIsBusy(false);
      return;
    }

    try {
      await onUpdateSchedule({
        scheduleId: schedule.id,
        roomId,
        teacherId,
        title,
        courseName,
        startTime: startIso,
        endTime: endIso,
        maxStudents,
        studentIds: selectedStudentIds,
        notes: notes || undefined,
        isActive,
      });
      setFeedback({
        type: 'ok',
        text: 'Cambios e inscripciones actualizados sin cruces de horario.',
      });
    } catch (err) {
      setFeedback({
        type: 'err',
        text: err instanceof Error ? err.message : 'Error actualizando clase',
      });
    } finally {
      setIsBusy(false);
    }
  };

  const handleConfirmDeactivate = async () => {
    if (!deactivationReason.trim()) {
      setFeedback({
        type: 'err',
        text: 'Debe escribir el motivo o razón por la cual desactiva esta clase.',
      });
      return;
    }
    setIsBusy(true);
    setFeedback(null);
    try {
      const startIso = new Date(`${classDate}T${startHour}:00`).toISOString();
      const endIso = new Date(`${classDate}T${endHour}:00`).toISOString();
      await onUpdateSchedule({
        scheduleId: schedule.id,
        roomId,
        teacherId,
        title,
        courseName,
        startTime: startIso,
        endTime: endIso,
        maxStudents,
        studentIds: selectedStudentIds,
        notes: notes || undefined,
        isActive: false,
        deactivationReason: deactivationReason.trim(),
      });
      setIsActive(false);
      setIsDeactivatePromptOpen(false);
      setFeedback({
        type: 'ok',
        text: 'Clase desactivada con motivo registrado en auditoría.',
      });
    } catch (err) {
      setFeedback({
        type: 'err',
        text:
          err instanceof Error ? err.message : 'Error desactivando la clase',
      });
    } finally {
      setIsBusy(false);
    }
  };

  const handleReactivateClass = async () => {
    setIsBusy(true);
    setFeedback(null);
    try {
      const startIso = new Date(`${classDate}T${startHour}:00`).toISOString();
      const endIso = new Date(`${classDate}T${endHour}:00`).toISOString();
      await onUpdateSchedule({
        scheduleId: schedule.id,
        roomId,
        teacherId,
        title,
        courseName,
        startTime: startIso,
        endTime: endIso,
        maxStudents,
        studentIds: selectedStudentIds,
        notes: notes || undefined,
        isActive: true,
        deactivationReason: null,
      });
      setIsActive(true);
      setDeactivationReason('');
      setFeedback({
        type: 'ok',
        text: 'Clase reactivada nuevamente por el Administrador.',
      });
    } catch (err) {
      setFeedback({
        type: 'err',
        text:
          err instanceof Error ? err.message : 'Error reactivando la clase',
      });
    } finally {
      setIsBusy(false);
    }
  };

  const handleQuickAttendancePresent = async (studentId: string) => {
    setIsBusy(true);
    setFeedback(null);
    try {
      await onRegisterAttendance({
        studentId,
        scheduleId: schedule.id,
        status: 'PRESENTE',
        verifiedByBiometry: true,
        operatorUserId,
        notes: 'Asistencia individual confirmada por biometría en salón',
      });
      setFeedback({
        type: 'ok',
        text: 'Asistencia individual registrada como PRESENTE.',
      });
    } catch (err) {
      setFeedback({
        type: 'err',
        text:
          err instanceof Error ? err.message : 'Error registrando asistencia',
      });
    } finally {
      setIsBusy(false);
    }
  };

  const handleDelete = async () => {
    setIsBusy(true);
    try {
      await onDeleteSchedule(schedule.id);
      onClose();
    } catch (err) {
      setFeedback({
        type: 'err',
        text:
          err instanceof Error ? err.message : 'No se pudo eliminar la clase',
      });
      setIsBusy(false);
    }
  };

  const filteredAvailableStudents = useMemo(() => {
    const q = enrollSearch.trim().toLowerCase();
    if (!q) return students;
    return students.filter(
      (s) =>
        s.fullName.toLowerCase().includes(q) ||
        s.documentId.toLowerCase().includes(q) ||
        s.programName.toLowerCase().includes(q)
    );
  }, [students, enrollSearch]);

  const filteredEnrolledStudents = useMemo(() => {
    const q = enrolledSearch.trim().toLowerCase();
    if (!q) return schedule.enrolledStudents;
    return schedule.enrolledStudents.filter(
      (s) =>
        s.fullName.toLowerCase().includes(q) ||
        s.documentId.toLowerCase().includes(q)
    );
  }, [schedule.enrolledStudents, enrolledSearch]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-2.5 sm:p-5 backdrop-blur-xs">
      <Card className="max-h-[94vh] w-full max-w-4xl flex flex-col border-[#E4BDD0] dark:border-[#3A3035] bg-white dark:bg-[#181517] shadow-2xl overflow-hidden rounded-3xl">
        <CardHeader className="space-y-4 border-b border-neutral-200/80 dark:border-[#332B2F] bg-[#FAF2F6]/80 dark:bg-[#221D20] px-5 py-4 sm:px-6 shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="pink" className="px-3 py-1 text-xs font-bold">
                {schedule.roomName}
              </Badge>
              <Badge
                variant="secondary"
                className="px-3 py-1 text-xs font-semibold"
              >
                Cupo: {selectedStudentIds.length} / {maxStudents}
              </Badge>
              <Badge
                variant={isActive ? 'success' : 'secondary'}
                className="px-2.5 py-1 text-[11px] font-bold"
              >
                {isActive ? '● Clase Activa' : '○ Desactivada'}
              </Badge>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {onDuplicateSchedule && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onDuplicateSchedule(schedule)}
                  className="h-9 gap-1.5 px-3 text-xs font-extrabold border-[#E4BDD0] bg-white text-[#141213] hover:bg-[#ECCCD9] dark:border-[#3A3035] dark:bg-[#161315] dark:text-[#ECCCD9]"
                  title="Duplicar esta clase y sus alumnas inscritas para otra fecha o semana"
                >
                  <Copy className="h-3.5 w-3.5" />
                  <span>Duplicar Clase</span>
                </Button>
              )}

              {isAdmin && (
                <>
                  <Button
                    type="button"
                    variant={isActive ? 'outline' : 'pink'}
                    size="sm"
                    className="h-9 gap-1.5 px-3 text-xs font-bold"
                    disabled={isBusy}
                    onClick={() => {
                      if (isActive) {
                        setIsDeactivatePromptOpen((prev) => !prev);
                      } else {
                        void handleReactivateClass();
                      }
                    }}
                  >
                    <Clock className="h-3.5 w-3.5" />
                    <span>{isActive ? 'Desactivar' : 'Reactivar'}</span>
                  </Button>

                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="h-9 gap-1.5 px-3 text-xs font-bold"
                    disabled={isBusy}
                    onClick={() => setIsConfirmDeleteOpen(true)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Eliminar</span>
                  </Button>
                </>
              )}

              <button
                type="button"
                onClick={onClose}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-neutral-300 dark:border-white/15 bg-white dark:bg-[#141213] text-neutral-600 hover:text-black dark:text-neutral-200 transition"
                title="Cerrar ventana"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div>
            <CardTitle className="font-serif text-lg sm:text-2xl font-bold leading-tight text-[#141213] dark:text-[#F5EEF1]">
              {schedule.title}
            </CardTitle>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-600 dark:text-[#C4B5BC]">
              <span className="flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5 text-[#7A1E46] dark:text-[#ECCCD9]" />
                <strong className="text-[#141213] dark:text-white">
                  {schedule.courseName}
                </strong>
              </span>
              <span>&bull;</span>
              <span className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-[#7A1E46] dark:text-[#ECCCD9]" />
                Docente:{' '}
                <strong className="text-[#141213] dark:text-white">
                  {schedule.teacherName}
                </strong>
              </span>
              <span>&bull;</span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-[#7A1E46] dark:text-[#ECCCD9]" />
                <span className="font-semibold text-[#141213] dark:text-[#E5D8DF]">
                  {formatDateTimeCo(schedule.startTime)} –{' '}
                  {formatTimeCo(schedule.endTime)}
                </span>
              </span>
            </div>
          </div>

          {isAdmin && isDeactivatePromptOpen && isActive && (
            <div className="rounded-2xl border border-amber-400 dark:border-amber-700 bg-amber-50 dark:bg-[#2A231C] p-4 space-y-2.5 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-950 dark:text-amber-200">
                  Motivo de Desactivación de la Clase (Obligatorio — Auditoría):
                </span>
                <button
                  type="button"
                  onClick={() => setIsDeactivatePromptOpen(false)}
                  className="text-xs font-semibold text-amber-800 dark:text-amber-400 hover:underline"
                >
                  Cancelar
                </button>
              </div>
              <textarea
                rows={2}
                value={deactivationReason}
                onChange={(e) => setDeactivationReason(e.target.value)}
                placeholder="Ej: Clase reprogramada por festivo o salón en mantenimiento..."
                className="w-full rounded-xl border border-amber-300 dark:border-amber-700/60 bg-white dark:bg-[#141213] p-2.5 text-xs text-[#141213] dark:text-white outline-none"
              />
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  disabled={isBusy || !deactivationReason.trim()}
                  onClick={() => void handleConfirmDeactivate()}
                  className="text-xs font-bold"
                >
                  Confirmar Desactivación
                </Button>
              </div>
            </div>
          )}

          {!isActive && (
            <div className="rounded-xl border border-neutral-300 dark:border-white/10 bg-neutral-100 dark:bg-[#141213] px-3.5 py-2.5 text-xs text-neutral-800 dark:text-neutral-200 space-y-0.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-extrabold uppercase text-[11px] text-neutral-700 dark:text-neutral-400">
                  ● Clase Desactivada Manualmente
                </span>
                {schedule.deactivatedByName && (
                  <span className="text-[10px] text-neutral-500 dark:text-neutral-400">
                    Por: <strong>{schedule.deactivatedByName}</strong>
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-900 dark:text-neutral-100">
                <strong>Motivo:</strong>{' '}
                {deactivationReason ||
                  schedule.deactivationReason ||
                  'Finalizada por Administración'}
              </p>
            </div>
          )}

          <div className="grid grid-cols-3 gap-2 rounded-2xl border border-neutral-200 dark:border-[#332B2F] bg-white dark:bg-[#141213] p-1 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('attendance')}
              className={`flex items-center justify-center gap-1.5 rounded-xl py-2 px-3 font-extrabold transition ${
                activeTab === 'attendance'
                  ? 'bg-[#ECCCD9] !text-[#141213] shadow-2xs'
                  : 'text-neutral-600 dark:text-[#C4B5BC] hover:bg-neutral-100 dark:hover:bg-white/5'
              }`}
            >
              <Fingerprint className="h-3.5 w-3.5" />
              <span className="truncate">
                1. Asistencia Huella ({schedule.enrolledStudents.length})
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('enroll')}
              className={`flex items-center justify-center gap-1.5 rounded-xl py-2 px-3 font-extrabold transition ${
                activeTab === 'enroll'
                  ? 'bg-[#ECCCD9] !text-[#141213] shadow-2xs'
                  : 'text-neutral-600 dark:text-[#C4B5BC] hover:bg-neutral-100 dark:hover:bg-white/5'
              }`}
            >
              <UserPlus className="h-3.5 w-3.5" />
              <span className="truncate">2. Inscribir Alumnas</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('edit')}
              className={`flex items-center justify-center gap-1.5 rounded-xl py-2 px-3 font-extrabold transition ${
                activeTab === 'edit'
                  ? 'bg-[#ECCCD9] !text-[#141213] shadow-2xs'
                  : 'text-neutral-600 dark:text-[#C4B5BC] hover:bg-neutral-100 dark:hover:bg-white/5'
              }`}
            >
              <Edit3 className="h-3.5 w-3.5" />
              <span className="truncate">3. Configurar Clase</span>
            </button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 p-4 sm:p-6 overflow-y-auto flex-1 bg-white dark:bg-[#181517]">
          {feedback && (
            <div
              className={`rounded-xl border px-4 py-2.5 text-xs font-bold ${
                feedback.type === 'ok'
                  ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200'
                  : 'border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/60 text-red-900 dark:text-red-200'
              }`}
            >
              {feedback.text}
            </div>
          )}

          {/* PESTAÑA 1: ASISTENCIA INDIVIDUAL VERIFICADA */}
          {activeTab === 'attendance' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-extrabold uppercase tracking-wider text-[#141213] dark:text-[#ECCCD9]">
                    Control Individual de Asistencia por Huella (
                    {schedule.enrolledStudents.length} inscritas)
                  </Label>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 font-extrabold text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
                      ✓ {presentCount} Presentes
                    </span>
                    <span className="rounded-full bg-red-100 px-2.5 py-0.5 font-extrabold text-red-900 dark:bg-red-950 dark:text-red-300">
                      ✕ {absentCount} Ausentes (Multa)
                    </span>
                    <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 font-bold text-neutral-700 dark:bg-[#252023] dark:text-[#C4B5BC]">
                      ⏳ {pendingCount} Pendientes de validar huella
                    </span>
                  </div>
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="h-3.5 w-3.5 text-neutral-400 absolute left-3 top-2.5" />
                  <Input
                    placeholder="Buscar alumna inscrita..."
                    value={enrolledSearch}
                    onChange={(e) => setEnrolledSearch(e.target.value)}
                    className="pl-8 text-xs h-9 rounded-xl bg-neutral-50 dark:bg-[#141213] border-neutral-300 dark:border-[#3A3035] text-[#141213] dark:text-white"
                  />
                </div>
              </div>

              {schedule.enrolledStudents.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-neutral-300 dark:border-[#3A3035] p-8 text-center text-xs text-neutral-500 dark:text-[#B8A8B0] space-y-2">
                  <p>Aún no hay alumnas inscritas en esta sesión académica.</p>
                  <Button
                    size="sm"
                    variant="pink"
                    onClick={() => setActiveTab('enroll')}
                    className="text-xs font-extrabold bg-[#ECCCD9] text-[#141213]"
                  >
                    <UserPlus className="h-3.5 w-3.5 mr-1.5" />
                    Ir a Inscribir Alumnas
                  </Button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {filteredEnrolledStudents.map((st, idx) => {
                    const fullStudent = students.find((s) => s.id === st.id);
                    return (
                      <div
                        key={st.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-neutral-200 dark:border-[#332B2F] bg-[#FAF8F9] dark:bg-[#211C1F] p-3.5 sm:p-4 hover:border-[#ECCCD9] transition"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#ECCCD9] text-xs font-extrabold !text-[#141213]">
                            {idx + 1}
                          </div>

                          <div>
                            <div className="text-sm font-extrabold text-[#141213] dark:text-white">
                              {st.fullName}
                            </div>
                            <div className="text-[11px] text-neutral-600 dark:text-[#C4B5BC]">
                              C.C.{' '}
                              <strong className="font-mono text-[#141213] dark:text-[#ECCCD9]">
                                {st.documentId}
                              </strong>
                            </div>

                            {(st.isBlocked || st.attendanceStatus) && (
                              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                {st.isBlocked && (
                                  <Badge
                                    variant="destructive"
                                    className="text-[10px] py-0"
                                  >
                                    Bloqueada por Multa
                                  </Badge>
                                )}
                                {st.attendanceStatus === 'PRESENTE' && (
                                  <Badge
                                    variant="success"
                                    className="text-[10px] py-0"
                                  >
                                    ✓ PRESENTE (Verificada)
                                  </Badge>
                                )}
                                {st.attendanceStatus === 'AUSENTE' && (
                                  <Badge
                                    variant="destructive"
                                    className="text-[10px] py-0"
                                  >
                                    ✕ AUSENTE (Multada)
                                  </Badge>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                          <Button
                            size="sm"
                            variant="pink"
                            disabled={isBusy}
                            onClick={() => handleQuickAttendancePresent(st.id)}
                            className="text-xs font-extrabold px-3.5 h-8 gap-1.5 bg-[#ECCCD9] text-[#141213]"
                          >
                            <UserCheck className="h-3.5 w-3.5 !text-[#141213]" />
                            <span>Validar Presente</span>
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isBusy}
                            onClick={() => {
                              if (fullStudent) {
                                setFineTargetStudent(fullStudent);
                              }
                            }}
                            className="text-xs border-red-300 dark:border-red-900/40 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 h-8 gap-1.5 px-3"
                          >
                            <UserX className="h-3.5 w-3.5 text-red-500" />
                            <span>Marcar Falla / Multar</span>
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* PESTAÑA 2: INSCRIBIR O RETIRAR ALUMNAS */}
          {activeTab === 'enroll' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-200 dark:border-[#332B2F] pb-3">
                <div>
                  <Label className="text-xs font-extrabold uppercase tracking-wider text-[#141213] dark:text-[#ECCCD9] flex items-center gap-1.5">
                    <UserPlus className="h-4 w-4" />
                    <span>
                      Inscribir Alumnas ({selectedStudentIds.length} /{' '}
                      {maxStudents} cupos ocupados)
                    </span>
                  </Label>
                  <p className="text-[11px] text-neutral-500 dark:text-[#B8A8B0]">
                    Seleccione individualmente o inscriba al grupo del programa actual
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSelectProgramGroup}
                    className="inline-flex items-center gap-1 rounded-xl bg-[#ECCCD9] px-3 py-1.5 text-xs font-extrabold text-[#141213] hover:bg-[#e4bdd0]"
                  >
                    <Users className="h-3.5 w-3.5" />+ Grupo del Programa
                  </button>
                  <div className="relative w-full sm:w-64">
                    <Search className="h-3.5 w-3.5 text-neutral-400 absolute left-3 top-2.5" />
                    <Input
                      placeholder="Buscar por nombre, cédula o programa..."
                      value={enrollSearch}
                      onChange={(e) => setEnrollSearch(e.target.value)}
                      className="pl-8 text-xs h-8 rounded-xl bg-neutral-50 dark:bg-[#141213] border-neutral-300 dark:border-[#3A3035] text-[#141213] dark:text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3 max-h-[380px] overflow-y-auto pr-1">
                {filteredAvailableStudents.map((st) => {
                  const isSelected = selectedStudentIds.includes(st.id);
                  return (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => toggleStudent(st.id)}
                      className={`flex items-center justify-between rounded-xl border-2 px-3.5 py-2.5 text-left text-xs transition ${
                        isSelected
                          ? 'border-[#141213] bg-[#ECCCD9] !text-[#141213] shadow-2xs font-extrabold dark:border-[#ECCCD9]'
                          : 'border-neutral-200 dark:border-[#332B2F] bg-white dark:bg-[#211C1F] text-[#141213] dark:text-[#E5D8DF] hover:border-[#ECCCD9]'
                      }`}
                    >
                      <div className="truncate pr-2">
                        <div className="truncate font-bold">{st.fullName}</div>
                        <div className="text-[10px] opacity-80 truncate">
                          C.C. {st.documentId} • {st.programName}
                        </div>
                      </div>

                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-current">
                        {isSelected ? (
                          <Check className="h-3 w-3" />
                        ) : (
                          <Plus className="h-3 w-3" />
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-neutral-200 dark:border-[#332B2F] pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onClose}
                  className="text-xs"
                >
                  Cerrar
                </Button>
                <Button
                  variant="pink"
                  size="sm"
                  onClick={() => void handleSaveChanges()}
                  disabled={isBusy}
                  className="text-xs font-extrabold gap-1.5 bg-[#ECCCD9] text-[#141213]"
                >
                  <CheckCircle2 className="h-4 w-4 !text-[#141213]" />
                  <span>Guardar Lista de Inscritas</span>
                </Button>
              </div>
            </div>
          )}

          {/* PESTAÑA 3: EDITAR DETALLES DE LA CLASE */}
          {activeTab === 'edit' && (
            <form onSubmit={handleSaveChanges} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-extrabold flex items-center gap-1.5 text-[#141213] dark:text-[#ECCCD9]">
                  <DoorOpen className="h-3.5 w-3.5" />
                  <span>Salón Físico</span>
                </Label>
                <div className="grid gap-2.5 sm:grid-cols-3">
                  {rooms.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => {
                        setRoomId(r.id);
                        setMaxStudents(r.capacity);
                      }}
                      className={`rounded-xl border-2 p-3 text-left text-xs transition ${
                        roomId === r.id
                          ? 'border-[#141213] bg-[#ECCCD9] !text-[#141213] font-extrabold dark:border-[#ECCCD9]'
                          : 'border-neutral-200 dark:border-[#332B2F] bg-white dark:bg-[#211C1F] text-[#141213] dark:text-[#E5D8DF]'
                      }`}
                    >
                      <div className="font-bold">{r.name}</div>
                      <div className="text-[10px] opacity-75">
                        Capacidad: {r.capacity} personas
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-[#141213] dark:text-[#F5EEF1]">
                    Cupo Máximo
                  </Label>
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    value={maxStudents}
                    onChange={(e) => setMaxStudents(Number(e.target.value))}
                    required
                    className="text-xs h-9 font-bold bg-white dark:bg-[#141213] border-neutral-300 dark:border-[#3A3035] text-[#141213] dark:text-white"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-[#141213] dark:text-[#F5EEF1]">
                    Docente
                  </Label>
                  <select
                    className="flex h-9 w-full rounded-xl border border-neutral-300 dark:border-[#3A3035] bg-white dark:bg-[#141213] px-3 text-xs font-bold text-[#141213] dark:text-white"
                    value={teacherId}
                    onChange={(e) => setTeacherId(e.target.value)}
                  >
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.fullName}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-[#141213] dark:text-[#F5EEF1]">
                    Programa / Materia
                  </Label>
                  <Input
                    value={courseName}
                    onChange={(e) => setCourseName(e.target.value)}
                    required
                    className="text-xs h-9 bg-white dark:bg-[#141213] border-neutral-300 dark:border-[#3A3035] text-[#141213] dark:text-white"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-[#141213] dark:text-[#F5EEF1]">
                    Tema de la Sesión
                  </Label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    className="text-xs h-9 bg-white dark:bg-[#141213] border-neutral-300 dark:border-[#3A3035] text-[#141213] dark:text-white"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-[#141213] dark:text-[#F5EEF1]">
                    Notas / Materiales
                  </Label>
                  <Input
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Ej: Traer kit de práctica"
                    className="text-xs h-9 bg-white dark:bg-[#141213] border-neutral-300 dark:border-[#3A3035] text-[#141213] dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-[#141213] dark:text-[#F5EEF1]">
                    Fecha de la Clase
                  </Label>
                  <Input
                    type="date"
                    value={classDate}
                    onChange={(e) => setClassDate(e.target.value)}
                    required
                    className="text-xs h-9 font-bold bg-white dark:bg-[#141213] border-neutral-300 dark:border-[#3A3035] text-[#141213] dark:text-white"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-[#141213] dark:text-[#F5EEF1]">
                    Hora Inicio
                  </Label>
                  <Input
                    type="time"
                    value={startHour}
                    onChange={(e) => setStartHour(e.target.value)}
                    required
                    className="text-xs h-9 font-bold bg-white dark:bg-[#141213] border-neutral-300 dark:border-[#3A3035] text-[#141213] dark:text-white"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-[#141213] dark:text-[#F5EEF1]">
                    Hora Finalización
                  </Label>
                  <Input
                    type="time"
                    value={endHour}
                    onChange={(e) => setEndHour(e.target.value)}
                    required
                    className="text-xs h-9 font-bold bg-white dark:bg-[#141213] border-neutral-300 dark:border-[#3A3035] text-[#141213] dark:text-white"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {TIME_BLOCK_PRESETS.map((block) => (
                  <button
                    key={block.label}
                    type="button"
                    onClick={() => {
                      setStartHour(block.start);
                      setEndHour(block.end);
                    }}
                    className="rounded-xl border border-neutral-300 bg-[#FAF7F9] px-3 py-1 text-xs font-bold text-[#141213] hover:bg-[#ECCCD9] dark:border-[#3A3035] dark:bg-[#211C1F] dark:text-[#E5D8DF]"
                  >
                    {block.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-end gap-2.5 border-t border-neutral-200 dark:border-[#332B2F] pt-4">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onClose}
                  className="text-xs"
                >
                  Cerrar
                </Button>
                <Button
                  type="submit"
                  variant="pink"
                  size="sm"
                  disabled={isBusy}
                  className="text-xs font-extrabold bg-[#ECCCD9] text-[#141213]"
                >
                  <CheckCircle2 className="h-4 w-4 !text-[#141213]" />
                  <span>Guardar Cambios</span>
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      <ConfirmModal
        isOpen={isConfirmDeleteOpen}
        title={`¿Eliminar clase "${schedule.title}"?`}
        description={`Se cancelará esta sesión académica del ${schedule.roomName}. Si hay alumnas inscritas, su inscripción para esta clase será retirada.`}
        confirmText="Sí, Eliminar Clase"
        cancelText="No, Mantener"
        variant="danger"
        isBusy={isBusy}
        onCancel={() => setIsConfirmDeleteOpen(false)}
        onConfirm={async () => {
          setIsConfirmDeleteOpen(false);
          await handleDelete();
        }}
      />

      {fineTargetStudent && (
        <ApplyFineModal
          isOpen={true}
          student={fineTargetStudent}
          schedules={[schedule]}
          defaultScheduleId={schedule.id}
          onClose={() => setFineTargetStudent(null)}
          onSubmit={async ({
            studentId,
            scheduleId: sId,
            customFineAmountCop,
            notes: n,
          }) => {
            await onRegisterAttendance({
              studentId,
              scheduleId: sId,
              status: 'AUSENTE',
              verifiedByBiometry: false,
              operatorUserId,
              customFineAmountCop,
              notes: n,
            });
            setFineTargetStudent(null);
            setFeedback({
              type: 'err',
              text: `Inasistencia registrada: Se aplicó multa de $${customFineAmountCop.toLocaleString(
                'es-CO'
              )} COP a ${fineTargetStudent.fullName}.`,
            });
          }}
        />
      )}
    </div>
  );
}
