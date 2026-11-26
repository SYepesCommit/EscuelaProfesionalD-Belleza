'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  CancelFinePayload,
  CertificateValidationResult,
  EnrollFingerprintPayload,
  PayAndRescheduleFinePayload,
  RegisterAttendancePayload,
  RegisterStudentPaymentPayload,
  StudentItem,
} from '@/interfaces/student.interface';
import {
  cancelFineRequest,
  createStudentRequest,
  enrollFingerprintRequest,
  fetchStudents,
  payAndRescheduleFineRequest,
  registerAttendanceRequest,
  registerStudentPaymentRequest,
  updateStudentRequest,
  validateAndIssueCertificateRequest,
} from '@/services/student.service';

export function useStudents() {
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [certificateAlert, setCertificateAlert] =
    useState<CertificateValidationResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadStudents = useCallback(async (isBackground = false) => {
    if (!isBackground) {
      setIsLoading(true);
    }
    setError(null);
    try {
      const data = await fetchStudents();
      setStudents(data);
    } catch (err) {
      if (!isBackground) {
        setError(err instanceof Error ? err.message : 'Error cargando alumnos');
      }
    } finally {
      if (!isBackground) {
        setIsLoading(false);
      }
    }
  }, []);

  // Carga inicial
  useEffect(() => {
    void loadStudents();
  }, [loadStudents]);

  // Polling Inteligente en Segundo Plano para Alumnas, Pagos y Multas
  useEffect(() => {
    const POLLING_INTERVAL_MS = 6000; // 6 segundos

    const intervalId = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        void loadStudents(true);
      }
    }, POLLING_INTERVAL_MS);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void loadStudents(true);
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
    };
  }, [loadStudents]);

  const createStudent = useCallback(
    async (payload: {
      documentId: string;
      fullName: string;
      phone: string;
      email?: string;
      programName: string;
      fingerprintTemplate?: string;
      pendingBalanceCop: number;
      pendingBalanceReason?: string;
      operatorUserId: string;
    }) => {
      await createStudentRequest(payload);
      await loadStudents();
    },
    [loadStudents]
  );

  const updateStudent = useCallback(
    async (payload: {
      studentId: string;
      documentId: string;
      fullName: string;
      phone: string;
      email?: string;
      programName: string;
      pendingBalanceCop: number;
      pendingBalanceReason?: string;
      operatorUserId: string;
    }) => {
      await updateStudentRequest(payload);
      await loadStudents();
    },
    [loadStudents]
  );

  const registerAttendance = useCallback(
    async (payload: RegisterAttendancePayload) => {
      await registerAttendanceRequest(payload);
      await loadStudents();
    },
    [loadStudents]
  );

  const payAndRescheduleFine = useCallback(
    async (payload: PayAndRescheduleFinePayload) => {
      await payAndRescheduleFineRequest(payload);
      await loadStudents();
    },
    [loadStudents]
  );

  const cancelFine = useCallback(
    async (payload: CancelFinePayload) => {
      await cancelFineRequest(payload);
      await loadStudents();
    },
    [loadStudents]
  );

  const registerStudentPayment = useCallback(
    async (payload: RegisterStudentPaymentPayload) => {
      const res = await registerStudentPaymentRequest(payload);
      await loadStudents();
      return res;
    },
    [loadStudents]
  );

  const enrollFingerprint = useCallback(
    async (payload: EnrollFingerprintPayload) => {
      await enrollFingerprintRequest(payload);
      await loadStudents();
    },
    [loadStudents]
  );

  const validateAndIssueCertificate = useCallback(
    async (params: {
      studentId: string;
      operatorUserId: string;
      forcePrintByAdmin?: boolean;
    }) => {
      const result = await validateAndIssueCertificateRequest(params);
      if (!result.canPrint) {
        setCertificateAlert(result);
      } else {
        setCertificateAlert(null);
      }
      return result;
    },
    []
  );

  const dismissCertificateAlert = useCallback(() => {
    setCertificateAlert(null);
  }, []);

  return {
    students,
    isLoading,
    error,
    certificateAlert,
    reloadStudents: loadStudents,
    createStudent,
    updateStudent,
    registerAttendance,
    payAndRescheduleFine,
    cancelFine,
    registerStudentPayment,
    enrollFingerprint,
    validateAndIssueCertificate,
    dismissCertificateAlert,
    clearCertificateAlert: dismissCertificateAlert,
  };
}
