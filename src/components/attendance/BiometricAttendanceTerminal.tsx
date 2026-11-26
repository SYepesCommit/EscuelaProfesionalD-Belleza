'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  Fingerprint,
  ShieldAlert,
  Search,
  Clock,
  AlertTriangle,
  ScanBarcode,
  DoorOpen,
  UserCheck,
  UserX,
  ArrowRight,
  RefreshCw,
  CreditCard,
  Users,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  DollarSign,
  Receipt,
  UserMinus,
  Sparkles,
} from 'lucide-react';
import {
  FineItem,
  StudentItem,
  PayAndRescheduleFinePayload,
  CancelFinePayload,
  RegisterStudentPaymentPayload,
} from '@/interfaces/student.interface';
import { ClassScheduleItem } from '@/interfaces/schedule.interface';
import { useBarcodeScanner } from '@/hooks/useBarcodeScanner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCop } from '@/lib/utils';
import { playTerminalSound } from '@/lib/sound';
import { PayFineModal } from '@/components/students/PayFineModal';
import { RegisterStudentPaymentModal } from '@/components/students/RegisterStudentPaymentModal';

interface AttendanceRecordApi {
  id: string;
  studentId: string;
  scheduleId: string;
  status: 'PRESENTE' | 'AUSENTE' | 'REPROGRAMADO';
  verifiedByBiometry: boolean;
  checkInTime: string;
  notes: string | null;
  student: {
    id: string;
    fullName: string;
    documentId: string;
    programName: string;
  };
  schedule: {
    id: string;
    title: string;
    courseName: string;
    startTime: string;
    endTime: string;
    room: {
      name: string;
      code: string;
    };
  };
}

interface BiometricAttendanceTerminalProps {
  students: StudentItem[];
  schedules: ClassScheduleItem[];
  operatorUserId: string;
  operatorName?: string;
  isAdmin?: boolean;
  fingerprintConnected: boolean;
  onCheckInByBiometry: (params: {
    studentId: string;
    scheduleId: string;
    verifiedByBiometry?: boolean;
  }) => Promise<void>;
  onPayAndRescheduleFine?: (payload: PayAndRescheduleFinePayload) => Promise<void>;
  onCancelFine?: (payload: CancelFinePayload) => Promise<void>;
  onRegisterStudentPayment?: (payload: RegisterStudentPaymentPayload) => Promise<{
    receiptNumber: string;
    newPendingBalanceCop: number;
    unblocked: boolean;
  }>;
}

type SemaphoreState = {
  status: 'IDLE' | 'ALLOWED' | 'DENIED' | 'UNSCHEDULED';
  student: StudentItem | null;
  scheduleTitle?: string;
  roomName?: string;
  timestamp?: string;
  message: string;
  subMessage?: string;
  method?: 'BIOMETRIA_USB' | 'DOCUMENTO_CARNET';
};

