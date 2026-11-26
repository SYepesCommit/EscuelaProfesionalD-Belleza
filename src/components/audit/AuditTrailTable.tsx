'use client';

import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Code2,
  DollarSign,
  Eye,
  FileSearch,
  Lock,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Unlock,
  X,
} from 'lucide-react';
import { AuditLogItem, JsonValue } from '@/interfaces/audit.interface';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatCop, formatDateTimeCo } from '@/lib/utils';

interface AuditTrailTableProps {
  logs: AuditLogItem[];
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

type AuditCategoryFilter = 'ALL' | 'FINANCIAL' | 'ALERTS' | 'OPERATIONS';

interface ActionMeta {
  label: string;
  tone: 'emerald' | 'amber' | 'red' | 'pink' | 'neutral';
  category: AuditCategoryFilter;
}

const ENTITY_LABELS: Record<string, string> = {
  User: 'Usuarios y Accesos',
  Room: 'Salones',
  ClassSchedule: 'Agenda de Clases',
  Student: 'Alumnas',
  StudentPayment: 'Abonos Académicos',
  Attendance: 'Asistencia Biométrica',
  Fine: 'Multas por Inasistencia',
  Certificate: 'Certificados y Diplomas',
  StaffTimeLog: 'Turnos de Personal',
  StaffPayrollAdjustment: 'Bonos y Vales de Nómina',
  StaffFortnightSettlement: 'Liquidación Quincenal',
  Product: 'Inventario y Catálogo',
  ClientPresale: 'Preventas (3 Días / 24h)',
  Sale: 'Ventas en Caja POS',
  Commission: 'Comisiones de Venta',
};

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Dirección / Admin',
  PROFESOR: 'Docente',
  ASESOR: 'Asesor Académico',
  VENTA: 'Ejecutivo POS',
  CONTABILIDAD: 'Contabilidad / Auditor',
};

const ACTION_META: Record<string, ActionMeta> = {
  LOGIN_SUCCESS: {
    label: 'Ingreso al Sistema',
    tone: 'emerald',
    category: 'OPERATIONS',
  },
  LOGIN_FAILED: {
    label: 'Intento de Ingreso Fallido',
    tone: 'red',
    category: 'ALERTS',
  },
  CREATE: {
    label: 'Nuevo Registro',
    tone: 'emerald',
    category: 'OPERATIONS',
  },
  UPDATE: {
    label: 'Actualización de Datos',
    tone: 'pink',
    category: 'OPERATIONS',
  },
  DELETE: {
    label: 'Desactivación / Eliminación',
    tone: 'red',
    category: 'ALERTS',
  },
  VOID_SALE: {
    label: 'Factura POS Anulada',
    tone: 'red',
    category: 'ALERTS',
  },
  DISCOUNT_APPLIED: {
    label: 'Descuento Manual en Caja',
    tone: 'amber',
    category: 'FINANCIAL',
  },
  CASH_DRAWER_OPENED: {
    label: 'Apertura de Cajón sin Venta',
    tone: 'red',
    category: 'ALERTS',
  },
  CASH_COUNT_REGISTERED: {
    label: 'Arqueo / Cierre de Caja',
    tone: 'emerald',
    category: 'FINANCIAL',
  },
  FINE_CREATED: {
    label: 'Multa por Inasistencia',
    tone: 'red',
    category: 'ALERTS',
  },
  FINE_PAID: {
    label: 'Multa Pagada en Caja',
    tone: 'emerald',
    category: 'FINANCIAL',
  },
  FINE_CANCELLED: {
    label: 'Multa Condonada (Admin)',
    tone: 'amber',
    category: 'ALERTS',
  },
  FINE_MODIFIED: {
    label: 'Multa Modificada',
    tone: 'amber',
    category: 'ALERTS',
  },
  STUDENT_PAYMENT_REGISTERED: {
    label: 'Abono a Saldo Académico',
    tone: 'emerald',
    category: 'FINANCIAL',
  },
  STUDENT_FINGERPRINT_ENROLLED: {
    label: 'Huella USB Enrolada',
    tone: 'emerald',
    category: 'OPERATIONS',
  },
  STUDENT_ACCESS_DENIED: {
    label: 'Acceso Denegado en Salón',
    tone: 'red',
    category: 'ALERTS',
  },
  STUDENT_BLOCKED: {
    label: 'Alumna Bloqueada',
    tone: 'red',
    category: 'ALERTS',
  },
  STUDENT_UNBLOCKED: {
    label: 'Alumna Desbloqueada',
    tone: 'emerald',
    category: 'OPERATIONS',
  },
  CLASS_RESCHEDULED: {
    label: 'Clase Reprogramada',
    tone: 'pink',
    category: 'OPERATIONS',
  },
  STOCK_ADJUSTED: {
    label: 'Ajuste de Inventario',
    tone: 'amber',
    category: 'OPERATIONS',
  },
  PRODUCT_PRICE_CHANGED: {
    label: 'Cambio de Precio / Costo',
    tone: 'amber',
    category: 'FINANCIAL',
  },
  STOCK_SCRAP_REGISTERED: {
    label: 'Baja de Producto (Merma/Daño)',
    tone: 'red',
    category: 'ALERTS',
  },
  CERTIFICATE_ISSUED: {
    label: 'Certificado Expedido',
    tone: 'emerald',
    category: 'OPERATIONS',
  },
  CERTIFICATE_BLOCKED_ATTEMPT: {
    label: 'Certificado Bloqueado',
    tone: 'red',
    category: 'ALERTS',
  },
  CLIENT_RELEASED: {
    label: 'Prospecto Liberado',
    tone: 'amber',
    category: 'OPERATIONS',
  },
  PRESALE_SELLER_TRANSFERRED: {
    label: 'Prospecto Reasignado (4to Día)',
    tone: 'amber',
    category: 'OPERATIONS',
  },
  COMMISSION_RATE_CHANGED: {
    label: 'Tasa de Comisión Modificada',
    tone: 'amber',
    category: 'FINANCIAL',
  },
  STAFF_TIME_MANUALLY_ADJUSTED: {
    label: 'Turno / Horas Ajustadas a Mano',
    tone: 'amber',
    category: 'FINANCIAL',
  },
  SCHEDULE_DEACTIVATED: {
    label: 'Clase Suspendida',
    tone: 'amber',
    category: 'ALERTS',
  },
  SCHEDULE_REACTIVATED: {
    label: 'Clase Reactivada',
    tone: 'emerald',
    category: 'OPERATIONS',
  },
};

