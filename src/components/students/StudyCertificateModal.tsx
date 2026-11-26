'use client';

import React, { useState } from 'react';
import {
  Award,
  AlertTriangle,
  CheckCircle2,
  Printer,
  Clock,
  ShieldAlert,
  X,
  FileText,
  GraduationCap,
  Sparkles,
  QrCode,
  Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StudentItem } from '@/interfaces/student.interface';
import { formatCop } from '@/lib/utils';

export type CertificateType = 'REGULAR_STUDY' | 'GRADUATION_DIPLOMA';

interface StudyCertificateModalProps {
  isOpen: boolean;
  student: StudentItem | null;
  certificateAlert?: any;
  isAdmin: boolean;
  onClose: () => void;
  onIssueCertificate?: (force: boolean, docType?: CertificateType) => Promise<void>;
  onGenerateCertificate?: () => Promise<void>;
  onQueueCertificate: () => Promise<void>;
}

export function StudyCertificateModal({
  isOpen,
  student,
  certificateAlert,
  isAdmin,
  onClose,
  onIssueCertificate,
  onGenerateCertificate,
  onQueueCertificate,
}: StudyCertificateModalProps) {
  const [docType, setDocType] = useState<CertificateType>('REGULAR_STUDY');
  const [isBusy, setIsBusy] = useState(false);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  if (!isOpen || !student) return null;

  const hasDebt = student.pendingBalanceCop > 0 || student.pendingFinesTotalCop > 0 || student.isBlocked;
  const requiredHours = student.totalProgramHours || 120;
  const attendedHours = student.attendedHours || 0;
  const hasMetHours = attendedHours >= requiredHours;
  const canIssueDirectly = (!hasDebt && (docType !== 'GRADUATION_DIPLOMA' || hasMetHours)) || isAdmin;

  // Código único para el diploma / constancia
  const certCode = `EPB-${docType === 'GRADUATION_DIPLOMA' ? 'DIP' : 'CONST'}-${student.documentId.slice(-4)}-${new Date().getFullYear()}`;
  const graduationHours = requiredHours; // Horas de formación técnica y práctica requeridas

  const handleIssue = async (force: boolean) => {
    setIsBusy(true);
    setSuccessNotice(null);
    try {
      if (onIssueCertificate) {
        await onIssueCertificate(force, docType);
      } else if (onGenerateCertificate) {
        await onGenerateCertificate();
      }
      setSuccessNotice(
        docType === 'GRADUATION_DIPLOMA'
          ? 'Diploma de Graduación emitido y registrado en auditoría académica.'
          : 'Constancia de Matrícula y Estudio emitida exitosamente.'
      );
    } finally {
      setIsBusy(false);
    }
  };

  const handleQueue = async () => {
    setIsBusy(true);
    setSuccessNotice(null);
    try {
      await onQueueCertificate();
      setSuccessNotice('La solicitud ha quedado registrada en la Lista de Pendientes para revisión de la Dirección.');
    } finally {
      setIsBusy(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const todayFormatted = new Date().toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 sm:p-6 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-3xl max-h-[92vh] flex flex-col rounded-3xl border border-[#ECCCD9] dark:border-white/10 bg-white dark:bg-[#1E1D1D] shadow-2xl overflow-hidden">
        {/* Header Elegante */}
        <div className="border-b border-neutral-100 dark:border-white/5 bg-gradient-to-r from-[#F9EFF3] via-[#FAF1F5] to-white dark:from-[#252324] dark:to-[#1E1D1D] px-7 py-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#232222] dark:bg-[#ECCCD9] text-[#ECCCD9] dark:text-[#141213] shadow-sm">
              {docType === 'GRADUATION_DIPLOMA' ? (
                <GraduationCap className="h-6 w-6" />
              ) : (
                <FileText className="h-6 w-6" />
              )}
            </div>
            <div>
              <h3 className="font-serif text-xl font-bold text-[#1A1A1A] dark:text-neutral-100">
                {docType === 'GRADUATION_DIPLOMA'
                  ? 'Diploma de Graduación y Culminación'
                  : 'Constancia de Matrícula y Estudio'}
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Escuela Profesional D&apos; Belleza &bull; Emisión de Documentos Académicos
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-[#141213] text-neutral-400 hover:text-black dark:hover:text-white transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Selector de Tipo de Documento */}
        <div className="px-7 pt-5 pb-3 shrink-0 bg-neutral-50/50 dark:bg-white/[0.02] border-b border-neutral-100 dark:border-white/5">
          <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-2.5 block">
            Seleccione el tipo de certificación a generar:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Opción 1: Alumna Regular / Trámites */}
            <button
              type="button"
              onClick={() => {
                setDocType('REGULAR_STUDY');
                setSuccessNotice(null);
              }}
              className={`p-3.5 rounded-2xl border text-left transition flex items-start gap-3 ${
                docType === 'REGULAR_STUDY'
                  ? 'border-[#232222] dark:border-[#ECCCD9] bg-[#232222]/5 dark:bg-[#ECCCD9]/10 shadow-sm'
                  : 'border-neutral-200 dark:border-white/10 hover:border-neutral-300 dark:hover:border-white/20'
              }`}
            >
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-xl shrink-0 mt-0.5 ${
                  docType === 'REGULAR_STUDY'
                    ? 'bg-[#232222] dark:bg-[#ECCCD9] text-[#ECCCD9] dark:text-[#141213]'
                    : 'bg-neutral-100 dark:bg-white/5 text-neutral-500'
                }`}
              >
                <FileText className="h-4 w-4" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="font-serif text-sm font-bold text-[#1A1A1A] dark:text-neutral-100">
                    Constancia de Matrícula
                  </span>
                  {docType === 'REGULAR_STUDY' && (
                    <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  )}
                </div>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-tight">
                  Alumna regular activa. Para trámites personales, cajas de compensación y subsidios.
                </p>
              </div>
            </button>

            {/* Opción 2: Diploma de Graduación */}
            <button
              type="button"
              onClick={() => {
                setDocType('GRADUATION_DIPLOMA');
                setSuccessNotice(null);
              }}
              className={`p-3.5 rounded-2xl border text-left transition flex items-start gap-3 ${
                docType === 'GRADUATION_DIPLOMA'
                  ? 'border-[#7A1E46] dark:border-[#ECCCD9] bg-[#7A1E46]/5 dark:bg-[#ECCCD9]/10 shadow-sm'
                  : 'border-neutral-200 dark:border-white/10 hover:border-neutral-300 dark:hover:border-white/20'
              }`}
            >
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-xl shrink-0 mt-0.5 ${
                  docType === 'GRADUATION_DIPLOMA'
                    ? 'bg-[#7A1E46] dark:bg-[#ECCCD9] text-white dark:text-[#141213]'
                    : 'bg-neutral-100 dark:bg-white/5 text-neutral-500'
                }`}
              >
                <Award className="h-4 w-4" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="font-serif text-sm font-bold text-[#1A1A1A] dark:text-neutral-100">
                    Diploma de Graduación
                  </span>
                  {docType === 'GRADUATION_DIPLOMA' && (
                    <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  )}
                </div>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-tight">
                  Culminación total del programa (120 hrs), con código único de registro institucional.
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* Contenido / Estado Financiero */}
        <div className="p-7 space-y-5 overflow-y-auto">
          {successNotice && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 dark:border-emerald-900/40 dark:bg-emerald-950/40 p-4 text-xs font-semibold text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
              <span>{successNotice}</span>
            </div>
          )}

          {/* Bloque de Validación de Deuda / Paz y Salvo */}
          {hasDebt ? (
            <div className="rounded-2xl border border-amber-300 dark:border-amber-800/40 bg-amber-50/70 dark:bg-amber-950/20 p-4 space-y-2">
              <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-bold text-sm">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                <span>Bloqueo Financiero para Certificación</span>
              </div>
              <p className="text-xs text-amber-950/80 dark:text-amber-300 leading-relaxed">
                La estudiante <strong>{student.fullName}</strong> registra obligaciones pendientes:{' '}
                {student.pendingBalanceCop > 0 && (
                  <span>
                    Saldo de <strong>{formatCop(student.pendingBalanceCop)}</strong>{' '}
                    {student.pendingBalanceReason ? `(${student.pendingBalanceReason})` : ''}
                  </span>
                )}
                {student.pendingFinesTotalCop > 0 && (
                  <span>
                    {student.pendingBalanceCop > 0 ? ' y ' : ''}
                    Multas por <strong>{formatCop(student.pendingFinesTotalCop)}</strong>
                  </span>
                )}
                . Para emitir el documento oficial, se debe poner al día o acordar con la dirección.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/20 p-4 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-emerald-950 dark:text-emerald-200 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>Estudiante a Paz y Salvo Financiero</span>
                </span>
                <p className="text-xs text-emerald-900/80 dark:text-emerald-300 mt-0.5">
                  No registra multas pendientes ni saldos por cobrar. Habilitada para certificación.
                </p>
              </div>
              <Badge variant="success" className="text-xs font-bold">
                APROBADO
              </Badge>
            </div>
          )}

          {/* Bloque de Horas Académicas Asistidas */}
          <div className="rounded-2xl border border-neutral-200 dark:border-white/10 bg-neutral-50/70 dark:bg-white/[0.03] p-4 space-y-2">
            <div className="flex items-center justify-between font-bold text-xs">
              <span className="flex items-center gap-1.5 text-neutral-800 dark:text-neutral-200">
                <Clock className="h-4 w-4 text-[#141213] dark:text-[#ECCCD9]" />
                <span>Control de Horas Técnicas Asistidas:</span>
              </span>
              <span className="font-mono text-sm font-black text-[#141213] dark:text-[#ECCCD9]">
                {attendedHours} / {requiredHours} hrs ({Math.min(100, Math.round((attendedHours / requiredHours) * 100))}%)
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  hasMetHours ? 'bg-emerald-600' : 'bg-amber-500'
                }`}
                style={{
                  width: `${Math.min(100, Math.max(5, Math.round((attendedHours / requiredHours) * 100)))}%`,
                }}
              />
            </div>
            {docType === 'GRADUATION_DIPLOMA' && !hasMetHours && (
              <p className="text-[11px] font-semibold text-amber-800 dark:text-amber-300">
                ⚠️ Alerta: El diploma de graduación requiere el 100% de las {requiredHours} horas asistidas reglamentarias.
              </p>
            )}
          </div>

          {/* ======================================================== */}
          {/* FORMATO 1: CONSTANCIA DE MATRÍCULA Y ESTUDIO            */}
          {/* ======================================================== */}
          {docType === 'REGULAR_STUDY' && (
            <div className="rounded-3xl border-2 border-dashed border-[#ECCCD9] dark:border-white/10 bg-[#FAF1F5]/40 dark:bg-[#141213] p-8 text-center space-y-4 print:border-none print:p-0">
              <div className="space-y-1">
                <span className="text-[10px] uppercase tracking-widest font-extrabold text-[#7A1E46] dark:text-[#ECCCD9]">
                  República de Colombia &bull; Escuela Profesional D&apos; Belleza
                </span>
                <h4 className="font-serif text-2xl font-bold text-[#1A1A1A] dark:text-neutral-100">
                  CONSTANCIA DE ESTUDIOS Y MATRÍCULA
                </h4>
                <p className="text-[11px] text-neutral-500 font-semibold tracking-wider">
                  A QUIEN PUEDA INTERESAR
                </p>
              </div>

              <p className="text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed max-w-lg mx-auto pt-2 text-justify sm:text-center">
                La suscrita Dirección Académica de la <strong>ESCUELA PROFESIONAL D&apos; BELLEZA</strong> hace constar que la estudiante{' '}
                <strong>{student.fullName}</strong>, identificada con documento de identidad Nº{' '}
                <strong>{student.documentId}</strong>, se encuentra legalmente <strong>MATRICULADA Y ACTIVA</strong> cursando el programa de formación técnica y práctica de:
              </p>

              <div className="py-2">
                <span className="font-serif text-lg font-bold text-[#232222] dark:text-[#ECCCD9] px-5 py-2 rounded-xl border border-[#ECCCD9]/60 dark:border-white/10 bg-white dark:bg-[#1E1D1D] shadow-sm inline-block">
                  {student.programName}
                </span>
              </div>

              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 max-w-md mx-auto">
                Se expide la presente constancia a solicitud de la interesada para los fines y trámites personales que estime convenientes (cajas de compensación familiar, subsidios o justificaciones).
              </p>

              <div className="pt-6 flex items-center justify-around border-t border-neutral-200 dark:border-white/5 text-[11px] text-neutral-500 dark:text-neutral-400">
                <div>
                  <div className="h-9 flex items-end justify-center pb-1">
                    <span className="font-serif italic font-bold text-[#7A1E46] dark:text-[#ECCCD9]">Valentina Montoya</span>
                  </div>
                  <div className="border-t border-neutral-400 dark:border-neutral-600 pt-1 w-44 mx-auto">
                    <p className="font-bold text-neutral-700 dark:text-neutral-200">Dra. Valentina Montoya</p>
                    <p>Directora Académica</p>
                  </div>
                </div>
                <div>
                  <div className="h-9 flex items-end justify-center pb-1">
                    <span className="font-mono text-[10px] text-neutral-400">REG-EPB-MED</span>
                  </div>
                  <div className="border-t border-neutral-400 dark:border-neutral-600 pt-1 w-44 mx-auto">
                    <p className="font-bold text-neutral-700 dark:text-neutral-200">{todayFormatted}</p>
                    <p>Fecha de Expedición</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* FORMATO 2: DIPLOMA OFICIAL DE GRADUACIÓN Y CULMINACIÓN  */}
          {/* ======================================================== */}
          {docType === 'GRADUATION_DIPLOMA' && (
            <div className="rounded-3xl border-4 border-double border-[#7A1E46]/40 dark:border-[#ECCCD9]/30 bg-gradient-to-b from-[#FFF9FB] via-white to-[#FDF4F7] dark:from-[#1A1819] dark:via-[#141213] dark:to-[#1E1B1D] p-8 text-center space-y-5 shadow-inner print:border-none print:p-0">
              {/* Emblema y Título */}
              <div className="space-y-1">
                <div className="flex items-center justify-center gap-2 text-[#7A1E46] dark:text-[#ECCCD9]">
                  <Sparkles className="h-4 w-4" />
                  <span className="text-[11px] uppercase tracking-widest font-extrabold">
                    República de Colombia &bull; Educación Técnica Laboral
                  </span>
                  <Sparkles className="h-4 w-4" />
                </div>
                <h3 className="font-serif text-2xl sm:text-3xl font-extrabold tracking-wide text-[#232222] dark:text-[#ECCCD9] pt-1">
                  ESCUELA PROFESIONAL D&apos; BELLEZA
                </h3>
                <p className="text-[11px] uppercase tracking-widest text-neutral-500 dark:text-neutral-400 font-semibold">
                  Otorga el presente DIPLOMA Y CERTIFICADO DE CULMINACIÓN a:
                </p>
              </div>

              {/* Nombre de la Graduada */}
              <div className="py-2 border-y border-[#ECCCD9]/60 dark:border-white/10 max-w-lg mx-auto">
                <h4 className="font-serif text-2xl sm:text-3xl font-bold text-[#1A1A1A] dark:text-white">
                  {student.fullName}
                </h4>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                  Documento de Identidad Nº <strong>{student.documentId}</strong>
                </p>
              </div>

              {/* Texto de Graduación */}
              <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed max-w-lg mx-auto">
                Por haber cursado y aprobado satisfactoriamente todos los módulos teórico-prácticos correspondientes con una intensidad de{' '}
                <strong className="text-[#7A1E46] dark:text-[#ECCCD9]">{graduationHours} horas académicas</strong>, obteniendo la certificación técnica en:
              </p>

              {/* Programa */}
              <div>
                <span className="font-serif text-xl sm:text-2xl font-extrabold text-[#7A1E46] dark:text-[#ECCCD9] px-6 py-2.5 rounded-2xl border-2 border-[#7A1E46]/30 dark:border-[#ECCCD9]/40 bg-white/90 dark:bg-black/40 shadow-sm inline-block">
                  {student.programName}
                </span>
              </div>

              {/* Firmas y Código Único */}
              <div className="pt-6 grid grid-cols-3 items-center gap-3 border-t border-[#ECCCD9]/50 dark:border-white/5 text-[11px] text-neutral-500 dark:text-neutral-400">
                <div>
                  <div className="h-9 flex items-end justify-center pb-1">
                    <span className="font-serif italic font-bold text-[#7A1E46] dark:text-[#ECCCD9]">Valentina Montoya</span>
                  </div>
                  <div className="border-t border-neutral-400 dark:border-neutral-600 pt-1 w-32 sm:w-40 mx-auto">
                    <p className="font-bold text-neutral-700 dark:text-neutral-200">Dra. Valentina Montoya</p>
                    <p className="text-[10px]">Directora Académica</p>
                  </div>
                </div>

                {/* Código Único & QR */}
                <div className="flex flex-col items-center justify-center space-y-1">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-100 dark:bg-white/5 border border-neutral-200 dark:border-white/10 text-neutral-700 dark:text-neutral-300">
                    <QrCode className="h-6 w-6" />
                  </div>
                  <span className="font-mono text-[9px] font-bold text-[#7A1E46] dark:text-[#ECCCD9]">
                    {certCode}
                  </span>
                  <span className="text-[9px] text-neutral-400">Verificación Oficial</span>
                </div>

                <div>
                  <div className="h-9 flex items-end justify-center pb-1">
                    <span className="font-bold text-neutral-700 dark:text-neutral-300 text-xs">{todayFormatted}</span>
                  </div>
                  <div className="border-t border-neutral-400 dark:border-neutral-600 pt-1 w-32 sm:w-40 mx-auto">
                    <p className="font-bold text-neutral-700 dark:text-neutral-200">Medellín, Colombia</p>
                    <p className="text-[10px]">Acta de Grado Registrada</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Bloque de Horas Académicas Asistidas */}
          <div className="rounded-2xl border border-neutral-200 dark:border-white/10 bg-neutral-50/70 dark:bg-white/[0.03] p-4 space-y-2">
            <div className="flex items-center justify-between font-bold text-xs">
              <span className="flex items-center gap-1.5 text-neutral-800 dark:text-neutral-200">
                <Clock className="h-4 w-4 text-[#141213] dark:text-[#ECCCD9]" />
                <span>Control de Horas Técnicas Asistidas:</span>
              </span>
              <span className="font-mono text-sm font-black text-[#141213] dark:text-[#ECCCD9]">
                {attendedHours} / {requiredHours} hrs ({Math.min(100, Math.round((attendedHours / requiredHours) * 100))}%)
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  hasMetHours ? 'bg-emerald-600' : 'bg-amber-500'
                }`}
                style={{
                  width: `${Math.min(100, Math.max(5, Math.round((attendedHours / requiredHours) * 100)))}%`,
                }}
              />
            </div>
            {docType === 'GRADUATION_DIPLOMA' && !hasMetHours && (
              <p className="text-[11px] font-semibold text-amber-800 dark:text-amber-300">
                ⚠️ Alerta: El diploma de graduación requiere el 100% de las {requiredHours} horas asistidas reglamentarias.
              </p>
            )}
          </div>
        </div>

        {/* Footer con Acciones */}
        <div className="border-t border-neutral-100 dark:border-white/5 bg-neutral-50 dark:bg-[#141213] px-7 py-4 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <Button
            type="button"
            variant="outline"
            disabled={isBusy}
            onClick={onClose}
            className="text-xs"
          >
            Cerrar
          </Button>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Botón para dejar en lista de pendientes */}
            <Button
              type="button"
              variant="outline"
              disabled={isBusy}
              onClick={handleQueue}
              className="text-xs gap-1.5 border-amber-300 text-amber-900 dark:text-amber-200 hover:bg-amber-50 dark:hover:bg-amber-950/30"
              title="Dejar registrado en lista de pendientes para acordar con la administración"
            >
              <Clock className="h-4 w-4 text-amber-600" />
              <span>Dejar en Pendientes</span>
            </Button>

            {/* Si es Admin y tiene deuda, permitir forzar emisión */}
            {hasDebt && isAdmin && (
              <Button
                type="button"
                variant="destructive"
                disabled={isBusy}
                onClick={() => handleIssue(true)}
                className="text-xs font-bold gap-1.5"
                title="Autorización administrativa especial"
              >
                <ShieldAlert className="h-4 w-4" />
                <span>Autorizar como Admin</span>
              </Button>
            )}

            {/* Botón Imprimir / Generar */}
            {canIssueDirectly && (
              <Button
                type="button"
                variant="pink"
                disabled={isBusy}
                onClick={handlePrint}
                className="text-xs font-bold gap-1.5"
              >
                <Printer className="h-4 w-4" />
                <span>
                  {docType === 'GRADUATION_DIPLOMA'
                    ? 'Imprimir Diploma de Grado'
                    : 'Imprimir Constancia'}
                </span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
