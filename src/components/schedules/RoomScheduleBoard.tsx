'use client';

import React, { useMemo, useState } from 'react';
import {
  CalendarDays,
  Clock,
  Copy,
  DoorOpen,
  Fingerprint,
  LayoutGrid,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Users,
} from 'lucide-react';
import {
  ClassScheduleItem,
  CreateRoomPayload,
  CreateSchedulePayload,
  RoomItem,
  UpdateRoomPayload,
  UpdateSchedulePayload,
} from '@/interfaces/schedule.interface';
import { StaffMemberItem } from '@/interfaces/staff.interface';
import {
  RegisterAttendancePayload,
  StudentItem,
} from '@/interfaces/student.interface';
import { useUiMode } from '@/hooks/useUiMode';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RoomTimelineView } from './RoomTimelineView';
import { CreateScheduleDialog } from './CreateScheduleDialog';
import { CreateRoomDialog } from './CreateRoomDialog';
import { ManageScheduleModal } from './ManageScheduleModal';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { formatDateTimeCo } from '@/lib/utils';

interface RoomScheduleBoardProps {
  rooms: RoomItem[];
  selectedRoomId: string;
  onSelectRoom: (roomId: string) => void;
  schedules: ClassScheduleItem[];
  allSchedules?: ClassScheduleItem[];
  teachers: StaffMemberItem[];
  students: StudentItem[];
  operatorUserId: string;
  isAdmin?: boolean;
  onCreateSchedule: (payload: CreateSchedulePayload) => Promise<void>;
  onUpdateSchedule: (payload: UpdateSchedulePayload) => Promise<void>;
  onDeleteSchedule: (scheduleId: string) => Promise<void>;
  onCreateRoom?: (payload: CreateRoomPayload) => Promise<void>;
  onUpdateRoom?: (payload: UpdateRoomPayload) => Promise<void>;
  onDeleteRoom?: (roomId: string) => Promise<void>;
  onRegisterAttendance: (payload: RegisterAttendancePayload) => Promise<void>;
}