const FIELD_LABELS: Record<string, string> = {
  studentName: 'Alumna',
  fullName: 'Nombre Completo',
  name: 'Nombre',
  title: 'Título de Clase',
  courseName: 'Programa / Curso',
  programName: 'Programa Técnico',
  documentId: 'Cédula / Documento',
  clientDocument: 'Documento Cliente',
  clientName: 'Cliente',
  phone: 'Teléfono',
  email: 'Correo Electrónico',
  role: 'Rol asignado',
  accessCode: 'Código de Acceso',
  sellerSecretCode: 'Código Secreto Vendedor',
  isTemporaryGuest: 'Pase Temporal Invitado',
  accessExpiresAt: 'Vencimiento de Acceso',
  expiredAt: 'Expiró el',
  method: 'Método de Ingreso',
  isActive: 'Activo',
  status: 'Estado',
  fineStatus: 'Estado de Multa',
  protectionStatus: 'Estado de Protección',
  isBlocked: 'Bloqueada',
  autoBlocked: 'Bloqueo Automático',
  unblocked: 'Desbloqueada',
  isClassRescheduled: 'Clase Reprogramada',
  verifiedByBiometry: 'Verificado con Huella USB',
  enrolled: 'Huella Enrolada',
  hasFinancialAlert: 'Con Excepción Financiera',
  lunchDeducted: 'Descuento Almuerzo (-1h)',
  amountCop: 'Valor',
  finePaidCop: 'Multa Pagada',
  pendingBalanceCop: 'Saldo Académico Pendiente',
  pendingAcademicBalanceCop: 'Saldo Académico Pendiente',
  newPendingBalanceCop: 'Nuevo Saldo Pendiente',
  pendingFinesTotalCop: 'Total Multas Pendientes',
  hourlyRateCop: 'Valor Hora',
  priceCop: 'Precio de Venta',
  costCop: 'Costo Base',
  subtotalCop: 'Subtotal',
  discountCop: 'Descuento',
  totalCop: 'Total Facturado',
  totalPaidCop: 'Total Liquidado',
  commissionCop: 'Comisión Generada',
  commissionRatePct: '% Comisión',
  stock: 'Stock Físico',
  previousStock: 'Stock Anterior',
  newStock: 'Stock Nuevo',
  minStock: 'Capacidad Tope (100%)',
  baseCapacity: 'Capacidad Tope (100%)',
  alertPercent: 'Límite de Aviso (%)',
  globalAlertPercent: 'Límite Global de Aviso (%)',
  updatedCount: 'Productos Actualizados',
  capacity: 'Cupo del Salón',
  maxStudents: 'Cupo Máximo',
  attendedHours: 'Horas Asistidas',
  requiredHours: 'Horas Requeridas',
  workedMinutes: 'Tiempo Trabajado',
  paymentMethod: 'Medio de Pago',
  paymentReference: 'Referencia / Recibo',
  receiptNumber: 'No. Recibo Oficial',
  invoiceNumber: 'No. Factura POS',
  certificateCode: 'Código de Certificado',
  fortnightKey: 'Quincena',
  type: 'Tipo de Movimiento',
  concept: 'Concepto',
  category: 'Categoría',
  sku: 'Referencia SKU',
  barcode: 'Código de Barras',
  code: 'Código Interno',
  reason: 'Motivo / Justificación',
  cancellationReason: 'Motivo de Condonación',
  deactivationReason: 'Motivo de Suspensión',
  pendingBalanceReason: 'Concepto de Saldo',
  blockReason: 'Motivo de Bloqueo',
  notes: 'Notas',
  info: 'Detalle del Evento',
  collectedByUserName: 'Recaudado por',
  cancelledByUserName: 'Autorizado por',
  operatorName: 'Operador',
  deactivatedByName: 'Suspendido por',
  startTime: 'Hora Inicio',
  endTime: 'Hora Fin',
};

// Campos de IDs internos que no aportan valor visual en el resumen de tabla si ya hay nombres
const INTERNAL_ID_KEYS = new Set([
  'studentId',
  'scheduleId',
  'missedScheduleId',
  'rescheduledScheduleId',
  'collectedByUserId',
  'cancelledByUserId',
  'roomId',
  'teacherId',
  'userId',
  'staffId',
  'productId',
  'saleId',
  'presaleId',
]);

const COP_CURRENCY_KEYS = new Set([
  'amountCop',
  'finePaidCop',
  'pendingBalanceCop',
  'pendingAcademicBalanceCop',
  'newPendingBalanceCop',
  'pendingFinesTotalCop',
  'hourlyRateCop',
  'priceCop',
  'costCop',
  'subtotalCop',
  'discountCop',
  'totalCop',
  'totalPaidCop',
  'commissionCop',
]);

const PERCENT_KEYS = new Set([
  'alertPercent',
  'globalAlertPercent',
  'commissionRatePct',
]);

const HOURS_KEYS = new Set(['attendedHours', 'requiredHours']);

const STOCK_KEYS = new Set([
  'stock',
  'previousStock',
  'newStock',
  'minStock',
  'baseCapacity',
  'capacity',
  'maxStudents',
]);

const VALUE_TRANSLATIONS: Record<string, string> = {
  PRESENTE: 'Presente en Salón',
  AUSENTE: 'Ausente (Inasistencia)',
  REPROGRAMADO: 'Reprogramada',
  PENDIENTE: 'Pendiente de Pago',
  PAGADA: 'Pagada',
  ANULADA: 'Anulada / Condonada',
  EFECTIVO: 'Efectivo',
  TRANSFERENCIA: 'Transferencia (Nequi / Banco)',
  TARJETA: 'Tarjeta Débito / Crédito',
  MIXTO: 'Pago Mixto',
  BIOMETRIA_USB: 'Huella Dactilar USB',
  CODIGO_PERSONAL: 'Código Personal',
  BONO: 'Bono (+)',
  ADELANTO: 'Vale / Adelanto (-)',
  DESCUENTO: 'Descuento (-)',
  COMPLETADA: 'Completada',
  PROTEGIDO_3_DIAS: 'Protegido (Ventana 3 Días)',
  LIBERADO_DIA_4: 'Liberado (4to Día)',
  SEGUNDA_OPORTUNIDAD_24H: '2da Oportunidad (24 Horas)',
  CERRADO_EN_VENTA: 'Cerrado en Venta POS',
  EXPIRADO_LIBRE: 'Libre Definitivo',
};

