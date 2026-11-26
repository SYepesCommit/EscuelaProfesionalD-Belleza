import {
  CloseOpenShiftPayload,
  CreatePayrollAdjustmentPayload,
  FortnightStaffPayrollSummary,
  ManualTimeLogPayload,
  SettleFortnightPayrollPayload,
  StaffMemberItem,
  StaffTimeLogItem,
  UpsertStaffMemberPayload,
} from '@/interfaces/staff.interface';
import { UserRoleType } from '@/interfaces/auth.interface';

export interface StaffPayrollApiResponse {
  fortnightKey: string;
  availableFortnights: string[];
  staffMembers: StaffMemberItem[];
  timeLogs: StaffTimeLogItem[];
  payrollSummary: FortnightStaffPayrollSummary[];
}

export interface ClockCheckResult {
  staffName: string;
  staffRole: UserRoleType;
  resolvedAction: 'ENTRADA' | 'SALIDA';
  workedHoursDecimal: number;
  workedMinutes: number;
  lunchDeductedMinutes?: number;
  earnedCop: number;
}

export async function fetchStaffAndPayroll(
  fortnightKey?: string,
  includeInactive = true
): Promise<StaffPayrollApiResponse> {
  const params = new URLSearchParams();
  if (fortnightKey) params.set('fortnightKey', fortnightKey);
  if (includeInactive) params.set('includeInactive', 'true');
  const query = params.toString() ? `?${params.toString()}` : '';
  const res = await fetch(`/api/staff${query}`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Error cargando personal y quincena');
  return (await res.json()) as StaffPayrollApiResponse;
}

export async function registerStaffBiometricLogRequest(params: {
  staffId?: string;
  identifier?: string;
  actionType: 'ENTRADA' | 'SALIDA' | 'AUTO';
  verifiedByBiometry: boolean;
  deductLunchHour?: boolean;
  notes?: string;
  operatorUserId: string;
}): Promise<ClockCheckResult> {
  const res = await fetch('/api/staff', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode: 'CLOCK', ...params }),
  });
  const data = (await res.json()) as ClockCheckResult & { message?: string };
  if (!res.ok) {
    throw new Error(data.message ?? 'Error en marcación biométrica');
  }
  return data;
}

export async function registerManualStaffShiftRequest(
  payload: ManualTimeLogPayload
): Promise<ClockCheckResult> {
  const res = await fetch('/api/staff', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode: 'MANUAL_SHIFT', ...payload }),
  });
  const data = (await res.json()) as ClockCheckResult & { message?: string };
  if (!res.ok) {
    throw new Error(data.message ?? 'Error registrando turno manual');
  }
  return data;
}

export async function closeOpenStaffShiftRequest(
  payload: CloseOpenShiftPayload
): Promise<ClockCheckResult> {
  const res = await fetch('/api/staff', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode: 'CLOSE_OPEN_SHIFT', ...payload }),
  });
  const data = (await res.json()) as ClockCheckResult & { message?: string };
  if (!res.ok) {
    throw new Error(data.message ?? 'Error cerrando turno abierto');
  }
  return data;
}

export async function createPayrollAdjustmentRequest(
  payload: CreatePayrollAdjustmentPayload
): Promise<void> {
  const res = await fetch('/api/staff', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode: 'ADD_ADJUSTMENT', ...payload }),
  });
  if (!res.ok) {
    const err = (await res.json()) as { message?: string };
    throw new Error(err.message ?? 'Error guardando concepto de nómina');
  }
}

export async function deletePayrollAdjustmentRequest(params: {
  adjustmentId: string;
  operatorUserId: string;
}): Promise<void> {
  const query = `?adjustmentId=${encodeURIComponent(params.adjustmentId)}&operatorUserId=${encodeURIComponent(params.operatorUserId)}`;
  const res = await fetch(`/api/staff${query}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const err = (await res.json()) as { message?: string };
    throw new Error(err.message ?? 'Error eliminando concepto de nómina');
  }
}

export async function settleFortnightPayrollRequest(
  payload: SettleFortnightPayrollPayload
): Promise<void> {
  const res = await fetch('/api/staff', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode: 'SETTLE_FORTNIGHT', ...payload }),
  });
  if (!res.ok) {
    const err = (await res.json()) as { message?: string };
    throw new Error(err.message ?? 'Error actualizando estado de pago');
  }
}

export async function upsertStaffMemberRequest(
  payload: UpsertStaffMemberPayload
): Promise<void> {
  const res = await fetch('/api/staff', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = (await res.json()) as { message?: string };
    throw new Error(err.message ?? 'Error guardando configuración del empleado');
  }
}

export async function deleteStaffTimeLogRequest(params: {
  logId: string;
  operatorUserId: string;
}): Promise<void> {
  const query = `?logId=${encodeURIComponent(params.logId)}&operatorUserId=${encodeURIComponent(params.operatorUserId)}`;
  const res = await fetch(`/api/staff${query}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const err = (await res.json()) as { message?: string };
    throw new Error(err.message ?? 'Error eliminando registro de turno');
  }
}
