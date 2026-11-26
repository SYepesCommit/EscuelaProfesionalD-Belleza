'use client';

import React, { useMemo, useState } from 'react';
import {
  AlertOctagon,
  Award,
  CheckCircle2,
  DollarSign,
  Lock,
  Plus,
  Search,
  Unlock,
  UserX,
  Phone,
  Fingerprint,
  History,
  Edit2,
  MessageCircle,
  Receipt,
  Filter,
  ArrowUpDown,
  Clock,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import {
  CancelFinePayload,
  CertificateValidationResult,
  FineItem,
  PayAndRescheduleFinePayload,
  RegisterAttendancePayload,
  RegisterStudentPaymentPayload,
  StudentItem,
} from '@/interfaces/student.interface';
import { ClassScheduleItem } from '@/interfaces/schedule.interface';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatCop } from '@/lib/utils';
import { CreateStudentModal } from './CreateStudentModal';
import { EditStudentModal } from './EditStudentModal';
import { PayFineModal } from './PayFineModal';
import { ApplyFineModal } from './ApplyFineModal';
import { StudentFinesHistoryModal } from './StudentFinesHistoryModal';
import { StudyCertificateModal } from './StudyCertificateModal';
import { RegisterStudentPaymentModal } from './RegisterStudentPaymentModal';
import { EnrollFingerprintModal } from './EnrollFingerprintModal';

interface StudentsFinesPanelProps {
  students: StudentItem[];
  schedules: ClassScheduleItem[];
  operatorUserId: string;
  operatorName?: string;
  isAdmin?: boolean;
  certificateAlert: CertificateValidationResult | null;
  onClearCertificateAlert: () => void;
  onCreateStudent: (payload: {
    documentId: string;
    fullName: string;
    phone: string;
    email?: string;
    programName: string;
    pendingBalanceCop: number;
    pendingBalanceReason?: string;
    operatorUserId: string;
  }) => Promise<void>;
  onUpdateStudent: (payload: {
    studentId: string;
    documentId: string;
    fullName: string;
    phone: string;
    email?: string;
    programName: string;
    pendingBalanceCop: number;
    pendingBalanceReason?: string;
    operatorUserId: string;
  }) => Promise<void>;
  onMarkAbsence: (payload: RegisterAttendancePayload) => Promise<void>;
  onPayAndRescheduleFine: (payload: PayAndRescheduleFinePayload) => Promise<void>;
  onCancelFine?: (payload: CancelFinePayload) => Promise<void>;
  onRegisterPayment?: (payload: RegisterStudentPaymentPayload) => Promise<{
    receiptNumber: string;
    newPendingBalanceCop: number;
    unblocked: boolean;
  }>;
  onEnrollFingerprint?: (payload: {
    studentId: string;
    fingerprintTemplate: string;
    operatorUserId: string;
  }) => Promise<void>;
  onValidateCertificate: (studentId: string) => Promise<void>;
}

type SortOption = 'DEBT_DESC' | 'NAME_ASC' | 'HOURS_ASC' | 'NO_FINGERPRINT';