function getActionMeta(log: AuditLogItem): ActionMeta {
  const base = ACTION_META[log.action];
  if (base) {
    // Afinar etiquetas genéricas CREATE / UPDATE según la entidad
    if (log.action === 'CREATE') {
      if (log.entity === 'Attendance') {
        return {
          label: 'Asistencia Registrada',
          tone: 'emerald',
          category: 'OPERATIONS',
        };
      }
      if (log.entity === 'Sale') {
        return {
          label: 'Venta Facturada en POS',
          tone: 'emerald',
          category: 'FINANCIAL',
        };
      }
      if (log.entity === 'StaffPayrollAdjustment') {
        return {
          label: 'Ajuste de Nómina',
          tone: 'amber',
          category: 'FINANCIAL',
        };
      }
      if (log.entity === 'StaffFortnightSettlement') {
        return {
          label: 'Quincena Liquidada',
          tone: 'emerald',
          category: 'FINANCIAL',
        };
      }
      if (log.entity === 'Student') {
        return {
          label: 'Alumna Matriculada',
          tone: 'emerald',
          category: 'OPERATIONS',
        };
      }
      if (log.entity === 'Product') {
        return {
          label: 'Producto Creado',
          tone: 'emerald',
          category: 'OPERATIONS',
        };
      }
      if (log.entity === 'ClassSchedule') {
        return {
          label: 'Clase Programada',
          tone: 'emerald',
          category: 'OPERATIONS',
        };
      }
      if (log.entity === 'ClientPresale') {
        return {
          label: 'Preventa Registrada',
          tone: 'emerald',
          category: 'OPERATIONS',
        };
      }
    }
    return base;
  }
  return {
    label: log.action.replace(/_/g, ' '),
    tone: 'neutral',
    category: 'OPERATIONS',
  };
}

function getEntityLabel(entity: string): string {
  return ENTITY_LABELS[entity] ?? entity;
}

function getFieldLabel(key: string): string {
  return FIELD_LABELS[key] ?? key;
}

function formatFieldValue(key: string, val: JsonValue | undefined): string {
  if (val === null || val === undefined || val === '') return '—';

  if (typeof val === 'boolean') {
    return val ? 'Sí' : 'No';
  }

  if (typeof val === 'number') {
    if (COP_CURRENCY_KEYS.has(key) || key.toLowerCase().endsWith('cop')) {
      return formatCop(val);
    }
    if (PERCENT_KEYS.has(key)) {
      return `${val}%`;
    }
    if (HOURS_KEYS.has(key)) {
      return `${val} hrs`;
    }
    if (key === 'workedMinutes') {
      const hrs = Math.floor(val / 60);
      const mins = val % 60;
      return hrs > 0 ? `${hrs}h ${mins}m` : `${mins} min`;
    }
    if (STOCK_KEYS.has(key)) {
      return `${val} uds`;
    }
    return val.toLocaleString('es-CO');
  }

  if (typeof val === 'string') {
    if (key === 'role' && ROLE_LABELS[val]) {
      return ROLE_LABELS[val];
    }
    if (VALUE_TRANSLATIONS[val]) {
      return VALUE_TRANSLATIONS[val];
    }
    // Detectar fecha ISO
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(val)) {
      return formatDateTimeCo(val);
    }
    // Si es un ID interno largo tipo cuid
    if (INTERNAL_ID_KEYS.has(key) && val.length >= 20) {
      return `Ref #${val.slice(-6).toUpperCase()}`;
    }
    return val;
  }

  if (Array.isArray(val)) {
    return `${val.length} elementos`;
  }

  return JSON.stringify(val);
}

/**
 * Extrae el nombre o identificador humano principal del registro afectado
 */
function extractSubjectTitle(log: AuditLogItem): string {
  const n = (log.newData ?? {}) as Record<string, JsonValue>;
  const p = (log.previousData ?? {}) as Record<string, JsonValue>;

  const candidate =
    n.studentName ??
    p.studentName ??
    n.fullName ??
    p.fullName ??
    n.name ??
    p.name ??
    n.title ??
    p.title ??
    n.clientName ??
    p.clientName ??
    n.invoiceNumber ??
    p.invoiceNumber ??
    n.receiptNumber ??
    n.certificateCode ??
    n.sku ??
    p.sku ??
    n.code ??
    p.code;

  if (typeof candidate === 'string' && candidate.trim()) {
    return candidate;
  }

  if (log.entityId === 'GLOBAL_ALERT_PERCENT') {
    return 'Configuración Global de Stock';
  }

  return `Registro #${log.entityId.slice(-6).toUpperCase()}`;
}

/**
 * Construye una frase ejecutiva clara en español que explica qué ocurrió en el movimiento
 */