export function BiometricAttendanceTerminal({
  students,
  schedules,
  operatorUserId,
  operatorName = 'Recepción EPB',
  isAdmin = true,
  fingerprintConnected,
  onCheckInByBiometry,
  onPayAndRescheduleFine,
  onCancelFine,
  onRegisterStudentPayment,
}: BiometricAttendanceTerminalProps) {
  // 'ALL' muestra todas las alumnas de la academia; un ID específico filtra por ese salón/clase
  const [selectedScheduleId, setSelectedScheduleId] = useState<string>('ALL');
  const [showFinishedClasses, setShowFinishedClasses] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [documentInput, setDocumentInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [recentAttendances, setRecentAttendances] = useState<AttendanceRecordApi[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(true);

  // Estados de Kiosco, Sonido y Modales Rápidos de Cobro
  const [isKioskMode, setIsKioskMode] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [activePaymentStudent, setActivePaymentStudent] = useState<StudentItem | null>(null);
  const [activeFineStudent, setActiveFineStudent] = useState<StudentItem | null>(null);
  const [activeFineToPay, setActiveFineToPay] = useState<FineItem | null>(null);

  const [semaphore, setSemaphore] = useState<SemaphoreState>({
    status: 'IDLE',
    student: null,
    message: 'Esperando entrada de alumna...',
    subMessage:
      'Escriba la cédula o nombre en el campo superior, o haga clic en "Marcar Llegada" en la lista de abajo.',
  });

  // Filtrar las clases según su vigencia temporal o si fueron desactivadas manualmente
  const visibleSchedules = useMemo(() => {
    const now = Date.now();
    const todayStr = new Date().toLocaleDateString('es-CO');

    return schedules.filter((sch) => {
      const endMs = new Date(sch.endTime).getTime();
      const schDateStr = new Date(sch.startTime).toLocaleDateString('es-CO');
      const isTodayOrFuture = schDateStr === todayStr || endMs >= now;
      const isFinishedOrDisabled = sch.isActive === false || endMs < now;

      if (!showFinishedClasses) {
        return !isFinishedOrDisabled;
      }
      return isTodayOrFuture || schedules.length <= 5;
    });
  }, [schedules, showFinishedClasses]);

  const activeSchedule = useMemo(
    () =>
      selectedScheduleId === 'ALL'
        ? null
        : schedules.find((s) => s.id === selectedScheduleId) ?? null,
    [schedules, selectedScheduleId]
  );

  const loadAttendanceLogs = useCallback(async () => {
    setIsLoadingLogs(true);
    try {
      const res = await fetch('/api/attendance', { cache: 'no-store' });
      if (res.ok) {
        const data = (await res.json()) as AttendanceRecordApi[];
        setRecentAttendances(data);
      }
    } catch {
      // Silencioso en caso de red
    } finally {
      setIsLoadingLogs(false);
    }
  }, []);

  useEffect(() => {
    void loadAttendanceLogs();
  }, [loadAttendanceLogs]);

  // Procesar intento de ingreso de alumna con detección automática de su salón
  const processStudentCheckIn = useCallback(
    async (
      student: StudentItem,
      method: 'BIOMETRIA_USB' | 'DOCUMENTO_CARNET' = 'BIOMETRIA_USB',
      forcedScheduleId?: string
    ) => {
      const timeStr = new Date().toLocaleTimeString('es-CO', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });

      // 1. Doble Verificación: Multas Activas o Deuda Académica Pendiente
      const hasPendingFines = student.isBlocked || student.pendingFinesCount > 0;
      const hasPendingBalance = (student.pendingBalanceCop ?? 0) > 0;

      if (hasPendingFines || hasPendingBalance) {
        if (isAudioEnabled) playTerminalSound('DENIED');

        let msgTitle = 'ACCESO DENEGADO — BLOQUEO POR MULTA ACTIVA';
        let subMsg = student.blockReason || '';

        if (hasPendingFines && hasPendingBalance) {
          msgTitle = 'ACCESO DENEGADO — MULTA Y DEUDA ACADÉMICA PENDIENTE';
          subMsg = `Presenta ${student.pendingFinesCount} multa(s) (${formatCop(
            student.pendingFinesTotalCop
          )}) y saldo de matrícula/kit de ${formatCop(student.pendingBalanceCop)} (${
            student.pendingBalanceReason || 'Cuota pendiente'
          }). Debe cancelar en Caja antes de ingresar.`;
        } else if (hasPendingFines) {
          msgTitle = 'ACCESO DENEGADO — MULTA POR INASISTENCIA ACTIVA';
          subMsg =
            student.blockReason ||
            `Presenta ${student.pendingFinesCount} multa(s) por valor de ${formatCop(
              student.pendingFinesTotalCop
            )}. Debe liquidar y reprogramar clase en Caja.`;
        } else {
          msgTitle = 'ACCESO EN OBSERVACIÓN — SALDO ACADÉMICO PENDIENTE';
          subMsg = `Presenta un saldo pendiente de ${formatCop(
            student.pendingBalanceCop
          )} por concepto de "${student.pendingBalanceReason || 'Cuota'}"`;
        }

        setSemaphore({
          status: 'DENIED',
          student,
          timestamp: timeStr,
          method,
          message: msgTitle,
          subMessage: subMsg,
        });
        return;
      }

      // 2. Determinar a qué salón/clase entra la alumna
      let targetSchedule: ClassScheduleItem | null = null;

      if (forcedScheduleId) {
        targetSchedule = schedules.find((s) => s.id === forcedScheduleId) ?? null;
      } else if (
        activeSchedule &&
        activeSchedule.enrolledStudents.some((e) => e.id === student.id)
      ) {
        // Está inscrita en el salón que tenemos filtrado actualmente
        targetSchedule = activeSchedule;
      } else {
        // Buscar automáticamente en todos los salones en cuál está inscrita
        targetSchedule =
          schedules.find((sch) =>
            sch.enrolledStudents.some((enr) => enr.id === student.id)
          ) ?? null;
      }

      // Si no está inscrita en ningún salón hoy
      if (!targetSchedule) {
        if (isAudioEnabled) playTerminalSound('UNSCHEDULED');
        const fallbackSchedule = activeSchedule ?? schedules[0] ?? null;
        setSemaphore({
          status: 'UNSCHEDULED',
          student,
          scheduleTitle: fallbackSchedule?.title,
          roomName: fallbackSchedule?.roomName,
          timestamp: timeStr,
          method,
          message: 'NO TIENE CLASE PROGRAMADA HOY EN LISTA',
          subMessage: fallbackSchedule
            ? `La estudiante ${student.fullName} está a paz y salvo, pero no figura inscrita en ninguna clase hoy. ¿Desea autorizar su ingreso excepcional a "${fallbackSchedule.roomName} — ${fallbackSchedule.title}"?`
            : `La estudiante ${student.fullName} no figura inscrita en ninguna clase programada.`,
        });
        return;
      }

      // 3. Registrar asistencia oficial
      setIsProcessing(true);
      try {
        await onCheckInByBiometry({
          studentId: student.id,
          scheduleId: targetSchedule.id,
          verifiedByBiometry: method === 'BIOMETRIA_USB',
        });

        if (isAudioEnabled) playTerminalSound('ALLOWED');

        setSemaphore({
          status: 'ALLOWED',
          student,
          scheduleTitle: targetSchedule.title,
          roomName: targetSchedule.roomName,
          timestamp: timeStr,
          method,
          message: `INGRESO APROBADO — ${targetSchedule.roomName.toUpperCase()}`,
          subMessage: `Clase: "${targetSchedule.title}" con ${targetSchedule.teacherName}. Asistencia registrada correctamente.`,
        });

        await loadAttendanceLogs();
      } catch (err) {
        if (isAudioEnabled) playTerminalSound('DENIED');
        setSemaphore({
          status: 'DENIED',
          student,
          scheduleTitle: targetSchedule.title,
          roomName: targetSchedule.roomName,
          timestamp: timeStr,
          method,
          message: 'ACCESO RECHAZADO POR EL SISTEMA',
          subMessage:
            err instanceof Error
              ? err.message
              : 'No se pudo autorizar el ingreso por restricción académica.',
        });
      } finally {
        setIsProcessing(false);
      }
    },
    [activeSchedule, schedules, onCheckInByBiometry, loadAttendanceLogs]
  );

  // Lector físico de código de barras (Carnet estudiantil)
  useBarcodeScanner({
    onScan: ({ barcode }) => {
      const cleanCode = barcode.trim();
      const matched = students.find(
        (s) => s.documentId.toLowerCase() === cleanCode.toLowerCase()
      );
      if (matched) {
        void processStudentCheckIn(matched, 'DOCUMENTO_CARNET');
      } else {
        setSemaphore({
          status: 'DENIED',
          student: null,
          timestamp: new Date().toLocaleTimeString('es-CO', {
            hour: '2-digit',
            minute: '2-digit',
          }),
          message: `CARNET NO RECONOCIDO (${cleanCode})`,
          subMessage:
            'El código escaneado no corresponde a ninguna alumna matriculada en el sistema.',
        });
      }
    },
  });

  // Búsqueda y marcación rápida por Cédula o Nombre arriba
  const handleManualDocumentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = documentInput.trim();
    if (!code) return;

    const matched = students.find(
      (s) =>
        s.documentId.toLowerCase() === code.toLowerCase() ||
        s.fullName.toLowerCase().includes(code.toLowerCase())
    );

    if (matched) {
      void processStudentCheckIn(matched, 'DOCUMENTO_CARNET');
      setDocumentInput('');
    } else {
      setSemaphore({
        status: 'DENIED',
        student: null,
        timestamp: new Date().toLocaleTimeString('es-CO', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        message: `ESTUDIANTE NO ENCONTRADA (${code})`,
        subMessage:
          'No se encontró ninguna alumna con ese número de cédula o nombre.',
      });
    }
  };

  // Mapa de asistencias presentes hoy por estudiante
  const presentRecordByStudentId = useMemo(() => {
    const map = new Map<string, AttendanceRecordApi>();
    for (const rec of recentAttendances) {
      if (rec.status === 'PRESENTE' && !map.has(rec.studentId)) {
        map.set(rec.studentId, rec);
      }
    }
    return map;
  }, [recentAttendances]);

  // UNA SOLA LISTA UNIFICADA DE ALUMNAS (según el filtro de salón + búsqueda)
  const displayedStudents = useMemo(() => {
    let list = students;

    // Si hay un salón específico seleccionado, mostrar solo las inscritas en ese salón
    if (activeSchedule) {
      const enrolledIds = new Set(
        activeSchedule.enrolledStudents.map((e) => e.id)
      );
      list = list.filter((s) => enrolledIds.has(s.id));
    }

    // Filtro por texto (nombre o cédula)
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (s) =>
          s.fullName.toLowerCase().includes(q) ||
          s.documentId.toLowerCase().includes(q) ||
          s.programName.toLowerCase().includes(q)
      );
    }

    return list;
  }, [students, activeSchedule, searchQuery]);

  const presentCountInList = displayedStudents.filter((s) =>
    presentRecordByStudentId.has(s.id)
  ).length;

  const blockedCountInList = displayedStudents.filter((s) => s.isBlocked).length;

  const formatTimeHour = (iso: string) => {
    try {
      return new Date(iso).toLocaleTimeString('es-CO', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '--:--';
    }
  };

  return (
    <div
      className={
        isKioskMode
          ? 'fixed inset-0 z-50 overflow-y-auto bg-neutral-100 dark:bg-[#121111] p-4 sm:p-8 animate-in fade-in duration-200'
          : 'space-y-6'
      }
    >
      {/* ===================================================================== */}
      {/* 1. BARRA SUPERIOR: ENTRADA POR CÉDULA + PANTALLA DE RESULTADO         */}
      {/* ===================================================================== */}
      <div className="rounded-3xl border border-[#ECCCD9]/80 dark:border-white/10 bg-white dark:bg-[#1E1D1D] p-5 sm:p-6 shadow-sm space-y-4">
        {/* Fila 1: Título e Input activo donde se digita la cédula */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#232222] dark:bg-[#ECCCD9] text-[#ECCCD9] dark:text-[#141213] shadow-sm shrink-0">
              <Fingerprint className="h-5 w-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-serif text-lg sm:text-xl font-bold text-[#1A1A1A] dark:text-neutral-100">
                  Control de Llegada y Asistencia
                </h2>
                <Badge
                  variant={fingerprintConnected ? 'success' : 'secondary'}
                  className="text-[10px] font-bold"
                >
                  {fingerprintConnected
                    ? '● Lector USB Activo'
                    : 'Sin sensor USB (Modo Cédula / Carnet)'}
                </Badge>

                {/* Botones de Control de Kiosco y Audio */}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAudioEnabled((prev) => !prev)}
                  className="h-6 px-2 text-[10px] font-bold gap-1"
                  title={isAudioEnabled ? 'Desactivar pitido de asistencia' : 'Activar pitido de asistencia'}
                >
                  {isAudioEnabled ? (
                    <>
                      <Volume2 className="h-3 w-3 text-emerald-600" />
                      <span>Audio ON</span>
                    </>
                  ) : (
                    <>
                      <VolumeX className="h-3 w-3 text-neutral-400" />
                      <span>Audio OFF</span>
                    </>
                  )}
                </Button>

                <Button
                  type="button"
                  variant="pink"
                  size="sm"
                  onClick={() => setIsKioskMode((prev) => !prev)}
                  className="h-6 px-2 text-[10px] font-extrabold gap-1 bg-[#ECCCD9] text-[#141213]"
                  title="Modo Kiosco / Pantalla Completa para recepción"
                >
                  {isKioskMode ? (
                    <>
                      <Minimize2 className="h-3 w-3" />
                      <span>Salir Kiosco</span>
                    </>
                  ) : (
                    <>
                      <Maximize2 className="h-3 w-3" />
                      <span>Modo Kiosco</span>
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                Escriba la cédula en el campo de la derecha o marque llegada abajo en la lista.
              </p>
            </div>
          </div>

          {/* Input donde la recepcionista digita la cédula o escanea carnet */}
          <form
            onSubmit={handleManualDocumentSubmit}
            className="flex items-center gap-2 w-full lg:w-[420px]"
          >
            <div className="relative flex-1">
              <CreditCard className="h-4 w-4 text-neutral-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={documentInput}
                onChange={(e) => setDocumentInput(e.target.value)}
                placeholder="Escriba la Cédula aquí (ej: 1098765431)..."
                className="w-full rounded-2xl border border-neutral-300 dark:border-white/15 bg-neutral-50/80 dark:bg-[#141213] pl-10 pr-3 py-2.5 text-xs font-bold text-[#1A1A1A] dark:text-neutral-100 outline-none transition focus:border-[#232222] dark:focus:border-[#ECCCD9] focus:bg-white dark:focus:bg-[#191818]"
              />
            </div>
            <Button
              type="submit"
              variant="pink"
              disabled={isProcessing || !documentInput.trim()}
              className="text-xs font-bold px-4 rounded-2xl shrink-0 h-10"
            >
              Registrar
            </Button>
          </form>
        </div>

        {/* PANTALLA VISUAL / SEMÁFORO (Muestra el resultado cuando una alumna entra) */}
        <div
          className={`rounded-2xl border-2 p-4 transition-all duration-200 ${
            semaphore.status === 'ALLOWED'
              ? 'border-emerald-400 dark:border-emerald-600 bg-emerald-50/80 dark:bg-emerald-950/30'
              : semaphore.status === 'DENIED'
              ? 'border-red-400 dark:border-red-600 bg-red-50/80 dark:bg-red-950/30'
              : semaphore.status === 'UNSCHEDULED'
              ? 'border-amber-400 dark:border-amber-600 bg-amber-50/80 dark:bg-amber-950/30'
              : 'border-dashed border-neutral-300 dark:border-white/10 bg-neutral-50/60 dark:bg-[#141213]'
          }`}
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5">
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-2xl shrink-0 shadow-sm ${
                  semaphore.status === 'ALLOWED'
                    ? 'bg-emerald-600 text-white'
                    : semaphore.status === 'DENIED'
                    ? 'bg-red-600 text-white animate-pulse'
                    : semaphore.status === 'UNSCHEDULED'
                    ? 'bg-amber-500 text-white'
                    : 'bg-neutral-200 dark:bg-white/10 text-neutral-600 dark:text-neutral-300'
                }`}
              >
                {semaphore.status === 'ALLOWED' ? (
                  <CheckCircle2 className="h-7 w-7" />
                ) : semaphore.status === 'DENIED' ? (
                  <ShieldAlert className="h-7 w-7" />
                ) : semaphore.status === 'UNSCHEDULED' ? (
                  <AlertTriangle className="h-7 w-7" />
                ) : (
                  <ScanBarcode className="h-6 w-6" />
                )}
              </div>

              <div className="space-y-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      semaphore.status === 'ALLOWED'
                        ? 'bg-emerald-200 text-emerald-950 dark:bg-emerald-900 dark:text-emerald-200'
                        : semaphore.status === 'DENIED'
                        ? 'bg-red-200 text-red-950 dark:bg-red-900 dark:text-red-200'
                        : semaphore.status === 'UNSCHEDULED'
                        ? 'bg-amber-200 text-amber-950 dark:bg-amber-900 dark:text-amber-200'
                        : 'bg-neutral-200/80 text-neutral-700 dark:bg-white/10 dark:text-neutral-300'
                    }`}
                  >
                    {semaphore.status === 'ALLOWED'
                      ? 'INGRESO APROBADO'
                      : semaphore.status === 'DENIED'
                      ? 'ACCESO BLOQUEADO'
                      : semaphore.status === 'UNSCHEDULED'
                      ? 'SIN CLASE ASIGNADA HOY'
                      : 'PANTALLA DE RESULTADO'}
                  </span>

                  {semaphore.timestamp && (
                    <span className="text-xs font-mono text-neutral-500 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {semaphore.timestamp}
                    </span>
                  )}
                </div>

                <h3 className="font-serif text-base sm:text-lg font-bold text-[#1A1A1A] dark:text-neutral-100">
                  {semaphore.student
                    ? `${semaphore.student.fullName} (C.C. ${semaphore.student.documentId})`
                    : semaphore.message}
                </h3>

                <p
                  className={`text-xs leading-relaxed ${
                    semaphore.status === 'DENIED'
                      ? 'font-bold text-red-800 dark:text-red-300'
                      : 'text-neutral-600 dark:text-neutral-400'
                  }`}
                >
                  {semaphore.student
                    ? `${semaphore.message} — ${semaphore.subMessage ?? ''}`
                    : semaphore.subMessage}
                </p>
              </div>
            </div>

            {/* Acciones Rápidas del Semáforo */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {semaphore.status === 'DENIED' && semaphore.student && (
                <div className="flex flex-wrap items-center gap-1.5">
                  {/* Botón Pago Express de Multa */}
                  {semaphore.student.pendingFinesCount > 0 && onPayAndRescheduleFine && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        const targetStudent = semaphore.student;
                        if (targetStudent) {
                          // Crear objeto de multa simulado si no viene en student
                          const dummyFine: FineItem = {
                            id: `FINE-${Date.now()}`,
                            studentId: targetStudent.id,
                            studentName: targetStudent.fullName,
                            missedScheduleId: activeSchedule?.id || schedules[0]?.id || 'SCH-01',
                            missedScheduleTitle: 'Inasistencia a clase previa',
                            rescheduledScheduleId: null,
                            amountCop: targetStudent.pendingFinesTotalCop || 40000,
                            status: 'PENDIENTE',
                            isClassRescheduled: false,
                            paymentReference: null,
                            paidAt: null,
                            reason: targetStudent.blockReason || 'Inasistencia a clase',
                            createdAt: new Date().toISOString(),
                          };
                          setActiveFineToPay(dummyFine);
                          setActiveFineStudent(targetStudent);
                        }
                      }}
                      className="text-xs font-bold gap-1.5 bg-red-600 hover:bg-red-700 text-white"
                    >
                      <DollarSign className="h-3.5 w-3.5" />
                      <span>Cobrar Multa Express ({formatCop(semaphore.student.pendingFinesTotalCop)})</span>
                    </Button>
                  )}

                  {/* Botón Abono Express de Saldo Académico */}
                  {(semaphore.student.pendingBalanceCop ?? 0) > 0 && onRegisterStudentPayment && (
                    <Button
                      type="button"
                      variant="pink"
                      size="sm"
                      onClick={() => setActivePaymentStudent(semaphore.student)}
                      className="text-xs font-black gap-1.5 bg-[#141213] text-[#ECCCD9] hover:bg-neutral-800 dark:bg-[#ECCCD9] dark:text-[#141213]"
                    >
                      <Receipt className="h-3.5 w-3.5" />
                      <span>Abonar Saldo ({formatCop(semaphore.student.pendingBalanceCop)})</span>
                    </Button>
                  )}

                  <Link href="/alumnos">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs font-bold gap-1"
                    >
                      <span>Ver Ficha Alumna</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </div>
              )}

              {semaphore.status === 'UNSCHEDULED' &&
                semaphore.student &&
                (activeSchedule ?? schedules[0]) && (
                  <Button
                    variant="pink"
                    size="sm"
                    disabled={isProcessing}
                    onClick={() => {
                      const target = activeSchedule ?? schedules[0];
                      if (semaphore.student && target) {
                        void processStudentCheckIn(
                          semaphore.student,
                          semaphore.method,
                          target.id
                        );
                      }
                    }}
                    className="text-xs font-bold gap-1.5"
                  >
                    <UserCheck className="h-3.5 w-3.5" />
                    <span>
                      Autorizar en {(activeSchedule ?? schedules[0])?.roomName}
                    </span>
                  </Button>
                )}

              {semaphore.status !== 'IDLE' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setSemaphore({
                      status: 'IDLE',
                      student: null,
                      message: 'Esperando entrada de alumna...',
                      subMessage:
                        'Escriba la cédula o nombre en el campo superior, o haga clic en "Marcar Llegada" en la lista de abajo.',
                    })
                  }
                  className="text-xs h-8"
                >
                  Limpiar
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 2. LISTA ÚNICA DE ASISTENCIA + BITÁCORA DE LLEGADAS                   */}
      {/* ===================================================================== */}
      <div className="grid gap-6 lg:grid-cols-12 min-w-0">
        {/* COLUMNA PRINCIPAL (8 cols): UNA SOLA LISTA UNIFICADA DE ALUMNAS */}
        <div className="lg:col-span-8 min-w-0 overflow-hidden rounded-3xl border border-neutral-200/80 dark:border-white/10 bg-white dark:bg-[#1E1D1D] p-4 sm:p-6 shadow-sm space-y-5">
          {/* Pestañas de Filtro por Salón y Buscador */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-100 dark:border-white/5 pb-4">
            <div>
              <h3 className="font-serif text-lg font-bold text-[#1A1A1A] dark:text-neutral-100 flex items-center gap-2">
                <Users className="h-5 w-5 text-[#7A1E46] dark:text-[#ECCCD9]" />
                <span>
                  {activeSchedule
                    ? `Listado del Salón: ${activeSchedule.roomName} (${activeSchedule.title})`
                    : 'Listado General de Alumnas (Todos los Salones)'}
                </span>
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                Presentes hoy: <strong>{presentCountInList}</strong> de{' '}
                <strong>{displayedStudents.length}</strong> &bull; Bloqueadas por multa:{' '}
                <strong className="text-red-600">{blockedCountInList}</strong>
              </p>
            </div>

            {/* Buscador */}
            <div className="relative w-full sm:w-64">
              <Search className="h-3.5 w-3.5 text-neutral-400 absolute left-3.5 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar alumna en la lista..."
                className="w-full rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-[#141213] pl-9 pr-3 py-2 text-xs outline-none focus:border-[#232222] dark:focus:border-[#ECCCD9]"
              />
            </div>
          </div>

          {/* Botones Píldora para Filtrar por Salón o Ver Todas */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedScheduleId('ALL')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                  selectedScheduleId === 'ALL'
                    ? 'bg-[#232222] text-[#ECCCD9] dark:bg-[#ECCCD9] dark:text-[#141213] shadow-sm'
                    : 'bg-neutral-100 dark:bg-white/5 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200'
                }`}
              >
                Todas las Alumnas ({students.length})
              </button>

              {visibleSchedules.map((sch) => {
                const isEnded = sch.isActive === false || new Date(sch.endTime).getTime() < Date.now();
                return (
                  <button
                    key={sch.id}
                    type="button"
                    onClick={() => setSelectedScheduleId(sch.id)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                      selectedScheduleId === sch.id
                        ? 'bg-[#232222] text-[#ECCCD9] dark:bg-[#ECCCD9] dark:text-[#141213] shadow-sm'
                        : isEnded
                        ? 'bg-neutral-100/60 dark:bg-white/[0.03] text-neutral-400 dark:text-neutral-500 hover:bg-neutral-200'
                        : 'bg-neutral-100 dark:bg-white/5 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200'
                    }`}
                  >
                    <DoorOpen className="h-3.5 w-3.5" />
                    <span>
                      {sch.roomName}: {sch.title} ({sch.enrolledCount})
                    </span>
                    {isEnded ? (
                      <span className="text-[10px] rounded bg-neutral-200/80 dark:bg-white/10 px-1.5 py-0.2 text-neutral-500 dark:text-neutral-400">
                        {sch.isActive === false ? 'Desactivada' : 'Finalizada'}
                      </span>
                    ) : (
                      <span className="h-2 w-2 rounded-full bg-emerald-500" title="En curso / Vigente" />
                    )}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setShowFinishedClasses((prev) => !prev)}
              className="text-[11px] font-semibold text-neutral-500 hover:text-black dark:hover:text-white underline decoration-dotted"
            >
              {showFinishedClasses ? 'Ocultar clases finalizadas' : 'Mostrar clases finalizadas'}
            </button>
          </div>

          {/* Tabla / Filas Unificadas de Alumnas */}
          {displayedStudents.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-neutral-200 dark:border-white/10 p-8 text-center text-xs text-neutral-400">
              No hay alumnas que coincidan con el salón o filtro seleccionado.
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1">
              {displayedStudents.map((st) => {
                const attendanceRec = presentRecordByStudentId.get(st.id);
                const isPresent = Boolean(attendanceRec);
                const assignedSchedule =
                  activeSchedule ??
                  schedules.find((sch) =>
                    sch.enrolledStudents.some((e) => e.id === st.id)
                  ) ??
                  null;

                return (
                  <div
                    key={st.id}
                    className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border p-4 transition ${
                      st.isBlocked
                        ? 'border-red-200 dark:border-red-900/40 bg-red-50/30 dark:bg-red-950/15'
                        : isPresent
                        ? 'border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/30 dark:bg-emerald-950/15'
                        : 'border-neutral-200/70 dark:border-white/10 bg-neutral-50/40 dark:bg-[#141213] hover:border-[#ECCCD9]'
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div
                        className={`flex h-11 w-11 items-center justify-center rounded-2xl shrink-0 font-serif font-bold text-sm ${
                          st.isBlocked
                            ? 'bg-red-600 text-white'
                            : isPresent
                            ? 'bg-emerald-600 text-white'
                            : 'bg-[#232222] dark:bg-[#ECCCD9] text-[#ECCCD9] dark:text-[#141213]'
                        }`}
                      >
                        {isPresent ? (
                          <CheckCircle2 className="h-5 w-5" />
                        ) : st.isBlocked ? (
                          <ShieldAlert className="h-5 w-5" />
                        ) : (
                          <Fingerprint className="h-5 w-5" />
                        )}
                      </div>

                      <div className="min-w-0 space-y-0.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-serif text-base font-bold text-[#1A1A1A] dark:text-neutral-100">
                            {st.fullName}
                          </span>
                          <span className="text-xs font-mono text-neutral-400">
                            C.C. {st.documentId}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                          <span>{st.programName}</span>
                          <span>&bull;</span>
                          {assignedSchedule ? (
                            <span className="font-semibold text-[#7A1E46] dark:text-[#ECCCD9]">
                              {assignedSchedule.roomName} — {assignedSchedule.title}
                            </span>
                          ) : (
                            <span className="text-amber-600 dark:text-amber-400">
                              Sin clase asignada hoy
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Botón o Estado en la Fila */}
                    <div className="flex items-center gap-2.5 shrink-0">
                      {st.isBlocked ? (
                        <div className="flex items-center gap-2">
                          <Badge variant="destructive" className="text-[11px] font-bold">
                            BLOQUEADA POR MULTA
                          </Badge>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => processStudentCheckIn(st, 'BIOMETRIA_USB')}
                            className="text-xs border-red-300 text-red-700 hover:bg-red-50"
                          >
                            Ver Motivo
                          </Button>
                        </div>
                      ) : isPresent ? (
                        <div className="text-right">
                          <Badge variant="success" className="text-xs font-bold gap-1">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            PRESENTE EN SALÓN
                          </Badge>
                          {attendanceRec && (
                            <p className="text-[10px] font-mono text-neutral-400 mt-0.5">
                              Llegó a las {formatTimeHour(attendanceRec.checkInTime)}
                            </p>
                          )}
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="pink"
                          disabled={isProcessing}
                          onClick={() => processStudentCheckIn(st, 'BIOMETRIA_USB')}
                          className="text-xs font-bold gap-1.5 px-4 shadow-sm"
                        >
                          <Fingerprint className="h-4 w-4" />
                          <span>Marcar Llegada</span>
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* COLUMNA DERECHA (4 cols): HISTORIAL DE LLEGADAS DE HOY EN VIVO */}
        <div className="lg:col-span-4 min-w-0 overflow-hidden rounded-3xl border border-neutral-200/80 dark:border-white/10 bg-white dark:bg-[#1E1D1D] p-4 sm:p-6 shadow-sm space-y-4 h-fit">
          <div className="flex items-center justify-between border-b border-neutral-100 dark:border-white/5 pb-3.5">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-[#232222] dark:text-[#ECCCD9]" />
              <div>
                <h3 className="font-serif text-base font-bold text-[#1A1A1A] dark:text-neutral-100">
                  Últimas Llegadas Registradas
                </h3>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                  Bitácora de ingresos del día con hora exacta
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => void loadAttendanceLogs()}
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-neutral-200 dark:border-white/10 text-neutral-500 hover:text-black dark:hover:text-white transition"
              title="Actualizar bitácora"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoadingLogs ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {recentAttendances.length === 0 ? (
            <div className="py-10 text-center text-xs text-neutral-400">
              Aún no se han registrado llegadas hoy.
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1">
              {recentAttendances.slice(0, 15).map((rec) => (
                <div
                  key={rec.id}
                  className="flex items-center justify-between gap-2 rounded-2xl border border-neutral-100 dark:border-white/5 bg-neutral-50/50 dark:bg-[#141213] p-3 text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-xl shrink-0 ${
                        rec.status === 'PRESENTE'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300'
                      }`}
                    >
                      {rec.status === 'PRESENTE' ? (
                        <UserCheck className="h-4 w-4" />
                      ) : (
                        <UserX className="h-4 w-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-[#1A1A1A] dark:text-neutral-100 truncate">
                        {rec.student?.fullName}
                      </p>
                      <p className="text-[11px] text-neutral-500 truncate">
                        {rec.schedule?.room?.name} — {rec.schedule?.title}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <Badge
                      variant={rec.status === 'PRESENTE' ? 'success' : 'destructive'}
                      className="text-[10px]"
                    >
                      {rec.status}
                    </Badge>
                    <p className="text-[10px] font-mono text-neutral-400 mt-0.5">
                      {formatTimeHour(rec.checkInTime)} &bull;{' '}
                      {rec.verifiedByBiometry ? 'Huella' : 'C.C.'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* MODAL DE COBRO DE MULTA EXPRESS (SIN SALIR DE LA TERMINAL DE ASISTENCIA) */}
      {activeFineStudent && onPayAndRescheduleFine && (
        <PayFineModal
          isOpen={Boolean(activeFineStudent)}
          fine={activeFineToPay}
          student={activeFineStudent}
          schedules={schedules}
          operatorName={operatorName}
          isAdmin={isAdmin}
          onClose={() => {
            setActiveFineStudent(null);
            setActiveFineToPay(null);
          }}
          onSubmit={async (payload) => {
            await onPayAndRescheduleFine({
              ...payload,
              operatorUserId,
            });
            setActiveFineStudent(null);
            setActiveFineToPay(null);
            setSemaphore({
              status: 'IDLE',
              student: null,
              message: 'Multa liquidada con éxito. La alumna puede volver a poner su huella.',
              subMessage: 'Paz y salvo registrado en auditoría forense EPB.',
            });
            await loadAttendanceLogs();
          }}
          onCancelFine={
            onCancelFine
              ? async (payload) => {
                  await onCancelFine({
                    action: 'CANCEL_FINE',
                    fineId: payload.fineId,
                    reason: payload.reason,
                    operatorUserId,
                  });
                  setActiveFineStudent(null);
                  setActiveFineToPay(null);
                  setSemaphore({
                    status: 'IDLE',
                    student: null,
                    message: 'Multa condonada por Administración.',
                    subMessage: 'Alumna habilitada para ingreso a clases.',
                  });
                  await loadAttendanceLogs();
                }
              : undefined
          }
        />
      )}

      {/* MODAL DE ABONO ACADÉMICO EXPRESS */}
      {activePaymentStudent && onRegisterStudentPayment && (
        <RegisterStudentPaymentModal
          isOpen={Boolean(activePaymentStudent)}
          student={activePaymentStudent}
          operatorName={operatorName}
          onClose={() => setActivePaymentStudent(null)}
          onSubmit={async (payload) => {
            const res = await onRegisterStudentPayment({
              action: 'REGISTER_PAYMENT',
              studentId: payload.studentId,
              amountCop: payload.amountCop,
              concept: payload.concept,
              paymentMethod: payload.paymentMethod,
              paymentReference: payload.paymentReference,
              notes: payload.notes,
              operatorUserId,
            });
            setActivePaymentStudent(null);
            setSemaphore({
              status: 'IDLE',
              student: null,
              message: `Abono registrado: Recibo ${res.receiptNumber}`,
              subMessage: res.unblocked
                ? 'Saldo saldado por completo. Alumna DESBLOQUEADA.'
                : `Nuevo saldo pendiente: ${formatCop(res.newPendingBalanceCop)}`,
            });
            await loadAttendanceLogs();
            return res;
          }}
        />
      )}
    </div>
  );
}