export function RoomScheduleBoard({
  rooms,
  selectedRoomId,
  onSelectRoom,
  schedules,
  allSchedules = [],
  teachers,
  students,
  operatorUserId,
  isAdmin = false,
  onCreateSchedule,
  onUpdateSchedule,
  onDeleteSchedule,
  onCreateRoom,
  onUpdateRoom,
  onDeleteRoom,
  onRegisterAttendance,
}: RoomScheduleBoardProps) {
  const [viewMode, setViewMode] = useState<'timeline' | 'cards'>('timeline');
  const [timeScope, setTimeScope] = useState<
    'ACTIVE' | 'TODAY' | 'FINISHED' | 'ALL'
  >('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [teacherFilterId, setTeacherFilterId] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [duplicateTemplate, setDuplicateTemplate] =
    useState<ClassScheduleItem | null>(null);
  const [isCreateRoomOpen, setIsCreateRoomOpen] = useState(false);
  const [activeScheduleId, setActiveScheduleId] = useState<string | null>(null);
  const [editingRoomCapacity, setEditingRoomCapacity] = useState<number | null>(
    null
  );
  const [isDeletingRoom, setIsDeletingRoom] = useState(false);
  const [isBusyDelete, setIsBusyDelete] = useState(false);
  const { isTouchMode } = useUiMode();

  const currentRoom = rooms.find((r) => r.id === selectedRoomId);
  const totalCount =
    allSchedules.length > 0 ? allSchedules.length : schedules.length;

  const getRoomScheduleCount = (roomId: string): number => {
    const source = allSchedules.length > 0 ? allSchedules : schedules;
    return source.filter((s) => s.roomId === roomId).length;
  };

  const filteredSchedules = useMemo(() => {
    const now = Date.now();
    const todayStr = new Date().toLocaleDateString('es-CO');

    return schedules.filter((sch) => {
      if (teacherFilterId && sch.teacherId !== teacherFilterId) return false;

      const endMs = new Date(sch.endTime).getTime();
      const schDateStr = new Date(sch.startTime).toLocaleDateString('es-CO');
      const isFinishedOrDisabled = sch.isActive === false || endMs < now;

      if (timeScope === 'ACTIVE' && isFinishedOrDisabled) return false;
      if (timeScope === 'TODAY' && schDateStr !== todayStr) return false;
      if (timeScope === 'FINISHED' && !isFinishedOrDisabled) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const matchTitle =
        sch.title.toLowerCase().includes(q) ||
        sch.courseName.toLowerCase().includes(q) ||
        sch.teacherName.toLowerCase().includes(q);
      const matchStudent = sch.enrolledStudents.some((st) =>
        st.fullName.toLowerCase().includes(q)
      );
      return matchTitle || matchStudent;
    });
  }, [schedules, searchQuery, teacherFilterId, timeScope]);

  const activeSchedule = useMemo(() => {
    if (!activeScheduleId) return null;
    const source = allSchedules.length > 0 ? allSchedules : schedules;
    return source.find((s) => s.id === activeScheduleId) ?? null;
  }, [activeScheduleId, allSchedules, schedules]);

  const handleOpenCreateNew = () => {
    setDuplicateTemplate(null);
    setIsDialogOpen(true);
  };

  const handleOpenDuplicate = (template: ClassScheduleItem) => {
    setActiveScheduleId(null);
    setDuplicateTemplate(template);
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-5 min-w-0">
      {/* Selector fijo de Salones y Acciones con Alto Contraste Dark Mode */}
      <div className="rounded-2xl border border-[#E4BDD0] bg-white p-4 shadow-xs dark:border-[#332B2F] dark:bg-[#1B181A]">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-extrabold uppercase tracking-wider text-neutral-600 dark:text-[#ECCCD9]">
            1. Seleccione un Salón Físico:
          </span>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-xl border border-neutral-200 bg-[#FAF7F9] p-1 dark:border-[#3A3035] dark:bg-[#141213]">
              <button
                type="button"
                onClick={() => setViewMode('timeline')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-extrabold transition ${
                  viewMode === 'timeline'
                    ? 'bg-[#141213] text-[#ECCCD9] dark:bg-[#ECCCD9] dark:text-[#141213]'
                    : 'text-neutral-600 hover:text-black dark:text-[#C4B5BC] dark:hover:text-white'
                }`}
              >
                <CalendarDays className="h-3.5 w-3.5" />
                Cronograma
              </button>
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-extrabold transition ${
                  viewMode === 'cards'
                    ? 'bg-[#141213] text-[#ECCCD9] dark:bg-[#ECCCD9] dark:text-[#141213]'
                    : 'text-neutral-600 hover:text-black dark:text-[#C4B5BC] dark:hover:text-white'
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                Tarjetas
              </button>
            </div>

            {onCreateRoom && (
              <Button
                variant="outline"
                size={isTouchMode ? 'lg' : 'sm'}
                onClick={() => setIsCreateRoomOpen(true)}
                className="font-bold dark:border-[#3A3035] dark:bg-[#252023] dark:text-white"
              >
                <DoorOpen className="h-4 w-4" />
                + Crear Salón
              </Button>
            )}

            <Button
              variant="pink"
              size={isTouchMode ? 'lg' : 'sm'}
              onClick={handleOpenCreateNew}
              className="bg-[#ECCCD9] font-extrabold text-[#141213] hover:bg-[#E4BDD0]"
            >
              <Plus className="h-4 w-4" />
              Programar Clase en Salón
            </Button>
          </div>
        </div>

        {/* Botonera de Salones */}
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          <button
            type="button"
            onClick={() => onSelectRoom('')}
            className={`flex items-center justify-between rounded-xl border-2 px-4 transition-all active:scale-95 ${
              isTouchMode ? 'py-4 text-sm' : 'py-2.5 text-xs'
            } ${
              selectedRoomId === ''
                ? 'border-[#141213] bg-[#141213] font-extrabold text-white shadow-sm dark:border-[#ECCCD9] dark:bg-[#ECCCD9] dark:text-[#141213]'
                : 'border-neutral-200 bg-[#FAF7F9] font-semibold text-[#141213] hover:border-[#ECCCD9] dark:border-[#332B2F] dark:bg-[#221D20] dark:text-[#E5D8DF]'
            }`}
          >
            <span>Todos los Salones</span>
            <Badge variant={selectedRoomId === '' ? 'pink' : 'secondary'}>
              {totalCount} clases
            </Badge>
          </button>

          {rooms.map((room) => {
            const isSelected = selectedRoomId === room.id;
            const count = getRoomScheduleCount(room.id);

            return (
              <button
                key={room.id}
                type="button"
                onClick={() => {
                  onSelectRoom(room.id);
                  setEditingRoomCapacity(room.capacity);
                }}
                className={`flex items-center justify-between rounded-xl border-2 px-4 text-left transition-all active:scale-95 ${
                  isTouchMode ? 'py-4 text-sm' : 'py-2.5 text-xs'
                } ${
                  isSelected
                    ? 'border-[#141213] bg-[#ECCCD9] font-extrabold text-[#141213] shadow-sm dark:border-[#ECCCD9]'
                    : 'border-neutral-200 bg-white font-semibold text-[#141213] hover:bg-[#FAF0F5] dark:border-[#332B2F] dark:bg-[#221D20] dark:text-[#F5EEF1]'
                }`}
              >
                <div className="flex flex-col truncate pr-2">
                  <span className="flex items-center gap-1.5 truncate">
                    <DoorOpen className="h-4 w-4 shrink-0" />
                    <span className="truncate">{room.name}</span>
                  </span>
                  <span
                    className={`text-[10px] font-normal ${
                      isSelected
                        ? 'text-[#141213]/80'
                        : 'text-neutral-500 dark:text-[#B8A8B0]'
                    }`}
                  >
                    Capacidad: {room.capacity} personas
                  </span>
                </div>
                <Badge variant={isSelected ? 'default' : 'secondary'}>
                  {count}
                </Badge>
              </button>
            );
          })}
        </div>

        {/* Barra de Búsqueda por Alumna/Tema, Filtro por Docente y Vigencia Temporal */}
        <div className="mt-3 grid gap-2.5 border-t border-neutral-200 dark:border-[#332B2F] pt-3 sm:grid-cols-4">
          <div className="relative sm:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
            <Input
              placeholder="Buscar clase por tema, materia o nombre de alumna inscrita..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-xs border-neutral-300 bg-white text-[#141213] dark:border-[#3A3035] dark:bg-[#141213] dark:text-white"
            />
          </div>
          <select
            className="flex h-10 w-full rounded-xl border border-neutral-300 dark:border-[#3A3035] bg-white dark:bg-[#141213] px-3 text-xs font-bold text-[#141213] dark:text-white"
            value={teacherFilterId}
            onChange={(e) => setTeacherFilterId(e.target.value)}
          >
            <option value="">Todos los Docentes ({teachers.length})</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>
                Docente: {t.fullName}
              </option>
            ))}
          </select>
          <select
            className="flex h-10 w-full rounded-xl border border-neutral-300 dark:border-[#3A3035] bg-white dark:bg-[#141213] px-3 text-xs font-bold text-[#141213] dark:text-white"
            value={timeScope}
            onChange={(e) =>
              setTimeScope(
                e.target.value as 'ACTIVE' | 'TODAY' | 'FINISHED' | 'ALL'
              )
            }
          >
            <option value="ALL">Todas las Fechas</option>
            <option value="TODAY">Solo Clases de Hoy</option>
            <option value="ACTIVE">En Curso y Próximas (Ocultar Pasadas)</option>
            <option value="FINISHED">Historial de Clases Finalizadas</option>
          </select>
        </div>
      </div>

      {/* Banner del salón seleccionado con edición rápida de capacidad de personas */}
      {currentRoom && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#E4BDD0] bg-gradient-to-r from-[#FAF2F6] to-white p-4 shadow-xs dark:border-[#3A3035] dark:from-[#261F23] dark:to-[#1B181A]">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-serif text-lg font-bold text-[#141213] dark:text-white">
                {currentRoom.name}
              </span>
              <Badge variant="pink">{currentRoom.code}</Badge>
            </div>
            <p className="mt-0.5 text-xs text-neutral-600 dark:text-[#C4B5BC]">
              {currentRoom.description || 'Espacio académico especializado.'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 text-xs font-semibold">
            {onUpdateRoom && (
              <div className="flex items-center gap-1.5 rounded-xl border border-neutral-300 bg-white px-3 py-1 shadow-2xs dark:border-[#3A3035] dark:bg-[#141213]">
                <span className="text-[#141213] dark:text-[#E5D8DF]">
                  Capacidad (Personas):
                </span>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  className="h-7 w-16 text-center text-xs font-extrabold border-neutral-300 bg-white text-[#141213] dark:border-[#3A3035] dark:bg-[#221D20] dark:text-white"
                  value={editingRoomCapacity ?? currentRoom.capacity}
                  onChange={(e) =>
                    setEditingRoomCapacity(Number(e.target.value))
                  }
                />
                <Button
                  size="sm"
                  variant="pink"
                  className="h-7 px-2.5 text-[11px] font-extrabold bg-[#ECCCD9] text-[#141213]"
                  onClick={() =>
                    void onUpdateRoom({
                      roomId: currentRoom.id,
                      name: currentRoom.name,
                      capacity: editingRoomCapacity ?? currentRoom.capacity,
                      description: currentRoom.description ?? undefined,
                    })
                  }
                >
                  Guardar Cupo
                </Button>
              </div>
            )}
            {isAdmin && onDeleteRoom && (
              <Button
                variant="destructive"
                size="sm"
                className="h-8 gap-1.5 px-3 text-xs font-bold"
                onClick={() => setIsDeletingRoom(true)}
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Eliminar Salón</span>
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="h-8 font-bold dark:border-[#3A3035] dark:bg-[#252023] dark:text-white"
              onClick={() => onSelectRoom('')}
            >
              Ver Todos los Salones
            </Button>
          </div>
        </div>
      )}

      {/* Listado de Clases */}
      {filteredSchedules.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#E4BDD0] bg-white/80 p-6 sm:p-12 text-center dark:border-[#3A3035] dark:bg-[#1B181A]">
          <Sparkles className="mb-3 h-10 w-10 text-[#141213] dark:text-[#ECCCD9]" />
          <h3 className="font-serif text-lg sm:text-xl font-bold text-[#141213] dark:text-white">
            {currentRoom
              ? `${currentRoom.name} no tiene clases con este filtro`
              : 'No se encontraron clases con este criterio'}
          </h3>
          <div className="mt-4 flex flex-wrap justify-center gap-2.5">
            <Button
              size="default"
              variant="pink"
              onClick={handleOpenCreateNew}
              className="bg-[#ECCCD9] font-extrabold text-[#141213]"
            >
              <Plus className="h-4 w-4" />
              Programar Clase en este Salón
            </Button>
            {(selectedRoomId || searchQuery || teacherFilterId) && (
              <Button
                variant="outline"
                size="default"
                onClick={() => {
                  onSelectRoom('');
                  setSearchQuery('');
                  setTeacherFilterId('');
                }}
              >
                Limpiar Filtros
              </Button>
            )}
          </div>
        </div>
      ) : viewMode === 'timeline' ? (
        <RoomTimelineView
          schedules={filteredSchedules}
          onSelectSchedule={(sch) => setActiveScheduleId(sch.id)}
          onDuplicateSchedule={handleOpenDuplicate}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredSchedules.map((sch) => {
            const presentCount = sch.enrolledStudents.filter(
              (s) => s.attendanceStatus === 'PRESENTE'
            ).length;
            const absentCount = sch.enrolledStudents.filter(
              (s) => s.attendanceStatus === 'AUSENTE'
            ).length;

            return (
              <div
                key={sch.id}
                onClick={() => setActiveScheduleId(sch.id)}
                className="group min-w-0 overflow-hidden cursor-pointer rounded-2xl border border-[#E4BDD0] dark:border-[#332B2F] bg-white dark:bg-[#1B181A] p-4 sm:p-5 shadow-xs transition-all hover:border-[#141213] dark:hover:border-[#ECCCD9]/60 hover:shadow-md"
              >
                <div className="flex items-center justify-between border-b border-neutral-100 dark:border-[#2C2629] pb-3">
                  <Badge
                    variant="pink"
                    className="text-xs px-2.5 py-1 font-bold"
                  >
                    {sch.roomName}
                  </Badge>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenDuplicate(sch);
                      }}
                      className="inline-flex items-center gap-1 rounded-lg border border-[#E4BDD0] bg-[#FAF2F6] px-2 py-0.5 text-[10px] font-extrabold text-[#141213] hover:bg-[#ECCCD9] dark:border-[#3A3035] dark:bg-[#252023] dark:text-[#ECCCD9]"
                    >
                      <Copy className="h-2.5 w-2.5" />
                      Duplicar
                    </button>
                    <span className="flex items-center gap-1 text-xs font-bold text-neutral-600 dark:text-[#C4B5BC]">
                      <Users className="h-3.5 w-3.5 text-neutral-400" />
                      {sch.enrolledCount}/{sch.maxStudents}
                    </span>
                  </div>
                </div>
                <div className="mt-3.5 space-y-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-[#C4B5BC]">
                    {sch.courseName}
                  </span>
                  <h4 className="font-serif text-lg font-bold text-[#141213] dark:text-white group-hover:text-[#7A1E46] dark:group-hover:text-[#ECCCD9] transition-colors leading-snug">
                    {sch.title}
                  </h4>
                  <p className="text-xs sm:text-sm text-neutral-600 dark:text-[#C4B5BC]">
                    Docente: <strong>{sch.teacherName}</strong>
                  </p>
                </div>

                {sch.enrolledCount > 0 && (
                  <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[10px] font-extrabold">
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-900 dark:bg-emerald-950/80 dark:text-emerald-300">
                      <Fingerprint className="h-2.5 w-2.5" />✓ {presentCount}{' '}
                      Presente(s)
                    </span>
                    {absentCount > 0 && (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-red-900 dark:bg-red-950/80 dark:text-red-300">
                        ✕ {absentCount} Ausente(s)
                      </span>
                    )}
                  </div>
                )}

                <div className="mt-4 flex items-center justify-between border-t border-neutral-100 dark:border-[#2C2629] pt-3.5 text-xs sm:text-sm text-neutral-600 dark:text-[#C4B5BC]">
                  <span className="flex items-center gap-1.5 font-semibold">
                    <Clock className="h-4 w-4 text-neutral-400" />
                    {formatDateTimeCo(sch.startTime)}
                  </span>
                  <span className="text-xs font-extrabold text-[#141213] dark:text-[#ECCCD9] flex items-center gap-1">
                    Gestionar &rarr;
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isDialogOpen && (
        <CreateScheduleDialog
          rooms={rooms}
          teachers={teachers}
          students={students}
          allSchedules={allSchedules.length > 0 ? allSchedules : schedules}
          defaultRoomId={selectedRoomId || undefined}
          initialTemplate={duplicateTemplate}
          onClose={() => {
            setIsDialogOpen(false);
            setDuplicateTemplate(null);
          }}
          onSubmit={onCreateSchedule}
        />
      )}

      {isCreateRoomOpen && onCreateRoom && (
        <CreateRoomDialog
          onClose={() => setIsCreateRoomOpen(false)}
          onSubmit={onCreateRoom}
        />
      )}

      {activeSchedule && (
        <ManageScheduleModal
          schedule={activeSchedule}
          rooms={rooms}
          teachers={teachers}
          students={students}
          operatorUserId={operatorUserId}
          isAdmin={isAdmin}
          onClose={() => setActiveScheduleId(null)}
          onDuplicateSchedule={handleOpenDuplicate}
          onUpdateSchedule={onUpdateSchedule}
          onDeleteSchedule={onDeleteSchedule}
          onRegisterAttendance={onRegisterAttendance}
        />
      )}

      {currentRoom && (
        <ConfirmModal
          isOpen={isDeletingRoom}
          title={`¿Eliminar ${currentRoom.name}?`}
          description={`Esta acción desactivará permanentemente el salón y cancelará las agendas académicas asociadas a este espacio. Esta acción no se puede deshacer.`}
          confirmText="Sí, Eliminar Salón"
          cancelText="No, Mantener"
          variant="danger"
          isBusy={isBusyDelete}
          onCancel={() => setIsDeletingRoom(false)}
          onConfirm={async () => {
            if (!onDeleteRoom) return;
            setIsBusyDelete(true);
            try {
              await onDeleteRoom(currentRoom.id);
              setIsDeletingRoom(false);
            } finally {
              setIsBusyDelete(false);
            }
          }}
        />
      )}
    </div>
  );
}
