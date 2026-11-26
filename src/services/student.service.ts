import {
  CancelFinePayload,
  CertificateValidationResult,
  EnrollFingerprintPayload,
  PayAndRescheduleFinePayload,
  RegisterAttendancePayload,
  RegisterStudentPaymentPayload,
  StudentItem,
} from '@/interfaces/student.interface';

export async function fetchStudents(): Promise<StudentItem[]> {
  const res = await fetch('/api/students', { cache: 'no-store' });
  if (!res.ok) throw new Error('Error cargando alumnos');
  return (await res.json()) as StudentItem[];
}

export async function createStudentRequest(payload: {
  documentId: string;
  fullName: string;
  phone: string;
  email?: string;
  programName: string;
  fingerprintTemplate?: string;
  pendingBalanceCop: number;
  pendingBalanceReason?: string;
  operatorUserId: string;
}): Promise<void> {
  const res = await fetch('/api/students', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = (await res.json()) as { message?: string };
    throw new Error(err.message ?? 'Error matriculando estudiante');
  }
}

export async function updateStudentRequest(payload: {
  studentId: string;
  documentId: string;
  fullName: string;
  phone: string;
  email?: string;
  programName: string;
  pendingBalanceCop: number;
  pendingBalanceReason?: string;
  operatorUserId: string;
}): Promise<void> {
  const res = await fetch('/api/students', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = (await res.json()) as { message?: string };
    throw new Error(err.message ?? 'Error actualizando estudiante');
  }
}

export async function registerAttendanceRequest(
  payload: RegisterAttendancePayload
): Promise<void> {
  const res = await fetch('/api/attendance', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = (await res.json()) as { message?: string };
    throw new Error(err.message ?? 'Error registrando asistencia');
  }
}

export async function payAndRescheduleFineRequest(
  payload: PayAndRescheduleFinePayload
): Promise<void> {
  const res = await fetch('/api/fines', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = (await res.json()) as { message?: string };
    throw new Error(err.message ?? 'Error pagando multa y reprogramando');
  }
}

export async function cancelFineRequest(payload: CancelFinePayload): Promise<void> {
  const res = await fetch('/api/fines', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = (await res.json()) as { message?: string };
    throw new Error(err.message ?? 'Error anulando multa');
  }
}

export async function registerStudentPaymentRequest(
  payload: RegisterStudentPaymentPayload
): Promise<{
  receiptNumber: string;
  newPendingBalanceCop: number;
  unblocked: boolean;
}> {
  const res = await fetch('/api/students', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = (await res.json()) as { message?: string };
    throw new Error(err.message ?? 'Error registrando abono');
  }
  return (await res.json()) as {
    receiptNumber: string;
    newPendingBalanceCop: number;
    unblocked: boolean;
  };
}

export async function enrollFingerprintRequest(
  payload: EnrollFingerprintPayload
): Promise<void> {
  const res = await fetch('/api/students', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = (await res.json()) as { message?: string };
    throw new Error(err.message ?? 'Error enrolando huella dactilar');
  }
}

export async function validateAndIssueCertificateRequest(params: {
  studentId: string;
  operatorUserId: string;
  forcePrintByAdmin?: boolean;
}): Promise<CertificateValidationResult> {
  const res = await fetch('/api/certificates', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  return (await res.json()) as CertificateValidationResult;
}
