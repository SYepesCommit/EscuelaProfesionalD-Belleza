import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatCop(amount: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDateTimeCo(dateInput: string | Date): string {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  return new Intl.DateTimeFormat('es-CO', {
    timeZone: 'America/Bogota',
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export function formatTimeCo(dateInput: string | Date): string {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  return new Intl.DateTimeFormat('es-CO', {
    timeZone: 'America/Bogota',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

/**
 * Extrae Año, Mes (1-12) y Día (1-31) siempre en hora oficial de Colombia (UTC-5),
 * evitando que servidores en la nube (como Railway que corren en UTC) cambien de día
 * a las 7:00 p. m. hora colombiana.
 */
export function getColombiaDateParts(date: Date = new Date()): {
  year: number;
  month: number;
  day: number;
} {
  // Desplazamos -5 horas respecto a UTC para obtener la fecha calendario exacta en Colombia
  const colombiaTime = new Date(date.getTime() - 5 * 60 * 60 * 1000);
  return {
    year: colombiaTime.getUTCFullYear(),
    month: colombiaTime.getUTCMonth() + 1,
    day: colombiaTime.getUTCDate(),
  };
}

/**
 * Retorna el inicio (00:00:00.000 -05:00) y fin (23:59:59.999 -05:00) del día en Colombia.
 */
export function getColombiaDayBounds(date: Date = new Date()): {
  startOfDay: Date;
  endOfDay: Date;
} {
  const { year, month, day } = getColombiaDateParts(date);
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return {
    startOfDay: new Date(`${year}-${mm}-${dd}T00:00:00.000-05:00`),
    endOfDay: new Date(`${year}-${mm}-${dd}T23:59:59.999-05:00`),
  };
}

/**
 * Retorna el inicio y fin exacto de un mes ("YYYY-MM") en zona horaria de Colombia (-05:00).
 */
export function getColombiaMonthBounds(monthKey: string): {
  startOfMonth: Date;
  endOfMonth: Date;
} {
  const [year, month] = monthKey.split('-').map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const mm = String(month).padStart(2, '0');
  const dd = String(lastDay).padStart(2, '0');
  return {
    startOfMonth: new Date(`${year}-${mm}-01T00:00:00.000-05:00`),
    endOfMonth: new Date(`${year}-${mm}-${dd}T23:59:59.999-05:00`),
  };
}

export function getFortnightKey(date: Date = new Date()): string {
  const { year, month, day } = getColombiaDateParts(date);
  const mm = String(month).padStart(2, '0');
  const half = day <= 15 ? 'Q1' : 'Q2';
  return `${year}-${mm}-${half}`;
}

export function getMonthKey(date: Date = new Date()): string {
  const { year, month } = getColombiaDateParts(date);
  const mm = String(month).padStart(2, '0');
  return `${year}-${mm}`;
}
