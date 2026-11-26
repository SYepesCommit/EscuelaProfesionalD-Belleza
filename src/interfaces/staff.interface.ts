import { UserRoleType } from './auth.interface';

export type PayrollAdjustmentType = 'BONO' | 'ADELANTO' | 'DESCUENTO';

export type PayrollPaymentMethod =
  | 'EFECTIVO'
  | 'NEQUI'
  | 'BANCOLOMBIA'
  | 'DAVIPLATA'
  | 'TRANSFERENCIA';

export interface StaffPayrollAdjustmentItem {
  id: string;
  staffId: string;
  staffName: string;
  fortnightKey: string;
  type: PayrollAdjustmentType;
  concept: string;
  amountCop: number;
  notes: string | null;
  createdAt: string;
}

export interface StaffFortnightSettlementItem {
  id: string;
  staffId: string;
  fortnightKey: string;
  status: 'PENDIENTE' | 'PAGADA';
  paidAmountCop: number;
  paymentMethod: PayrollPaymentMethod;
  paymentReference: string | null;
  paidAt: string | null;
  notes: string | null;
}

export interface StaffMemberItem {
  id: string;
  documentId: string;
  fullName: string;
  role: UserRoleType;
  phone: string | null;
  email: string | null;
  accessCode: string;
  hourlyRateCop: number;
  commissionRatePct: number;
  hasFingerprint: boolean;
  isActive: boolean;
  openLogId: string | null;
  openCheckInAt: string | null;
  openElapsedMinutes: number;
  isOverdueShift: boolean; // true si lleva >= 10 horas abierto sin marcar salida
}

export interface StaffTimeLogItem {
  id: string;
  staffId: string;
  staffName: string;
  staffDocumentId: string;
  staffRole: UserRoleType;
  checkInAt: string;
  checkOutAt: string | null;
  workedMinutes: number;
  lunchDeductedMinutes: number;
  workedHoursDecimal: number;
  verifiedByBiometry: boolean;
  fortnightKey: string;
  notes: string | null;
  isOverdueOpen: boolean;
}

export interface FortnightStaffPayrollSummary {
  staffId: string;
  documentId: string;
  fullName: string;
  role: UserRoleType;
  phone: string | null;
  email: string | null;
  fortnightKey: string; // Ej: "2026-11-Q1" (1-15) o "2026-11-Q2" (16-fin)
  totalShifts: number;
  completedShifts: number;
  openShifts: number;
  totalWorkedMinutes: number;
  totalLunchDeductedMinutes: number;
  totalWorkedHours: number;
  hourlyRateCop: number;
  commissionRatePct: number;
  hoursPayCop: number; // Pago bruto solo por horas
  salesCount: number; // Cantidad de ventas comisionadas en la quincena
  salesCommissionCop: number; // Comisiones ganadas en la quincena
  bonusesCop: number; // Total bonos (+) en la quincena
  deductionsCop: number; // Total adelantos/vales y descuentos (-) en la quincena
  adjustments: StaffPayrollAdjustmentItem[];
  totalPayCop: number; // Neto final = hoursPayCop + salesCommissionCop + bonusesCop - deductionsCop
  settlementStatus: 'PENDIENTE' | 'PAGADA';
  settlement: StaffFortnightSettlementItem | null;
  isActive: boolean;
}

export interface UpsertStaffMemberPayload {
  id?: string;
  documentId: string;
  fullName: string;
  role: UserRoleType;
  phone?: string;
  email?: string;
  accessCode?: string;
  hourlyRateCop: number;
  commissionRatePct?: number;
  isActive?: boolean;
  operatorUserId: string;
}

export interface ManualTimeLogPayload {
  staffId: string;
  checkInAt: string;
  checkOutAt: string;
  deductLunchHour?: boolean;
  notes?: string;
  operatorUserId: string;
}

export interface CloseOpenShiftPayload {
  logId: string;
  checkOutAt: string;
  deductLunchHour?: boolean;
  notes?: string;
  operatorUserId: string;
}

export interface CreatePayrollAdjustmentPayload {
  staffId: string;
  fortnightKey: string;
  type: PayrollAdjustmentType;
  concept: string;
  amountCop: number;
  notes?: string;
  operatorUserId: string;
}

export interface SettleFortnightPayrollPayload {
  staffId: string;
  fortnightKey: string;
  status: 'PENDIENTE' | 'PAGADA';
  paidAmountCop: number;
  paymentMethod: PayrollPaymentMethod;
  paymentReference?: string;
  notes?: string;
  operatorUserId: string;
}