function buildHumanSummary(log: AuditLogItem): string {
  const n = (log.newData ?? {}) as Record<string, JsonValue>;
  const p = (log.previousData ?? {}) as Record<string, JsonValue>;
  const subject = extractSubjectTitle(log);

  if (typeof n.info === 'string') {
    return n.info;
  }

  switch (log.action) {
    case 'STOCK_ADJUSTED': {
      if (n.globalAlertPercent !== undefined) {
        return `Se actualizó el límite global de aviso de agotamiento al ${n.globalAlertPercent}% (${n.updatedCount ?? 'todos los'} productos).`;
      }
      const prevStock = p.stock !== undefined ? `${p.stock} uds` : '';
      const newStock = n.stock !== undefined ? `${n.stock} uds` : '';
      const reason = typeof n.reason === 'string' ? ` (${n.reason})` : '';
      return `Ajuste de existencias en "${subject}": ${prevStock ? `pasó de ${prevStock} a ` : ''}${newStock}${reason}.`;
    }

    case 'FINE_CREATED': {
      const amount = typeof n.amountCop === 'number' ? formatCop(n.amountCop) : '$ 40.000';
      return `Se aplicó multa por inasistencia de ${amount} a la alumna ${subject} con bloqueo preventivo.`;
    }

    case 'FINE_PAID': {
      const amount = typeof n.amountCop === 'number' ? formatCop(n.amountCop) : '$ 40.000';
      const ref = typeof n.paymentReference === 'string' ? ` (Recibo: ${n.paymentReference})` : '';
      return `Pago de multa por ${amount} y reprogramación de clase completada${ref}.`;
    }

    case 'FINE_CANCELLED': {
      const reason =
        typeof n.cancellationReason === 'string'
          ? ` — Motivo: ${n.cancellationReason}`
          : '';
      return `Multa anulada/condonada por autorización administrativa${reason}.`;
    }

    case 'STUDENT_UNBLOCKED': {
      const paid =
        typeof n.finePaidCop === 'number'
          ? ` tras pago de ${formatCop(n.finePaidCop)}`
          : '';
      const reason =
        typeof n.reason === 'string' ? ` (${n.reason})` : '';
      return `Se levantó el bloqueo académico de la alumna${paid}${reason}.`;
    }

    case 'STUDENT_PAYMENT_REGISTERED': {
      const amount = typeof n.amountCop === 'number' ? formatCop(n.amountCop) : '';
      const rem =
        typeof n.newPendingBalanceCop === 'number'
          ? ` • Saldo restante: ${formatCop(n.newPendingBalanceCop)}`
          : '';
      const rec = typeof n.receiptNumber === 'string' ? ` (${n.receiptNumber})` : '';
      return `Abono recibido de ${subject} por ${amount}${rec}${rem}.`;
    }

    case 'STUDENT_FINGERPRINT_ENROLLED': {
      return `Se enroló y cifró la huella dactilar USB de la alumna ${subject}.`;
    }

    case 'CERTIFICATE_ISSUED': {
      const code = typeof n.certificateCode === 'string' ? ` [${n.certificateCode}]` : '';
      const prog = typeof n.programName === 'string' ? ` en ${n.programName}` : '';
      return `Emisión oficial de certificado para ${subject}${prog}${code}.`;
    }

    case 'CERTIFICATE_BLOCKED_ATTEMPT': {
      const reason =
        typeof n.reason === 'string'
          ? n.reason
          : 'Restricción financiera o de horas activas';
      return `Bloqueo preventivo de certificado para ${subject}: ${reason}.`;
    }

    case 'DISCOUNT_APPLIED': {
      const disc =
        typeof n.discountCop === 'number' ? formatCop(n.discountCop) : '$ 0';
      const tot = typeof n.totalCop === 'number' ? formatCop(n.totalCop) : '';
      const inv = typeof n.invoiceNumber === 'string' ? ` (Factura ${n.invoiceNumber})` : '';
      return `Descuento manual aplicado en caja por ${disc} sobre factura${inv} • Total final cobrado: ${tot}.`;
    }

    case 'PRODUCT_PRICE_CHANGED': {
      const pPrice =
        typeof p.priceCop === 'number' ? formatCop(p.priceCop) : '';
      const nPrice =
        typeof n.priceCop === 'number' ? formatCop(n.priceCop) : '';
      return `Modificación de precio en "${subject}": precio de venta cambió de ${pPrice} a ${nPrice}.`;
    }

    case 'STUDENT_ACCESS_DENIED': {
      const reason =
        typeof n.blockReason === 'string'
          ? ` (${n.blockReason})`
          : ' por deuda o multa pendiente';
      return `ALERTA EN SALÓN: Intento de ingreso denegado a ${subject}${reason}.`;
    }

    case 'PRESALE_SELLER_TRANSFERRED': {
      const sec = typeof n.secondSellerName === 'string' ? n.secondSellerName : 'Segundo vendedor';
      return `Prospecto "${subject}" liberado en 4to día y tomado por ${sec} activando ventana de 24 horas.`;
    }

    case 'COMMISSION_RATE_CHANGED': {
      const pRate = p.commissionRatePct !== undefined ? `${p.commissionRatePct}%` : '';
      const nRate = n.commissionRatePct !== undefined ? `${n.commissionRatePct}%` : '';
      return `Modificación de tasa de comisión para ${subject}: cambió de ${pRate} a ${nRate}.`;
    }

    case 'STAFF_TIME_MANUALLY_ADJUSTED': {
      const hrs = n.workedHoursDecimal !== undefined ? `${n.workedHoursDecimal}h` : '';
      const note = typeof n.notes === 'string' ? ` — ${n.notes}` : '';
      return `Registro manual de turno para ${subject}: ${hrs} acreditadas por administración${note}.`;
    }

    case 'CASH_DRAWER_OPENED': {
      return `Apertura manual de gaveta de dinero sin transacción de venta asociada.`;
    }

    case 'CASH_COUNT_REGISTERED': {
      return `Arqueo y cierre de caja registrado al final de la jornada.`;
    }

    case 'HARDWARE_EMERGENCY_OVERRIDE_ACTIVATED': {
      const role = typeof n.role === 'string' ? n.role : 'ROL';
      const usr = typeof n.activatedForUser === 'string' ? n.activatedForUser : '';
      return `ALERTA DE SEGURIDAD: Protocolo de contingencia activado para ${usr} (${role}). Desbloqueo temporal sin huella dactilar.`;
    }

    case 'LOGIN_FAILED': {
      if (n.hasPhotoEvidence) {
        return `ALERTA MÁXIMA: Intento de adivinación de la llave maestra institucional. Evidencia fotográfica capturada por la cámara.`;
      }
      return `Intento fallido de inicio de sesión o clave de acceso incorrecta.`;
    }

    case 'STOCK_SCRAP_REGISTERED': {
      return `Baja de unidades de "${subject}" por merma, avería o vencimiento.`;
    }

    case 'VOID_SALE': {
      const reason = typeof n.voidReason === 'string' ? ` — Motivo: ${n.voidReason}` : '';
      return `Anulación de factura POS con retorno automático de unidades al inventario${reason}.`;
    }

    case 'SCHEDULE_DEACTIVATED': {
      const reason =
        typeof n.deactivationReason === 'string'
          ? ` — Motivo: ${n.deactivationReason}`
          : '';
      return `Suspensión de clase programada "${subject}"${reason}.`;
    }

    case 'SCHEDULE_REACTIVATED': {
      return `Reactivación de clase programada "${subject}" en agenda.`;
    }

    case 'LOGIN_SUCCESS': {
      const method =
        n.method === 'BIOMETRIA_USB' ? 'Huella Biométrica USB' : 'Código Personal';
      return `Inicio de sesión verificado mediante ${method}.`;
    }

    case 'LOGIN_FAILED': {
      return typeof n.reason === 'string'
        ? n.reason
        : 'Intento de acceso denegado.';
    }

    case 'DELETE': {
      return `Se desactivó o retiró "${subject}" del módulo de ${getEntityLabel(log.entity)}.`;
    }

    case 'CREATE': {
      if (log.entity === 'Attendance') {
        const status =
          n.status === 'PRESENTE' ? 'PRESENTE en salón' : String(n.status ?? '');
        const bio = n.verifiedByBiometry ? ' validada por huella USB' : '';
        return `Asistencia marcada como ${status} para ${subject}${bio}.`;
      }
      return `Se registró "${subject}" en ${getEntityLabel(log.entity)}.`;
    }

    case 'UPDATE': {
      return `Se actualizaron los datos de "${subject}" en ${getEntityLabel(log.entity)}.`;
    }

    default:
      return `Movimiento registrado sobre "${subject}" en ${getEntityLabel(log.entity)}.`;
  }
}

interface DiffChip {
  key: string;
  label: string;
  before?: string;
  after: string;
  changed: boolean;
}

/**
 * Genera píldoras comparativas legibles en español (Antes -> Después) sin JSON
 */
function buildDiffChips(log: AuditLogItem): DiffChip[] {
  const prev = (log.previousData ?? {}) as Record<string, JsonValue>;
  const next = (log.newData ?? {}) as Record<string, JsonValue>;
  const allKeys = Array.from(new Set([...Object.keys(prev), ...Object.keys(next)]));

  const chips: DiffChip[] = [];

  for (const key of allKeys) {
    if (INTERNAL_ID_KEYS.has(key)) continue;

    const pVal = prev[key];
    const nVal = next[key];

    const hasPrev = pVal !== undefined && pVal !== null;
    const hasNext = nVal !== undefined && nVal !== null;

    if (!hasPrev && !hasNext) continue;

    const pFormatted = hasPrev ? formatFieldValue(key, pVal) : undefined;
    const nFormatted = hasNext ? formatFieldValue(key, nVal) : '—';

    const changed = hasPrev && hasNext && JSON.stringify(pVal) !== JSON.stringify(nVal);

    chips.push({
      key,
      label: getFieldLabel(key),
      before: changed ? pFormatted : undefined,
      after: hasNext ? nFormatted : (pFormatted ?? '—'),
      changed,
    });
  }

  // Priorizar los campos que cambiaron primero
  return chips.sort((a, b) => (a.changed === b.changed ? 0 : a.changed ? -1 : 1));
}

