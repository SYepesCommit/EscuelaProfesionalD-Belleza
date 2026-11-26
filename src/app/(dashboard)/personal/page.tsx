'use client';

import React from 'react';
import { StaffFortnightPanel } from '@/components/staff/StaffFortnightPanel';
import { PageLoading } from '@/components/ui/page-loading';
import { useStaff } from '@/hooks/useStaff';
import { useAuthSession } from '@/hooks/useAuthSession';

export default function PersonalPage() {
  const { user } = useAuthSession();
  const {
    fortnightKey,
    setFortnightKey,
    availableFortnights,
    staffMembers,
    timeLogs,
    payrollSummary,
    isLoading,
    registerBiometricLog,
    registerManualShift,
    closeOpenShift,
    createPayrollAdjustment,
    deletePayrollAdjustment,
    settleFortnightPayroll,
    upsertStaffMember,
    deleteTimeLog,
  } = useStaff();

  if (isLoading && staffMembers.length === 0) {
    return (
      <PageLoading
        title="Cargando Personal y Liquidación Quincenal..."
        subtitle="Sincronizando reloj biométrico, comisiones POS, bonos/vales y turnos de la quincena"
      />
    );
  }

  return (
    <div className="space-y-5 min-w-0">
      <div>
        <h1 className="font-serif text-xl sm:text-2xl font-bold text-[#141213] dark:text-[#F5EEF1]">
          Personal de Planta, Tarifas por Hora y Liquidación Quincenal
        </h1>
        <p className="mt-0.5 text-xs sm:text-sm text-neutral-600 dark:text-[#C4B5BC]">
          Gestión de tipos de empleado, valor hora en COP, reloj biométrico con descuento de almuerzo, cruce de comisiones POS, bonos/vales y cierre de pago quincenal.
        </p>
      </div>

      <StaffFortnightPanel
        fortnightKey={fortnightKey}
        availableFortnights={availableFortnights}
        onChangeFortnight={setFortnightKey}
        staffMembers={staffMembers}
        timeLogs={timeLogs}
        payrollSummary={payrollSummary}
        operatorUserId={user?.id ?? ''}
        onBiometricLog={registerBiometricLog}
        onRegisterManualShift={registerManualShift}
        onCloseOpenShift={closeOpenShift}
        onCreateAdjustment={createPayrollAdjustment}
        onDeleteAdjustment={deletePayrollAdjustment}
        onSettleFortnight={settleFortnightPayroll}
        onUpsertStaffMember={upsertStaffMember}
        onDeleteTimeLog={deleteTimeLog}
      />
    </div>
  );
}
