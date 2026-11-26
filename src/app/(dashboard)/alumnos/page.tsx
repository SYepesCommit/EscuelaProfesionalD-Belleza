'use client';

import React from 'react';
import { StudentsFinesPanel } from '@/components/students/StudentsFinesPanel';
import { useStudents } from '@/hooks/useStudents';
import { useSchedules } from '@/hooks/useSchedules';
import { useAuthSession } from '@/hooks/useAuthSession';
import { PageLoading } from '@/components/ui/page-loading';

export default function AlumnosPage() {
  const { user, isLoading: isAuthLoading } = useAuthSession();
  const {
    students,
    isLoading: isStudentsLoading,
    certificateAlert,
    clearCertificateAlert,
    createStudent,
    updateStudent,
    registerAttendance,
    payAndRescheduleFine,
    cancelFine,
    registerStudentPayment,
    enrollFingerprint,
    validateAndIssueCertificate,
  } = useStudents();
  const { schedules, isLoading: isSchedulesLoading } = useSchedules();

  const isInitialLoading = (isStudentsLoading && students.length === 0) || isAuthLoading;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold text-[#222222]">
          Estudiantes, Multas Editables, Bloqueo y Certificados
        </h1>
        <p className="text-xs text-neutral-600">
          Control académico integral con multas personalizables por inasistencia, reprogramación obligatoria y validación para emisión de certificados.
        </p>
      </div>

      {isInitialLoading ? (
        <PageLoading
          title="Cargando Lista de Estudiantes..."
          subtitle="Consultando estados académicos, inasistencias y paz y salvo financiero"
        />
      ) : (
        <StudentsFinesPanel
          students={students}
          schedules={schedules}
          operatorUserId={user?.id ?? ''}
          operatorName={user?.fullName}
          isAdmin={user?.role === 'ADMIN'}
          certificateAlert={certificateAlert}
          onClearCertificateAlert={clearCertificateAlert}
          onCreateStudent={createStudent}
          onUpdateStudent={updateStudent}
          onMarkAbsence={registerAttendance}
          onPayAndRescheduleFine={payAndRescheduleFine}
          onCancelFine={cancelFine}
          onRegisterPayment={registerStudentPayment}
          onEnrollFingerprint={async (payload) => {
            await enrollFingerprint({
              action: 'ENROLL_FINGERPRINT',
              ...payload,
            });
          }}
          onValidateCertificate={async (studentId) => {
            if (!user) return;
            await validateAndIssueCertificate({
              studentId,
              operatorUserId: user.id,
            });
          }}
        />
      )}
    </div>
  );
}
