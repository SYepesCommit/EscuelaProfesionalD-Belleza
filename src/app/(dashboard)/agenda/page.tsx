'use client';

import React from 'react';
import { RoomScheduleBoard } from '@/components/schedules/RoomScheduleBoard';
import { useSchedules } from '@/hooks/useSchedules';
import { useStaff } from '@/hooks/useStaff';
import { useStudents } from '@/hooks/useStudents';
import { useAuthSession } from '@/hooks/useAuthSession';
import { PageLoading } from '@/components/ui/page-loading';

export default function AgendaPage() {
  const { user, isLoading: isAuthLoading } = useAuthSession();
  const {
    rooms,
    selectedRoomId,
    setSelectedRoomId,
    schedules,
    allSchedules,
    isLoading: isSchedulesLoading,
    createSchedule,
    updateSchedule,
    deleteSchedule,
    createRoom,
    updateRoom,
    deleteRoom,
  } = useSchedules();
  const { staffMembers } = useStaff();
  const { students, registerAttendance } = useStudents();

  const teachers = staffMembers.filter(
    (s) => s.role === 'PROFESOR' || s.role === 'ADMIN'
  );

  const isInitialLoading =
    (isSchedulesLoading && schedules.length === 0) || isAuthLoading;

  return (
    <div className="space-y-5 min-w-0">
      <div>
        <h1 className="font-serif text-xl sm:text-2xl font-bold text-[#141213] dark:text-[#F5EEF1]">
          Agendas Académicas Independientes por Salón
        </h1>
        <p className="mt-0.5 text-xs sm:text-sm text-neutral-600 dark:text-[#C4B5BC]">
          Seleccione un salón, programe clases únicas o recurrentes (con validación anti-cruce de salón y docente), inscriba por grupo de programa y valide asistencia individual por huella.
        </p>
      </div>

      {isInitialLoading ? (
        <PageLoading
          title="Cargando Agendas y Salones..."
          subtitle="Sincronizando clases programadas, capacidad y disponibilidad de salones"
        />
      ) : (
        <RoomScheduleBoard
          rooms={rooms}
          selectedRoomId={selectedRoomId}
          onSelectRoom={setSelectedRoomId}
          schedules={schedules}
          allSchedules={allSchedules}
          teachers={teachers}
          students={students}
          operatorUserId={user?.id ?? ''}
          isAdmin={user?.role === 'ADMIN'}
          onCreateSchedule={async (payload) => {
            if (!user) return;
            await createSchedule({ ...payload, operatorUserId: user.id });
          }}
          onUpdateSchedule={async (payload) => {
            if (!user) return;
            await updateSchedule({ ...payload, operatorUserId: user.id });
          }}
          onDeleteSchedule={async (scheduleId) => {
            if (!user) return;
            await deleteSchedule({ scheduleId, operatorUserId: user.id });
          }}
          onCreateRoom={async (payload) => {
            if (!user) return;
            await createRoom({ ...payload, operatorUserId: user.id });
          }}
          onUpdateRoom={async (payload) => {
            if (!user) return;
            await updateRoom({ ...payload, operatorUserId: user.id });
          }}
          onDeleteRoom={async (roomId) => {
            if (!user) return;
            await deleteRoom({ roomId, operatorUserId: user.id });
          }}
          onRegisterAttendance={registerAttendance}
        />
      )}
    </div>
  );
}
