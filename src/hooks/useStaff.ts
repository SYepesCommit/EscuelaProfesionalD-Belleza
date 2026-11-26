'use client';

import { useCallback, useEffect, useState } from 'react';
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
import {
  ClockCheckResult,
  closeOpenStaffShiftRequest,
  createPayrollAdjustmentRequest,
  deletePayrollAdjustmentRequest,
  deleteStaffTimeLogRequest,
  fetchStaffAndPayroll,
  registerManualStaffShiftRequest,
  registerStaffBiometricLogRequest,
  settleFortnightPayrollRequest,
  upsertStaffMemberRequest,
} from '@/services/staff.service';

export function useStaff() {
  const [fortnightKey, setFortnightKey] = useState<string>('');
  const [availableFortnights, setAvailableFortnights] = useState<string[]>([]);
  const [staffMembers, setStaffMembers] = useState<StaffMemberItem[]>([]);
  const [timeLogs, setTimeLogs] = useState<StaffTimeLogItem[]>([]);
  const [payrollSummary, setPayrollSummary] = useState<
    FortnightStaffPayrollSummary[]
  >([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadStaff = useCallback(async (key?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchStaffAndPayroll(key || undefined, true);
      setFortnightKey(data.fortnightKey);
      setAvailableFortnights(data.availableFortnights);
      setStaffMembers(data.staffMembers);
      setTimeLogs(data.timeLogs);
      setPayrollSummary(data.payrollSummary);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Error cargando nómina quincenal'
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStaff(fortnightKey || undefined);
  }, [loadStaff, fortnightKey]);

  const registerBiometricLog = useCallback(
    async (params: {
      staffId?: string;
      identifier?: string;
      actionType: 'ENTRADA' | 'SALIDA' | 'AUTO';
      verifiedByBiometry: boolean;
      deductLunchHour?: boolean;
      notes?: string;
      operatorUserId: string;
    }): Promise<ClockCheckResult> => {
      const result = await registerStaffBiometricLogRequest(params);
      await loadStaff(fortnightKey || undefined);
      return result;
    },
    [fortnightKey, loadStaff]
  );

  const registerManualShift = useCallback(
    async (payload: ManualTimeLogPayload): Promise<ClockCheckResult> => {
      const result = await registerManualStaffShiftRequest(payload);
      await loadStaff(fortnightKey || undefined);
      return result;
    },
    [fortnightKey, loadStaff]
  );

  const closeOpenShift = useCallback(
    async (payload: CloseOpenShiftPayload): Promise<ClockCheckResult> => {
      const result = await closeOpenStaffShiftRequest(payload);
      await loadStaff(fortnightKey || undefined);
      return result;
    },
    [fortnightKey, loadStaff]
  );

  const createPayrollAdjustment = useCallback(
    async (payload: CreatePayrollAdjustmentPayload): Promise<void> => {
      await createPayrollAdjustmentRequest(payload);
      await loadStaff(fortnightKey || undefined);
    },
    [fortnightKey, loadStaff]
  );

  const deletePayrollAdjustment = useCallback(
    async (adjustmentId: string, operatorUserId: string): Promise<void> => {
      await deletePayrollAdjustmentRequest({ adjustmentId, operatorUserId });
      await loadStaff(fortnightKey || undefined);
    },
    [fortnightKey, loadStaff]
  );

  const settleFortnightPayroll = useCallback(
    async (payload: SettleFortnightPayrollPayload): Promise<void> => {
      await settleFortnightPayrollRequest(payload);
      await loadStaff(fortnightKey || undefined);
    },
    [fortnightKey, loadStaff]
  );

  const upsertStaffMember = useCallback(
    async (payload: UpsertStaffMemberPayload): Promise<void> => {
      await upsertStaffMemberRequest(payload);
      await loadStaff(fortnightKey || undefined);
    },
    [fortnightKey, loadStaff]
  );

  const deleteTimeLog = useCallback(
    async (logId: string, operatorUserId: string): Promise<void> => {
      await deleteStaffTimeLogRequest({ logId, operatorUserId });
      await loadStaff(fortnightKey || undefined);
    },
    [fortnightKey, loadStaff]
  );

  return {
    fortnightKey,
    setFortnightKey,
    availableFortnights,
    staffMembers,
    timeLogs,
    payrollSummary,
    isLoading,
    error,
    reloadStaff: () => loadStaff(fortnightKey || undefined),
    registerBiometricLog,
    registerManualShift,
    closeOpenShift,
    createPayrollAdjustment,
    deletePayrollAdjustment,
    settleFortnightPayroll,
    upsertStaffMember,
    deleteTimeLog,
  };
}
