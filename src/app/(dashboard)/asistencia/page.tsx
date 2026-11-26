'use client';

import React from 'react';
import { BiometricAttendanceTerminal } from '@/components/attendance/BiometricAttendanceTerminal';
import { useStudents } from '@/hooks/useStudents';
import { useSchedules } from '@/hooks/useSchedules';
import { useAuthSession } from '@/hooks/useAuthSession';
import { useFingerprint } from '@/hooks/useFingerprint';
import { PageLoading } from '@/components/ui/page-loading';

export default function AsistenciaPage() {
  const { user, isLoading: isAuthLoading } = useAuthSession();
  const {
    students,
    registerAttendance,
    payAndRescheduleFine,
    cancelFine,
    registerStudentPayment,
    isLoading: isStudentsLoading,
  } = useStudents();
  const { schedules, isLoading: isSchedulesLoading } = useSchedules();
  const { state: fpState } = useFingerprint();

  const isInitialLoading = (isStudentsLoading && students.length === 0) || isAuthLoading;

  return (
    <div className="space-y-6">
      {isInitialLoading ? (
        <PageLoading
          title="Iniciando Terminal de Asistencia..."
          subtitle="Verificando conexión con salones, clases activas y servicio de recepción"
        />
      ) : (
        <BiometricAttendanceTerminal
          students={students}
          schedules={schedules}
          operatorUserId={user?.id ?? ''}
          operatorName={user?.fullName ?? 'Recepción EPB'}
          isAdmin={user?.role === 'ADMIN'}
          fingerprintConnected={fpState.isConnected}
          onCheckInByBiometry={async ({ studentId, scheduleId, verifiedByBiometry = true }) => {
            if (!user) return;
            await registerAttendance({
              studentId,
              scheduleId,
              status: 'PRESENTE',
              verifiedByBiometry,
              operatorUserId: user.id,
            });
          }}
          onPayAndRescheduleFine={payAndRescheduleFine}
          onCancelFine={cancelFine}
          onRegisterStudentPayment={registerStudentPayment}
        />
      )}
    </div>
  );
}