export function AuditTrailTable({
  logs,
  onRefresh,
  isRefreshing = false,
}: AuditTrailTableProps) {
  const [categoryFilter, setCategoryFilter] = useState<AuditCategoryFilter>('ALL');
  const [entityFilter, setEntityFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);
  const [showRawJson, setShowRawJson] = useState(false);

  const entities = useMemo(() => {
    const s = new Set<string>();
    logs.forEach((l) => s.add(l.entity));
    return Array.from(s);
  }, [logs]);

  // Contadores de resumen forense
  const stats = useMemo(() => {
    let financial = 0;
    let alerts = 0;
    let operations = 0;
    logs.forEach((l) => {
      const meta = getActionMeta(l);
      if (meta.category === 'FINANCIAL') financial++;
      else if (meta.category === 'ALERTS') alerts++;
      else operations++;
    });
    return { total: logs.length, financial, alerts, operations };
  }, [logs]);

  const filteredLogs = useMemo(() => {
    return logs.filter((l) => {
      const meta = getActionMeta(l);
      if (categoryFilter !== 'ALL' && meta.category !== categoryFilter) {
        return false;
      }
      if (entityFilter !== 'ALL' && l.entity !== entityFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const mUser = (l.user?.fullName ?? l.userId).toLowerCase().includes(q);
        const mActionEs = meta.label.toLowerCase().includes(q);
        const mEntityEs = getEntityLabel(l.entity).toLowerCase().includes(q);
        const mSummary = buildHumanSummary(l).toLowerCase().includes(q);
        const mJson = JSON.stringify(l.newData ?? {})
          .toLowerCase()
          .includes(q);
        if (!mUser && !mActionEs && !mEntityEs && !mSummary && !mJson) {
          return false;
        }
      }
      return true;
    });
  }, [logs, categoryFilter, entityFilter, searchQuery]);

  const renderActionBadge = (log: AuditLogItem) => {
    const meta = getActionMeta(log);
    const toneClasses: Record<ActionMeta['tone'], string> = {
      emerald:
        'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800/60 dark:bg-emerald-950/60 dark:text-emerald-300',
      amber:
        'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/60 dark:text-amber-300',
      red: 'border-red-300 bg-red-50 text-red-900 dark:border-red-800/60 dark:bg-red-950/60 dark:text-red-300',
      pink: 'border-[#E4BDD0] bg-[#FAF2F6] text-[#141213] dark:border-[#3A3035] dark:bg-[#282125] dark:text-[#ECCCD9]',
      neutral:
        'border-neutral-300 bg-neutral-100 text-neutral-800 dark:border-[#3A3035] dark:bg-[#221D20] dark:text-neutral-200',
    };

    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-extrabold ${toneClasses[meta.tone]}`}
      >
        {meta.tone === 'emerald' && <CheckCircle2 className="h-3 w-3 shrink-0" />}
        {meta.tone === 'amber' && <AlertTriangle className="h-3 w-3 shrink-0" />}
        {meta.tone === 'red' && <ShieldAlert className="h-3 w-3 shrink-0" />}
        <span>{meta.label}</span>
      </span>
    );
  };

  return (
    <div className="space-y-4 min-w-0">
      {/* Tarjetas de Resumen Forense */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <button
          type="button"
          onClick={() => setCategoryFilter('ALL')}
          className={`flex flex-col justify-between rounded-2xl border p-3.5 text-left transition ${
            categoryFilter === 'ALL'
              ? 'border-[#141213] bg-[#FAF2F6] shadow-xs dark:border-[#ECCCD9] dark:bg-[#251E22]'
              : 'border-neutral-200 bg-white hover:bg-neutral-50 dark:border-[#332B2F] dark:bg-[#1B181A]'
          }`}
        >
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-neutral-500 dark:text-[#C4B5BC]">
            Total Eventos Auditados
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-black tracking-tight text-[#141213] dark:text-white">
              {stats.total}
            </span>
            <span className="text-[11px] font-bold text-[#141213] dark:text-[#ECCCD9]">
              Ver todos
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setCategoryFilter('FINANCIAL')}
          className={`flex flex-col justify-between rounded-2xl border p-3.5 text-left transition ${
            categoryFilter === 'FINANCIAL'
              ? 'border-emerald-600 bg-emerald-50/80 shadow-xs dark:border-emerald-400 dark:bg-emerald-950/40'
              : 'border-emerald-200/80 bg-white hover:bg-emerald-50/40 dark:border-emerald-900/40 dark:bg-[#1B181A]'
          }`}
        >
          <span className="flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
            <DollarSign className="h-3.5 w-3.5" />
            Dinero, Caja y Pagos
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-black tracking-tight text-emerald-700 dark:text-emerald-400">
              {stats.financial}
            </span>
            <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300">
              Recaudos y Nómina
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setCategoryFilter('ALERTS')}
          className={`flex flex-col justify-between rounded-2xl border p-3.5 text-left transition ${
            categoryFilter === 'ALERTS'
              ? 'border-red-600 bg-red-50/80 shadow-xs dark:border-red-400 dark:bg-red-950/40'
              : 'border-red-200/80 bg-white hover:bg-red-50/40 dark:border-red-900/40 dark:bg-[#1B181A]'
          }`}
        >
          <span className="flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider text-red-800 dark:text-red-300">
            <ShieldAlert className="h-3.5 w-3.5" />
            Bloqueos y Alertas
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-black tracking-tight text-red-700 dark:text-red-400">
              {stats.alerts}
            </span>
            <span className="text-[11px] font-bold text-red-800 dark:text-red-300">
              Multas y Restricciones
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setCategoryFilter('OPERATIONS')}
          className={`flex flex-col justify-between rounded-2xl border p-3.5 text-left transition ${
            categoryFilter === 'OPERATIONS'
              ? 'border-amber-600 bg-amber-50/80 shadow-xs dark:border-amber-400 dark:bg-amber-950/40'
              : 'border-amber-200/80 bg-white hover:bg-amber-50/40 dark:border-amber-900/40 dark:bg-[#1B181A]'
          }`}
        >
          <span className="flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider text-amber-900 dark:text-amber-300">
            <Sparkles className="h-3.5 w-3.5" />
            Académico e Inventario
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-black tracking-tight text-amber-700 dark:text-amber-400">
              {stats.operations}
            </span>
            <span className="text-[11px] font-bold text-amber-800 dark:text-amber-300">
              Asistencias y Stock
            </span>
          </div>
        </button>
      </div>

      <Card className="overflow-hidden border-[#E4BDD0] bg-white dark:border-[#332B2F] dark:bg-[#1B181A]">
        <CardHeader className="border-b border-[#E4BDD0]/60 bg-gradient-to-r from-[#ECCCD9]/50 to-[#FAF2F6] p-4 sm:p-5 dark:border-[#332B2F] dark:from-[#241E21] dark:to-[#1B181A]">
          <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
            <div>
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg font-bold text-[#141213] dark:text-[#F5EEF1]">
                <FileSearch className="h-5 w-5 text-[#141213] dark:text-[#ECCCD9]" />
                Historial Traducido de Movimientos ({filteredLogs.length})
              </CardTitle>
              <CardDescription className="text-xs text-neutral-600 dark:text-[#C4B5BC]">
                Lectura clara en español con comparación automática del Antes y Después de cada operación.
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {onRefresh && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onRefresh}
                  disabled={isRefreshing}
                  className="h-8 gap-1.5 text-xs font-bold dark:border-[#3A3035] dark:bg-[#221D20] dark:text-[#ECCCD9]"
                >
                  <RefreshCw
                    className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`}
                  />
                  Actualizar
                </Button>
              )}
              <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-[#141213] px-3 py-1 text-xs font-extrabold text-[#ECCCD9] dark:border dark:border-[#ECCCD9]/40">
                <ShieldCheck className="h-3.5 w-3.5" />
                Bitácora Anti-Fraude Inmutable
              </span>
            </div>
          </div>

          {/* Buscador y Filtros por Módulo en Español */}
          <div className="mt-3 flex flex-col justify-between gap-2.5 lg:flex-row lg:items-center">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setEntityFilter('ALL')}
                className={`rounded-xl border px-3 py-1 text-xs font-extrabold transition ${
                  entityFilter === 'ALL'
                    ? 'border-[#141213] bg-[#141213] text-[#ECCCD9] dark:border-[#ECCCD9] dark:bg-[#ECCCD9] dark:text-[#141213]'
                    : 'border-neutral-200 bg-white text-neutral-700 dark:border-[#3A3035] dark:bg-[#221D20] dark:text-[#E5D8DF]'
                }`}
              >
                Todos los Módulos ({logs.length})
              </button>
              {entities.map((ent) => (
                <button
                  key={ent}
                  type="button"
                  onClick={() => setEntityFilter(ent)}
                  className={`rounded-xl border px-2.5 py-1 text-xs font-extrabold transition ${
                    entityFilter === ent
                      ? 'border-[#141213] bg-[#ECCCD9] text-[#141213]'
                      : 'border-neutral-200 bg-white text-neutral-700 hover:bg-[#FAF0F5] dark:border-[#3A3035] dark:bg-[#221D20] dark:text-[#E5D8DF]'
                  }`}
                >
                  {getEntityLabel(ent)}
                </button>
              ))}
            </div>

            <div className="relative w-full lg:w-80">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar alumna, producto, recibo o responsable..."
                className="h-9 border-neutral-300 bg-white pl-9 text-xs text-[#141213] dark:border-[#3A3035] dark:bg-[#181517] dark:text-white"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {filteredLogs.length === 0 ? (
            <div className="p-10 text-center text-xs text-neutral-500 dark:text-[#B8A8B0]">
              No se encontraron movimientos para el filtro o búsqueda seleccionada.
            </div>
          ) : (
            <>
              {/* Vista Móvil (< md) */}
              <div className="divide-y divide-neutral-200 md:hidden dark:divide-[#332B2F]">
                {filteredLogs.map((log) => {
                  const summary = buildHumanSummary(log);
                  const diffChips = buildDiffChips(log).slice(0, 4);
                  const subject = extractSubjectTitle(log);

                  return (
                    <div key={log.id} className="space-y-2.5 p-4 text-xs">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-extrabold text-[#141213] dark:text-white">
                            {log.user?.fullName ?? 'Sistema EPB'}
                          </div>
                          <div className="text-[11px] text-neutral-500 dark:text-[#B8A8B0]">
                            {formatDateTimeCo(log.createdAt)} &bull;{' '}
                            {ROLE_LABELS[log.user?.role ?? ''] ?? 'Operador'}
                          </div>
                        </div>
                        {renderActionBadge(log)}
                      </div>

                      <div className="rounded-xl border border-neutral-200/80 bg-[#FAF8F9] p-2.5 dark:border-[#332B2F] dark:bg-[#221D20]">
                        <div className="text-[11px] font-extrabold text-[#141213] dark:text-[#ECCCD9]">
                          {getEntityLabel(log.entity)} &bull; {subject}
                        </div>
                        <p className="mt-0.5 text-xs text-neutral-700 dark:text-[#E5D8DF]">
                          {summary}
                        </p>
                      </div>

                      {diffChips.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {diffChips.map((chip) => (
                            <span
                              key={chip.key}
                              className={`inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[11px] font-bold ${
                                chip.changed
                                  ? 'border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-200'
                                  : 'border-neutral-200 bg-white text-neutral-700 dark:border-[#3A3035] dark:bg-[#181517] dark:text-[#C4B5BC]'
                              }`}
                            >
                              <strong className="font-extrabold">{chip.label}:</strong>
                              {chip.before !== undefined ? (
                                <>
                                  <span className="line-through opacity-70">
                                    {chip.before}
                                  </span>
                                  <ArrowRight className="h-3 w-3 shrink-0" />
                                  <span className="font-black">{chip.after}</span>
                                </>
                              ) : (
                                <span>{chip.after}</span>
                              )}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="flex justify-end pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedLog(log);
                            setShowRawJson(false);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-[#E4BDD0] bg-[#FAF2F6] px-3 py-1.5 text-xs font-extrabold text-[#141213] dark:border-[#3A3035] dark:bg-[#252023] dark:text-[#ECCCD9]"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Ver Ficha Forense
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Vista Desktop (>= md) */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow className="border-neutral-200 bg-[#FAF7F9] dark:border-[#332B2F] dark:bg-[#221D20]">
                      <TableHead className="font-bold text-[#141213] dark:text-[#ECCCD9]">
                        Fecha y Hora
                      </TableHead>
                      <TableHead className="font-bold text-[#141213] dark:text-[#ECCCD9]">
                        Responsable
                      </TableHead>
                      <TableHead className="font-bold text-[#141213] dark:text-[#ECCCD9]">
                        Módulo y Acción
                      </TableHead>
                      <TableHead className="font-bold text-[#141213] dark:text-[#ECCCD9]">
                        Descripción del Movimiento
                      </TableHead>
                      <TableHead className="font-bold text-[#141213] dark:text-[#ECCCD9]">
                        Datos y Cambios (Antes → Después)
                      </TableHead>
                      <TableHead className="text-right font-bold text-[#141213] dark:text-[#ECCCD9]">
                        Detalle
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.map((log) => {
                      const summary = buildHumanSummary(log);
                      const diffChips = buildDiffChips(log);
                      const visibleChips = diffChips.slice(0, 4);
                      const extraCount = Math.max(0, diffChips.length - 4);
                      const subject = extractSubjectTitle(log);

                      return (
                        <TableRow
                          key={log.id}
                          onClick={() => {
                            setSelectedLog(log);
                            setShowRawJson(false);
                          }}
                          className="cursor-pointer border-neutral-200 transition hover:bg-[#FAF2F6]/60 dark:border-[#332B2F] dark:hover:bg-[#252023]/60"
                        >
                          <TableCell className="whitespace-nowrap text-xs font-semibold text-[#141213] dark:text-[#E5D8DF]">
                            {formatDateTimeCo(log.createdAt)}
                          </TableCell>

                          <TableCell>
                            <div className="font-extrabold text-xs text-[#141213] dark:text-white">
                              {log.user?.fullName ?? 'Sistema EPB'}
                            </div>
                            <div className="text-[11px] font-medium text-neutral-500 dark:text-[#B8A8B0]">
                              {ROLE_LABELS[log.user?.role ?? ''] ??
                                log.user?.role ??
                                'Operador'}
                            </div>
                          </TableCell>

                          <TableCell className="space-y-1">
                            <div>{renderActionBadge(log)}</div>
                            <div className="text-[11px] font-bold text-neutral-600 dark:text-[#C4B5BC]">
                              {getEntityLabel(log.entity)}
                            </div>
                          </TableCell>

                          <TableCell className="max-w-sm">
                            <div className="text-xs font-extrabold text-[#141213] dark:text-[#ECCCD9]">
                              {subject}
                            </div>
                            <p className="mt-0.5 text-xs leading-relaxed text-neutral-700 dark:text-[#E5D8DF]">
                              {summary}
                            </p>
                          </TableCell>

                          <TableCell className="max-w-md">
                            {visibleChips.length === 0 ? (
                              <span className="text-xs text-neutral-400">
                                Registro automático
                              </span>
                            ) : (
                              <div className="flex flex-wrap gap-1.5">
                                {visibleChips.map((chip) => (
                                  <span
                                    key={chip.key}
                                    className={`inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[11px] ${
                                      chip.changed
                                        ? 'border-amber-300 bg-amber-50/90 font-extrabold text-amber-950 dark:border-amber-700/60 dark:bg-amber-950/50 dark:text-amber-200'
                                        : 'border-neutral-200 bg-[#FAF8F9] font-semibold text-neutral-800 dark:border-[#3A3035] dark:bg-[#221D20] dark:text-[#E5D8DF]'
                                    }`}
                                  >
                                    <span className="text-neutral-500 dark:text-[#B8A8B0]">
                                      {chip.label}:
                                    </span>
                                    {chip.before !== undefined ? (
                                      <>
                                        <span className="line-through opacity-75">
                                          {chip.before}
                                        </span>
                                        <ArrowRight className="h-3 w-3 shrink-0 text-amber-600 dark:text-amber-400" />
                                        <span className="font-black text-[#141213] dark:text-white">
                                          {chip.after}
                                        </span>
                                      </>
                                    ) : (
                                      <span className="font-bold text-[#141213] dark:text-white">
                                        {chip.after}
                                      </span>
                                    )}
                                  </span>
                                ))}
                                {extraCount > 0 && (
                                  <span className="inline-flex items-center rounded-lg bg-[#ECCCD9]/60 px-2 py-0.5 text-[10px] font-black text-[#141213] dark:bg-[#3A3035] dark:text-[#ECCCD9]">
                                    +{extraCount} más
                                  </span>
                                )}
                              </div>
                            )}
                          </TableCell>

                          <TableCell className="text-right">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedLog(log);
                                setShowRawJson(false);
                              }}
                              className="inline-flex items-center gap-1 rounded-xl border border-[#E4BDD0] bg-[#FAF2F6] px-2.5 py-1.5 text-xs font-extrabold text-[#141213] transition hover:bg-[#ECCCD9] dark:border-[#3A3035] dark:bg-[#252023] dark:text-[#ECCCD9]"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              <span>Ver Ficha</span>
                            </button>
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

      {/* Modal de Inspección Forense Comparativa en Español */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 sm:p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-[#E4BDD0] bg-white text-[#141213] shadow-2xl dark:border-[#3A3035] dark:bg-[#181517] dark:text-[#F5EEF1]">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#E4BDD0]/80 bg-gradient-to-r from-[#ECCCD9]/60 via-[#F6E4EC] to-[#FAF2F6] px-5 py-4 dark:border-[#332B2F] dark:from-[#261F23] dark:via-[#201A1D] dark:to-[#181517]">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  {renderActionBadge(selectedLog)}
                  <span className="rounded-full bg-[#141213] px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-[#ECCCD9]">
                    {getEntityLabel(selectedLog.entity)}
                  </span>
                </div>
                <h3 className="font-serif text-base sm:text-lg font-bold text-[#141213] dark:text-white">
                  {extractSubjectTitle(selectedLog)}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-neutral-300 bg-white text-neutral-700 transition hover:bg-neutral-100 dark:border-white/15 dark:bg-[#252023] dark:text-neutral-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 space-y-4 overflow-y-auto p-5 text-xs">
              {/* Explicación en Lenguaje Natural */}
              <div className="rounded-2xl border border-[#E4BDD0] bg-[#FAF2F6]/80 p-3.5 dark:border-[#3A3035] dark:bg-[#231B20]">
                <div className="text-[11px] font-extrabold uppercase tracking-wider text-neutral-500 dark:text-[#C4B5BC]">
                  Resumen Ejecutivo del Evento
                </div>
                <p className="mt-1 text-sm font-bold text-[#141213] dark:text-white">
                  {buildHumanSummary(selectedLog)}
                </p>
              </div>

              {/* Si hay fotografía de evidencia forense (Fototrampa de Intento de Vulneración) */}
              {(() => {
                const next = (selectedLog.newData ?? {}) as Record<string, JsonValue>;
                if (typeof next.photoSnapshot === 'string' && next.photoSnapshot.startsWith('data:image')) {
                  return (
                    <div className="rounded-2xl border-2 border-red-400 bg-red-50/70 p-4 dark:border-red-900/60 dark:bg-red-950/30 space-y-2">
                      <div className="flex items-center justify-between text-xs font-black text-red-900 dark:text-red-200">
                        <span className="flex items-center gap-1.5">
                          <ShieldAlert className="h-4 w-4 text-red-600" />
                          Evidencia Visual Forense (Fototrampa de Cámara):
                        </span>
                        <span className="rounded bg-red-600 px-2 py-0.5 text-[10px] text-white">
                          CÁMARA DISPARADA
                        </span>
                      </div>
                      <div className="flex justify-center p-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={next.photoSnapshot}
                          alt="Evidencia fotográfica de intento de vulneración"
                          className="max-h-64 rounded-xl border border-red-300 shadow-md object-cover"
                        />
                      </div>
                      <p className="text-[11px] text-center text-red-700 dark:text-red-300 font-bold">
                        Fotografía capturada automáticamente por la cámara WebRTC en el instante del intento fallido.
                      </p>
                    </div>
                  );
                }
                return null;
              })()}

              {/* Metadatos del Responsable */}
              <div className="grid grid-cols-1 gap-2.5 rounded-2xl border border-neutral-200 bg-[#FAF8F9] p-3.5 sm:grid-cols-3 dark:border-[#332B2F] dark:bg-[#201B1E]">
                <div>
                  <span className="text-[10px] font-bold uppercase text-neutral-500 dark:text-[#B8A8B0]">
                    Operador Responsable
                  </span>
                  <div className="mt-0.5 font-extrabold text-[#141213] dark:text-white">
                    {selectedLog.user?.fullName ?? 'Sistema EPB'}
                  </div>
                  <div className="text-[11px] text-neutral-500 dark:text-[#C4B5BC]">
                    {ROLE_LABELS[selectedLog.user?.role ?? ''] ?? 'Operador Autorizado'}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-neutral-500 dark:text-[#B8A8B0]">
                    Fecha y Hora Exacta
                  </span>
                  <div className="mt-0.5 font-extrabold text-[#141213] dark:text-white">
                    {formatDateTimeCo(selectedLog.createdAt)}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-neutral-500 dark:text-[#B8A8B0]">
                    Módulo y Código Interno
                  </span>
                  <div className="mt-0.5 font-extrabold text-[#141213] dark:text-white">
                    {getEntityLabel(selectedLog.entity)}
                  </div>
                  <div className="font-mono text-[10px] text-neutral-500 dark:text-[#C4B5BC]">
                    Ref #{selectedLog.entityId.slice(-8).toUpperCase()}
                  </div>
                </div>
              </div>

              {/* Tabla Comparativa Antes vs Después en Español */}
              <div className="space-y-2">
                <div className="font-extrabold uppercase tracking-wider text-[11px] text-[#141213] dark:text-[#ECCCD9]">
                  Desglose de Datos Registrados (Comparativa Antes vs Después)
                </div>

                <div className="overflow-hidden rounded-2xl border border-neutral-200 dark:border-[#332B2F]">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-[#FAF7F9] dark:bg-[#221D20]">
                        <TableHead className="text-xs font-extrabold text-[#141213] dark:text-[#ECCCD9]">
                          Campo / Concepto
                        </TableHead>
                        <TableHead className="text-xs font-extrabold text-neutral-600 dark:text-[#C4B5BC]">
                          Valor Anterior
                        </TableHead>
                        <TableHead className="text-xs font-extrabold text-[#141213] dark:text-white">
                          Valor Nuevo Aplicado
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(() => {
                        const prev = (selectedLog.previousData ?? {}) as Record<
                          string,
                          JsonValue
                        >;
                        const next = (selectedLog.newData ?? {}) as Record<
                          string,
                          JsonValue
                        >;
                        const keys = Array.from(
                          new Set([...Object.keys(prev), ...Object.keys(next)])
                        );

                        if (keys.length === 0) {
                          return (
                            <TableRow>
                              <TableCell
                                colSpan={3}
                                className="py-4 text-center text-xs text-neutral-500"
                              >
                                Sin campos adicionales en este evento.
                              </TableCell>
                            </TableRow>
                          );
                        }

                        return keys.map((key) => {
                          const hasPrev =
                            prev[key] !== undefined && prev[key] !== null;
                          const hasNext =
                            next[key] !== undefined && next[key] !== null;
                          const changed =
                            hasPrev &&
                            hasNext &&
                            JSON.stringify(prev[key]) !== JSON.stringify(next[key]);

                          return (
                            <TableRow
                              key={key}
                              className={
                                changed
                                  ? 'bg-amber-50/70 dark:bg-amber-950/25'
                                  : 'border-neutral-200 dark:border-[#332B2F]'
                              }
                            >
                              <TableCell className="font-bold text-xs text-[#141213] dark:text-[#E5D8DF]">
                                {getFieldLabel(key)}
                                {changed && (
                                  <span className="ml-1.5 rounded-full bg-amber-200 px-1.5 py-0.5 text-[9px] font-black text-amber-950 dark:bg-amber-800 dark:text-amber-100">
                                    MODIFICADO
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="text-xs text-neutral-600 dark:text-[#B8A8B0]">
                                {hasPrev ? formatFieldValue(key, prev[key]) : '—'}
                              </TableCell>
                              <TableCell className="text-xs font-extrabold text-[#141213] dark:text-[#ECCCD9]">
                                {hasNext ? formatFieldValue(key, next[key]) : '—'}
                              </TableCell>
                            </TableRow>
                          );
                        });
                      })()}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Desplegable Opcional para soporte técnico (JSON Crudo Oculto) */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowRawJson((v) => !v)}
                  className="inline-flex items-center gap-1.5 text-[11px] font-bold text-neutral-500 hover:text-[#141213] dark:text-[#B8A8B0] dark:hover:text-[#ECCCD9]"
                >
                  <Code2 className="h-3.5 w-3.5" />
                  <span>
                    {showRawJson
                      ? 'Ocultar respaldo técnico JSON'
                      : 'Ver respaldo técnico JSON (Solo soporte avanzado)'}
                  </span>
                  {showRawJson ? (
                    <ChevronUp className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5" />
                  )}
                </button>

                {showRawJson && (
                  <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <div>
                      <div className="mb-1 text-[10px] font-bold text-neutral-500">
                        JSON Anterior:
                      </div>
                      <pre className="max-h-32 overflow-auto rounded-xl border border-neutral-200 bg-neutral-100 p-2.5 font-mono text-[10px] dark:border-[#332B2F] dark:bg-[#221D20] dark:text-[#C4B5BC]">
                        {selectedLog.previousData
                          ? JSON.stringify(selectedLog.previousData, null, 2)
                          : 'null'}
                      </pre>
                    </div>
                    <div>
                      <div className="mb-1 text-[10px] font-bold text-neutral-500">
                        JSON Nuevo:
                      </div>
                      <pre className="max-h-32 overflow-auto rounded-xl border border-neutral-200 bg-neutral-100 p-2.5 font-mono text-[10px] dark:border-[#332B2F] dark:bg-[#221D20] dark:text-[#ECCCD9]">
                        {selectedLog.newData
                          ? JSON.stringify(selectedLog.newData, null, 2)
                          : 'null'}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end border-t border-neutral-200 px-5 py-3 dark:border-[#332B2F]">
              <Button
                type="button"
                variant="pink"
                onClick={() => setSelectedLog(null)}
                className="h-9 bg-[#ECCCD9] px-5 text-xs font-black text-[#141213] hover:bg-[#E4BDD0]"
              >
                Cerrar Ficha Forense
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
