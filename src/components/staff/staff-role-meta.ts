import { UserRoleType } from '@/interfaces/auth.interface';

export interface StaffRoleMeta {
  role: UserRoleType;
  label: string;
  shortLabel: string;
  description: string;
  payModelLabel: string;
  badgeClass: string;
  defaultHourlyRate: number;
}

export const STAFF_ROLE_META: Record<UserRoleType, StaffRoleMeta> = {
  PROFESOR: {
    role: 'PROFESOR',
    label: 'Docente / Instructor de Planta',
    shortLabel: 'Docente',
    description: 'Dicta clases teóricas y prácticas en los salones. Liquidación principal por horas dictadas.',
    payModelLabel: 'Pago por Hora Laborada',
    badgeClass:
      'border-[#E4BDD0] bg-[#ECCCD9] text-[#141213] dark:border-[#ECCCD9]/40 dark:bg-[#ECCCD9] dark:text-[#141213]',
    defaultHourlyRate: 28000,
  },
  ASESOR: {
    role: 'ASESOR',
    label: 'Asesor Académico / Recepción',
    shortLabel: 'Asesor / Recepción',
    description: 'Atención en recepción, matrículas, control de asistencia, agendas y prospectos.',
    payModelLabel: 'Hora + Comisión Preventa',
    badgeClass:
      'border-sky-300 bg-sky-100 text-sky-950 dark:border-sky-500/40 dark:bg-sky-950/70 dark:text-sky-200',
    defaultHourlyRate: 18000,
  },
  VENTA: {
    role: 'VENTA',
    label: 'Ejecutivo de Venta / Tienda POS',
    shortLabel: 'Ventas POS',
    description: 'Facturación en mostrador, venta de kits cosméticos y cierre comercial.',
    payModelLabel: 'Hora + % Comisión Ventas',
    badgeClass:
      'border-emerald-300 bg-emerald-100 text-emerald-950 dark:border-emerald-500/40 dark:bg-emerald-950/70 dark:text-emerald-200',
    defaultHourlyRate: 16000,
  },
  ADMIN: {
    role: 'ADMIN',
    label: 'Administrador / Dirección',
    shortLabel: 'Dirección / Admin',
    description: 'Dirección general, supervisión operativa, auditoría y gestión de personal.',
    payModelLabel: 'Planta Administrativa',
    badgeClass:
      'border-amber-300 bg-amber-100 text-amber-950 dark:border-amber-500/40 dark:bg-amber-950/70 dark:text-amber-200',
    defaultHourlyRate: 35000,
  },
  CONTABILIDAD: {
    role: 'CONTABILIDAD',
    label: 'Contabilidad / Auditoría',
    shortLabel: 'Contabilidad',
    description: 'Revisión contable, validación de cierres quincenales y soporte financiero.',
    payModelLabel: 'Honorarios / Hora',
    badgeClass:
      'border-purple-300 bg-purple-100 text-purple-950 dark:border-purple-500/40 dark:bg-purple-950/70 dark:text-purple-200',
    defaultHourlyRate: 30000,
  },
};

export const HOURLY_RATE_PRESETS_COP: number[] = [
  12000, 15000, 18000, 22000, 25000, 28000, 35000, 45000,
];

const MONTH_NAMES_ES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

export function formatFortnightHumanLabel(fortnightKey: string): string {
  if (!fortnightKey) return 'Quincena Actual';
  const match = /^(\d{4})-(\d{2})-(Q1|Q2)$/.exec(fortnightKey);
  if (!match) return fortnightKey;

  const year = match[1];
  const monthIndex = parseInt(match[2], 10) - 1;
  const q = match[3];
  const monthName = MONTH_NAMES_ES[monthIndex] ?? match[2];

  if (q === 'Q1') {
    return `1ª Quincena ${monthName} ${year} (Días 1 al 15)`;
  }
  return `2ª Quincena ${monthName} ${year} (Días 16 a Fin de Mes)`;
}

export function formatMinutesToHoursAndMinutes(totalMinutes: number): string {
  const mins = Math.max(0, Math.round(totalMinutes));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}