export function StudentsFinesPanel({
  students,
  schedules,
  operatorUserId,
  operatorName,
  isAdmin = false,
  certificateAlert,
  onClearCertificateAlert,
  onCreateStudent,
  onUpdateStudent,
  onMarkAbsence,
  onPayAndRescheduleFine,
  onCancelFine,
  onRegisterPayment,
  onEnrollFingerprint,
  onValidateCertificate,
}: StudentsFinesPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'BLOCKED' | 'ACTIVE'>('ALL');
  const [programFilter, setProgramFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<SortOption>('DEBT_DESC');

  // Modales
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [studentToEdit, setStudentToEdit] = useState<StudentItem | null>(null);
  const [fineToPay, setFineToPay] = useState<{ fine: FineItem; student: StudentItem } | null>(null);
  const [studentToFine, setStudentToFine] = useState<StudentItem | null>(null);
  const [historyStudent, setHistoryStudent] = useState<StudentItem | null>(null);
  const [certificateStudent, setCertificateStudent] = useState<StudentItem | null>(null);
  const [paymentStudent, setPaymentStudent] = useState<StudentItem | null>(null);
  const [enrollStudent, setEnrollStudent] = useState<StudentItem | null>(null);

  // Programas únicos para el filtro
  const uniquePrograms = useMemo(() => {
    const set = new Set<string>();
    students.forEach((s) => {
      if (s.programName) set.add(s.programName.trim());
    });
    return Array.from(set).sort();
  }, [students]);

  const blockedCount = useMemo(
    () => students.filter((s) => s.isBlocked).length,
    [students]
  );
  const activeCount = useMemo(
    () => students.filter((s) => !s.isBlocked).length,
    [students]
  );
  const withDebtCount = useMemo(
    () =>
      students.filter(
        (s) => s.pendingBalanceCop > 0 || s.pendingFinesTotalCop > 0
      ).length,
    [students]
  );

  const filteredAndSortedStudents = useMemo(() => {
    const list = students.filter((st) => {
      if (statusFilter === 'BLOCKED' && !st.isBlocked) return false;
      if (statusFilter === 'ACTIVE' && st.isBlocked) return false;

      if (programFilter !== 'ALL' && st.programName.trim() !== programFilter) {
        return false;
      }

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        st.fullName.toLowerCase().includes(q) ||
        st.documentId.toLowerCase().includes(q) ||
        st.programName.toLowerCase().includes(q) ||
        st.phone.includes(q)
      );
    });

    return list.sort((a, b) => {
      if (sortBy === 'DEBT_DESC') {
        const debtA = a.pendingBalanceCop + a.pendingFinesTotalCop;
        const debtB = b.pendingBalanceCop + b.pendingFinesTotalCop;
        if (debtB !== debtA) return debtB - debtA;
        return a.fullName.localeCompare(b.fullName);
      }
      if (sortBy === 'NAME_ASC') {
        return a.fullName.localeCompare(b.fullName);
      }
      if (sortBy === 'HOURS_ASC') {
        const hA = a.attendedHours ?? 0;
        const hB = b.attendedHours ?? 0;
        return hA - hB;
      }
      if (sortBy === 'NO_FINGERPRINT') {
        if (!a.hasFingerprint && b.hasFingerprint) return -1;
        if (a.hasFingerprint && !b.hasFingerprint) return 1;
        return a.fullName.localeCompare(b.fullName);
      }
      return 0;
    });
  }, [students, statusFilter, programFilter, sortBy, searchQuery]);

  // Generador de mensaje cortés de WhatsApp
  const generateWhatsAppUrl = (student: StudentItem) => {
    const cleanPhone = student.phone.replace(/\D/g, '');
    const phoneToUse = cleanPhone.length === 10 ? `57${cleanPhone}` : cleanPhone;
    const totalDebt = student.pendingBalanceCop + student.pendingFinesTotalCop;

    const debtParts: string[] = [];
    if (student.pendingBalanceCop > 0) {
      debtParts.push(
        `saldo académico de ${formatCop(student.pendingBalanceCop)}${
          student.pendingBalanceReason ? ` (${student.pendingBalanceReason})` : ''
        }`
      );
    }
    if (student.pendingFinesTotalCop > 0) {
      debtParts.push(
        `multas por inasistencia de ${formatCop(student.pendingFinesTotalCop)}`
      );
    }

    const debtText = debtParts.join(' y ');

    const msg =
      `Hola ${student.fullName}, te saludamos de la Escuela Profesional D' Belleza (EPB). ` +
      `Te informamos que actualmente registras un ${debtText}. ` +
      `Para habilitar tu acceso dactilar a clases o expedir tu certificado, puedes transferir a Nequi / Bancolombia EPB o acercarte a Caja. ` +
      `¡Quedamos muy atentos para apoyarte!`;

    return `https://wa.me/${phoneToUse}?text=${encodeURIComponent(msg)}`;
  };

  return (
    <div className="space-y-6">
      {/* Alerta de Certificado */}
      {certificateAlert && (
        <Card
          className={`overflow-hidden border-2 shadow-md ${
            certificateAlert.canPrint
              ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50/90 dark:bg-emerald-950/40'
              : 'border-red-300 dark:border-red-800 bg-red-50/95 dark:bg-red-950/40'
          }`}
        >
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base font-serif font-bold">
                {certificateAlert.canPrint ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-emerald-700 dark:text-emerald-400" />
                    <span className="text-emerald-950 dark:text-emerald-100">
                      Certificado Validado y Emitido con Éxito ({certificateAlert.studentName})
                    </span>
                  </>
                ) : (
                  <>
                    <AlertOctagon className="h-5 w-5 text-red-700 dark:text-red-400" />
                    <span className="text-red-950 dark:text-red-100">
                      Restricción para Emisión de Certificado ({certificateAlert.studentName})
                    </span>
                  </>
                )}
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={onClearCertificateAlert}
                className="text-xs dark:border-white/10 dark:bg-[#1E1D1D] dark:text-neutral-200"
              >
                Cerrar Alerta
              </Button>
            </div>
          </CardHeader>
          <CardContent className="text-xs sm:text-sm">
            {certificateAlert.canPrint ? (
              <p className="text-emerald-900 dark:text-emerald-200">
                La estudiante se encuentra a paz y salvo de multas, saldo académico y
                cuenta con las horas mínimas completadas ({certificateAlert.attendedHours}h).
                El certificado de graduación de <strong>{certificateAlert.programName}</strong> fue
                aprobado y registrado en la Auditoría Forense.
              </p>
            ) : (
              <p className="font-semibold text-red-900 dark:text-red-200">
                {certificateAlert.alertMessage}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Controles y Filtros Superiores */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className={`rounded-xl border px-3.5 py-2 text-xs font-bold transition ${
              statusFilter === 'ALL'
                ? 'border-[#141213] dark:border-[#ECCCD9] bg-[#141213] text-[#ECCCD9] dark:bg-[#ECCCD9] dark:text-[#141213]'
                : 'border-neutral-200 dark:border-white/10 bg-white dark:bg-[#1E1D1D] text-neutral-700 dark:text-neutral-300 hover:bg-[#F9EFF3]'
            }`}
          >
            Todas ({students.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('BLOCKED')}
            className={`rounded-xl border px-3.5 py-2 text-xs font-bold transition flex items-center gap-1.5 ${
              statusFilter === 'BLOCKED'
                ? 'border-red-600 bg-red-600 text-white'
                : 'border-red-200 dark:border-red-900/30 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300 hover:bg-red-100'
            }`}
          >
            <Lock className="h-3.5 w-3.5" />
            <span>Bloqueadas ({blockedCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('ACTIVE')}
            className={`rounded-xl border px-3.5 py-2 text-xs font-bold transition flex items-center gap-1.5 ${
              statusFilter === 'ACTIVE'
                ? 'border-emerald-600 bg-emerald-600 text-white'
                : 'border-emerald-200 dark:border-emerald-900/30 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100'
            }`}
          >
            <Unlock className="h-3.5 w-3.5" />
            <span>Habilitadas ({activeCount})</span>
          </button>

          <span className="hidden sm:inline-block rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-black text-amber-900 dark:bg-amber-950/80 dark:text-amber-300">
            Con Saldo/Multa: {withDebtCount}
          </span>
        </div>

        <Button
          onClick={() => setIsCreateOpen(true)}
          className="gap-2 self-start sm:self-auto text-xs font-black bg-[#ECCCD9] text-[#141213] hover:bg-[#E4BDD0]"
          variant="pink"
        >
          <Plus className="h-4 w-4" />
          <span>Matricular Nueva Alumna</span>
        </Button>
      </div>

      {/* Barra de Filtros, Programas y Ordenamiento */}
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-12">
        {/* Barra de búsqueda */}
        <div className="relative sm:col-span-6">
          <Search className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-neutral-400" />
          <Input
            placeholder="Buscar por nombre, cédula, teléfono o carrera..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 text-xs sm:text-sm bg-white border-neutral-300 text-[#141213] dark:bg-[#181517] dark:border-[#3A3035] dark:text-white"
          />
        </div>

        {/* Filtro por Programa */}
        <div className="sm:col-span-3">
          <div className="relative">
            <Filter className="pointer-events-none absolute left-3 top-3 h-3.5 w-3.5 text-neutral-400" />
            <select
              value={programFilter}
              onChange={(e) => setProgramFilter(e.target.value)}
              className="h-10 w-full rounded-xl border border-neutral-300 bg-white pl-8 pr-3 text-xs font-semibold text-[#141213] dark:border-[#3A3035] dark:bg-[#181517] dark:text-white"
            >
              <option value="ALL">Todos los Programas ({students.length})</option>
              {uniquePrograms.map((prog) => (
                <option key={prog} value={prog}>
                  {prog}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Ordenamiento Rápido */}
        <div className="sm:col-span-3">
          <div className="relative">
            <ArrowUpDown className="pointer-events-none absolute left-3 top-3 h-3.5 w-3.5 text-neutral-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="h-10 w-full rounded-xl border border-neutral-300 bg-white pl-8 pr-3 text-xs font-semibold text-[#141213] dark:border-[#3A3035] dark:bg-[#181517] dark:text-white"
            >
              <option value="DEBT_DESC">Mayor Deuda Primero</option>
              <option value="NAME_ASC">Nombre (A - Z)</option>
              <option value="HOURS_ASC">Menor Avance de Horas</option>
              <option value="NO_FINGERPRINT">Sin Huella Primero</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tarjetas de Estudiantes */}
      {filteredAndSortedStudents.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#E4BDD0] dark:border-white/10 bg-white dark:bg-[#181517] p-12 text-center">
          <UserX className="mb-3 h-10 w-10 text-neutral-400" />
          <h3 className="font-serif text-lg font-bold text-[#141213] dark:text-neutral-100">
            No se encontraron estudiantes con este criterio
          </h3>
          <p className="mt-1 max-w-sm text-xs text-neutral-500">
            Intente con otro término de búsqueda o restablezca los filtros.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredAndSortedStudents.map((st) => {
            const openFines =
              st.fines?.filter(
                (f) => f.status === 'PENDIENTE' || !f.isClassRescheduled
              ) ?? [];
            const totalDebt = st.pendingBalanceCop + st.pendingFinesTotalCop;
            const requiredHours = st.totalProgramHours ?? 120;
            const attendedHours = st.attendedHours ?? 0;
            const pctHours = st.attendancePercentage ?? 0;

            return (
              <div
                key={st.id}
                className={`flex min-w-0 flex-col justify-between overflow-hidden rounded-2xl border p-4 sm:p-5 shadow-sm transition-all ${
                  st.isBlocked
                    ? 'border-red-300 dark:border-red-900/50 bg-red-50/20 dark:bg-red-950/15'
                    : 'border-[#E4BDD0]/80 dark:border-[#3A3035] bg-white dark:bg-[#181517]'
                }`}
              >
                <div className="space-y-3.5 min-w-0">
                  {/* Encabezado: Estado y Programa */}
                  <div className="flex items-center justify-between gap-2 border-b border-neutral-100 dark:border-[#332B2F] pb-3 min-w-0">
                    <span className="min-w-0 flex-1 text-[11px] font-extrabold uppercase tracking-wider text-neutral-600 dark:text-[#C4B5BC] truncate">
                      {st.programName}
                    </span>
                    {st.isBlocked ? (
                      <Badge
                        variant="destructive"
                        className="gap-1 text-[10px] sm:text-[11px] font-black shrink-0"
                      >
                        <Lock className="h-3 w-3" />
                        <span>BLOQUEADA</span>
                      </Badge>
                    ) : (
                      <Badge
                        variant="success"
                        className="gap-1 text-[10px] sm:text-[11px] font-black shrink-0"
                      >
                        <Unlock className="h-3 w-3" />
                        <span>HABILITADA</span>
                      </Badge>
                    )}
                  </div>

                  {/* Nombre y Documento */}
                  <div>
                    <h4 className="font-serif text-lg font-bold text-[#141213] dark:text-[#F5EEF1] leading-snug">
                      {st.fullName}
                    </h4>
                    <div className="mt-1 flex flex-wrap items-center gap-2.5 text-xs text-neutral-500 dark:text-[#C4B5BC]">
                      <span>
                        C.C. <strong>{st.documentId}</strong>
                      </span>
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {st.phone}
                      </span>

                      {/* Botón rápido WhatsApp si tiene deuda o saldo */}
                      {totalDebt > 0 && (
                        <a
                          href={generateWhatsAppUrl(st)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-black text-emerald-900 transition hover:bg-emerald-200 dark:bg-emerald-950 dark:text-emerald-300"
                          title="Enviar cobro cortés por WhatsApp con canales de pago"
                        >
                          <MessageCircle className="h-3 w-3 text-emerald-700 dark:text-emerald-400" />
                          <span>Cobro WhatsApp</span>
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Estado Biométrico de Huella */}
                  <div className="flex items-center justify-between rounded-xl border border-neutral-200/80 bg-[#FAF8F9] px-3 py-2 text-xs dark:border-[#332B2F] dark:bg-[#201B1E]">
                    <div className="flex items-center gap-1.5">
                      <Fingerprint
                        className={`h-4 w-4 ${
                          st.hasFingerprint
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-amber-500'
                        }`}
                      />
                      <span className="font-bold text-neutral-700 dark:text-[#C4B5BC]">
                        {st.hasFingerprint
                          ? 'Huella Enrolada (USB OK)'
                          : 'Sin Huella Enrolada'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEnrollStudent(st)}
                      className="rounded-lg border border-neutral-300 bg-white px-2 py-1 text-[11px] font-black text-[#141213] transition hover:bg-[#ECCCD9] dark:border-[#3A3035] dark:bg-[#161315] dark:text-[#ECCCD9]"
                    >
                      {st.hasFingerprint ? 'Actualizar' : 'Enrolar'}
                    </button>
                  </div>

                  {/* Barra de Horas Asistidas y Progreso hacia Grado */}
                  <div className="rounded-xl border border-neutral-200/80 bg-[#FAF8F9] p-2.5 text-xs space-y-1.5 dark:border-[#332B2F] dark:bg-[#201B1E]">
                    <div className="flex items-center justify-between font-bold text-neutral-700 dark:text-[#C4B5BC]">
                      <span className="flex items-center gap-1 text-[11px]">
                        <Clock className="h-3.5 w-3.5 text-neutral-500" />
                        <span>Horas Asistidas:</span>
                      </span>
                      <span className="text-[11px] font-black text-[#141213] dark:text-[#ECCCD9]">
                        {attendedHours} / {requiredHours} hrs ({pctHours}%)
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          pctHours >= 100
                            ? 'bg-emerald-600'
                            : pctHours >= 50
                              ? 'bg-amber-500'
                              : 'bg-[#ECCCD9]'
                        }`}
                        style={{ width: `${Math.min(100, Math.max(5, pctHours))}%` }}
                      />
                    </div>
                  </div>

                  {/* Motivo de Bloqueo */}
                  {st.isBlocked && st.blockReason && (
                    <div className="rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-950/30 p-2.5 text-xs text-red-800 dark:text-red-300 space-y-1">
                      <div className="flex items-center gap-1.5 font-bold">
                        <AlertOctagon className="h-3.5 w-3.5 text-red-600" />
                        <span>Motivo del Bloqueo:</span>
                      </div>
                      <p className="text-[11px] leading-relaxed">
                        {st.blockReason}
                      </p>
                    </div>
                  )}

                  {/* Saldo académico y botón de Abono */}
                  {st.pendingBalanceCop > 0 && (
                    <div className="rounded-xl border border-amber-200 dark:border-amber-900/30 bg-amber-50/70 dark:bg-amber-950/20 p-2.5 text-xs space-y-1.5">
                      <div className="flex items-center justify-between font-bold text-amber-950 dark:text-amber-200">
                        <span className="flex items-center gap-1.5">
                          <DollarSign className="h-3.5 w-3.5 text-amber-600" />
                          <span>Saldo Académico:</span>
                        </span>
                        <span className="text-sm font-black text-amber-700 dark:text-amber-400">
                          {formatCop(st.pendingBalanceCop)}
                        </span>
                      </div>
                      {st.pendingBalanceReason && (
                        <p className="text-[11px] text-amber-900/80 dark:text-amber-300">
                          Concepto: <strong>{st.pendingBalanceReason}</strong>
                        </p>
                      )}
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => setPaymentStudent(st)}
                        className="w-full gap-1.5 h-8 bg-amber-500 font-black text-[#141213] hover:bg-amber-600 text-xs"
                      >
                        <Receipt className="h-3.5 w-3.5" />
                        <span>Registrar Abono a Saldo</span>
                      </Button>
                    </div>
                  )}

                  {/* Multas por inasistencia */}
                  {openFines.length > 0 && (
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center justify-between text-xs font-bold text-neutral-700 dark:text-neutral-300">
                        <span>Multas por inasistencia:</span>
                        <span className="text-red-600 dark:text-red-400 font-black">
                          {formatCop(st.pendingFinesTotalCop)}
                        </span>
                      </div>

                      {openFines.map((fine) => (
                        <div
                          key={fine.id}
                          className="flex items-center justify-between rounded-xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-[#141213] p-2.5 text-xs shadow-2xs"
                        >
                          <div className="min-w-0 pr-2">
                            <p className="font-semibold text-neutral-800 dark:text-neutral-200 truncate">
                              {fine.missedScheduleTitle || 'Clase'}
                            </p>
                            <p className="text-[11px] font-black text-red-600 dark:text-red-400">
                              {formatCop(fine.amountCop)}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="pink"
                            className="h-8 text-[11px] font-black shrink-0 bg-emerald-600 text-white hover:bg-emerald-700 gap-1"
                            onClick={() => setFineToPay({ fine, student: st })}
                          >
                            <DollarSign className="h-3.5 w-3.5" />
                            <span>Cobrar / Condonar</span>
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Acciones Inferiores */}
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-neutral-100 dark:border-[#332B2F] pt-3.5">
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs gap-1 px-2.5 font-bold text-neutral-700 dark:text-neutral-300 hover:text-black dark:border-[#3A3035] dark:bg-[#201B1E]"
                      onClick={() => setStudentToEdit(st)}
                      title="Editar información de la alumna"
                    >
                      <Edit2 className="h-3.5 w-3.5 shrink-0" />
                      <span>Editar</span>
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs gap-1 px-2.5 font-bold text-neutral-700 dark:text-neutral-300 hover:text-black dark:border-[#3A3035] dark:bg-[#201B1E]"
                      onClick={() => setHistoryStudent(st)}
                      title="Ver historial de inasistencias y constancias de pago"
                    >
                      <History className="h-3.5 w-3.5 shrink-0" />
                      <span>Historial</span>
                    </Button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Botón de abono si no tiene saldo visible arriba */}
                    {st.pendingBalanceCop === 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs gap-1 px-2 font-bold dark:border-[#3A3035] dark:bg-[#201B1E]"
                        onClick={() => setPaymentStudent(st)}
                        title="Registrar abono o pago a cuenta"
                      >
                        <Receipt className="h-3.5 w-3.5" />
                        <span>Abonar</span>
                      </Button>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs gap-1 px-2 font-bold text-red-600 hover:text-red-700 border-red-200 hover:bg-red-50 dark:border-red-900/40 dark:bg-red-950/20"
                      onClick={() => setStudentToFine(st)}
                    >
                      <UserX className="h-3.5 w-3.5 shrink-0" />
                      <span>Multar</span>
                    </Button>

                    <Button
                      variant="pink"
                      size="sm"
                      className="h-8 text-xs font-black gap-1 px-2.5 bg-[#ECCCD9] text-[#141213] hover:bg-[#E4BDD0]"
                      onClick={async () => {
                        setCertificateStudent(st);
                        await onValidateCertificate(st.id);
                      }}
                    >
                      <Award className="h-3.5 w-3.5 shrink-0" />
                      <span>Certificado</span>
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Matricular Alumna */}
      <CreateStudentModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={async (payload) => {
          await onCreateStudent({
            ...payload,
            operatorUserId,
          });
        }}
      />

      {/* Modal: Editar Alumna */}
      <EditStudentModal
        isOpen={Boolean(studentToEdit)}
        student={studentToEdit}
        onClose={() => setStudentToEdit(null)}
        onSubmit={async (payload) => {
          await onUpdateStudent({
            ...payload,
            operatorUserId,
          });
        }}
      />

      {/* Modal: Cobrar Multa y Reprogramar Clase (o Condonar como Admin) */}
      <PayFineModal
        isOpen={Boolean(fineToPay)}
        fine={fineToPay?.fine ?? null}
        student={fineToPay?.student ?? null}
        schedules={schedules}
        operatorName={operatorName}
        isAdmin={isAdmin}
        onClose={() => setFineToPay(null)}
        onSubmit={async (payload) => {
          await onPayAndRescheduleFine({
            ...payload,
            operatorUserId,
          });
        }}
        onCancelFine={
          onCancelFine
            ? async (payload) => {
                await onCancelFine({
                  action: 'CANCEL_FINE',
                  ...payload,
                  operatorUserId,
                });
              }
            : undefined
        }
      />

      {/* Modal: Registrar Inasistencia / Multar Alumna */}
      <ApplyFineModal
        isOpen={Boolean(studentToFine)}
        student={studentToFine}
        schedules={schedules}
        onClose={() => setStudentToFine(null)}
        onSubmit={async (payload) => {
          await onMarkAbsence({
            studentId: payload.studentId,
            scheduleId: payload.scheduleId,
            status: 'AUSENTE',
            verifiedByBiometry: true,
            operatorUserId,
            customFineAmountCop: payload.customFineAmountCop,
            notes: payload.notes,
          });
        }}
      />

      {/* Modal: Registrar Abono a Saldo Académico */}
      <RegisterStudentPaymentModal
        isOpen={Boolean(paymentStudent)}
        student={paymentStudent}
        operatorName={operatorName}
        onClose={() => setPaymentStudent(null)}
        onSubmit={async (payload) => {
          if (!onRegisterPayment) {
            throw new Error('Servicio de abonos no configurado');
          }
          return await onRegisterPayment({
            action: 'REGISTER_PAYMENT',
            ...payload,
            operatorUserId,
          });
        }}
      />

      {/* Modal: Enrolar Huella Dactilar USB */}
      <EnrollFingerprintModal
        isOpen={Boolean(enrollStudent)}
        student={enrollStudent}
        onClose={() => setEnrollStudent(null)}
        onSubmit={async (payload) => {
          if (!onEnrollFingerprint) {
            throw new Error('Servicio biométrico no configurado');
          }
          await onEnrollFingerprint({
            ...payload,
            operatorUserId,
          });
        }}
      />

      {/* Modal: Historial de Inasistencias y Multas */}
      <StudentFinesHistoryModal
        isOpen={Boolean(historyStudent)}
        student={historyStudent}
        onClose={() => setHistoryStudent(null)}
      />

      {/* Modal: Expedición de Certificados de Estudio / Grado */}
      <StudyCertificateModal
        isOpen={Boolean(certificateStudent)}
        student={certificateStudent}
        certificateAlert={certificateAlert}
        isAdmin={isAdmin}
        onClose={() => setCertificateStudent(null)}
        onIssueCertificate={async (force) => {
          if (certificateStudent) {
            await onValidateCertificate(certificateStudent.id);
          }
        }}
        onQueueCertificate={async () => {
          onClearCertificateAlert();
        }}
      />
    </div>
  );
}
