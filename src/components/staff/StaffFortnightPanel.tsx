'use client';

import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  BadgeDollarSign,
  Briefcase,
  CalendarClock,
  CheckCircle2,
  Clock,
  Edit3,
  FileText,
  Fingerprint,
  LogIn,
  LogOut,
  Plus,
  Search,
  Sparkles,
  Trash2,
  TrendingUp,
  UserPlus,
  Users,
  Utensils,
  Wallet,
} from 'lucide-react';
import { UserRoleType } from '@/interfaces/auth.interface';
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
import { ClockCheckResult } from '@/services/staff.service';
import {
  STAFF_ROLE_META,
  formatFortnightHumanLabel,
  formatMinutesToHoursAndMinutes,
} from './staff-role-meta';
import { StaffMemberFormModal } from './StaffMemberFormModal';
import { ManualTimeLogModal } from './ManualTimeLogModal';
import { StaffPayStubModal } from './StaffPayStubModal';
import { PayrollAdjustmentModal } from './PayrollAdjustmentModal';
import { useUiMode } from '@/hooks/useUiMode';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatCop, formatDateTimeCo } from '@/lib/utils';

interface StaffFortnightPanelProps {
  fortnightKey: string;
  availableFortnights: string[];
  onChangeFortnight: (key: string) => void;
  staffMembers: StaffMemberItem[];
  timeLogs: StaffTimeLogItem[];
  payrollSummary: FortnightStaffPayrollSummary[];
  operatorUserId: string;
  onBiometricLog: (params: {
    staffId?: string;
    identifier?: string;
    actionType: 'ENTRADA' | 'SALIDA' | 'AUTO';
    verifiedByBiometry: boolean;
    deductLunchHour?: boolean;
    notes?: string;
    operatorUserId: string;
  }) => Promise<ClockCheckResult>;
  onRegisterManualShift: (payload: ManualTimeLogPayload) => Promise<ClockCheckResult>;
  onCloseOpenShift: (payload: CloseOpenShiftPayload) => Promise<ClockCheckResult>;
  onCreateAdjustment: (payload: CreatePayrollAdjustmentPayload) => Promise<void>;
  onDeleteAdjustment: (adjustmentId: string, operatorUserId: string) => Promise<void>;
  onSettleFortnight: (payload: SettleFortnightPayrollPayload) => Promise<void>;
  onUpsertStaffMember: (payload: UpsertStaffMemberPayload) => Promise<void>;
  onDeleteTimeLog: (logId: string, operatorUserId: string) => Promise<void>;
}

const ROLE_FILTERS: { key: 'ALL' | UserRoleType; label: string }[] = [
  { key: 'ALL', label: 'Todos los Tipos' },
  { key: 'PROFESOR', label: 'Docentes' },
  { key: 'ASESOR', label: 'Asesores / Recepción' },
  { key: 'VENTA', label: 'Ventas POS' },
  { key: 'ADMIN', label: 'Dirección / Admin' },
  { key: 'CONTABILIDAD', label: 'Contabilidad' },
];

