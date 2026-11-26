export type AttendanceStatusType = 'PRESENTE' | 'AUSENTE' | 'REPROGRAMADO';
export type FineStatusType = 'PENDIENTE' | 'PAGADA' | 'ANULADA';
export type CertificateStatusType =
  | 'PENDIENTE_VALIDACION'
  | 'APROBADO'
  | 'EMITIDO'
  | 'BLOQUEADO_POR_DEUDA'
  | 'BLOQUEADO_POR_HORAS';

export interface StudentPaymentItem {
  id: string;
  studentId: string;
  amountCop: number;
  concept: string;
  paymentMethod: 'EFECTIVO' | 'TRANSFERENCIA' | 'TARJETA' | 'MIXTO';
  paymentReference?: string | null;
  receiptNumber?: string | null;
  notes?: string | null;
  operatorUserId?: string | null;
  operatorUserName?: string | null;
  createdAt: string;
}

export interface FineItem {
  id: string;
  studentId: string;
  studentName?: string;
  missedScheduleId: string;
  missedScheduleTitle?: string;
  rescheduledScheduleId: string | null;
  amountCop: number; // Multa en COP
  status: FineStatusType;
  isClassRescheduled: boolean;
  paidAt: string | null;
  paymentReference: string | null;
  paymentMethod?: 'EFECTIVO' | 'TRANSFERENCIA' | 'TARJETA' | 'MIXTO';
  collectedByUserId?: string | null;
  collectedByUserName?: string | null;
  reason: string;
  createdAt: string;
}

export interface StudentItem {
  id: string;
  documentId: string;
  fullName: string;
  phone: string;
  email: string | null;
  programName: string;
  hasFingerprint: boolean;
  fingerprintTemplate?: string | null;
  isBlocked: boolean;
  blockReason: string | null;
  pendingBalanceCop: number;
  pendingBalanceReason?: string | null;
  pendingFinesCount: number;
  pendingFinesTotalCop: number;
  attendedHours?: number;
  totalProgramHours?: number;
  attendancePercentage?: number;
  isActive: boolean;
  fines?: FineItem[];
  payments?: StudentPaymentItem[];
}

export interface RegisterAttendancePayload {
  studentId: string;
  scheduleId: string;
  status: AttendanceStatusType;
  verifiedByBiometry: boolean;
  operatorUserId: string;
  customFineAmountCop?: number;
  notes?: string;
}

export interface PayAndRescheduleFinePayload {
  action?: 'PAY_AND_RESCHEDULE';
  fineId: string;
  rescheduledScheduleId: string;
  paymentReference: string;
  paymentMethod?: 'EFECTIVO' | 'TRANSFERENCIA' | 'TARJETA' | 'MIXTO';
  operatorUserId: string;
}

export interface CancelFinePayload {
  action: 'CANCEL_FINE';
  fineId: string;
  reason: string;
  operatorUserId: string;
}

export interface RegisterStudentPaymentPayload {
  action: 'REGISTER_PAYMENT';
  studentId: string;
  amountCop: number;
  concept: string;
  paymentMethod: 'EFECTIVO' | 'TRANSFERENCIA' | 'TARJETA' | 'MIXTO';
  paymentReference?: string;
  notes?: string;
  operatorUserId: string;
}

export interface EnrollFingerprintPayload {
  action: 'ENROLL_FINGERPRINT';
  studentId: string;
  fingerprintTemplate: string;
  operatorUserId: string;
}

export interface CertificateValidationResult {
  studentId: string;
  studentName: string;
  programName: string;
  canPrint: boolean;
  hasPendingFines: boolean;
  pendingFinesTotalCop: number;
  hasPendingAcademicBalance: boolean;
  pendingAcademicBalanceCop: number;
  pendingAcademicBalanceReason?: string | null;
  attendedHours: number;
  requiredHours: number;
  hasMetHours: boolean;
  alertMessage: string | null;
}
