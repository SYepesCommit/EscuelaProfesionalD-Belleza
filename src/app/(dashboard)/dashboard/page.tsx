'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  LayoutDashboard,
  ShoppingCart,
  GraduationCap,
  CalendarDays,
  Fingerprint,
  ShieldCheck,
  BarChart3,
  DollarSign,
  Wallet,
  ArrowUpRight,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Package,
  RefreshCw,
  Award,
  TrendingUp,
  Receipt,
  Users,
  Sparkles,
  Search,
  Ban,
  ChevronRight,
  CreditCard,
  Banknote,
  Building2,
  FileSearch,
  Lock,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { RegisterStudentPaymentModal } from '@/components/students/RegisterStudentPaymentModal';
import { registerStudentPaymentRequest } from '@/services/student.service';
import { StudentItem } from '@/interfaces/student.interface';
import { useAuthSession } from '@/hooks/useAuthSession';
import { canRoleAccessPath } from '@/lib/permissions';
import { formatCop } from '@/lib/utils';
import { buildDebtReminderMessage, buildWhatsAppUrl } from '@/lib/whatsapp';

interface DashboardData {
  generatedAt: string;
  monthKey: string;
  cashPulse: {
    expectedCashCop: number;
    expectedTransfCop: number;
    expectedCardCop: number;
    grandTotalCop: number;
    salesCount: number;
    salesTotalCop: number;
    salesCashCop: number;
    salesTransfCop: number;
    tuitionCount: number;
    tuitionTotalCop: number;
    tuitionCashCop: number;
    tuitionTransfCop: number;
    finesCount: number;
    finesTotalCop: number;
    shiftStatus: 'ABIERTO' | 'CERRADO_HOY';
    lastCloseInfo: {
      closedAt: string;
      closedBy: string;
    } | null;
  };
  academicToday: {
    isShowingTodayExact: boolean;
    schedulesCount: number;
    totalEnrolledToday: number;
    presentCount: number;
    absentCount: number;
    rescheduledCount: number;
    schedules: Array<{
      id: string;
      title: string;
      courseName: string;
      roomName: string;
      roomCode: string;
      teacherId: string;
      teacherName: string;
      startTime: string;
      endTime: string;
      enrolledCount: number;
      maxStudents: number;
      presentCount: number;
      absentCount: number;
      debtorsInClass: Array<{
        id: string;
        fullName: string;
        pendingBalanceCop: number;
      }>;
      enrolledStudentsAcademic: Array<{
        id: string;
        fullName: string;
        documentId: string;
        programName: string;
        attendanceStatus: string;
      }>;
    }>;
    studentsInClassWithDebt: Array<{
      id: string;
      fullName: string;
      documentId: string;
      pendingBalanceCop: number;
      pendingBalanceReason: string | null;
      courseName: string;
      roomName: string;
      startTime: string;
    }>;
  };
  portfolio: {
    totalStudentsCount: number;
    debtorsCount: number;
    blockedStudentsCount: number;
    totalPendingBalanceCop: number;
    topDebtors: Array<{
      id: string;
      fullName: string;
      documentId: string;
      phone: string;
      programName: string;
      pendingBalanceCop: number;
      pendingBalanceReason: string | null;
      isBlocked: boolean;
      blockReason: string | null;
    }>;
  };
  inventory: {
    totalActiveProducts: number;
    criticalCount: number;
    criticalStockProducts: Array<{
      id: string;
      name: string;
      sku: string;
      category: string;
      stock: number;
      minStock: number;
      priceCop: number;
    }>;
    topProducts: Array<{
      id: string;
      name: string;
      sku: string;
      quantitySold: number;
      revenueCop: number;
    }>;
  };
  commercial: {
    activePresalesCount: number;
    activePresalesList: Array<{
      id: string;
      clientName: string;
      clientDocument: string;
      clientPhone: string;
      interestedCourseOrItem: string;
      status: string;
      initialSellerId: string;
      initialSellerName: string;
      secondSellerId: string | null;
      secondSellerName: string | null;
      protectedUntilDay3: string;
      secondWindowUntil24h: string | null;
    }>;
    topCommissions: Array<{
      sellerId: string;
      sellerName: string;
      salesCount: number;
      totalSalesCop: number;
      totalCommissionCop: number;
      commissionRatePct?: number;
    }>;
    monthlyOverview: {
      monthKey: string;
      posSalesTotalCop: number;
      tuitionTotalCop: number;
      finesTotalCop: number;
      schoolGrossIncomeCop: number;
      posSalesCount: number;
      tuitionCount: number;
      finesCount: number;
    };
  };
  personalMetrics: {
    mySalesTodayCount: number;
    mySalesTodayCop: number;
    myMonthSalesCount: number;
    myMonthSalesCop: number;
    myMonthCommissionCop: number;
    myWorkedHoursMonth: number;
    myLogsCountMonth: number;
  };
  liveFeed: Array<{
    id: string;
    type: 'SALE_POS' | 'SALE_VOID' | 'STUDENT_PAYMENT' | 'FINE_PAID';
    title: string;
    subtitle: string;
    amountCop: number;
    paymentMethod: string;
    createdAt: string;
  }>;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
}

const ROLE_SUBTITLES: Record<string, { badge: string; description: string }> = {
  ADMIN: {
    badge: 'DIRECCIÓN GENERAL • VISTA 360°',
    description:
      'Control ejecutivo total: caja unificada del día, recaudo de cuotas académicas, consolidado mensual, comisiones y salones.',
  },
  CONTABILIDAD: {
    badge: 'AUDITORÍA & CONTABILIDAD • SOLO LECTURA',
    description:
      'Verificación financiera de arqueos de caja, ingresos acumulados del mes, cartera académica, nómina y bitácora forense.',
  },
  ASESOR: {
    badge: 'RECEPCIÓN & ADMISIONES ACADÉMICAS',
    description:
      'Gestión de salones del día, recordatorio de cobro a alumnas que asisten hoy, recepción de abonos, asistencia y preventas.',
  },
  VENTA: {
    badge: 'TERMINAL TIENDA POS & PREVENTAS',
    description:
      'Operación de facturación POS con escáner, control de preventas protegidas (3 días / 24h), stock de tienda y tus comisiones.',
  },
  PROFESOR: {
    badge: 'PORTAL DOCENTE & SALONES ACADÉMICOS',
    description:
      'Panel exclusivo académico: tus salones asignados, horarios de clase, alumnas inscritas y control de asistencia biométrica.',
  },
};