export function StaffFortnightPanel({
  fortnightKey,
  availableFortnights,
  onChangeFortnight,
  staffMembers,
  timeLogs,
  payrollSummary,
  operatorUserId,
  onBiometricLog,
  onRegisterManualShift,
  onCloseOpenShift,
  onCreateAdjustment,
  onDeleteAdjustment,
  onSettleFortnight,
  onUpsertStaffMember,
  onDeleteTimeLog,
}: StaffFortnightPanelProps) {
  const { isTouchMode } = useUiMode();

  // Estados de filtros y búsqueda
  const [roleFilter, setRoleFilter] = useState<'ALL' | UserRoleType>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [quickIdentifier, setQuickIdentifier] = useState('');
  const [logStaffFilter, setLogStaffFilter] = useState<string>('ALL');
  const [showInactive, setShowInactive] = useState(false);

  // Estado por empleado para descontar 1h de almuerzo al marcar SALIDA en reloj
  const [lunchToggleByStaff, setLunchToggleByStaff] = useState<
    Record<string, boolean>
  >({});

  // Estado de feedback del reloj biométrico
  const [clockFeedback, setClockFeedback] = useState<{
    type: 'success' | 'error';
    title: string;
    subtitle: string;
  } | null>(null);
  const [busyStaffId, setBusyStaffId] = useState<string | null>(null);
  const [confirmDeleteLogId, setConfirmDeleteLogId] = useState<string | null>(null);

  // Modales
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMemberItem | null>(null);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [manualPreselectedStaffId, setManualPreselectedStaffId] = useState<
    string | undefined
  >(undefined);
  const [closingOpenShift, setClosingOpenShift] = useState<{
    logId: string;
    staffId: string;
    checkInAt: string;
  } | null>(null);
  const [selectedPayStubId, setSelectedPayStubId] = useState<string | null>(null);
  const [adjustmentStaffId, setAdjustmentStaffId] = useState<string | null>(null);
  const [adjustmentInitialTab, setAdjustmentInitialTab] = useState<
    'ADJUSTMENTS' | 'SETTLEMENT'
  >('ADJUSTMENTS');

  const selectedPayStub = useMemo(
    () => payrollSummary.find((p) => p.staffId === selectedPayStubId) ?? null,
    [payrollSummary, selectedPayStubId]
  );

  const selectedAdjustmentSummary = useMemo(
    () => payrollSummary.find((p) => p.staffId === adjustmentStaffId) ?? null,
    [payrollSummary, adjustmentStaffId]
  );

  // KPIs Calculados
  const activeStaffList = useMemo(
    () => staffMembers.filter((s) => s.isActive),
    [staffMembers]
  );
  const openShiftsCount = useMemo(
    () => staffMembers.filter((s) => Boolean(s.openLogId)).length,
    [staffMembers]
  );
  const overdueStaffList = useMemo(
    () => staffMembers.filter((s) => s.isOverdueShift && s.openLogId),
    [staffMembers]
  );
  const totalQuincenaCop = useMemo(
    () => payrollSummary.reduce((acc, item) => acc + item.totalPayCop, 0),
    [payrollSummary]
  );
  const totalHoursPayCop = useMemo(
    () => payrollSummary.reduce((acc, item) => acc + item.hoursPayCop, 0),
    [payrollSummary]
  );
  const totalCommissionsCop = useMemo(
    () => payrollSummary.reduce((acc, item) => acc + item.salesCommissionCop, 0),
    [payrollSummary]
  );
  const totalBonusesCop = useMemo(
    () => payrollSummary.reduce((acc, item) => acc + item.bonusesCop, 0),
    [payrollSummary]
  );
  const totalDeductionsCop = useMemo(
    () => payrollSummary.reduce((acc, item) => acc + item.deductionsCop, 0),
    [payrollSummary]
  );
  const paidCount = useMemo(
    () => payrollSummary.filter((item) => item.settlementStatus === 'PAGADA').length,
    [payrollSummary]
  );
  const totalQuincenaMinutes = useMemo(
    () => payrollSummary.reduce((acc, item) => acc + item.totalWorkedMinutes, 0),
    [payrollSummary]
  );
  const totalQuincenaHours = useMemo(
    () =>
      Number(
        payrollSummary
          .reduce((acc, item) => acc + item.totalWorkedHours, 0)
          .toFixed(2)
      ),
    [payrollSummary]
  );

  // Empleados filtrados para las tarjetas del reloj biométrico
  const filteredStaff = useMemo(() => {
    return staffMembers.filter((s) => {
      if (!showInactive && !s.isActive) return false;
      if (roleFilter !== 'ALL' && s.role !== roleFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = s.fullName.toLowerCase().includes(q);
        const matchesDoc = s.documentId.toLowerCase().includes(q);
        const matchesCode = s.accessCode.toLowerCase().includes(q);
        if (!matchesName && !matchesDoc && !matchesCode) return false;
      }
      return true;
    });
  }, [staffMembers, showInactive, roleFilter, searchQuery]);

  // Resumen de nómina filtrado
  const filteredPayroll = useMemo(() => {
    return payrollSummary.filter((row) => {
      if (!showInactive && !row.isActive) return false;
      if (roleFilter !== 'ALL' && row.role !== roleFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (
          !row.fullName.toLowerCase().includes(q) &&
          !row.documentId.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [payrollSummary, showInactive, roleFilter, searchQuery]);

  // Historial de turnos filtrado
  const filteredLogs = useMemo(() => {
    if (logStaffFilter === 'ALL') return timeLogs;
    return timeLogs.filter((l) => l.staffId === logStaffFilter);
  }, [timeLogs, logStaffFilter]);

  const handleClockAction = async (params: {
    staffId?: string;
    identifier?: string;
    actionType: 'ENTRADA' | 'SALIDA' | 'AUTO';
    deductLunchHour?: boolean;
  }) => {
    setBusyStaffId(params.staffId ?? 'QUICK');
    try {
      const res = await onBiometricLog({
        ...params,
        verifiedByBiometry: true,
        operatorUserId,
      });

      const roleMeta = STAFF_ROLE_META[res.staffRole];
      if (res.resolvedAction === 'ENTRADA') {
        setClockFeedback({
          type: 'success',
          title: `ENTRADA REGISTRADA — ${res.staffName}`,
          subtitle: `${roleMeta.shortLabel} • Turno iniciado a las ${new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}`,
        });
      } else {
        const lunchTag =
          res.lunchDeductedMinutes && res.lunchDeductedMinutes > 0
            ? ` (-${res.lunchDeductedMinutes}m almuerzo)`
            : '';
        setClockFeedback({
          type: 'success',
          title: `SALIDA REGISTRADA — ${res.staffName}`,
          subtitle: `Tiempo neto: ${res.workedHoursDecimal} hrs (${res.workedMinutes} min)${lunchTag} • Liquidado en turno: ${formatCop(res.earnedCop)}`,
        });
      }
      if (params.identifier) {
        setQuickIdentifier('');
      }
    } catch (err) {
      setClockFeedback({
        type: 'error',
        title: 'No se pudo completar la marcación',
        subtitle:
          err instanceof Error ? err.message : 'Verifique el estado del turno',
      });
    } finally {
      setBusyStaffId(null);
    }
  };

  const handleQuickIdentifierSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickIdentifier.trim()) return;
    await handleClockAction({
      identifier: quickIdentifier.trim(),
      actionType: 'AUTO',
    });
  };

  const openCreateStaffModal = () => {
    setEditingStaff(null);
    setIsStaffModalOpen(true);
  };

  const openEditStaffModal = (staff: StaffMemberItem) => {
    setEditingStaff(staff);
    setIsStaffModalOpen(true);
  };

  const openEditFromPayrollRow = (row: FortnightStaffPayrollSummary) => {
    const found = staffMembers.find((s) => s.id === row.staffId);
    if (found) {
      openEditStaffModal(found);
    }
  };

  const openCloseShiftModalForStaff = (staff: StaffMemberItem) => {
    if (!staff.openLogId || !staff.openCheckInAt) return;
    setClosingOpenShift({
      logId: staff.openLogId,
      staffId: staff.id,
      checkInAt: staff.openCheckInAt,
    });
    setIsManualModalOpen(true);
  };

  return (
    <div className="space-y-5 min-w-0">
      {/* Alerta de Turnos Abiertos Olvidados (+10 horas sin marcar salida) */}
      {overdueStaffList.length > 0 && (
        <div className="flex flex-col justify-between gap-3 rounded-2xl border-2 border-amber-500 bg-amber-50 p-4 text-amber-950 shadow-sm sm:flex-row sm:items-center dark:border-amber-500/70 dark:bg-amber-950/60 dark:text-amber-100">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-[#141213]">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-wide">
                Alerta: {overdueStaffList.length} Turno(s) Abierto(s) por más de 10 Horas
              </h3>
              <p className="mt-0.5 text-xs opacity-90">
                Es posible que el empleado haya olvidado marcar su salida. Ajuste la hora real de salida con 1 clic para evitar sobrecostos en la quincena.
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {overdueStaffList.map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => openCloseShiftModalForStaff(st)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#141213] px-3 py-1.5 text-xs font-extrabold text-[#ECCCD9] shadow-2xs transition hover:bg-[#2a2427] dark:bg-[#ECCCD9] dark:text-[#141213]"
                  >
                    <Clock className="h-3.5 w-3.5" />
                    <span>
                      Cerrar Turno de {st.fullName} (
                      {formatMinutesToHoursAndMinutes(st.openElapsedMinutes)})
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 1. Barra Superior de Quincena y Acciones Principales */}
      <div className="flex flex-col justify-between gap-3 rounded-2xl border border-[#E4BDD0] bg-white p-4 shadow-xs lg:flex-row lg:items-center dark:border-[#332B2F] dark:bg-[#1B181A]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#ECCCD9] px-3 py-1 text-xs font-extrabold text-[#141213]">
              <Sparkles className="h-3.5 w-3.5" />
              Período Quincenal Activo
            </span>
            <span className="text-xs font-bold text-neutral-600 dark:text-[#C4B5BC]">
              {formatFortnightHumanLabel(fortnightKey)}
            </span>
          </div>
          <p className="mt-1 text-xs text-neutral-600 dark:text-[#B8A8B0]">
            Integra horas trabajadas, descuento opcional de almuerzo (-1h), comisiones POS de la quincena, bonos y adelantos (vales).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Selector de Quincena */}
          <select
            value={fortnightKey}
            onChange={(e) => onChangeFortnight(e.target.value)}
            className={`rounded-xl border border-[#E4BDD0] bg-[#FAF2F6] px-3 text-xs font-extrabold text-[#141213] transition focus:outline-none dark:border-[#3A3035] dark:bg-[#252023] dark:text-[#F5EEF1] ${
              isTouchMode ? 'h-12 text-sm' : 'h-10'
            }`}
            title="Seleccionar período quincenal"
          >
            {availableFortnights.map((key) => (
              <option key={key} value={key}>
                {key} — {formatFortnightHumanLabel(key)}
              </option>
            ))}
          </select>

          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setClosingOpenShift(null);
              setManualPreselectedStaffId(undefined);
              setIsManualModalOpen(true);
            }}
            className={`gap-1.5 border-[#E4BDD0] bg-white font-bold text-[#141213] hover:bg-[#FAF0F5] dark:border-[#3A3035] dark:bg-[#252023] dark:text-[#F5EEF1] dark:hover:bg-[#322B2F] ${
              isTouchMode ? 'h-12 px-4 text-sm' : 'h-10 text-xs'
            }`}
          >
            <CalendarClock className="h-4 w-4 text-[#141213] dark:text-[#ECCCD9]" />
            <span>+ Turno / Horas Manual</span>
          </Button>

          <Button
            type="button"
            variant="pink"
            onClick={openCreateStaffModal}
            className={`gap-1.5 bg-[#ECCCD9] font-extrabold text-[#141213] hover:bg-[#E4BDD0] ${
              isTouchMode ? 'h-12 px-4 text-sm' : 'h-10 text-xs'
            }`}
          >
            <UserPlus className="h-4 w-4" />
            <span>+ Nuevo Empleado / Tarifas</span>
          </Button>
        </div>
      </div>

      {/* 2. Tarjetas KPI de la Quincena (Móvil 2 cols / PC 4 cols) */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-[#E4BDD0] bg-white p-4 shadow-xs dark:border-[#332B2F] dark:bg-[#1B181A]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-500 dark:text-[#C4B5BC]">
              Personal y Estado Pago
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#ECCCD9] text-[#141213]">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between gap-2">
            <span className="text-2xl font-black text-[#141213] dark:text-white">
              {activeStaffList.length} activos
            </span>
            <span
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-extrabold ${
                openShiftsCount > 0
                  ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/80 dark:text-emerald-300'
                  : 'bg-neutral-100 text-neutral-600 dark:bg-[#262124] dark:text-[#B8A8B0]'
              }`}
            >
              {openShiftsCount} en turno • {paidCount} pagados
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-[#E4BDD0] bg-white p-4 shadow-xs dark:border-[#332B2F] dark:bg-[#1B181A]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-500 dark:text-[#C4B5BC]">
              Subtotal Horas ({totalQuincenaHours}h)
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#ECCCD9] text-[#141213]">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between gap-2">
            <span className="text-2xl font-black text-[#141213] dark:text-white">
              {formatCop(totalHoursPayCop)}
            </span>
            <span className="text-xs font-semibold text-neutral-500 dark:text-[#B8A8B0]">
              {formatMinutesToHoursAndMinutes(totalQuincenaMinutes)}
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-[#E4BDD0] bg-white p-4 shadow-xs dark:border-[#332B2F] dark:bg-[#1B181A]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-500 dark:text-[#C4B5BC]">
              + Comisiones / Bonos / Vales
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#ECCCD9] text-[#141213]">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between gap-2">
            <span className="text-lg font-black text-emerald-700 dark:text-emerald-400">
              +{formatCop(totalCommissionsCop + totalBonusesCop)}
            </span>
            <span className="text-xs font-extrabold text-red-600 dark:text-red-400">
              Vales: -{formatCop(totalDeductionsCop)}
            </span>
          </div>
        </div>

        <div className="rounded-2xl border-2 border-[#D9AFC2] bg-gradient-to-br from-[#FAF0F5] via-white to-[#ECCCD9]/40 p-4 text-[#141213] shadow-xs dark:border-[#ECCCD9]/50 dark:bg-[#231D20] dark:text-white">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-[#7A1E46] dark:text-[#ECCCD9]">
              Neto Nómina Quincenal
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#ECCCD9] text-[#7A1E46] dark:bg-[#382630] dark:text-[#ECCCD9]">
              <BadgeDollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between gap-2">
            <span className="text-2xl font-black text-[#141213] dark:text-white">
              {formatCop(totalQuincenaCop)}
            </span>
            <span className="text-[11px] font-semibold text-neutral-600 dark:text-[#ECCCD9]">
              Horas + Comis. - Vales
            </span>
          </div>
        </div>
      </div>

      {/* 3. Terminal de Reloj Biométrico + Marcación por Cédula / Clic */}
      <Card className="overflow-hidden border-[#E4BDD0] bg-white dark:border-[#332B2F] dark:bg-[#1B181A]">
        <CardHeader className="border-b border-[#E4BDD0]/60 bg-gradient-to-r from-[#ECCCD9]/45 to-[#FAF2F6] p-4 sm:p-5 dark:border-[#332B2F] dark:from-[#241E21] dark:to-[#1B181A]">
          <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
            <div className="flex items-start gap-3 min-w-0">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#ECCCD9] text-[#141213] shadow-xs">
                <Fingerprint className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="text-base sm:text-lg font-bold text-[#141213] dark:text-[#F5EEF1]">
                    Reloj Biométrico y Control de Turnos
                  </CardTitle>
                  <span className="rounded-full bg-[#ECCCD9] px-2.5 py-0.5 text-[11px] font-extrabold text-[#141213]">
                    Huella / Cédula / Clic
                  </span>
                </div>
                <CardDescription className="text-xs text-neutral-600 dark:text-[#C4B5BC]">
                  Marque Entrada o Salida, active el descuento de 1h de almuerzo (-60m) o ajuste la hora de salida de cualquier turno activo.
                </CardDescription>
              </div>
            </div>

            {/* Formulario de Marcación Rápida por Cédula / Código */}
            <form
              onSubmit={handleQuickIdentifierSubmit}
              className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto"
            >
              <Input
                value={quickIdentifier}
                onChange={(e) => setQuickIdentifier(e.target.value)}
                placeholder="Cédula o código para Entrada/Salida..."
                className={`w-full border-[#E4BDD0] bg-white text-sm font-semibold text-[#141213] sm:w-64 dark:border-[#3D3439] dark:bg-[#141213] dark:text-white ${
                  isTouchMode ? 'h-12' : 'h-10'
                }`}
              />
              <Button
                type="submit"
                variant="pink"
                disabled={busyStaffId === 'QUICK' || !quickIdentifier.trim()}
                className={`shrink-0 bg-[#ECCCD9] font-extrabold text-[#141213] hover:bg-[#E4BDD0] ${
                  isTouchMode ? 'h-12 px-5 text-sm' : 'h-10 px-4 text-xs'
                }`}
              >
                {busyStaffId === 'QUICK' ? 'Procesando...' : 'Marcar Turno'}
              </Button>
            </form>
          </div>

          {/* Semáforo de Confirmación de Marcación */}
          {clockFeedback && (
            <div
              className={`mt-3 flex items-center justify-between gap-3 rounded-xl border p-3 text-xs transition-all ${
                clockFeedback.type === 'success'
                  ? 'border-emerald-400/70 bg-emerald-50 text-emerald-950 dark:border-emerald-500/40 dark:bg-emerald-950/60 dark:text-emerald-100'
                  : 'border-red-400/70 bg-red-50 text-red-950 dark:border-red-500/40 dark:bg-red-950/60 dark:text-red-100'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {clockFeedback.type === 'success' ? (
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <AlertCircle className="h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
                )}
                <div className="min-w-0">
                  <div className="font-extrabold">{clockFeedback.title}</div>
                  <div className="truncate opacity-90">{clockFeedback.subtitle}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setClockFeedback(null)}
                className="shrink-0 rounded-lg px-2 py-1 text-[11px] font-bold underline"
              >
                Ocultar
              </button>
            </div>
          )}
        </CardHeader>

        <CardContent className="space-y-4 p-4 sm:p-5">
          {/* Filtros por Tipo de Empleado y Buscador */}
          <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
            <div className="flex flex-wrap items-center gap-1.5">
              {ROLE_FILTERS.map((f) => {
                const active = roleFilter === f.key;
                return (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setRoleFilter(f.key)}
                    className={`rounded-xl border px-3 py-1.5 text-xs font-extrabold transition ${
                      active
                        ? 'border-[#141213] bg-[#ECCCD9] text-[#141213] shadow-xs dark:border-[#ECCCD9]'
                        : 'border-neutral-200 bg-[#FAF7F9] text-neutral-700 hover:bg-[#FAF0F5] dark:border-[#332B2F] dark:bg-[#221D20] dark:text-[#E5D8DF] dark:hover:border-[#ECCCD9]/40'
                    }`}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 sm:w-64">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar empleado o cédula..."
                  className="h-9 border-neutral-300 bg-white pl-9 text-xs text-[#141213] dark:border-[#3A3035] dark:bg-[#221D20] dark:text-white"
                />
              </div>

              <button
                type="button"
                onClick={() => setShowInactive(!showInactive)}
                className={`rounded-xl border px-3 py-1.5 text-xs font-bold transition ${
                  showInactive
                    ? 'border-[#141213] bg-[#141213] text-[#ECCCD9] dark:border-[#ECCCD9]'
                    : 'border-neutral-200 bg-white text-neutral-600 dark:border-[#332B2F] dark:bg-[#221D20] dark:text-[#C4B5BC]'
                }`}
              >
                {showInactive ? 'Ocultar Inactivos' : 'Ver Inactivos'}
              </button>
            </div>
          </div>

          {/* Grilla de Tarjetas de Empleados (Móvil 1 col, Tablet 2 cols, Desktop 3 cols) */}
          <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2 xl:grid-cols-3">
            {filteredStaff.map((staff) => {
              const roleMeta = STAFF_ROLE_META[staff.role];
              const isInShift = Boolean(staff.openLogId);
              const isBusy = busyStaffId === staff.id;
              const deductLunch = Boolean(lunchToggleByStaff[staff.id]);
              const summaryForStaff = payrollSummary.find(
                (p) => p.staffId === staff.id
              );

              return (
                <div
                  key={staff.id}
                  className={`flex min-w-0 flex-col justify-between rounded-2xl border p-4 transition-all ${
                    !staff.isActive
                      ? 'border-neutral-300 bg-neutral-100/70 opacity-75 dark:border-[#2C2629] dark:bg-[#171416]'
                      : staff.isOverdueShift
                        ? 'border-2 border-amber-500 bg-amber-50/40 shadow-sm dark:border-amber-500/70 dark:bg-amber-950/25'
                        : isInShift
                          ? 'border-emerald-400 bg-emerald-50/35 shadow-sm dark:border-emerald-500/50 dark:bg-emerald-950/20'
                          : 'border-[#E4BDD0] bg-[#FAF7F9]/70 shadow-xs hover:border-[#d8a7c0] dark:border-[#332B2F] dark:bg-[#221D20]'
                  }`}
                >
                  <div className="min-w-0">
                    {/* Fila superior: Tipo de empleado + Indicador de Turno */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-extrabold ${roleMeta.badgeClass}`}
                      >
                        <Briefcase className="h-3 w-3" />
                        {roleMeta.shortLabel}
                      </span>

                      {isInShift ? (
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-extrabold text-white shadow-xs ${
                            staff.isOverdueShift ? 'bg-amber-600' : 'bg-emerald-600'
                          }`}
                        >
                          <span className="h-2 w-2 animate-ping rounded-full bg-white" />
                          {staff.isOverdueShift ? 'TURNO +10H (' : 'EN TURNO ('}
                          {staff.openCheckInAt
                            ? new Date(staff.openCheckInAt).toLocaleTimeString(
                                'es-CO',
                                { hour: '2-digit', minute: '2-digit' }
                              )
                            : 'Activo'}
                          )
                        </span>
                      ) : (
                        <span className="rounded-full border border-neutral-300 bg-white px-2.5 py-0.5 text-[11px] font-semibold text-neutral-600 dark:border-[#3A3035] dark:bg-[#181517] dark:text-[#B8A8B0]">
                          Fuera de turno
                        </span>
                      )}
                    </div>

                    {/* Nombre y Documento */}
                    <div className="mt-2.5 flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="truncate text-base font-extrabold text-[#141213] dark:text-white">
                          {staff.fullName}
                        </h3>
                        <p className="truncate text-xs text-neutral-600 dark:text-[#C4B5BC]">
                          C.C. {staff.documentId} • Cód:{' '}
                          <strong className="text-[#141213] dark:text-[#ECCCD9]">
                            {staff.accessCode}
                          </strong>
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => openEditStaffModal(staff)}
                        className="flex h-8 shrink-0 items-center gap-1 rounded-xl border border-[#E4BDD0] bg-white px-2.5 text-[11px] font-extrabold text-[#141213] shadow-2xs transition hover:bg-[#ECCCD9] dark:border-[#3A3035] dark:bg-[#181517] dark:text-[#ECCCD9] dark:hover:bg-[#ECCCD9] dark:hover:text-[#141213]"
                        title="Definir valor de hora y tipo de empleado"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                        <span>Tarifa / Rol</span>
                      </button>
                    </div>

                    {/* Caja de Tarifa por Hora y Acumulado Neto en Quincena */}
                    <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl border border-[#E4BDD0]/80 bg-white p-2.5 dark:border-[#332B2F] dark:bg-[#181517]">
                      <div className="min-w-0">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 dark:text-[#B8A8B0]">
                          Valor Hora
                        </div>
                        <div className="truncate text-sm font-black text-[#141213] dark:text-[#ECCCD9]">
                          {formatCop(staff.hourlyRateCop)}
                          <span className="text-[10px] font-normal text-neutral-500 dark:text-[#B8A8B0]">
                            /h
                          </span>
                        </div>
                      </div>

                      <div className="min-w-0 border-l border-neutral-200 pl-2.5 dark:border-[#332B2F]">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 dark:text-[#B8A8B0]">
                          Neto Quincena
                        </div>
                        <div className="truncate text-sm font-black text-[#141213] dark:text-white">
                          {summaryForStaff?.totalWorkedHours ?? 0}h •{' '}
                          {formatCop(summaryForStaff?.totalPayCop ?? 0)}
                        </div>
                      </div>
                    </div>

                    {/* Si está en turno activo: Opción rápida de -1h Almuerzo o Ajustar Hora Salida */}
                    {isInShift && (
                      <div className="mt-2.5 flex items-center justify-between gap-2 rounded-xl border border-emerald-300/80 bg-white/90 px-2.5 py-1.5 text-[11px] dark:border-emerald-700/40 dark:bg-[#181517]">
                        <button
                          type="button"
                          onClick={() =>
                            setLunchToggleByStaff((prev) => ({
                              ...prev,
                              [staff.id]: !prev[staff.id],
                            }))
                          }
                          className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 font-extrabold transition ${
                            deductLunch
                              ? 'bg-[#141213] text-[#ECCCD9] dark:bg-[#ECCCD9] dark:text-[#141213]'
                              : 'bg-neutral-100 text-neutral-600 dark:bg-[#252023] dark:text-[#C4B5BC]'
                          }`}
                        >
                          <Utensils className="h-3 w-3" />
                          <span>
                            {deductLunch
                              ? 'Almuerzo -1h: SÍ'
                              : 'Descontar 1h almuerzo'}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => openCloseShiftModalForStaff(staff)}
                          className="font-extrabold text-amber-800 underline hover:text-amber-950 dark:text-amber-300"
                        >
                          Ajustar hora salida
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Botones de Acción (Entrada / Salida / Manual) */}
                  <div className="mt-3.5 flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      disabled={isBusy || isInShift || !staff.isActive}
                      onClick={() =>
                        handleClockAction({
                          staffId: staff.id,
                          actionType: 'ENTRADA',
                        })
                      }
                      className={`flex-1 gap-1.5 font-extrabold ${
                        isTouchMode ? 'h-12 text-xs' : 'h-9 text-xs'
                      } ${
                        !isInShift
                          ? 'bg-[#141213] text-[#ECCCD9] hover:bg-[#282426] dark:bg-[#ECCCD9] dark:text-[#141213] dark:hover:bg-[#E4BDD0]'
                          : 'bg-neutral-200 text-neutral-500 dark:bg-[#2A2427] dark:text-neutral-500'
                      }`}
                    >
                      <LogIn className="h-3.5 w-3.5 shrink-0" />
                      <span>Entrada</span>
                    </Button>

                    <Button
                      type="button"
                      disabled={isBusy || !isInShift}
                      onClick={() =>
                        handleClockAction({
                          staffId: staff.id,
                          actionType: 'SALIDA',
                          deductLunchHour: deductLunch,
                        })
                      }
                      className={`flex-1 gap-1.5 font-extrabold ${
                        isTouchMode ? 'h-12 text-xs' : 'h-9 text-xs'
                      } ${
                        isInShift
                          ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                          : 'bg-[#ECCCD9]/60 text-[#141213]/60 dark:bg-[#2A2427] dark:text-neutral-400'
                      }`}
                    >
                      <LogOut className="h-3.5 w-3.5 shrink-0" />
                      <span>{deductLunch ? 'Salida (-1h)' : 'Salida'}</span>
                    </Button>

                    <button
                      type="button"
                      onClick={() => {
                        setClosingOpenShift(null);
                        setManualPreselectedStaffId(staff.id);
                        setIsManualModalOpen(true);
                      }}
                      className={`flex shrink-0 items-center justify-center rounded-xl border border-[#E4BDD0] bg-white px-2.5 text-xs font-bold text-[#141213] transition hover:bg-[#FAF0F5] dark:border-[#3A3035] dark:bg-[#181517] dark:text-[#ECCCD9] ${
                        isTouchMode ? 'h-12' : 'h-9'
                      }`}
                      title="Agregar horas o turno manual a este empleado"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* 4. Tabla y Tarjetas Móviles de Liquidación Quincenal Completa */}
      <Card className="overflow-hidden border-[#E4BDD0] bg-white dark:border-[#332B2F] dark:bg-[#1B181A]">
        <CardHeader className="border-b border-[#E4BDD0]/60 bg-[#FAF2F6]/60 p-4 sm:p-5 dark:border-[#332B2F] dark:bg-[#221D20]">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <CardTitle className="text-base sm:text-lg font-bold text-[#141213] dark:text-[#F5EEF1]">
                Liquidación Quincenal Integral ({fortnightKey})
              </CardTitle>
              <CardDescription className="text-xs text-neutral-600 dark:text-[#C4B5BC]">
                Incluye Pago por Horas + Comisiones POS + Bonos - Adelantos (Vales) y Estado de Desembolso.
              </CardDescription>
            </div>
            <div className="rounded-xl bg-[#141213] px-4 py-2.5 text-right text-white dark:border dark:border-[#ECCCD9]/40">
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#ECCCD9]">
                Total Neto Quincena
              </div>
              <div className="text-lg font-black text-white">
                {formatCop(totalQuincenaCop)}
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {/* Vista Móvil (< md): Tarjetas apiladas sin desborde */}
          <div className="divide-y divide-neutral-200 md:hidden dark:divide-[#332B2F]">
            {filteredPayroll.map((row) => {
              const roleMeta = STAFF_ROLE_META[row.role];
              const isPaid = row.settlementStatus === 'PAGADA';
              return (
                <div key={row.staffId} className="space-y-2.5 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-extrabold ${roleMeta.badgeClass}`}
                        >
                          {roleMeta.shortLabel}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                            isPaid
                              ? 'bg-emerald-600 text-white'
                              : 'bg-amber-100 text-amber-950 dark:bg-amber-950 dark:text-amber-200'
                          }`}
                        >
                          {isPaid
                            ? `PAGADA (${row.settlement?.paymentMethod ?? ''})`
                            : 'PENDIENTE'}
                        </span>
                      </div>
                      <div className="mt-1 truncate text-sm font-extrabold text-[#141213] dark:text-white">
                        {row.fullName}
                      </div>
                      <div className="text-xs text-neutral-500 dark:text-[#B8A8B0]">
                        C.C. {row.documentId} • {formatCop(row.hourlyRateCop)}/h
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-[10px] font-bold uppercase text-neutral-500 dark:text-[#B8A8B0]">
                        Neto a Pagar
                      </div>
                      <div className="text-base font-black text-[#141213] dark:text-[#ECCCD9]">
                        {formatCop(row.totalPayCop)}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 rounded-xl border border-neutral-200 bg-[#FAF7F9] p-2.5 text-xs dark:border-[#332B2F] dark:bg-[#221D20]">
                    <div>
                      <div className="text-[10px] text-neutral-500 dark:text-[#B8A8B0]">
                        Horas ({row.totalWorkedHours}h)
                      </div>
                      <div className="font-bold text-[#141213] dark:text-white">
                        {formatCop(row.hoursPayCop)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-neutral-500 dark:text-[#B8A8B0]">
                        + Comisiones ({row.salesCount})
                      </div>
                      <div className="font-bold text-emerald-700 dark:text-emerald-400">
                        +{formatCop(row.salesCommissionCop)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-neutral-500 dark:text-[#B8A8B0]">
                        Bonos / Vales
                      </div>
                      <div className="font-bold text-[#141213] dark:text-white">
                        +{formatCop(row.bonusesCop)} / -{formatCop(row.deductionsCop)}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setAdjustmentStaffId(row.staffId);
                        setAdjustmentInitialTab('ADJUSTMENTS');
                      }}
                      className="flex-1 gap-1 text-xs font-bold dark:border-[#3A3035] dark:bg-[#252023] dark:text-white"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Bono / Vale
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setAdjustmentStaffId(row.staffId);
                        setAdjustmentInitialTab('SETTLEMENT');
                      }}
                      className="flex-1 gap-1 border-emerald-400 text-xs font-extrabold text-emerald-800 dark:text-emerald-300"
                    >
                      <Wallet className="h-3.5 w-3.5" />
                      {isPaid ? 'Pagada' : 'Pagar'}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="pink"
                      onClick={() => setSelectedPayStubId(row.staffId)}
                      className="flex-1 gap-1 bg-[#ECCCD9] text-xs font-extrabold text-[#141213]"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      Recibo
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Vista Tablet / PC (>= md): Tabla completa */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow className="border-neutral-200 bg-[#FAF7F9] dark:border-[#332B2F] dark:bg-[#221D20]">
                  <TableHead className="font-bold text-[#141213] dark:text-[#ECCCD9]">
                    Empleado / Cargo
                  </TableHead>
                  <TableHead className="font-bold text-[#141213] dark:text-[#ECCCD9]">
                    Horas / Tarifa
                  </TableHead>
                  <TableHead className="font-bold text-[#141213] dark:text-[#ECCCD9]">
                    Pago Horas
                  </TableHead>
                  <TableHead className="font-bold text-[#141213] dark:text-[#ECCCD9]">
                    + Comisiones POS
                  </TableHead>
                  <TableHead className="font-bold text-[#141213] dark:text-[#ECCCD9]">
                    + Bonos / - Vales
                  </TableHead>
                  <TableHead className="text-right font-bold text-[#141213] dark:text-[#ECCCD9]">
                    Neto a Pagar
                  </TableHead>
                  <TableHead className="font-bold text-[#141213] dark:text-[#ECCCD9]">
                    Estado
                  </TableHead>
                  <TableHead className="text-right font-bold text-[#141213] dark:text-[#ECCCD9]">
                    Acciones
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayroll.map((row) => {
                  const roleMeta = STAFF_ROLE_META[row.role];
                  const isPaid = row.settlementStatus === 'PAGADA';
                  return (
                    <TableRow
                      key={row.staffId}
                      className="border-neutral-200 dark:border-[#332B2F]"
                    >
                      <TableCell>
                        <div className="font-extrabold text-[#141213] dark:text-white">
                          {row.fullName}
                        </div>
                        <div className="mt-0.5 flex items-center gap-1.5">
                          <span
                            className={`inline-flex items-center rounded-full border px-2 py-0.2 text-[10px] font-extrabold ${roleMeta.badgeClass}`}
                          >
                            {roleMeta.shortLabel}
                          </span>
                          <span className="text-[11px] text-neutral-500 dark:text-[#B8A8B0]">
                            C.C. {row.documentId}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-extrabold text-[#141213] dark:text-white">
                          {row.totalWorkedHours} hrs{' '}
                          <span className="text-xs font-normal text-neutral-500">
                            ({row.totalShifts}t)
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => openEditFromPayrollRow(row)}
                          className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-extrabold text-[#7A1E46] underline hover:opacity-80 dark:text-[#ECCCD9]"
                          title="Editar valor hora"
                        >
                          <span>{formatCop(row.hourlyRateCop)}/h</span>
                          <Edit3 className="h-2.5 w-2.5" />
                        </button>
                      </TableCell>
                      <TableCell className="font-bold text-[#141213] dark:text-white">
                        {formatCop(row.hoursPayCop)}
                      </TableCell>
                      <TableCell>
                        <div className="font-extrabold text-emerald-700 dark:text-emerald-400">
                          +{formatCop(row.salesCommissionCop)}
                        </div>
                        <div className="text-[10px] text-neutral-500 dark:text-[#B8A8B0]">
                          {row.salesCount} venta(s) ({row.commissionRatePct}%)
                        </div>
                      </TableCell>
                      <TableCell>
                        <button
                          type="button"
                          onClick={() => {
                            setAdjustmentStaffId(row.staffId);
                            setAdjustmentInitialTab('ADJUSTMENTS');
                          }}
                          className="group inline-flex flex-col items-start rounded-xl border border-[#E4BDD0] bg-[#FAF2F6] px-2.5 py-1 text-left text-[11px] transition hover:bg-[#ECCCD9] dark:border-[#3A3035] dark:bg-[#252023]"
                        >
                          <div className="font-extrabold">
                            <span className="text-emerald-700 dark:text-emerald-400">
                              +{formatCop(row.bonusesCop)}
                            </span>{' '}
                            /{' '}
                            <span className="text-red-600 dark:text-red-400">
                              -{formatCop(row.deductionsCop)}
                            </span>
                          </div>
                          <span className="text-[10px] font-bold text-neutral-600 underline dark:text-[#C4B5BC]">
                            + Bono o Vale ({row.adjustments.length})
                          </span>
                        </button>
                      </TableCell>
                      <TableCell className="text-right text-base font-black text-[#141213] dark:text-[#ECCCD9]">
                        {formatCop(row.totalPayCop)}
                      </TableCell>
                      <TableCell>
                        <button
                          type="button"
                          onClick={() => {
                            setAdjustmentStaffId(row.staffId);
                            setAdjustmentInitialTab('SETTLEMENT');
                          }}
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black transition ${
                            isPaid
                              ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                              : 'border border-amber-400 bg-amber-100 text-amber-950 hover:bg-amber-200 dark:bg-amber-950 dark:text-amber-200'
                          }`}
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          {isPaid
                            ? `PAGADA (${row.settlement?.paymentMethod ?? 'OK'})`
                            : 'PENDIENTE • PAGAR'}
                        </button>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setAdjustmentStaffId(row.staffId);
                              setAdjustmentInitialTab('ADJUSTMENTS');
                            }}
                            className="h-8 gap-1 px-2 text-xs font-bold dark:border-[#3A3035] dark:bg-[#252023] dark:text-white"
                            title="Agregar Bono, Vale o Descuento"
                          >
                            <Wallet className="h-3.5 w-3.5" />
                            <span>Vales</span>
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="pink"
                            onClick={() => setSelectedPayStubId(row.staffId)}
                            className="h-8 gap-1 bg-[#ECCCD9] px-2.5 text-xs font-extrabold text-[#141213] hover:bg-[#E4BDD0]"
                          >
                            <FileText className="h-3.5 w-3.5" />
                            <span>Recibo</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* 5. Historial Detallado de Marcaciones de la Quincena */}
      <Card className="overflow-hidden border-[#E4BDD0] bg-white dark:border-[#332B2F] dark:bg-[#1B181A]">
        <CardHeader className="border-b border-[#E4BDD0]/60 p-4 sm:p-5 dark:border-[#332B2F]">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <CardTitle className="flex items-center gap-2 text-sm sm:text-base font-bold text-[#141213] dark:text-[#F5EEF1]">
              <Clock className="h-4 w-4 text-[#141213] dark:text-[#ECCCD9]" />
              Historial Detallado de Turnos y Marcaciones ({filteredLogs.length})
            </CardTitle>

            <select
              value={logStaffFilter}
              onChange={(e) => setLogStaffFilter(e.target.value)}
              className="h-9 rounded-xl border border-neutral-300 bg-white px-3 text-xs font-bold text-[#141213] dark:border-[#3A3035] dark:bg-[#221D20] dark:text-white"
            >
              <option value="ALL">Ver todos los empleados</option>
              {staffMembers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.fullName} ({STAFF_ROLE_META[s.role].shortLabel})
                </option>
              ))}
            </select>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {filteredLogs.length === 0 ? (
            <div className="p-8 text-center text-xs text-neutral-500 dark:text-[#B8A8B0]">
              No hay marcaciones registradas para el filtro seleccionado en la quincena {fortnightKey}.
            </div>
          ) : (
            <>
              {/* Vista Móvil de Historial */}
              <div className="divide-y divide-neutral-200 md:hidden dark:divide-[#332B2F]">
                {filteredLogs.map((log) => {
                  const staffObj = staffMembers.find((s) => s.id === log.staffId);
                  const shiftValueCop = Math.round(
                    log.workedHoursDecimal * (staffObj?.hourlyRateCop ?? 0)
                  );
                  return (
                    <div key={log.id} className="space-y-2 p-4 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-extrabold text-[#141213] dark:text-white">
                          {log.staffName}
                        </span>
                        <span className="font-extrabold text-[#141213] dark:text-[#ECCCD9]">
                          {log.workedHoursDecimal} hrs ({formatCop(shiftValueCop)})
                        </span>
                      </div>
                      <div className="text-neutral-600 dark:text-[#C4B5BC]">
                        <div>Entrada: {formatDateTimeCo(log.checkInAt)}</div>
                        <div>
                          Salida:{' '}
                          {log.checkOutAt
                            ? formatDateTimeCo(log.checkOutAt)
                            : 'Turno en curso'}
                        </div>
                        {log.lunchDeductedMinutes > 0 && (
                          <div className="font-bold text-amber-800 dark:text-amber-300">
                            Almuerzo descontado: -{log.lunchDeductedMinutes} min
                          </div>
                        )}
                        {log.notes && (
                          <div className="mt-1 italic">Nota: {log.notes}</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Vista Desktop de Historial */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow className="border-neutral-200 bg-[#FAF7F9] dark:border-[#332B2F] dark:bg-[#221D20]">
                      <TableHead className="font-bold text-[#141213] dark:text-[#ECCCD9]">
                        Personal
                      </TableHead>
                      <TableHead className="font-bold text-[#141213] dark:text-[#ECCCD9]">
                        Entrada
                      </TableHead>
                      <TableHead className="font-bold text-[#141213] dark:text-[#ECCCD9]">
                        Salida
                      </TableHead>
                      <TableHead className="font-bold text-[#141213] dark:text-[#ECCCD9]">
                        Horas Netas
                      </TableHead>
                      <TableHead className="font-bold text-[#141213] dark:text-[#ECCCD9]">
                        Valor del Turno
                      </TableHead>
                      <TableHead className="font-bold text-[#141213] dark:text-[#ECCCD9]">
                        Origen / Nota
                      </TableHead>
                      <TableHead className="text-right font-bold text-[#141213] dark:text-[#ECCCD9]">
                        Acción
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.map((log) => {
                      const staffObj = staffMembers.find(
                        (s) => s.id === log.staffId
                      );
                      const shiftValueCop = Math.round(
                        log.workedHoursDecimal * (staffObj?.hourlyRateCop ?? 0)
                      );
                      const roleMeta = STAFF_ROLE_META[log.staffRole];

                      return (
                        <TableRow
                          key={log.id}
                          className="border-neutral-200 dark:border-[#332B2F]"
                        >
                          <TableCell>
                            <div className="font-bold text-[#141213] dark:text-white">
                              {log.staffName}
                            </div>
                            <span
                              className={`mt-0.5 inline-flex rounded-full border px-2 py-0.2 text-[10px] font-bold ${roleMeta.badgeClass}`}
                            >
                              {roleMeta.shortLabel}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs text-[#141213] dark:text-[#E5D8DF]">
                            {formatDateTimeCo(log.checkInAt)}
                          </TableCell>
                          <TableCell className="text-xs text-[#141213] dark:text-[#E5D8DF]">
                            {log.checkOutAt ? (
                              formatDateTimeCo(log.checkOutAt)
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <Badge variant="success">Turno en curso</Badge>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setClosingOpenShift({
                                      logId: log.id,
                                      staffId: log.staffId,
                                      checkInAt: log.checkInAt,
                                    });
                                    setIsManualModalOpen(true);
                                  }}
                                  className="text-[11px] font-extrabold text-amber-800 underline dark:text-amber-300"
                                >
                                  Cerrar/Ajustar
                                </button>
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="font-bold text-[#141213] dark:text-white">
                            <div>
                              {log.workedHoursDecimal} hrs{' '}
                              <span className="text-xs font-normal text-neutral-500 dark:text-[#B8A8B0]">
                                ({log.workedMinutes} min)
                              </span>
                            </div>
                            {log.lunchDeductedMinutes > 0 && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-amber-800 dark:text-amber-300">
                                <Utensils className="h-2.5 w-2.5" />-
                                {log.lunchDeductedMinutes}m almuerzo
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="font-extrabold text-[#141213] dark:text-[#ECCCD9]">
                            {formatCop(shiftValueCop)}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <Badge
                                variant={log.verifiedByBiometry ? 'pink' : 'secondary'}
                                className="w-fit gap-1 text-[10px]"
                              >
                                <Fingerprint className="h-3 w-3" />
                                {log.verifiedByBiometry
                                  ? 'Reloj Biométrico'
                                  : 'Registro Manual'}
                              </Badge>
                              {log.notes && (
                                <span className="text-[11px] text-neutral-500 dark:text-[#B8A8B0]">
                                  {log.notes}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            {confirmDeleteLogId === log.id ? (
                              <div className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={async () => {
                                    await onDeleteTimeLog(log.id, operatorUserId);
                                    setConfirmDeleteLogId(null);
                                  }}
                                  className="rounded-lg bg-red-600 px-2 py-1 text-[11px] font-bold text-white hover:bg-red-700"
                                >
                                  Confirmar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteLogId(null)}
                                  className="rounded-lg border border-neutral-300 px-2 py-1 text-[11px] font-semibold dark:border-[#3A3035]"
                                >
                                  No
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteLogId(log.id)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                                title="Eliminar registro de turno"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Modales */}
      <StaffMemberFormModal
        isOpen={isStaffModalOpen}
        editingStaff={editingStaff}
        operatorUserId={operatorUserId}
        onClose={() => setIsStaffModalOpen(false)}
        onSave={onUpsertStaffMember}
      />

      <ManualTimeLogModal
        isOpen={isManualModalOpen}
        staffMembers={staffMembers}
        preselectedStaffId={manualPreselectedStaffId}
        closingOpenShift={closingOpenShift}
        operatorUserId={operatorUserId}
        onClose={() => {
          setIsManualModalOpen(false);
          setClosingOpenShift(null);
        }}
        onSaveManualShift={onRegisterManualShift}
        onCloseOpenShift={onCloseOpenShift}
      />

      <PayrollAdjustmentModal
        isOpen={Boolean(selectedAdjustmentSummary)}
        summary={selectedAdjustmentSummary}
        initialTab={adjustmentInitialTab}
        operatorUserId={operatorUserId}
        onClose={() => setAdjustmentStaffId(null)}
        onCreateAdjustment={onCreateAdjustment}
        onDeleteAdjustment={onDeleteAdjustment}
        onSettleFortnight={onSettleFortnight}
      />

      <StaffPayStubModal
        summary={selectedPayStub}
        logs={timeLogs}
        onClose={() => setSelectedPayStubId(null)}
        onOpenSettlement={(summary) => {
          setSelectedPayStubId(null);
          setAdjustmentStaffId(summary.staffId);
          setAdjustmentInitialTab('SETTLEMENT');
        }}
      />
    </div>
  );
}