export default function DashboardPage() {
  const { user } = useAuthSession();
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedStudentForPayment, setSelectedStudentForPayment] = useState<StudentItem | null>(
    null
  );
  const [isQuickPickerOpen, setIsQuickPickerOpen] = useState(false);
  const [quickSearch, setQuickSearch] = useState('');

  const loadDashboard = useCallback(
    async (background = false) => {
      if (!background) setIsLoading(true);
      else setIsRefreshing(true);

      try {
        const params = new URLSearchParams();
        if (user?.id) params.set('userId', user.id);
        if (user?.role) params.set('role', user.role);

        const res = await fetch(`/api/dashboard?${params.toString()}`, { cache: 'no-store' });
        if (!res.ok) throw new Error('No se pudo cargar el Centro de Mando');
        const json = (await res.json()) as DashboardData;
        setData(json);
      } catch (err) {
        if (!background) {
          toast.error(err instanceof Error ? err.message : 'Error cargando dashboard');
        }
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [user?.id, user?.role]
  );

  useEffect(() => {
    void loadDashboard(false);
    const handleManualRefresh = () => {
      void loadDashboard(true);
    };
    window.addEventListener('epb:manual-refresh', handleManualRefresh);
    return () => {
      window.removeEventListener('epb:manual-refresh', handleManualRefresh);
    };
  }, [loadDashboard]);

  const openPaymentModalForDebtor = (debtor: {
    id: string;
    fullName: string;
    documentId: string;
    phone?: string;
    programName?: string;
    pendingBalanceCop: number;
    pendingBalanceReason?: string | null;
    isBlocked?: boolean;
    blockReason?: string | null;
  }) => {
    const mappedStudent: StudentItem = {
      id: debtor.id,
      documentId: debtor.documentId,
      fullName: debtor.fullName,
      phone: debtor.phone || '3000000000',
      email: null,
      programName: debtor.programName || 'Programa Académico EPB',
      hasFingerprint: false,
      isBlocked: Boolean(debtor.isBlocked),
      blockReason: debtor.blockReason || null,
      pendingBalanceCop: debtor.pendingBalanceCop,
      pendingBalanceReason: debtor.pendingBalanceReason || 'Cuota académica pendiente',
      pendingFinesCount: 0,
      pendingFinesTotalCop: 0,
      isActive: true,
    };
    setIsQuickPickerOpen(false);
    setSelectedStudentForPayment(mappedStudent);
  };

  const handlePaymentSubmit = async (payload: {
    studentId: string;
    amountCop: number;
    concept: string;
    paymentMethod: 'EFECTIVO' | 'TRANSFERENCIA' | 'TARJETA' | 'MIXTO';
    paymentReference?: string;
    notes?: string;
  }) => {
    const result = await registerStudentPaymentRequest({
      action: 'REGISTER_PAYMENT',
      ...payload,
      operatorUserId: user?.id || 'ADMIN-EPB',
    });
    toast.success(`Abono registrado (${result.receiptNumber}) y sumado a Caja del día`);
    await loadDashboard(true);
    return result;
  };

  if (isLoading || !data) {
    return (
      <div className="space-y-5">
        <div className="h-36 animate-pulse rounded-3xl border border-[#E4BDD0] bg-[#FAF0F5]/70 dark:border-[#332B2F] dark:bg-[#1A1719]" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="h-44 animate-pulse rounded-2xl border border-[#E4BDD0] bg-white/80 dark:border-[#332B2F] dark:bg-[#1A1719]"
            />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          <div className="h-96 animate-pulse rounded-2xl border border-[#E4BDD0] bg-white/80 lg:col-span-7 dark:border-[#332B2F] dark:bg-[#1A1719]" />
          <div className="h-96 animate-pulse rounded-2xl border border-[#E4BDD0] bg-white/80 lg:col-span-5 dark:border-[#332B2F] dark:bg-[#1A1719]" />
        </div>
      </div>
    );
  }

  const role = user?.role || 'ADMIN';
  const roleHeader = ROLE_SUBTITLES[role] || ROLE_SUBTITLES.ADMIN;
  const { cashPulse, academicToday, portfolio, inventory, commercial, personalMetrics, liveFeed } =
    data;

  // Permiso para cobrar abonos académicos: solo ADMIN y ASESOR
  const canCollectAcademicPayments = role === 'ADMIN' || role === 'ASESOR';

  const grossMonth = Math.max(1, commercial.monthlyOverview.schoolGrossIncomeCop);
  const posPct = Math.round((commercial.monthlyOverview.posSalesTotalCop / grossMonth) * 100);
  const tuitionPct = Math.round((commercial.monthlyOverview.tuitionTotalCop / grossMonth) * 100);
  const finesPct = Math.max(0, 100 - posPct - tuitionPct);

  const filteredQuickDebtors = portfolio.topDebtors.filter(
    (d) =>
      d.fullName.toLowerCase().includes(quickSearch.toLowerCase()) ||
      d.documentId.includes(quickSearch)
  );

  const inClassDebtorIds = new Set(academicToday.studentsInClassWithDebt.map((s) => s.id));

  // Acciones rápidas filtradas estrictamente por los permisos del rol actual
  const allPossibleActions = [
    {
      href: '/ventas',
      title: 'Terminal POS',
      subtitle: 'Facturar & Cierre Z',
      icon: ShoppingCart,
      highlight: role === 'ADMIN' || role === 'VENTA',
    },
    {
      href: '/agenda',
      title: 'Agendas Salón',
      subtitle: `${academicToday.schedulesCount} grupos activos`,
      icon: CalendarDays,
      highlight: role === 'PROFESOR' || role === 'ASESOR',
    },
    {
      href: '/asistencia',
      title: 'Lector Huella',
      subtitle: 'Asistencia biométrica',
      icon: Fingerprint,
      highlight: false,
    },
    {
      href: '/alumnos',
      title: 'Cartera Alumnas',
      subtitle: `${portfolio.debtorsCount} saldos activos`,
      icon: GraduationCap,
      highlight: false,
    },
    {
      href: '/preventas',
      title: 'Preventas 3d/24h',
      subtitle: `${commercial.activePresalesCount} protegidas`,
      icon: ShieldCheck,
      highlight: false,
    },
    {
      href: '/inventario',
      title: 'Inventario Stock',
      subtitle: `${inventory.totalActiveProducts} referencias`,
      icon: Package,
      highlight: false,
    },
    {
      href: '/reportes',
      title: 'Reportes & Mes',
      subtitle: 'Comisiones y P&G',
      icon: BarChart3,
      highlight: role === 'CONTABILIDAD',
    },
    {
      href: '/personal',
      title: 'Nómina Quincenal',
      subtitle: 'Horas y liquidación',
      icon: Users,
      highlight: false,
    },
    {
      href: '/auditoria',
      title: 'Auditoría Forense',
      subtitle: 'Trazabilidad total',
      icon: FileSearch,
      highlight: false,
    },
  ].filter((item) => (user ? canRoleAccessPath(user.role, item.href) : true));

  return (
    <div className="space-y-6 pb-10">
      {/* =========================================================================
          1. BANNER EDITORIAL ROSA PASTEL & TERMINAL DE ACCIONES RÁPIDAS POR ROL
          ========================================================================= */}
      <section className="relative overflow-hidden rounded-3xl border border-[#E2B5C9] bg-gradient-to-br from-[#F4D7E4] via-[#FAF0F5] to-[#ECCCD9] p-5 shadow-md dark:border-[#3D3136] dark:from-[#231C20] dark:via-[#1B1719] dark:to-[#281F24]">
        <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#141213] px-3 py-1 text-[11px] font-bold tracking-wide text-[#ECCCD9] shadow-xs dark:bg-[#ECCCD9] dark:!text-[#141213]">
                <LayoutDashboard className="h-3.5 w-3.5" />
                {roleHeader.badge}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#141213]/15 bg-white/80 px-3 py-1 text-[11px] font-semibold text-[#141213] backdrop-blur-xs dark:border-white/15 dark:bg-white/10 dark:text-[#F5EBF0]">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Vista Protegida por Rol ({role})
              </span>
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-[#141213] dark:text-white">
              Hola, {user?.fullName || "Escuela Profesional D' Belleza"}
            </h1>
            <p className="text-xs sm:text-sm text-[#4A3E43] dark:text-[#C7B8C0]">
              {roleHeader.description}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {canCollectAcademicPayments && (
              <Button
                type="button"
                onClick={() => setIsQuickPickerOpen((prev) => !prev)}
                className="h-10 rounded-xl bg-[#141213] px-4 text-xs font-bold text-[#ECCCD9] shadow-sm hover:bg-[#2A2528] dark:bg-[#ECCCD9] dark:!text-[#141213]"
              >
                <DollarSign className="mr-1.5 h-4 w-4" />
                Recibir Abono Rápido
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={() => void loadDashboard(true)}
              disabled={isRefreshing}
              className="h-10 rounded-xl border-[#141213]/20 bg-white/85 px-3.5 text-xs font-semibold text-[#141213] hover:bg-white dark:border-white/15 dark:bg-[#141213]/60 dark:text-white"
            >
              <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
          </div>
        </div>

        {/* Buscador Desplegable de Cobro de Abono Rápido (Solo ADMIN y ASESOR) */}
        {canCollectAcademicPayments && isQuickPickerOpen && (
          <div className="relative z-10 mt-4 rounded-2xl border border-[#D9A7BE] bg-white/95 p-4 shadow-lg dark:border-[#42353B] dark:bg-[#161315]">
            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between border-b border-[#F0DCE5] pb-3 dark:border-[#2C2528]">
              <div className="flex items-center gap-2 text-xs font-bold text-[#141213] dark:text-[#ECCCD9]">
                <Sparkles className="h-4 w-4 text-[#C86D94]" />
                Selecciona la alumna para registrar su abono (se suma automáticamente al Arqueo de Caja de hoy):
              </div>
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
                <Input
                  value={quickSearch}
                  onChange={(e) => setQuickSearch(e.target.value)}
                  placeholder="Filtrar por nombre o documento..."
                  className="h-9 pl-9 text-xs"
                />
              </div>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {filteredQuickDebtors.length === 0 ? (
                <div className="col-span-full py-3 text-center text-xs text-neutral-500">
                  No se encontraron alumnas con saldo pendiente para ese filtro.
                </div>
              ) : (
                filteredQuickDebtors.map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => openPaymentModalForDebtor(st)}
                    className="flex items-center justify-between rounded-xl border border-[#E8C8D7] bg-[#FDF8FA] p-3 text-left transition hover:border-[#141213] hover:bg-[#FAF0F5] dark:border-[#362D32] dark:bg-[#1E1A1C] dark:hover:border-[#ECCCD9]"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="text-xs font-bold text-[#141213] dark:text-white truncate">
                        {st.fullName}
                      </div>
                      <div className="text-[11px] text-neutral-500 dark:text-[#B8A9B1] truncate">
                        CC {st.documentId} • {st.programName}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-xs font-bold text-rose-600 dark:text-rose-400">
                        {formatCop(st.pendingBalanceCop)}
                      </div>
                      <span className="inline-flex items-center text-[10px] font-bold text-[#141213] dark:text-[#ECCCD9]">
                        Cobrar <ChevronRight className="h-3 w-3" />
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {/* Botonera Táctil POS Estructurada (Muestra únicamente los módulos autorizados para el rol) */}
        <div
          className={`relative z-10 mt-4 grid grid-cols-2 gap-2.5 ${
            allPossibleActions.length <= 2
              ? 'sm:grid-cols-2'
              : allPossibleActions.length <= 4
              ? 'sm:grid-cols-4'
              : 'sm:grid-cols-3 lg:grid-cols-6'
          }`}
        >
          {allPossibleActions.slice(0, 6).map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.href}
                href={action.href}
                className={`group flex items-center justify-between rounded-2xl border p-3 transition-all active:scale-[0.98] ${
                  action.highlight
                    ? 'border-[#141213] bg-[#141213] text-white shadow-sm hover:bg-[#272325] dark:border-[#ECCCD9] dark:bg-[#ECCCD9] dark:!text-[#141213]'
                    : 'border-[#E2B5C9]/80 bg-white/90 text-[#141213] shadow-2xs hover:border-[#141213]/40 hover:bg-white dark:border-[#3A3035] dark:bg-[#181517]/90 dark:text-white dark:hover:bg-[#221D20]'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                      action.highlight
                        ? 'bg-[#ECCCD9] text-[#141213] dark:bg-[#141213] dark:!text-[#ECCCD9]'
                        : 'bg-[#F5DCE7] text-[#141213] dark:bg-[#2B2327] dark:text-[#ECCCD9]'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold leading-tight truncate">{action.title}</div>
                    <div
                      className={`text-[10px] truncate ${
                        action.highlight
                          ? 'text-[#ECCCD9] dark:!text-[#141213]/80'
                          : 'text-neutral-500 dark:text-[#B8A9B1]'
                      }`}
                    >
                      {action.subtitle}
                    </div>
                  </div>
                </div>
                <ChevronRight
                  className={`h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5 ${
                    action.highlight ? 'text-[#ECCCD9] dark:!text-[#141213]' : 'text-neutral-400'
                  }`}
                />
              </Link>
            );
          })}
        </div>
      </section>

      {/* =========================================================================
          VISTA 1: PROFESOR (DOCENTE DE PLANTA — 100% ACADÉMICO, CERO DATOS FINANCIEROS)
          ========================================================================= */}
      {role === 'PROFESOR' && (
        <>
          {/* 4 KPIs Académicos del Docente */}
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {/* KPI 1: Salones Activos */}
            <div className="flex flex-col justify-between overflow-hidden rounded-2xl border border-[#E4BDD0] bg-white shadow-xs dark:border-[#332B2F] dark:bg-[#1B181A]">
              <div className="flex items-center justify-between border-b border-[#F2E0E8] bg-gradient-to-r from-[#FAF0F5] to-white px-4 py-2.5 dark:border-[#2C2528] dark:from-[#241E21] dark:to-[#1B181A]">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#6E5A63] dark:text-[#D8C5CE]">
                  1. Salones & Grupos
                </span>
                <span className="epb-pink-surface flex h-7 w-7 items-center justify-center rounded-lg bg-[#ECCCD9] !text-[#141213]">
                  <CalendarDays className="h-3.5 w-3.5" />
                </span>
              </div>
              <div className="px-4 py-3">
                <div className="text-2xl font-bold tracking-tight text-[#141213] dark:text-white">
                  {academicToday.schedulesCount} Grupos
                </div>
                <div className="mt-0.5 text-[11px] text-neutral-500 dark:text-[#B8A9B1]">
                  Programados en calendario académico
                </div>
              </div>
              <div className="grid grid-cols-2 divide-x divide-[#F0DCE5] border-t border-[#F0DCE5] bg-[#FDF8FA] dark:divide-[#2C2528] dark:border-[#2C2528] dark:bg-[#171416]">
                <div className="px-3.5 py-2.5">
                  <div className="text-[10px] font-semibold text-neutral-500">Alumnas Inscritas</div>
                  <div className="mt-0.5 text-xs font-bold text-[#141213] dark:text-white">
                    {academicToday.totalEnrolledToday} cupos
                  </div>
                </div>
                <div className="px-3.5 py-2.5">
                  <div className="text-[10px] font-semibold text-neutral-500">Estado Jornada</div>
                  <div className="mt-0.5 text-xs font-bold text-emerald-600">Activa</div>
                </div>
              </div>
              <Link
                href="/agenda"
                className="flex items-center justify-between border-t border-[#F0DCE5] bg-[#FAF0F5]/80 px-4 py-2 text-[11px] font-bold text-[#141213] hover:bg-[#F3DCE6] dark:border-[#2C2528] dark:bg-[#221D20] dark:text-[#ECCCD9]"
              >
                <span>Ver mi agenda por salón</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {/* KPI 2: Asistencia Biométrica en Salón */}
            <div className="flex flex-col justify-between overflow-hidden rounded-2xl border border-[#E4BDD0] bg-white shadow-xs dark:border-[#332B2F] dark:bg-[#1B181A]">
              <div className="flex items-center justify-between border-b border-[#F2E0E8] bg-gradient-to-r from-[#FAF0F5] to-white px-4 py-2.5 dark:border-[#2C2528] dark:from-[#241E21] dark:to-[#1B181A]">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#6E5A63] dark:text-[#D8C5CE]">
                  2. Asistencia de Alumnas
                </span>
                <span className="epb-pink-surface flex h-7 w-7 items-center justify-center rounded-lg bg-[#ECCCD9] !text-[#141213]">
                  <Fingerprint className="h-3.5 w-3.5" />
                </span>
              </div>
              <div className="px-4 py-3">
                <div className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
                  {academicToday.presentCount} Presentes
                </div>
                <div className="mt-0.5 text-[11px] text-neutral-500 dark:text-[#B8A9B1]">
                  Verificadas en los grupos activos
                </div>
              </div>
              <div className="grid grid-cols-3 divide-x divide-[#F0DCE5] border-t border-[#F0DCE5] bg-[#FDF8FA] text-center dark:divide-[#2C2528] dark:border-[#2C2528] dark:bg-[#171416]">
                <div className="py-2.5">
                  <div className="text-[10px] font-semibold text-neutral-500">Presentes</div>
                  <div className="mt-0.5 text-xs font-bold text-emerald-600">
                    {academicToday.presentCount}
                  </div>
                </div>
                <div className="py-2.5">
                  <div className="text-[10px] font-semibold text-neutral-500">Ausentes</div>
                  <div className="mt-0.5 text-xs font-bold text-rose-600">
                    {academicToday.absentCount}
                  </div>
                </div>
                <div className="py-2.5">
                  <div className="text-[10px] font-semibold text-neutral-500">Reprog.</div>
                  <div className="mt-0.5 text-xs font-bold text-amber-600">
                    {academicToday.rescheduledCount}
                  </div>
                </div>
              </div>
              <Link
                href="/asistencia"
                className="flex items-center justify-between border-t border-[#F0DCE5] bg-[#FAF0F5]/80 px-4 py-2 text-[11px] font-bold text-[#141213] hover:bg-[#F3DCE6] dark:border-[#2C2528] dark:bg-[#221D20] dark:text-[#ECCCD9]"
              >
                <span>Ir a control de asistencia</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {/* KPI 3: Mis Horas Registradas en el Mes */}
            <div className="flex flex-col justify-between overflow-hidden rounded-2xl border border-[#E4BDD0] bg-white shadow-xs dark:border-[#332B2F] dark:bg-[#1B181A]">
              <div className="flex items-center justify-between border-b border-[#F2E0E8] bg-gradient-to-r from-[#FAF0F5] to-white px-4 py-2.5 dark:border-[#2C2528] dark:from-[#241E21] dark:to-[#1B181A]">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#6E5A63] dark:text-[#D8C5CE]">
                  3. Mis Horas Biométricas
                </span>
                <span className="epb-pink-surface flex h-7 w-7 items-center justify-center rounded-lg bg-[#ECCCD9] !text-[#141213]">
                  <Clock className="h-3.5 w-3.5" />
                </span>
              </div>
              <div className="px-4 py-3">
                <div className="text-2xl font-bold tracking-tight text-[#141213] dark:text-white">
                  {personalMetrics.myWorkedHoursMonth} hrs
                </div>
                <div className="mt-0.5 text-[11px] text-neutral-500 dark:text-[#B8A9B1]">
                  Acumuladas por huella en el mes ({data.monthKey})
                </div>
              </div>
              <div className="grid grid-cols-2 divide-x divide-[#F0DCE5] border-t border-[#F0DCE5] bg-[#FDF8FA] dark:divide-[#2C2528] dark:border-[#2C2528] dark:bg-[#171416]">
                <div className="px-3.5 py-2.5">
                  <div className="text-[10px] font-semibold text-neutral-500">Marcaciones</div>
                  <div className="mt-0.5 text-xs font-bold text-[#141213] dark:text-white">
                    {personalMetrics.myLogsCountMonth} turnos
                  </div>
                </div>
                <div className="px-3.5 py-2.5">
                  <div className="text-[10px] font-semibold text-neutral-500">Verificación</div>
                  <div className="mt-0.5 text-xs font-bold text-emerald-600">Biométrica USB</div>
                </div>
              </div>
              <div className="flex items-center justify-between border-t border-[#F0DCE5] bg-[#FAF0F5]/80 px-4 py-2 text-[11px] font-semibold text-[#141213] dark:border-[#2C2528] dark:bg-[#221D20] dark:text-[#ECCCD9]">
                <span>Recuerda marcar entrada y salida</span>
              </div>
            </div>

            {/* KPI 4: Privacidad Académica */}
            <div className="flex flex-col justify-between overflow-hidden rounded-2xl border border-[#E4BDD0] bg-white shadow-xs dark:border-[#332B2F] dark:bg-[#1B181A]">
              <div className="flex items-center justify-between border-b border-[#F2E0E8] bg-gradient-to-r from-[#FAF0F5] to-white px-4 py-2.5 dark:border-[#2C2528] dark:from-[#241E21] dark:to-[#1B181A]">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#6E5A63] dark:text-[#D8C5CE]">
                  4. Perfil Docente EPB
                </span>
                <span className="epb-pink-surface flex h-7 w-7 items-center justify-center rounded-lg bg-[#ECCCD9] !text-[#141213]">
                  <GraduationCap className="h-3.5 w-3.5" />
                </span>
              </div>
              <div className="px-4 py-3">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F5DCE7] px-3 py-1 text-xs font-bold text-[#141213] dark:bg-[#2C2428] dark:text-[#ECCCD9]">
                  MODO ACADÉMICO ACTIVO
                </span>
                <div className="mt-1 text-[11px] text-neutral-500 dark:text-[#B8A9B1]">
                  Enfocado en salones, formación y asistencia de alumnas
                </div>
              </div>
              <div className="grid grid-cols-2 divide-x divide-[#F0DCE5] border-t border-[#F0DCE5] bg-[#FDF8FA] dark:divide-[#2C2528] dark:border-[#2C2528] dark:bg-[#171416]">
                <div className="px-3.5 py-2.5">
                  <div className="text-[10px] font-semibold text-neutral-500">Alumnas Activas</div>
                  <div className="mt-0.5 text-xs font-bold text-[#141213] dark:text-white">
                    {portfolio.totalStudentsCount} matriculadas
                  </div>
                </div>
                <div className="px-3.5 py-2.5">
                  <div className="text-[10px] font-semibold text-neutral-500">Lector Huella</div>
                  <div className="mt-0.5 text-xs font-bold text-emerald-600">Habilitado</div>
                </div>
              </div>
              <div className="flex items-center justify-between border-t border-[#F0DCE5] bg-[#FAF0F5]/80 px-4 py-2 text-[11px] font-semibold text-[#141213] dark:border-[#2C2528] dark:bg-[#221D20] dark:text-[#ECCCD9]">
                <span>Vista libre de datos financieros de caja</span>
                <Lock className="h-3.5 w-3.5" />
              </div>
            </div>
          </section>

          {/* Zona Académica Docente: Salones Programados (7 cols) + Lista de Alumnas Inscritas por Grupo (5 cols) */}
          <section className="grid grid-cols-1 gap-5 lg:grid-cols-12 items-stretch">
            <div className="flex flex-col overflow-hidden rounded-2xl border border-[#E4BDD0] bg-white shadow-xs lg:col-span-7 dark:border-[#332B2F] dark:bg-[#1B181A]">
              <div className="flex items-center justify-between border-b border-[#EED7E2] bg-gradient-to-r from-[#F6E2EB] via-[#FAF0F5] to-white px-5 py-3.5 dark:border-[#2F272B] dark:from-[#261F23] dark:via-[#201B1E] dark:to-[#1B181A]">
                <div className="flex items-center gap-2.5">
                  <span className="epb-pink-surface flex h-8 w-8 items-center justify-center rounded-xl bg-[#ECCCD9] !text-[#141213]">
                    <Building2 className="h-4 w-4" />
                  </span>
                  <div>
                    <h2 className="text-sm font-bold text-[#141213] dark:text-white">
                      Horarios y Ocupación por Salón
                    </h2>
                    <p className="text-[11px] text-neutral-600 dark:text-[#B8A9B1]">
                      Grupos académicos activos, docente responsable y asistencia registrada
                    </p>
                  </div>
                </div>
                <Link href="/agenda">
                  <Button variant="outline" size="sm" className="h-8 rounded-xl border-[#E2B5C9] bg-white text-xs">
                    Ver Calendario
                    <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>

              <div className="flex-1 divide-y divide-[#F2E2EA] dark:divide-[#2A2327]">
                {academicToday.schedules.map((sch) => {
                  const occupancyPct = Math.min(
                    100,
                    Math.round((sch.enrolledCount / Math.max(1, sch.maxStudents)) * 100)
                  );
                  const isMine = user?.id === sch.teacherId;
                  return (
                    <div
                      key={sch.id}
                      className="p-4 transition-colors hover:bg-[#FDF8FA] dark:hover:bg-[#211C1F]"
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="epb-pink-surface inline-flex items-center gap-1 rounded-lg bg-[#ECCCD9] px-2.5 py-0.5 text-[11px] font-bold !text-[#141213]">
                              {sch.roomName}
                            </span>
                            {isMine && (
                              <Badge variant="default" className="text-[10px]">
                                Mi Grupo Asignado
                              </Badge>
                            )}
                            <span className="text-xs font-bold text-[#141213] dark:text-white">
                              {sch.title}
                            </span>
                          </div>
                          <div className="text-[11px] text-neutral-600 dark:text-[#B8A9B1]">
                            Docente: <strong>{sch.teacherName}</strong> •{' '}
                            {new Date(sch.startTime).toLocaleTimeString('es-CO', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}{' '}
                            a{' '}
                            {new Date(sch.endTime).toLocaleTimeString('es-CO', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <Badge variant="success" className="text-[10px]">
                            {sch.presentCount} Presentes
                          </Badge>
                          {sch.absentCount > 0 && (
                            <Badge variant="destructive" className="text-[10px]">
                              {sch.absentCount} Ausentes
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="mt-3 flex items-center gap-3">
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#F3E2EA] dark:bg-[#2C2428]">
                          <div
                            style={{ width: `${Math.max(8, occupancyPct)}%` }}
                            className="h-full rounded-full bg-gradient-to-r from-[#D98BB0] to-[#141213] dark:from-[#ECCCD9] dark:to-[#D49AB5]"
                          />
                        </div>
                        <span className="shrink-0 text-[11px] font-semibold text-neutral-600 dark:text-[#C7B8C0]">
                          Cupo {sch.enrolledCount}/{sch.maxStudents} ({occupancyPct}%)
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Columna Derecha Docente: Lista de Alumnas Inscritas en los Salones (Sin deudas ni dinero) */}
            <div className="flex flex-col overflow-hidden rounded-2xl border border-[#E4BDD0] bg-white shadow-xs lg:col-span-5 dark:border-[#332B2F] dark:bg-[#1B181A]">
              <div className="flex items-center justify-between border-b border-[#EED7E2] bg-gradient-to-r from-[#F6E2EB] via-[#FAF0F5] to-white px-5 py-3.5 dark:border-[#2F272B] dark:from-[#261F23] dark:via-[#201B1E] dark:to-[#1B181A]">
                <div className="flex items-center gap-2.5">
                  <span className="epb-pink-surface flex h-8 w-8 items-center justify-center rounded-xl bg-[#ECCCD9] !text-[#141213]">
                    <Users className="h-4 w-4" />
                  </span>
                  <div>
                    <h2 className="text-sm font-bold text-[#141213] dark:text-white">
                      Alumnas en Salón & Estado de Asistencia
                    </h2>
                    <p className="text-[11px] text-neutral-600 dark:text-[#B8A9B1]">
                      Control de presencia biométrica por estudiante
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex-1 divide-y divide-[#F2E2EA] dark:divide-[#2A2327]">
                {academicToday.schedules
                  .flatMap((s) =>
                    s.enrolledStudentsAcademic.map((st) => ({
                      ...st,
                      roomName: s.roomName,
                      courseName: s.courseName,
                    }))
                  )
                  .slice(0, 7)
                  .map((item, idx) => (
                    <div
                      key={`${item.id}-${idx}`}
                      className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-[#FDF8FA] dark:hover:bg-[#211C1F]"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="epb-pink-surface flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#ECCCD9] text-xs font-bold !text-[#141213]">
                          {getInitials(item.fullName)}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-[#141213] dark:text-white truncate">
                            {item.fullName}
                          </div>
                          <div className="text-[11px] text-neutral-500 dark:text-[#B8A9B1] truncate">
                            {item.roomName} • {item.courseName}
                          </div>
                        </div>
                      </div>
                      <Badge
                        variant={
                          item.attendanceStatus === 'PRESENTE'
                            ? 'success'
                            : item.attendanceStatus === 'AUSENTE'
                            ? 'destructive'
                            : 'secondary'
                        }
                        className="text-[10px]"
                      >
                        {item.attendanceStatus}
                      </Badge>
                    </div>
                  ))}
              </div>

              <div className="flex items-center justify-between border-t border-[#F0DCE5] bg-[#FAF0F5]/80 px-5 py-2.5 text-xs dark:border-[#2C2528] dark:bg-[#221D20]">
                <span className="text-[11px] text-neutral-600 dark:text-[#C7B8C0]">
                  Verificación biométrica en recepción
                </span>
                <Link
                  href="/asistencia"
                  className="text-[11px] font-bold text-[#141213] hover:underline dark:text-[#ECCCD9]"
                >
                  Abrir módulo asistencia →
                </Link>
              </div>
            </div>
          </section>
        </>
      )}

      {/* =========================================================================
          VISTA 2: VENTA (EJECUTIVO TIENDA POS — SIN MATRÍCULAS NI DEUDAS DE ALUMNAS NI COMISIONES AJENAS)
          ========================================================================= */}
      {role === 'VENTA' && (
        <>
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {/* KPI 1: Caja Tienda POS Hoy */}
            <div className="flex flex-col justify-between overflow-hidden rounded-2xl border border-[#E4BDD0] bg-white shadow-xs dark:border-[#332B2F] dark:bg-[#1B181A]">
              <div className="flex items-center justify-between border-b border-[#F2E0E8] bg-gradient-to-r from-[#FAF0F5] to-white px-4 py-2.5 dark:border-[#2C2528] dark:from-[#241E21] dark:to-[#1B181A]">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#6E5A63] dark:text-[#D8C5CE]">
                  1. Ventas Tienda POS Hoy
                </span>
                <span className="epb-pink-surface flex h-7 w-7 items-center justify-center rounded-lg bg-[#ECCCD9] !text-[#141213]">
                  <ShoppingCart className="h-3.5 w-3.5" />
                </span>
              </div>
              <div className="px-4 py-3">
                <div className="text-2xl font-bold tracking-tight text-[#141213] dark:text-white">
                  {formatCop(cashPulse.salesTotalCop)}
                </div>
                <div className="mt-0.5 text-[11px] text-neutral-500 dark:text-[#B8A9B1]">
                  {cashPulse.salesCount} facturas POS emitidas hoy
                </div>
              </div>
              <div className="grid grid-cols-2 divide-x divide-[#F0DCE5] border-t border-[#F0DCE5] bg-[#FDF8FA] dark:divide-[#2C2528] dark:border-[#2C2528] dark:bg-[#171416]">
                <div className="px-3.5 py-2.5">
                  <div className="text-[10px] font-semibold text-neutral-500">Efectivo POS</div>
                  <div className="mt-0.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                    {formatCop(cashPulse.salesCashCop)}
                  </div>
                </div>
                <div className="px-3.5 py-2.5">
                  <div className="text-[10px] font-semibold text-neutral-500">Transferencias</div>
                  <div className="mt-0.5 text-xs font-bold text-sky-700 dark:text-sky-400">
                    {formatCop(cashPulse.salesTransfCop)}
                  </div>
                </div>
              </div>
              <Link
                href="/ventas"
                className="flex items-center justify-between border-t border-[#F0DCE5] bg-[#FAF0F5]/80 px-4 py-2 text-[11px] font-bold text-[#141213] hover:bg-[#F3DCE6] dark:border-[#2C2528] dark:bg-[#221D20] dark:text-[#ECCCD9]"
              >
                <span>Abrir Terminal de Facturación</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {/* KPI 2: Mis Ventas & Mi Comisión Personal del Mes */}
            <div className="flex flex-col justify-between overflow-hidden rounded-2xl border border-[#E4BDD0] bg-white shadow-xs dark:border-[#332B2F] dark:bg-[#1B181A]">
              <div className="flex items-center justify-between border-b border-[#F2E0E8] bg-gradient-to-r from-[#FAF0F5] to-white px-4 py-2.5 dark:border-[#2C2528] dark:from-[#241E21] dark:to-[#1B181A]">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#6E5A63] dark:text-[#D8C5CE]">
                  2. Mi Comisión del Mes
                </span>
                <span className="epb-pink-surface flex h-7 w-7 items-center justify-center rounded-lg bg-[#ECCCD9] !text-[#141213]">
                  <Award className="h-3.5 w-3.5" />
                </span>
              </div>
              <div className="px-4 py-3">
                <div className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
                  {formatCop(personalMetrics.myMonthCommissionCop)}
                </div>
                <div className="mt-0.5 text-[11px] text-neutral-500 dark:text-[#B8A9B1]">
                  Comisión personal acumulada en {data.monthKey}
                </div>
              </div>
              <div className="grid grid-cols-2 divide-x divide-[#F0DCE5] border-t border-[#F0DCE5] bg-[#FDF8FA] dark:divide-[#2C2528] dark:border-[#2C2528] dark:bg-[#171416]">
                <div className="px-3.5 py-2.5">
                  <div className="text-[10px] font-semibold text-neutral-500">Mis Ventas Mes</div>
                  <div className="mt-0.5 text-xs font-bold text-[#141213] dark:text-white">
                    {formatCop(personalMetrics.myMonthSalesCop)}
                  </div>
                </div>
                <div className="px-3.5 py-2.5">
                  <div className="text-[10px] font-semibold text-neutral-500">Facturas Mías</div>
                  <div className="mt-0.5 text-xs font-bold text-[#141213] dark:text-white">
                    {personalMetrics.myMonthSalesCount} cierres
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between border-t border-[#F0DCE5] bg-[#FAF0F5]/80 px-4 py-2 text-[11px] font-semibold text-[#141213] dark:border-[#2C2528] dark:bg-[#221D20] dark:text-[#ECCCD9]">
                <span>Hoy has facturado: {formatCop(personalMetrics.mySalesTodayCop)}</span>
              </div>
            </div>

            {/* KPI 3: Preventas Protegidas (3d / 24h) */}
            <div className="flex flex-col justify-between overflow-hidden rounded-2xl border border-[#E4BDD0] bg-white shadow-xs dark:border-[#332B2F] dark:bg-[#1B181A]">
              <div className="flex items-center justify-between border-b border-[#F2E0E8] bg-gradient-to-r from-[#FAF0F5] to-white px-4 py-2.5 dark:border-[#2C2528] dark:from-[#241E21] dark:to-[#1B181A]">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#6E5A63] dark:text-[#D8C5CE]">
                  3. Preventas (3d / 24h)
                </span>
                <span className="epb-pink-surface flex h-7 w-7 items-center justify-center rounded-lg bg-[#ECCCD9] !text-[#141213]">
                  <ShieldCheck className="h-3.5 w-3.5" />
                </span>
              </div>
              <div className="px-4 py-3">
                <div className="text-2xl font-bold tracking-tight text-[#141213] dark:text-white">
                  {commercial.activePresalesCount} Clientes
                </div>
                <div className="mt-0.5 text-[11px] text-neutral-500 dark:text-[#B8A9B1]">
                  Con blindaje de comisión activo en sistema
                </div>
              </div>
              <div className="grid grid-cols-2 divide-x divide-[#F0DCE5] border-t border-[#F0DCE5] bg-[#FDF8FA] dark:divide-[#2C2528] dark:border-[#2C2528] dark:bg-[#171416]">
                <div className="px-3.5 py-2.5">
                  <div className="text-[10px] font-semibold text-neutral-500">Ventana 3 Días</div>
                  <div className="mt-0.5 text-xs font-bold text-emerald-600">Protegidas</div>
                </div>
                <div className="px-3.5 py-2.5">
                  <div className="text-[10px] font-semibold text-neutral-500">2da Oportunidad</div>
                  <div className="mt-0.5 text-xs font-bold text-amber-600">Ventana 24h</div>
                </div>
              </div>
              <Link
                href="/preventas"
                className="flex items-center justify-between border-t border-[#F0DCE5] bg-[#FAF0F5]/80 px-4 py-2 text-[11px] font-bold text-[#141213] hover:bg-[#F3DCE6] dark:border-[#2C2528] dark:bg-[#221D20] dark:text-[#ECCCD9]"
              >
                <span>Registrar o consultar preventa</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {/* KPI 4: Estado de Turno POS & Stock */}
            <div className="flex flex-col justify-between overflow-hidden rounded-2xl border border-[#E4BDD0] bg-white shadow-xs dark:border-[#332B2F] dark:bg-[#1B181A]">
              <div className="flex items-center justify-between border-b border-[#F2E0E8] bg-gradient-to-r from-[#FAF0F5] to-white px-4 py-2.5 dark:border-[#2C2528] dark:from-[#241E21] dark:to-[#1B181A]">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#6E5A63] dark:text-[#D8C5CE]">
                  4. Estado Caja & Stock
                </span>
                <span className="epb-pink-surface flex h-7 w-7 items-center justify-center rounded-lg bg-[#ECCCD9] !text-[#141213]">
                  <Package className="h-3.5 w-3.5" />
                </span>
              </div>
              <div className="px-4 py-3">
                {cashPulse.shiftStatus === 'ABIERTO' ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    TURNO POS ABIERTO
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-200 px-3 py-1 text-xs font-bold text-neutral-700">
                    CIERRE Z REALIZADO
                  </span>
                )}
                <div className="mt-1 text-[11px] text-neutral-500 dark:text-[#B8A9B1]">
                  {inventory.totalActiveProducts} productos activos en catálogo
                </div>
              </div>
              <div className="grid grid-cols-2 divide-x divide-[#F0DCE5] border-t border-[#F0DCE5] bg-[#FDF8FA] dark:divide-[#2C2528] dark:border-[#2C2528] dark:bg-[#171416]">
                <div className="px-3.5 py-2.5">
                  <div className="text-[10px] font-semibold text-neutral-500">Stock Crítico</div>
                  <div
                    className={`mt-0.5 text-xs font-bold ${
                      inventory.criticalCount > 0 ? 'text-rose-600' : 'text-emerald-600'
                    }`}
                  >
                    {inventory.criticalCount} alertas
                  </div>
                </div>
                <div className="px-3.5 py-2.5">
                  <div className="text-[10px] font-semibold text-neutral-500">Escáner USB</div>
                  <div className="mt-0.5 text-xs font-bold text-[#141213] dark:text-white">
                    Listo
                  </div>
                </div>
              </div>
              <Link
                href="/inventario"
                className="flex items-center justify-between border-t border-[#F0DCE5] bg-[#FAF0F5]/80 px-4 py-2 text-[11px] font-bold text-[#141213] hover:bg-[#F3DCE6] dark:border-[#2C2528] dark:bg-[#221D20] dark:text-[#ECCCD9]"
              >
                <span>Consultar stock de tienda</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </section>

          {/* Zona Operativa VENTA: Preventas Protegidas + Top Productos & Bitácora POS */}
          <section className="grid grid-cols-1 gap-5 lg:grid-cols-12 items-stretch">
            {/* Izquierda (7 cols): Clientes en Preventa Protegida & Top Productos */}
            <div className="flex flex-col overflow-hidden rounded-2xl border border-[#E4BDD0] bg-white shadow-xs lg:col-span-7 dark:border-[#332B2F] dark:bg-[#1B181A]">
              <div className="flex items-center justify-between border-b border-[#EED7E2] bg-gradient-to-r from-[#F6E2EB] via-[#FAF0F5] to-white px-5 py-3.5 dark:border-[#2F272B] dark:from-[#261F23] dark:via-[#201B1E] dark:to-[#1B181A]">
                <div className="flex items-center gap-2.5">
                  <span className="epb-pink-surface flex h-8 w-8 items-center justify-center rounded-xl bg-[#ECCCD9] !text-[#141213]">
                    <ShieldCheck className="h-4 w-4" />
                  </span>
                  <div>
                    <h2 className="text-sm font-bold text-[#141213] dark:text-white">
                      Clientes en Preventa Protegida (3 Días / 24 Horas)
                    </h2>
                    <p className="text-[11px] text-neutral-600 dark:text-[#B8A9B1]">
                      Prospectos listos para cierre en POS con comisión protegida
                    </p>
                  </div>
                </div>
                <Link href="/preventas">
                  <Button variant="outline" size="sm" className="h-8 rounded-xl border-[#E2B5C9] bg-white text-xs">
                    Nueva Preventa
                  </Button>
                </Link>
              </div>

              <div className="flex-1 divide-y divide-[#F2E2EA] dark:divide-[#2A2327]">
                {commercial.activePresalesList.length === 0 ? (
                  <div className="p-6 text-center text-xs text-neutral-500">
                    No hay preventas activas en este momento.
                  </div>
                ) : (
                  commercial.activePresalesList.map((pr) => (
                    <div
                      key={pr.id}
                      className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between hover:bg-[#FDF8FA] dark:hover:bg-[#211C1F]"
                    >
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-bold text-[#141213] dark:text-white">
                            {pr.clientName}
                          </span>
                          <Badge variant="secondary" className="text-[10px]">
                            CC {pr.clientDocument}
                          </Badge>
                          <Badge
                            variant={
                              pr.status === 'PROTEGIDO_3_DIAS' ? 'success' : 'warning'
                            }
                            className="text-[10px]"
                          >
                            {pr.status === 'PROTEGIDO_3_DIAS' ? 'Blindaje 3 Días' : 'Ventana 24h'}
                          </Badge>
                        </div>
                        <div className="mt-1 text-[11px] text-neutral-600 dark:text-[#B8A9B1]">
                          Interés: <strong>{pr.interestedCourseOrItem}</strong> • Asesor inicial:{' '}
                          {pr.initialSellerName}
                        </div>
                      </div>
                      <Link href="/ventas">
                        <Button size="sm" className="h-8 rounded-xl text-xs">
                          Facturar en POS
                        </Button>
                      </Link>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Derecha (5 cols): Semáforo de Stock + Últimas Facturas POS */}
            <div className="flex flex-col overflow-hidden rounded-2xl border border-[#E4BDD0] bg-white shadow-xs lg:col-span-5 dark:border-[#332B2F] dark:bg-[#1B181A]">
              <div className="flex items-center justify-between border-b border-[#EED7E2] bg-gradient-to-r from-[#F6E2EB] via-[#FAF0F5] to-white px-5 py-3.5 dark:border-[#2F272B] dark:from-[#261F23] dark:via-[#201B1E] dark:to-[#1B181A]">
                <div className="flex items-center gap-2.5">
                  <span className="epb-pink-surface flex h-8 w-8 items-center justify-center rounded-xl bg-[#ECCCD9] !text-[#141213]">
                    <Receipt className="h-4 w-4" />
                  </span>
                  <div>
                    <h2 className="text-sm font-bold text-[#141213] dark:text-white">
                      Últimas Facturas POS & Stock de Tienda
                    </h2>
                    <p className="text-[11px] text-neutral-600 dark:text-[#B8A9B1]">
                      Movimientos recientes de facturación en mostrador
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex-1 divide-y divide-[#F2E2EA] dark:divide-[#2A2327]">
                {liveFeed
                  .filter((f) => f.type === 'SALE_POS' || f.type === 'SALE_VOID')
                  .map((item) => {
                    const isVoid = item.type === 'SALE_VOID';
                    return (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-[#FDF8FA] dark:hover:bg-[#211C1F]"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                              isVoid
                                ? 'bg-rose-500/15 text-rose-600'
                                : 'epb-pink-surface bg-[#ECCCD9] !text-[#141213]'
                            }`}
                          >
                            {isVoid ? (
                              <Ban className="h-4 w-4" />
                            ) : (
                              <ShoppingCart className="h-4 w-4" />
                            )}
                          </span>
                          <div className="min-w-0">
                            <div
                              className={`text-xs font-bold truncate ${
                                isVoid
                                  ? 'line-through text-rose-500'
                                  : 'text-[#141213] dark:text-white'
                              }`}
                            >
                              {item.title}
                            </div>
                            <div className="text-[11px] text-neutral-500 truncate">
                              {item.subtitle}
                            </div>
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <div
                            className={`text-xs font-bold ${
                              isVoid ? 'line-through text-rose-500' : 'text-emerald-700'
                            }`}
                          >
                            {formatCop(item.amountCop)}
                          </div>
                          <div className="text-[10px] text-neutral-500">{item.paymentMethod}</div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </section>
        </>
      )}

      {/* =========================================================================
          VISTA 3: ASESOR (RECEPCIÓN ACADÉMICA — SALONES, CARTERA, ABONOS Y PREVENTAS)
          ========================================================================= */}
      {role === 'ASESOR' && (
        <>
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {/* KPI 1: Recaudo Académico Hoy en Recepción */}
            <div className="flex flex-col justify-between overflow-hidden rounded-2xl border border-[#E4BDD0] bg-white shadow-xs dark:border-[#332B2F] dark:bg-[#1B181A]">
              <div className="flex items-center justify-between border-b border-[#F2E0E8] bg-gradient-to-r from-[#FAF0F5] to-white px-4 py-2.5 dark:border-[#2C2528] dark:from-[#241E21] dark:to-[#1B181A]">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#6E5A63] dark:text-[#D8C5CE]">
                  1. Recaudo Académico Hoy
                </span>
                <span className="epb-pink-surface flex h-7 w-7 items-center justify-center rounded-lg bg-[#ECCCD9] !text-[#141213]">
                  <Wallet className="h-3.5 w-3.5" />
                </span>
              </div>
              <div className="px-4 py-3">
                <div className="text-2xl font-bold tracking-tight text-[#141213] dark:text-white">
                  {formatCop(cashPulse.tuitionTotalCop + cashPulse.finesTotalCop)}
                </div>
                <div className="mt-0.5 text-[11px] text-neutral-500 dark:text-[#B8A9B1]">
                  {cashPulse.tuitionCount} abonos y {cashPulse.finesCount} multas hoy
                </div>
              </div>
              <div className="grid grid-cols-2 divide-x divide-[#F0DCE5] border-t border-[#F0DCE5] bg-[#FDF8FA] dark:divide-[#2C2528] dark:border-[#2C2528] dark:bg-[#171416]">
                <div className="px-3.5 py-2.5">
                  <div className="text-[10px] font-semibold text-neutral-500">Efectivo Abonos</div>
                  <div className="mt-0.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                    {formatCop(cashPulse.tuitionCashCop)}
                  </div>
                </div>
                <div className="px-3.5 py-2.5">
                  <div className="text-[10px] font-semibold text-neutral-500">Transferencias</div>
                  <div className="mt-0.5 text-xs font-bold text-sky-700 dark:text-sky-400">
                    {formatCop(cashPulse.tuitionTransfCop)}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between border-t border-[#F0DCE5] bg-[#FAF0F5]/80 px-4 py-2 text-[11px] font-semibold text-[#141213] dark:border-[#2C2528] dark:bg-[#221D20] dark:text-[#ECCCD9]">
                <span>Abonos: {formatCop(cashPulse.tuitionTotalCop)}</span>
                <span>Multas: {formatCop(cashPulse.finesTotalCop)}</span>
              </div>
            </div>

            {/* KPI 2: Salones & Asistencia */}
            <div className="flex flex-col justify-between overflow-hidden rounded-2xl border border-[#E4BDD0] bg-white shadow-xs dark:border-[#332B2F] dark:bg-[#1B181A]">
              <div className="flex items-center justify-between border-b border-[#F2E0E8] bg-gradient-to-r from-[#FAF0F5] to-white px-4 py-2.5 dark:border-[#2C2528] dark:from-[#241E21] dark:to-[#1B181A]">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#6E5A63] dark:text-[#D8C5CE]">
                  2. Salones & Asistencia
                </span>
                <span className="epb-pink-surface flex h-7 w-7 items-center justify-center rounded-lg bg-[#ECCCD9] !text-[#141213]">
                  <CalendarDays className="h-3.5 w-3.5" />
                </span>
              </div>
              <div className="px-4 py-3">
                <div className="text-2xl font-bold tracking-tight text-[#141213] dark:text-white">
                  {academicToday.schedulesCount} Salones
                </div>
                <div className="mt-0.5 text-[11px] text-neutral-500 dark:text-[#B8A9B1]">
                  {academicToday.totalEnrolledToday} alumnas agendadas
                </div>
              </div>
              <div className="grid grid-cols-3 divide-x divide-[#F0DCE5] border-t border-[#F0DCE5] bg-[#FDF8FA] text-center dark:divide-[#2C2528] dark:border-[#2C2528] dark:bg-[#171416]">
                <div className="py-2.5">
                  <div className="text-[10px] font-semibold text-neutral-500">Presentes</div>
                  <div className="mt-0.5 text-xs font-bold text-emerald-600">
                    {academicToday.presentCount}
                  </div>
                </div>
                <div className="py-2.5">
                  <div className="text-[10px] font-semibold text-neutral-500">Ausentes</div>
                  <div className="mt-0.5 text-xs font-bold text-rose-600">
                    {academicToday.absentCount}
                  </div>
                </div>
                <div className="py-2.5">
                  <div className="text-[10px] font-semibold text-neutral-500">Reprog.</div>
                  <div className="mt-0.5 text-xs font-bold text-amber-600">
                    {academicToday.rescheduledCount}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between border-t border-[#F0DCE5] bg-[#FAF0F5]/80 px-4 py-2 text-[11px] font-semibold dark:border-[#2C2528] dark:bg-[#221D20]">
                <span className="text-neutral-600 dark:text-[#C7B8C0]">En salón con deuda:</span>
                <span className="font-bold text-rose-600">
                  {academicToday.studentsInClassWithDebt.length} alumna(s)
                </span>
              </div>
            </div>

            {/* KPI 3: Cartera por Cobrar en Recepción */}
            <div className="flex flex-col justify-between overflow-hidden rounded-2xl border border-[#E4BDD0] bg-white shadow-xs dark:border-[#332B2F] dark:bg-[#1B181A]">
              <div className="flex items-center justify-between border-b border-[#F2E0E8] bg-gradient-to-r from-[#FAF0F5] to-white px-4 py-2.5 dark:border-[#2C2528] dark:from-[#241E21] dark:to-[#1B181A]">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#6E5A63] dark:text-[#D8C5CE]">
                  3. Cartera por Cobrar
                </span>
                <span className="epb-pink-surface flex h-7 w-7 items-center justify-center rounded-lg bg-[#ECCCD9] !text-[#141213]">
                  <Receipt className="h-3.5 w-3.5" />
                </span>
              </div>
              <div className="px-4 py-3">
                <div className="text-2xl font-bold tracking-tight text-rose-600 dark:text-rose-400">
                  {formatCop(portfolio.totalPendingBalanceCop)}
                </div>
                <div className="mt-0.5 text-[11px] text-neutral-500 dark:text-[#B8A9B1]">
                  Cuotas y saldos pendientes de alumnas
                </div>
              </div>
              <div className="grid grid-cols-2 divide-x divide-[#F0DCE5] border-t border-[#F0DCE5] bg-[#FDF8FA] dark:divide-[#2C2528] dark:border-[#2C2528] dark:bg-[#171416]">
                <div className="px-3.5 py-2.5">
                  <div className="text-[10px] font-semibold text-neutral-500">Con Saldo</div>
                  <div className="mt-0.5 text-xs font-bold text-[#141213] dark:text-white">
                    {portfolio.debtorsCount} alumnas
                  </div>
                </div>
                <div className="px-3.5 py-2.5">
                  <div className="text-[10px] font-semibold text-neutral-500">Bloqueadas</div>
                  <div className="mt-0.5 text-xs font-bold text-amber-600">
                    {portfolio.blockedStudentsCount} alumnas
                  </div>
                </div>
              </div>
              <Link
                href="/alumnos"
                className="flex items-center justify-between border-t border-[#F0DCE5] bg-[#FAF0F5]/80 px-4 py-2 text-[11px] font-bold text-[#141213] hover:bg-[#F3DCE6] dark:border-[#2C2528] dark:bg-[#221D20] dark:text-[#ECCCD9]"
              >
                <span>Ver directorio de alumnas</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {/* KPI 4: Preventas & Mi Comisión Personal */}
            <div className="flex flex-col justify-between overflow-hidden rounded-2xl border border-[#E4BDD0] bg-white shadow-xs dark:border-[#332B2F] dark:bg-[#1B181A]">
              <div className="flex items-center justify-between border-b border-[#F2E0E8] bg-gradient-to-r from-[#FAF0F5] to-white px-4 py-2.5 dark:border-[#2C2528] dark:from-[#241E21] dark:to-[#1B181A]">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#6E5A63] dark:text-[#D8C5CE]">
                  4. Preventas & Mi Comisión
                </span>
                <span className="epb-pink-surface flex h-7 w-7 items-center justify-center rounded-lg bg-[#ECCCD9] !text-[#141213]">
                  <ShieldCheck className="h-3.5 w-3.5" />
                </span>
              </div>
              <div className="px-4 py-3">
                <div className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
                  {formatCop(personalMetrics.myMonthCommissionCop)}
                </div>
                <div className="mt-0.5 text-[11px] text-neutral-500 dark:text-[#B8A9B1]">
                  Mi comisión personal acumulada este mes
                </div>
              </div>
              <div className="grid grid-cols-2 divide-x divide-[#F0DCE5] border-t border-[#F0DCE5] bg-[#FDF8FA] dark:divide-[#2C2528] dark:border-[#2C2528] dark:bg-[#171416]">
                <div className="px-3.5 py-2.5">
                  <div className="text-[10px] font-semibold text-neutral-500">Preventas 3d/24h</div>
                  <div className="mt-0.5 text-xs font-bold text-[#141213] dark:text-white">
                    {commercial.activePresalesCount} activas
                  </div>
                </div>
                <div className="px-3.5 py-2.5">
                  <div className="text-[10px] font-semibold text-neutral-500">Mis Cierres</div>
                  <div className="mt-0.5 text-xs font-bold text-[#141213] dark:text-white">
                    {personalMetrics.myMonthSalesCount} ventas
                  </div>
                </div>
              </div>
              <Link
                href="/preventas"
                className="flex items-center justify-between border-t border-[#F0DCE5] bg-[#FAF0F5]/80 px-4 py-2 text-[11px] font-bold text-[#141213] hover:bg-[#F3DCE6] dark:border-[#2C2528] dark:bg-[#221D20] dark:text-[#ECCCD9]"
              >
                <span>Gestionar preventas protegidas</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </section>
        </>
      )}

      {/* =========================================================================
          VISTA 4 & 5: ADMIN Y CONTABILIDAD (4 KPIs FINANCIEROS Y OPERATIVOS GLOBALES)
          ========================================================================= */}
      {(role === 'ADMIN' || role === 'CONTABILIDAD') && (
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {/* KPI 1: Recaudo en Caja Hoy */}
          <div className="flex flex-col justify-between overflow-hidden rounded-2xl border border-[#E4BDD0] bg-white shadow-xs dark:border-[#332B2F] dark:bg-[#1B181A]">
            <div className="flex items-center justify-between border-b border-[#F2E0E8] bg-gradient-to-r from-[#FAF0F5] to-white px-4 py-2.5 dark:border-[#2C2528] dark:from-[#241E21] dark:to-[#1B181A]">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#6E5A63] dark:text-[#D8C5CE]">
                1. Recaudo en Caja Hoy
              </span>
              <span className="epb-pink-surface flex h-7 w-7 items-center justify-center rounded-lg bg-[#ECCCD9] !text-[#141213]">
                <Wallet className="h-3.5 w-3.5" />
              </span>
            </div>

            <div className="px-4 py-3">
              <div className="text-2xl font-bold tracking-tight text-[#141213] dark:text-white">
                {formatCop(cashPulse.grandTotalCop)}
              </div>
              <div className="mt-0.5 text-[11px] text-neutral-500 dark:text-[#B8A9B1]">
                {cashPulse.salesCount + cashPulse.tuitionCount + cashPulse.finesCount} operaciones registradas hoy
              </div>
            </div>

            <div className="grid grid-cols-2 divide-x divide-[#F0DCE5] border-t border-[#F0DCE5] bg-[#FDF8FA] dark:divide-[#2C2528] dark:border-[#2C2528] dark:bg-[#171416]">
              <div className="px-3.5 py-2.5">
                <div className="flex items-center gap-1 text-[10px] font-semibold text-neutral-500 dark:text-[#B8A9B1]">
                  <Banknote className="h-3 w-3 text-emerald-600" />
                  Efectivo Cajón
                </div>
                <div className="mt-0.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                  {formatCop(cashPulse.expectedCashCop)}
                </div>
              </div>
              <div className="px-3.5 py-2.5">
                <div className="flex items-center gap-1 text-[10px] font-semibold text-neutral-500 dark:text-[#B8A9B1]">
                  <CreditCard className="h-3 w-3 text-sky-600" />
                  Transferencias
                </div>
                <div className="mt-0.5 text-xs font-bold text-sky-700 dark:text-sky-400">
                  {formatCop(cashPulse.expectedTransfCop)}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-[#F0DCE5] bg-[#FAF0F5]/80 px-4 py-2 text-[11px] font-semibold text-[#141213] dark:border-[#2C2528] dark:bg-[#221D20] dark:text-[#ECCCD9]">
              <span>POS: {formatCop(cashPulse.salesTotalCop)}</span>
              <span>Abonos: {formatCop(cashPulse.tuitionTotalCop)}</span>
            </div>
          </div>

          {/* KPI 2: Salones & Asistencia del Día */}
          <div className="flex flex-col justify-between overflow-hidden rounded-2xl border border-[#E4BDD0] bg-white shadow-xs dark:border-[#332B2F] dark:bg-[#1B181A]">
            <div className="flex items-center justify-between border-b border-[#F2E0E8] bg-gradient-to-r from-[#FAF0F5] to-white px-4 py-2.5 dark:border-[#2C2528] dark:from-[#241E21] dark:to-[#1B181A]">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#6E5A63] dark:text-[#D8C5CE]">
                2. Ocupación & Asistencia
              </span>
              <span className="epb-pink-surface flex h-7 w-7 items-center justify-center rounded-lg bg-[#ECCCD9] !text-[#141213]">
                <CalendarDays className="h-3.5 w-3.5" />
              </span>
            </div>

            <div className="px-4 py-3">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold tracking-tight text-[#141213] dark:text-white">
                  {academicToday.schedulesCount} Salones
                </span>
                <span className="rounded-full bg-[#F5DCE7] px-2 py-0.5 text-[10px] font-bold text-[#141213] dark:bg-[#2C2428] dark:text-[#ECCCD9]">
                  {academicToday.totalEnrolledToday} inscritas
                </span>
              </div>
              <div className="mt-0.5 text-[11px] text-neutral-500 dark:text-[#B8A9B1]">
                {academicToday.isShowingTodayExact
                  ? 'Grupos programados en la jornada de hoy'
                  : 'Grupos activos en el calendario académico'}
              </div>
            </div>

            <div className="grid grid-cols-3 divide-x divide-[#F0DCE5] border-t border-[#F0DCE5] bg-[#FDF8FA] text-center dark:divide-[#2C2528] dark:border-[#2C2528] dark:bg-[#171416]">
              <div className="py-2.5">
                <div className="text-[10px] font-semibold text-neutral-500 dark:text-[#B8A9B1]">
                  Presentes
                </div>
                <div className="mt-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  {academicToday.presentCount}
                </div>
              </div>
              <div className="py-2.5">
                <div className="text-[10px] font-semibold text-neutral-500 dark:text-[#B8A9B1]">
                  Ausentes
                </div>
                <div className="mt-0.5 text-xs font-bold text-rose-600 dark:text-rose-400">
                  {academicToday.absentCount}
                </div>
              </div>
              <div className="py-2.5">
                <div className="text-[10px] font-semibold text-neutral-500 dark:text-[#B8A9B1]">
                  Reprog.
                </div>
                <div className="mt-0.5 text-xs font-bold text-amber-600 dark:text-amber-400">
                  {academicToday.rescheduledCount}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-[#F0DCE5] bg-[#FAF0F5]/80 px-4 py-2 text-[11px] font-semibold dark:border-[#2C2528] dark:bg-[#221D20]">
              <span className="text-neutral-600 dark:text-[#C7B8C0]">En salón con deuda:</span>
              <span className="font-bold text-rose-600 dark:text-rose-400">
                {academicToday.studentsInClassWithDebt.length} alumna(s)
              </span>
            </div>
          </div>

          {/* KPI 3: Cartera Académica Activa */}
          <div className="flex flex-col justify-between overflow-hidden rounded-2xl border border-[#E4BDD0] bg-white shadow-xs dark:border-[#332B2F] dark:bg-[#1B181A]">
            <div className="flex items-center justify-between border-b border-[#F2E0E8] bg-gradient-to-r from-[#FAF0F5] to-white px-4 py-2.5 dark:border-[#2C2528] dark:from-[#241E21] dark:to-[#1B181A]">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#6E5A63] dark:text-[#D8C5CE]">
                3. Cartera Académica
              </span>
              <span className="epb-pink-surface flex h-7 w-7 items-center justify-center rounded-lg bg-[#ECCCD9] !text-[#141213]">
                <Receipt className="h-3.5 w-3.5" />
              </span>
            </div>

            <div className="px-4 py-3">
              <div className="text-2xl font-bold tracking-tight text-rose-600 dark:text-rose-400">
                {formatCop(portfolio.totalPendingBalanceCop)}
              </div>
              <div className="mt-0.5 text-[11px] text-neutral-500 dark:text-[#B8A9B1]">
                Saldo total pendiente de cobro en matrículas y cuotas
              </div>
            </div>

            <div className="grid grid-cols-2 divide-x divide-[#F0DCE5] border-t border-[#F0DCE5] bg-[#FDF8FA] dark:divide-[#2C2528] dark:border-[#2C2528] dark:bg-[#171416]">
              <div className="px-3.5 py-2.5">
                <div className="text-[10px] font-semibold text-neutral-500 dark:text-[#B8A9B1]">
                  Alumnas con Saldo
                </div>
                <div className="mt-0.5 text-xs font-bold text-[#141213] dark:text-white">
                  {portfolio.debtorsCount} de {portfolio.totalStudentsCount}
                </div>
              </div>
              <div className="px-3.5 py-2.5">
                <div className="text-[10px] font-semibold text-neutral-500 dark:text-[#B8A9B1]">
                  Bloqueadas Sistema
                </div>
                <div className="mt-0.5 text-xs font-bold text-amber-600 dark:text-amber-400">
                  {portfolio.blockedStudentsCount} alumna(s)
                </div>
              </div>
            </div>

            <Link
              href="/alumnos"
              className="flex items-center justify-between border-t border-[#F0DCE5] bg-[#FAF0F5]/80 px-4 py-2 text-[11px] font-bold text-[#141213] hover:bg-[#F3DCE6] dark:border-[#2C2528] dark:bg-[#221D20] dark:text-[#ECCCD9]"
            >
              <span>Gestionar estados de cuenta</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* KPI 4: Estado de Turno POS, Preventas y Stock */}
          <div className="flex flex-col justify-between overflow-hidden rounded-2xl border border-[#E4BDD0] bg-white shadow-xs dark:border-[#332B2F] dark:bg-[#1B181A]">
            <div className="flex items-center justify-between border-b border-[#F2E0E8] bg-gradient-to-r from-[#FAF0F5] to-white px-4 py-2.5 dark:border-[#2C2528] dark:from-[#241E21] dark:to-[#1B181A]">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#6E5A63] dark:text-[#D8C5CE]">
                4. Turno POS & Control
              </span>
              <span className="epb-pink-surface flex h-7 w-7 items-center justify-center rounded-lg bg-[#ECCCD9] !text-[#141213]">
                <ShieldCheck className="h-3.5 w-3.5" />
              </span>
            </div>

            <div className="px-4 py-3">
              <div className="flex items-center gap-2">
                {cashPulse.shiftStatus === 'ABIERTO' ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    TURNO POS ABIERTO
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-200 px-3 py-1 text-xs font-bold text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                    CIERRE Z REALIZADO
                  </span>
                )}
              </div>
              <div className="mt-1 text-[11px] text-neutral-500 dark:text-[#B8A9B1]">
                {cashPulse.lastCloseInfo
                  ? `Cerrado hoy por ${cashPulse.lastCloseInfo.closedBy}`
                  : 'Gaveta y terminal listas para facturación'}
              </div>
            </div>

            <div className="grid grid-cols-2 divide-x divide-[#F0DCE5] border-t border-[#F0DCE5] bg-[#FDF8FA] dark:divide-[#2C2528] dark:border-[#2C2528] dark:bg-[#171416]">
              <div className="px-3.5 py-2.5">
                <div className="text-[10px] font-semibold text-neutral-500 dark:text-[#B8A9B1]">
                  Preventas 3d / 24h
                </div>
                <div className="mt-0.5 text-xs font-bold text-[#141213] dark:text-white">
                  {commercial.activePresalesCount} protegidas
                </div>
              </div>
              <div className="px-3.5 py-2.5">
                <div className="text-[10px] font-semibold text-neutral-500 dark:text-[#B8A9B1]">
                  Stock Crítico
                </div>
                <div
                  className={`mt-0.5 text-xs font-bold ${
                    inventory.criticalCount > 0
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  {inventory.criticalCount} alertas
                </div>
              </div>
            </div>

            <Link
              href="/ventas"
              className="flex items-center justify-between border-t border-[#F0DCE5] bg-[#FAF0F5]/80 px-4 py-2 text-[11px] font-bold text-[#141213] hover:bg-[#F3DCE6] dark:border-[#2C2528] dark:bg-[#221D20] dark:text-[#ECCCD9]"
            >
              <span>Ir a Arqueo y Cierre Z</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </section>
      )}

      {/* =========================================================================
          ZONA OPERATIVA COMPARTIDA (ADMIN, CONTABILIDAD, ASESOR):
          SALONES EN VIVO + BANDEJA UNIFICADA DE CARTERA Y COBRO DE ABONOS
          ========================================================================= */}
      {(role === 'ADMIN' || role === 'CONTABILIDAD' || role === 'ASESOR') && (
        <section className="grid grid-cols-1 gap-5 lg:grid-cols-12 items-stretch">
          {/* PANEL IZQUIERDO (7 cols): CONTROL DE SALONES Y OCUPACIÓN */}
          <div className="flex flex-col overflow-hidden rounded-2xl border border-[#E4BDD0] bg-white shadow-xs lg:col-span-7 dark:border-[#332B2F] dark:bg-[#1B181A]">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#EED7E2] bg-gradient-to-r from-[#F6E2EB] via-[#FAF0F5] to-white px-5 py-3.5 dark:border-[#2F272B] dark:from-[#261F23] dark:via-[#201B1E] dark:to-[#1B181A]">
              <div className="flex items-center gap-2.5">
                <span className="epb-pink-surface flex h-8 w-8 items-center justify-center rounded-xl bg-[#ECCCD9] !text-[#141213] shadow-2xs">
                  <Clock className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="text-sm font-bold text-[#141213] dark:text-white">
                    {academicToday.isShowingTodayExact
                      ? 'Control de Salones y Clases de Hoy'
                      : 'Programación de Salones y Grupos Activos'}
                  </h2>
                  <p className="text-[11px] text-neutral-600 dark:text-[#B8A9B1]">
                    Ocupación en tiempo real, docente a cargo y estado de cartera por salón
                  </p>
                </div>
              </div>
              {role !== 'CONTABILIDAD' && (
                <Link href="/agenda">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 rounded-xl border-[#E2B5C9] bg-white text-xs"
                  >
                    Abrir Agenda
                    <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
                  </Button>
                </Link>
              )}
            </div>

            <div className="flex-1 divide-y divide-[#F2E2EA] dark:divide-[#2A2327]">
              {academicToday.schedules.map((sch) => {
                const occupancyPct = Math.min(
                  100,
                  Math.round((sch.enrolledCount / Math.max(1, sch.maxStudents)) * 100)
                );
                return (
                  <div
                    key={sch.id}
                    className="p-4 transition-colors hover:bg-[#FDF8FA] dark:hover:bg-[#211C1F]"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="space-y-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="epb-pink-surface inline-flex items-center gap-1 rounded-lg bg-[#ECCCD9] px-2.5 py-0.5 text-[11px] font-bold !text-[#141213]">
                            <Building2 className="h-3 w-3" />
                            {sch.roomName}
                          </span>
                          <span className="text-xs font-bold text-[#141213] dark:text-white">
                            {sch.title}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-neutral-600 dark:text-[#B8A9B1]">
                          <span>
                            Docente:{' '}
                            <strong className="text-[#141213] dark:text-white">
                              {sch.teacherName}
                            </strong>
                          </span>
                          <span>•</span>
                          <span className="rounded-md bg-[#F7EBF0] px-2 py-0.5 font-medium text-[#141213] dark:bg-[#2A2326] dark:text-[#ECCCD9]">
                            {new Date(sch.startTime).toLocaleTimeString('es-CO', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}{' '}
                            -{' '}
                            {new Date(sch.endTime).toLocaleTimeString('es-CO', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                        <Badge variant="success" className="text-[10px]">
                          {sch.presentCount} Presentes
                        </Badge>
                        {sch.absentCount > 0 && (
                          <Badge variant="destructive" className="text-[10px]">
                            {sch.absentCount} Ausentes
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 flex items-center gap-3">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#F3E2EA] dark:bg-[#2C2428]">
                        <div
                          style={{ width: `${Math.max(8, occupancyPct)}%` }}
                          className="h-full rounded-full bg-gradient-to-r from-[#D98BB0] to-[#141213] dark:from-[#ECCCD9] dark:to-[#D49AB5]"
                        />
                      </div>
                      <span className="shrink-0 text-[11px] font-semibold text-neutral-600 dark:text-[#C7B8C0]">
                        Cupo {sch.enrolledCount}/{sch.maxStudents} ({occupancyPct}%)
                      </span>
                    </div>

                    {sch.debtorsInClass.length > 0 && (
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-rose-300/60 bg-rose-50/70 px-3 py-2 dark:border-rose-900/50 dark:bg-rose-950/25">
                        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                          <AlertTriangle className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
                          <span className="font-bold text-rose-800 dark:text-rose-300">
                            Alumna(s) en este salón con cuota pendiente:
                          </span>
                          {sch.debtorsInClass.map((d) => (
                            <span
                              key={d.id}
                              className="rounded-md bg-white px-2 py-0.5 text-[10px] font-bold text-rose-700 shadow-2xs dark:bg-[#1B181A] dark:text-rose-300"
                            >
                              {d.fullName} ({formatCop(d.pendingBalanceCop)})
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* PANEL DERECHO (5 cols): BANDEJA UNIFICADA DE COBRO & RECORDATORIO EN RECEPCIÓN */}
          <div className="flex flex-col overflow-hidden rounded-2xl border border-[#E4BDD0] bg-white shadow-xs lg:col-span-5 dark:border-[#332B2F] dark:bg-[#1B181A]">
            <div className="flex items-center justify-between gap-2 border-b border-[#EED7E2] bg-gradient-to-r from-[#F6E2EB] via-[#FAF0F5] to-white px-5 py-3.5 dark:border-[#2F272B] dark:from-[#261F23] dark:via-[#201B1E] dark:to-[#1B181A]">
              <div className="flex items-center gap-2.5">
                <span className="epb-pink-surface flex h-8 w-8 items-center justify-center rounded-xl bg-[#ECCCD9] !text-[#141213] shadow-2xs">
                  <Users className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="text-sm font-bold text-[#141213] dark:text-white">
                    Recepción: Cartera & Cobro de Abonos
                  </h2>
                  <p className="text-[11px] text-neutral-600 dark:text-[#B8A9B1]">
                    Prioridad para alumnas que asisten a salón con saldo pendiente
                  </p>
                </div>
              </div>
              <Badge variant={portfolio.debtorsCount > 0 ? 'destructive' : 'success'}>
                {portfolio.debtorsCount} pendientes
              </Badge>
            </div>

            <div className="flex-1 divide-y divide-[#F2E2EA] dark:divide-[#2A2327]">
              {portfolio.topDebtors.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center p-8 text-center">
                  <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                  <div className="mt-2 text-xs font-bold text-[#141213] dark:text-white">
                    Cartera al día
                  </div>
                  <p className="text-[11px] text-neutral-500">
                    Ninguna alumna registra saldo académico pendiente en este momento.
                  </p>
                </div>
              ) : (
                portfolio.topDebtors.map((student) => {
                  const isInClassroomToday = inClassDebtorIds.has(student.id);
                  return (
                    <div
                      key={student.id}
                      className={`flex items-center justify-between gap-3 p-4 transition-colors ${
                        isInClassroomToday
                          ? 'bg-[#FFF5F8] dark:bg-[#251C20]'
                          : 'hover:bg-[#FDF8FA] dark:hover:bg-[#211C1F]'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="epb-pink-surface flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#ECCCD9] text-xs font-bold !text-[#141213]">
                          {getInitials(student.fullName)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-xs font-bold text-[#141213] dark:text-white truncate">
                              {student.fullName}
                            </span>
                            {isInClassroomToday && (
                              <span className="rounded-full bg-rose-600 px-2 py-0.5 text-[9px] font-bold text-white">
                                HOY EN SALÓN
                              </span>
                            )}
                            {student.isBlocked && (
                              <Badge variant="destructive" className="text-[9px] px-1.5 py-0">
                                Bloqueada
                              </Badge>
                            )}
                          </div>
                          <div className="mt-0.5 text-[11px] text-neutral-500 dark:text-[#B8A9B1] truncate">
                            CC {student.documentId} • {student.programName}
                          </div>
                          <div className="mt-0.5 text-[10px] font-medium text-rose-700 dark:text-rose-300 truncate">
                            {student.pendingBalanceReason || 'Cuota académica pendiente'}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <span className="text-xs font-bold text-rose-600 dark:text-rose-400">
                          {formatCop(student.pendingBalanceCop)}
                        </span>
                        {canCollectAcademicPayments && (
                          <div className="flex items-center gap-1.5">
                            <a
                              href={buildWhatsAppUrl(
                                student.phone,
                                buildDebtReminderMessage({
                                  studentName: student.fullName,
                                  amountCop: student.pendingBalanceCop,
                                  reason: student.pendingBalanceReason,
                                  programName: student.programName,
                                })
                              )}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex h-7 items-center rounded-lg bg-emerald-600 px-2 text-[11px] font-bold text-white hover:bg-emerald-700"
                              title="Enviar recordatorio amable por WhatsApp"
                            >
                              WhatsApp
                            </a>
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => openPaymentModalForDebtor(student)}
                              className="h-7 rounded-lg bg-[#141213] px-2.5 text-[11px] font-bold text-[#ECCCD9] hover:bg-[#2B2528] dark:bg-[#ECCCD9] dark:!text-[#141213]"
                            >
                              <DollarSign className="mr-0.5 h-3 w-3" />
                              Registrar Abono
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex items-center justify-between border-t border-[#F0DCE5] bg-[#FAF0F5]/80 px-5 py-2.5 text-xs dark:border-[#2C2528] dark:bg-[#221D20]">
              <span className="text-[11px] font-medium text-neutral-600 dark:text-[#C7B8C0]">
                Los abonos se suman de inmediato a Caja POS
              </span>
              <Link
                href="/alumnos"
                className="text-[11px] font-bold text-[#141213] hover:underline dark:text-[#ECCCD9]"
              >
                Ver todas las alumnas →
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* =========================================================================
          ZONA OPERATIVA 2 EXCLUSIVA PARA ASESOR (PREVENTAS PROTEGIDAS + BITÁCORA DE RECEPCIÓN)
          Oculta el Consolidado Mensual de toda la escuela y las comisiones de otros vendedores
          ========================================================================= */}
      {role === 'ASESOR' && (
        <section className="grid grid-cols-1 gap-5 lg:grid-cols-12 items-stretch">
          <div className="flex flex-col overflow-hidden rounded-2xl border border-[#E4BDD0] bg-white shadow-xs lg:col-span-7 dark:border-[#332B2F] dark:bg-[#1B181A]">
            <div className="flex items-center justify-between border-b border-[#EED7E2] bg-gradient-to-r from-[#F6E2EB] via-[#FAF0F5] to-white px-5 py-3.5 dark:border-[#2F272B] dark:from-[#261F23] dark:via-[#201B1E] dark:to-[#1B181A]">
              <div className="flex items-center gap-2.5">
                <span className="epb-pink-surface flex h-8 w-8 items-center justify-center rounded-xl bg-[#ECCCD9] !text-[#141213]">
                  <ShieldCheck className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="text-sm font-bold text-[#141213] dark:text-white">
                    Seguimiento de Preventas & Prospectos (3d / 24h)
                  </h2>
                  <p className="text-[11px] text-neutral-600 dark:text-[#B8A9B1]">
                    Clientes atendidos en recepción con protección de comisión activa
                  </p>
                </div>
              </div>
              <Link href="/preventas">
                <Button variant="outline" size="sm" className="h-8 rounded-xl border-[#E2B5C9] bg-white text-xs">
                  Abrir Preventas
                </Button>
              </Link>
            </div>

            <div className="flex-1 divide-y divide-[#F2E2EA] dark:divide-[#2A2327]">
              {commercial.activePresalesList.map((pr) => (
                <div
                  key={pr.id}
                  className="flex items-center justify-between gap-3 p-4 hover:bg-[#FDF8FA] dark:hover:bg-[#211C1F]"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-[#141213] dark:text-white">
                        {pr.clientName}
                      </span>
                      <Badge variant="secondary" className="text-[10px]">
                        CC {pr.clientDocument}
                      </Badge>
                    </div>
                    <div className="mt-1 text-[11px] text-neutral-600 dark:text-[#B8A9B1]">
                      Interés: <strong>{pr.interestedCourseOrItem}</strong> • Asesor:{' '}
                      {pr.initialSellerName}
                    </div>
                  </div>
                  <Badge
                    variant={pr.status === 'PROTEGIDO_3_DIAS' ? 'success' : 'warning'}
                    className="text-[10px]"
                  >
                    {pr.status === 'PROTEGIDO_3_DIAS' ? '3 Días Activo' : '24h Activo'}
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col overflow-hidden rounded-2xl border border-[#E4BDD0] bg-white shadow-xs lg:col-span-5 dark:border-[#332B2F] dark:bg-[#1B181A]">
            <div className="flex items-center justify-between border-b border-[#EED7E2] bg-gradient-to-r from-[#F6E2EB] via-[#FAF0F5] to-white px-5 py-3.5 dark:border-[#2F272B] dark:from-[#261F23] dark:via-[#201B1E] dark:to-[#1B181A]">
              <div className="flex items-center gap-2.5">
                <span className="epb-pink-surface flex h-8 w-8 items-center justify-center rounded-xl bg-[#ECCCD9] !text-[#141213]">
                  <Receipt className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="text-sm font-bold text-[#141213] dark:text-white">
                    Últimos Recibos Académicos & Multas
                  </h2>
                  <p className="text-[11px] text-neutral-600 dark:text-[#B8A9B1]">
                    Abonos y reprogramaciones registradas en recepción
                  </p>
                </div>
              </div>
            </div>

            <div className="flex-1 divide-y divide-[#F2E2EA] dark:divide-[#2A2327]">
              {liveFeed
                .filter((item) => item.type === 'STUDENT_PAYMENT' || item.type === 'FINE_PAID')
                .map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-[#FDF8FA] dark:hover:bg-[#211C1F]"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600">
                        <GraduationCap className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-[#141213] dark:text-white truncate">
                          {item.title}
                        </div>
                        <div className="text-[11px] text-neutral-500 truncate">{item.subtitle}</div>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-xs font-bold text-emerald-700">
                        {formatCop(item.amountCop)}
                      </div>
                      <div className="text-[10px] text-neutral-500">{item.paymentMethod}</div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </section>
      )}

      {/* =========================================================================
          ZONA OPERATIVA 2 EXCLUSIVA PARA DIRECCIÓN (ADMIN) Y CONTABILIDAD:
          CONSOLIDADO FINANCIERO TOTAL DEL MES + RANKING DE COMISIONES DE TODOS + BITÁCORA GLOBAL
          ========================================================================= */}
      {(role === 'ADMIN' || role === 'CONTABILIDAD') && (
        <section className="grid grid-cols-1 gap-5 lg:grid-cols-12 items-stretch">
          {/* PANEL IZQUIERDO (7 cols): CONSOLIDADO MENSUAL + RANKING ASESORES & PRODUCTOS */}
          <div className="flex flex-col overflow-hidden rounded-2xl border border-[#E4BDD0] bg-white shadow-xs lg:col-span-7 dark:border-[#332B2F] dark:bg-[#1B181A]">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#EED7E2] bg-gradient-to-r from-[#F6E2EB] via-[#FAF0F5] to-white px-5 py-3.5 dark:border-[#2F272B] dark:from-[#261F23] dark:via-[#201B1E] dark:to-[#1B181A]">
              <div className="flex items-center gap-2.5">
                <span className="epb-pink-surface flex h-8 w-8 items-center justify-center rounded-xl bg-[#ECCCD9] !text-[#141213] shadow-2xs">
                  <TrendingUp className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="text-sm font-bold text-[#141213] dark:text-white">
                    Consolidado Mensual & Comisiones ({commercial.monthlyOverview.monthKey})
                  </h2>
                  <p className="text-[11px] text-neutral-600 dark:text-[#B8A9B1]">
                    Información Confidencial de Dirección: Ventas POS vs. Abonos Académicos y Multas
                  </p>
                </div>
              </div>
              <div className="rounded-xl bg-[#141213] px-3 py-1 text-xs font-bold text-[#ECCCD9] dark:bg-[#ECCCD9] dark:!text-[#141213]">
                Total Mes: {formatCop(commercial.monthlyOverview.schoolGrossIncomeCop)}
              </div>
            </div>

            <div className="p-5 space-y-5 flex-1">
              <div className="space-y-2">
                <div className="flex h-3.5 w-full overflow-hidden rounded-full bg-[#F5E6ED] p-0.5 dark:bg-[#2A2428]">
                  <div
                    style={{ width: `${posPct}%` }}
                    className="rounded-l-full bg-[#D98BB0] transition-all"
                    title={`Tienda POS: ${posPct}%`}
                  />
                  <div
                    style={{ width: `${tuitionPct}%` }}
                    className="bg-emerald-500 transition-all"
                    title={`Abonos Académicos: ${tuitionPct}%`}
                  />
                  <div
                    style={{ width: `${finesPct}%` }}
                    className="rounded-r-full bg-amber-500 transition-all"
                    title={`Multas: ${finesPct}%`}
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-[#EED7E2] bg-[#FDF8FA] p-3 dark:border-[#2F282C] dark:bg-[#171416]">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-neutral-600 dark:text-[#B8A9B1]">
                      <span className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-[#D98BB0]" />
                        Tienda POS
                      </span>
                      <span className="font-bold text-[#141213] dark:text-[#ECCCD9]">{posPct}%</span>
                    </div>
                    <div className="mt-1 text-sm font-bold text-[#141213] dark:text-white">
                      {formatCop(commercial.monthlyOverview.posSalesTotalCop)}
                    </div>
                    <div className="text-[10px] text-neutral-500">
                      {commercial.monthlyOverview.posSalesCount} facturas emitidas
                    </div>
                  </div>

                  <div className="rounded-xl border border-[#EED7E2] bg-[#FDF8FA] p-3 dark:border-[#2F282C] dark:bg-[#171416]">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-neutral-600 dark:text-[#B8A9B1]">
                      <span className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                        Abonos Alumnas
                      </span>
                      <span className="font-bold text-emerald-600">{tuitionPct}%</span>
                    </div>
                    <div className="mt-1 text-sm font-bold text-emerald-700 dark:text-emerald-400">
                      {formatCop(commercial.monthlyOverview.tuitionTotalCop)}
                    </div>
                    <div className="text-[10px] text-neutral-500">
                      {commercial.monthlyOverview.tuitionCount} recibos de abono
                    </div>
                  </div>

                  <div className="rounded-xl border border-[#EED7E2] bg-[#FDF8FA] p-3 dark:border-[#2F282C] dark:bg-[#171416]">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-neutral-600 dark:text-[#B8A9B1]">
                      <span className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                        Multas Pagadas
                      </span>
                      <span className="font-bold text-amber-600">{finesPct}%</span>
                    </div>
                    <div className="mt-1 text-sm font-bold text-amber-700 dark:text-amber-400">
                      {formatCop(commercial.monthlyOverview.finesTotalCop)}
                    </div>
                    <div className="text-[10px] text-neutral-500">
                      {commercial.monthlyOverview.finesCount} reprogramaciones
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 pt-1">
                <div className="rounded-xl border border-[#EED7E2] bg-[#FCF7FA] p-3.5 dark:border-[#2F282C] dark:bg-[#171416]">
                  <div className="mb-2.5 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-xs font-bold text-[#141213] dark:text-white">
                      <Award className="h-4 w-4 text-[#C86D94]" />
                      Ranking Comisiones
                    </span>
                    <Link
                      href="/reportes"
                      className="text-[10px] font-bold text-[#141213] hover:underline dark:text-[#ECCCD9]"
                    >
                      Ver detalle →
                    </Link>
                  </div>
                  <div className="space-y-2">
                    {commercial.topCommissions.length === 0 ? (
                      <div className="py-3 text-center text-xs text-neutral-500">
                        Sin comisiones registradas este mes.
                      </div>
                    ) : (
                      commercial.topCommissions.map((seller, idx) => (
                        <div
                          key={seller.sellerId}
                          className="flex items-center justify-between rounded-lg border border-[#F0DCE5] bg-white px-3 py-2 text-xs dark:border-[#2A2327] dark:bg-[#1E1A1C]"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="epb-pink-surface flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#ECCCD9] text-[10px] font-bold !text-[#141213]">
                              #{idx + 1}
                            </span>
                            <div className="min-w-0">
                              <div className="font-bold text-[#141213] dark:text-white truncate">
                                {seller.sellerName}
                              </div>
                              <div className="text-[10px] text-neutral-500">
                                {seller.salesCount} ventas ({formatCop(seller.totalSalesCop)})
                              </div>
                            </div>
                          </div>
                          <span className="shrink-0 font-bold text-emerald-600 dark:text-emerald-400">
                            {formatCop(seller.totalCommissionCop)}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="rounded-xl border border-[#EED7E2] bg-[#FCF7FA] p-3.5 dark:border-[#2F282C] dark:bg-[#171416]">
                  <div className="mb-2.5 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-xs font-bold text-[#141213] dark:text-white">
                      <Package className="h-4 w-4 text-[#C86D94]" />
                      Productos Más Vendidos
                    </span>
                    {role === 'ADMIN' && (
                      <Link
                        href="/inventario"
                        className="text-[10px] font-bold text-[#141213] hover:underline dark:text-[#ECCCD9]"
                      >
                        Inventario →
                      </Link>
                    )}
                  </div>
                  <div className="space-y-2">
                    {inventory.topProducts.length === 0 ? (
                      <div className="py-3 text-center text-xs text-neutral-500">
                        Sin ventas de productos este mes.
                      </div>
                    ) : (
                      inventory.topProducts.map((tp, idx) => (
                        <div
                          key={tp.id}
                          className="flex items-center justify-between rounded-lg border border-[#F0DCE5] bg-white px-3 py-2 text-xs dark:border-[#2A2327] dark:bg-[#1E1A1C]"
                        >
                          <div className="flex items-center gap-2 min-w-0 pr-2">
                            <span className="epb-pink-surface flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#ECCCD9] text-[10px] font-bold !text-[#141213]">
                              {idx + 1}
                            </span>
                            <span className="font-semibold text-[#141213] dark:text-white truncate">
                              {tp.name}
                            </span>
                          </div>
                          <div className="shrink-0 text-right">
                            <div className="font-bold text-[#141213] dark:text-[#ECCCD9]">
                              {formatCop(tp.revenueCop)}
                            </div>
                            <div className="text-[10px] text-neutral-500">{tp.quantitySold} uds</div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* PANEL DERECHO (5 cols): BITÁCORA EN VIVO DE CAJA + SEMÁFORO DE STOCK */}
          <div className="flex flex-col overflow-hidden rounded-2xl border border-[#E4BDD0] bg-white shadow-xs lg:col-span-5 dark:border-[#332B2F] dark:bg-[#1B181A]">
            <div className="flex items-center justify-between gap-2 border-b border-[#EED7E2] bg-gradient-to-r from-[#F6E2EB] via-[#FAF0F5] to-white px-5 py-3.5 dark:border-[#2F272B] dark:from-[#261F23] dark:via-[#201B1E] dark:to-[#1B181A]">
              <div className="flex items-center gap-2.5">
                <span className="epb-pink-surface flex h-8 w-8 items-center justify-center rounded-xl bg-[#ECCCD9] !text-[#141213] shadow-2xs">
                  <Receipt className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="text-sm font-bold text-[#141213] dark:text-white">
                    Bitácora en Vivo & Semáforo de Stock
                  </h2>
                  <p className="text-[11px] text-neutral-600 dark:text-[#B8A9B1]">
                    Últimas transacciones de caja y estado de abastecimiento
                  </p>
                </div>
              </div>
            </div>

            <div className="border-b border-[#F0DCE5] bg-[#FDF8FA] px-4 py-3 dark:border-[#2A2327] dark:bg-[#171416]">
              {inventory.criticalStockProducts.length === 0 ? (
                <div className="flex items-center justify-between rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3.5 py-2.5 text-xs">
                  <div className="flex items-center gap-2 font-semibold text-emerald-800 dark:text-emerald-300">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                    <span>
                      Inventario saludable ({inventory.totalActiveProducts} productos sobre el mínimo)
                    </span>
                  </div>
                  {role === 'ADMIN' && (
                    <Link
                      href="/inventario"
                      className="shrink-0 text-[11px] font-bold text-emerald-900 underline dark:text-emerald-200"
                    >
                      Ver stock
                    </Link>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-amber-800 dark:text-amber-300">
                    <span>Alertas de Stock Crítico ({inventory.criticalCount})</span>
                    {role === 'ADMIN' && (
                      <Link href="/inventario" className="underline">
                        Abastecer →
                      </Link>
                    )}
                  </div>
                  {inventory.criticalStockProducts.slice(0, 3).map((prod) => (
                    <div
                      key={prod.id}
                      className="flex items-center justify-between rounded-lg border border-amber-400/30 bg-white px-3 py-1.5 text-xs dark:bg-[#1E1A1C]"
                    >
                      <span className="truncate font-semibold">{prod.name}</span>
                      <Badge variant="destructive" className="text-[10px]">
                        {prod.stock} / mín {prod.minStock}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex-1 divide-y divide-[#F2E2EA] dark:divide-[#2A2327]">
              {liveFeed.map((item) => {
                const isVoid = item.type === 'SALE_VOID';
                const isTuition = item.type === 'STUDENT_PAYMENT';
                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-[#FDF8FA] dark:hover:bg-[#211C1F]"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                          isVoid
                            ? 'bg-rose-500/15 text-rose-600'
                            : isTuition
                            ? 'bg-emerald-500/15 text-emerald-600'
                            : 'epb-pink-surface bg-[#ECCCD9] !text-[#141213]'
                        }`}
                      >
                        {isVoid ? (
                          <Ban className="h-4 w-4" />
                        ) : isTuition ? (
                          <GraduationCap className="h-4 w-4" />
                        ) : (
                          <ShoppingCart className="h-4 w-4" />
                        )}
                      </span>
                      <div className="min-w-0">
                        <div
                          className={`text-xs font-bold truncate ${
                            isVoid
                              ? 'line-through text-rose-500'
                              : 'text-[#141213] dark:text-white'
                          }`}
                        >
                          {item.title}
                        </div>
                        <div className="text-[11px] text-neutral-500 dark:text-[#B8A9B1] truncate">
                          {item.subtitle}
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      <div
                        className={`text-xs font-bold ${
                          isVoid
                            ? 'line-through text-rose-500'
                            : 'text-emerald-700 dark:text-emerald-400'
                        }`}
                      >
                        {formatCop(item.amountCop)}
                      </div>
                      <div className="mt-0.5 flex items-center justify-end gap-1 text-[10px] text-neutral-500">
                        <span className="rounded bg-[#F5E6ED] px-1.5 py-0.2 font-semibold text-[#141213] dark:bg-[#2A2327] dark:text-[#ECCCD9]">
                          {item.paymentMethod}
                        </span>
                        <span>
                          {new Date(item.createdAt).toLocaleTimeString('es-CO', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Modal de Registro de Abono Académico Directo desde el Dashboard */}
      <RegisterStudentPaymentModal
        isOpen={Boolean(selectedStudentForPayment)}
        student={selectedStudentForPayment}
        operatorName={user?.fullName || 'Caja Recepción EPB'}
        onClose={() => setSelectedStudentForPayment(null)}
        onSubmit={handlePaymentSubmit}
      />
    </div>
  );
}
