'use client';

import React, { useEffect, useState } from 'react';
import {
  BadgeDollarSign,
  Briefcase,
  CheckCircle2,
  Percent,
  Save,
  UserCheck,
  UserPlus,
  X,
} from 'lucide-react';
import { UserRoleType } from '@/interfaces/auth.interface';
import {
  StaffMemberItem,
  UpsertStaffMemberPayload,
} from '@/interfaces/staff.interface';
import {
  HOURLY_RATE_PRESETS_COP,
  STAFF_ROLE_META,
} from './staff-role-meta';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCop } from '@/lib/utils';

interface StaffMemberFormModalProps {
  isOpen: boolean;
  editingStaff: StaffMemberItem | null;
  operatorUserId: string;
  onClose: () => void;
  onSave: (payload: UpsertStaffMemberPayload) => Promise<void>;
}

const ROLE_OPTIONS: UserRoleType[] = [
  'PROFESOR',
  'ASESOR',
  'VENTA',
  'ADMIN',
  'CONTABILIDAD',
];

export function StaffMemberFormModal({
  isOpen,
  editingStaff,
  operatorUserId,
  onClose,
  onSave,
}: StaffMemberFormModalProps) {
  const [fullName, setFullName] = useState('');
  const [documentId, setDocumentId] = useState('');
  const [role, setRole] = useState<UserRoleType>('PROFESOR');
  const [hourlyRateCop, setHourlyRateCop] = useState<number>(28000);
  const [commissionRatePct, setCommissionRatePct] = useState<number>(5);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setErrorMsg(null);
    if (editingStaff) {
      setFullName(editingStaff.fullName);
      setDocumentId(editingStaff.documentId);
      setRole(editingStaff.role);
      setHourlyRateCop(editingStaff.hourlyRateCop);
      setCommissionRatePct(editingStaff.commissionRatePct ?? 0);
      setPhone(editingStaff.phone ?? '');
      setEmail(editingStaff.email ?? '');
      setAccessCode(editingStaff.accessCode ?? '');
      setIsActive(editingStaff.isActive);
    } else {
      setFullName('');
      setDocumentId('');
      setRole('PROFESOR');
      setHourlyRateCop(STAFF_ROLE_META.PROFESOR.defaultHourlyRate);
      setCommissionRatePct(5);
      setPhone('');
      setEmail('');
      setAccessCode('');
      setIsActive(true);
    }
  }, [isOpen, editingStaff]);

  if (!isOpen) return null;

  const handleRoleSelect = (newRole: UserRoleType) => {
    setRole(newRole);
    // Si estamos creando uno nuevo, sugerimos la tarifa por defecto de ese tipo de empleado
    if (!editingStaff) {
      setHourlyRateCop(STAFF_ROLE_META[newRole].defaultHourlyRate);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!fullName.trim() || fullName.trim().length < 3) {
      setErrorMsg('Ingrese el nombre completo del empleado.');
      return;
    }
    if (!documentId.trim() || documentId.trim().length < 4) {
      setErrorMsg('Ingrese un documento de identidad / cédula válido.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave({
        id: editingStaff?.id,
        fullName: fullName.trim(),
        documentId: documentId.trim(),
        role,
        hourlyRateCop: Math.max(0, Math.round(Number(hourlyRateCop) || 0)),
        commissionRatePct: Math.max(0, Number(commissionRatePct) || 0),
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        accessCode: accessCode.trim() || undefined,
        isActive,
        operatorUserId,
      });
      onClose();
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Error guardando empleado'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentRoleMeta = STAFF_ROLE_META[role];
  const sampleQuincena48h = Math.round((Number(hourlyRateCop) || 0) * 48);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-2.5 sm:p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-[#E4BDD0] bg-white text-[#141213] shadow-2xl dark:border-[#3A3035] dark:bg-[#181517] dark:text-[#F5EEF1]">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-[#E4BDD0]/80 bg-gradient-to-r from-[#ECCCD9]/60 to-[#FAF2F6] px-4 py-3.5 sm:px-6 dark:border-[#332B2F] dark:from-[#261F23] dark:to-[#1B1719]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#ECCCD9] text-[#141213] shadow-xs">
              {editingStaff ? (
                <UserCheck className="h-5 w-5" />
              ) : (
                <UserPlus className="h-5 w-5" />
              )}
            </div>
            <div className="min-w-0">
              <h2 className="truncate font-serif text-base sm:text-lg font-bold text-[#141213] dark:text-[#F5EEF1]">
                {editingStaff
                  ? `Configurar Empleado: ${editingStaff.fullName}`
                  : 'Registrar Nuevo Empleado / Docente de Planta'}
              </h2>
              <p className="truncate text-xs text-neutral-600 dark:text-[#C4B5BC]">
                Defina tipo de empleado, valor de hora en COP y credenciales biométricas
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-neutral-300 bg-white text-neutral-700 transition hover:bg-neutral-100 dark:border-white/15 dark:bg-[#252023] dark:text-neutral-200 dark:hover:bg-[#322B2F]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form Body */}
        <form
          onSubmit={handleSubmit}
          className="flex-1 space-y-5 overflow-y-auto p-4 sm:p-6"
        >
          {errorMsg && (
            <div className="rounded-xl border border-red-400/60 bg-red-50 px-4 py-3 text-xs font-semibold text-red-900 dark:border-red-500/40 dark:bg-red-950/60 dark:text-red-200">
              {errorMsg}
            </div>
          )}

          {/* 1. Selección de Tipo de Empleado / Rol */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-[#141213] dark:text-[#ECCCD9]">
              <Briefcase className="h-3.5 w-3.5" />
              1. Tipo de Empleado / Cargo en la Escuela
            </Label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {ROLE_OPTIONS.map((r) => {
                const meta = STAFF_ROLE_META[r];
                const isSelected = role === r;
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => handleRoleSelect(r)}
                    className={`flex flex-col items-start rounded-xl border p-3 text-left transition-all ${
                      isSelected
                        ? 'border-[#141213] bg-[#ECCCD9] text-[#141213] shadow-sm dark:border-[#ECCCD9] dark:bg-[#ECCCD9] dark:text-[#141213]'
                        : 'border-neutral-200 bg-[#FAF7F9] text-[#141213] hover:border-[#E4BDD0] dark:border-[#332B2F] dark:bg-[#211C1F] dark:text-[#F5EEF1] dark:hover:border-[#ECCCD9]/50'
                    }`}
                  >
                    <div className="flex w-full items-center justify-between gap-2">
                      <span className="text-xs font-extrabold">
                        {meta.label}
                      </span>
                      {isSelected && (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-[#141213]" />
                      )}
                    </div>
                    <span
                      className={`mt-1 text-[11px] leading-tight ${
                        isSelected
                          ? 'font-medium text-[#141213]/85'
                          : 'text-neutral-500 dark:text-[#B8A8B0]'
                      }`}
                    >
                      {meta.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Valor de Hora por Empleado (COP) */}
          <div className="rounded-2xl border border-[#E4BDD0] bg-[#FAF2F6]/80 p-4 dark:border-[#3A3035] dark:bg-[#221D20]">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-[#141213] dark:text-[#ECCCD9]">
                <BadgeDollarSign className="h-4 w-4" />
                2. Valor de la Hora Laborada (COP) — {currentRoleMeta.shortLabel}
              </Label>
              <span className="rounded-full bg-[#ECCCD9] px-2.5 py-0.5 text-[11px] font-extrabold text-[#141213]">
                {formatCop(Number(hourlyRateCop) || 0)} / hora
              </span>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <Label className="text-xs text-neutral-600 dark:text-[#C4B5BC]">
                  Tarifa Exacta por Hora (Pesos Colombianos)
                </Label>
                <Input
                  type="number"
                  min={0}
                  step={500}
                  value={hourlyRateCop}
                  onChange={(e) => setHourlyRateCop(Number(e.target.value))}
                  className="mt-1 h-11 border-neutral-300 bg-white text-base font-extrabold text-[#141213] dark:border-[#3D3439] dark:bg-[#161315] dark:text-white"
                  placeholder="Ej: 28000"
                />
              </div>

              <div>
                <Label className="flex items-center gap-1 text-xs text-neutral-600 dark:text-[#C4B5BC]">
                  <Percent className="h-3 w-3" />
                  Comisión en Ventas (%)
                </Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  value={commissionRatePct}
                  onChange={(e) => setCommissionRatePct(Number(e.target.value))}
                  className="mt-1 h-11 border-neutral-300 bg-white text-sm font-bold text-[#141213] dark:border-[#3D3439] dark:bg-[#161315] dark:text-white"
                  placeholder="Ej: 5"
                />
              </div>
            </div>

            {/* Botones rápidos de tarifa por hora */}
            <div className="mt-3">
              <span className="text-[11px] font-semibold text-neutral-600 dark:text-[#C4B5BC]">
                Tarifas rápidas por hora (clic para aplicar):
              </span>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {HOURLY_RATE_PRESETS_COP.map((preset) => {
                  const active = Number(hourlyRateCop) === preset;
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setHourlyRateCop(preset)}
                      className={`rounded-lg border px-2.5 py-1 text-xs font-extrabold transition ${
                        active
                          ? 'border-[#141213] bg-[#ECCCD9] text-[#141213] shadow-xs'
                          : 'border-neutral-300 bg-white text-neutral-700 hover:bg-[#FAF0F5] dark:border-[#3A3035] dark:bg-[#181517] dark:text-[#E5D8DF] dark:hover:border-[#ECCCD9]/50'
                      }`}
                    >
                      {formatCop(preset)}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#E4BDD0]/70 bg-white/90 px-3 py-2 text-xs dark:border-[#332B2F] dark:bg-[#171416]">
              <span className="text-neutral-600 dark:text-[#C4B5BC]">
                Proyección estimada por quincena (48 horas):
              </span>
              <span className="font-extrabold text-[#141213] dark:text-[#ECCCD9]">
                {formatCop(sampleQuincena48h)}
              </span>
            </div>
          </div>

          {/* 3. Datos Personales y de Identificación */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label className="text-xs font-bold text-[#141213] dark:text-[#F5EEF1]">
                Nombre Completo *
              </Label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ej: Prof. Carolina Méndez"
                className="mt-1 border-neutral-300 bg-white text-[#141213] dark:border-[#3A3035] dark:bg-[#211C1F] dark:text-white"
                required
              />
            </div>

            <div>
              <Label className="text-xs font-bold text-[#141213] dark:text-[#F5EEF1]">
                Cédula / Documento de Identidad *
              </Label>
              <Input
                value={documentId}
                onChange={(e) => setDocumentId(e.target.value)}
                placeholder="Ej: 1098765432"
                className="mt-1 border-neutral-300 bg-white text-[#141213] dark:border-[#3A3035] dark:bg-[#211C1F] dark:text-white"
                required
              />
            </div>

            <div>
              <Label className="text-xs font-bold text-[#141213] dark:text-[#F5EEF1]">
                Teléfono / WhatsApp
              </Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Ej: 3152223344"
                className="mt-1 border-neutral-300 bg-white text-[#141213] dark:border-[#3A3035] dark:bg-[#211C1F] dark:text-white"
              />
            </div>

            <div>
              <Label className="text-xs font-bold text-[#141213] dark:text-[#F5EEF1]">
                Código Rápido de Acceso / Marcación
              </Label>
              <Input
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                placeholder="Autogenerado si se deja vacío"
                className="mt-1 border-neutral-300 bg-white text-[#141213] dark:border-[#3A3035] dark:bg-[#211C1F] dark:text-white"
              />
            </div>

            <div className="sm:col-span-2">
              <Label className="text-xs font-bold text-[#141213] dark:text-[#F5EEF1]">
                Correo Electrónico (Opcional)
              </Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="empleado@escueladbelleza.com"
                className="mt-1 border-neutral-300 bg-white text-[#141213] dark:border-[#3A3035] dark:bg-[#211C1F] dark:text-white"
              />
            </div>
          </div>

          {/* Estado activo / inactivo */}
          {editingStaff && (
            <div className="flex items-center justify-between rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-2.5 dark:border-[#332B2F] dark:bg-[#211C1F]">
              <div>
                <div className="text-xs font-bold text-[#141213] dark:text-[#F5EEF1]">
                  Estado del Empleado en Nómina
                </div>
                <div className="text-[11px] text-neutral-500 dark:text-[#B8A8B0]">
                  Desactive si el empleado ya no labora actualmente en la escuela
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsActive(!isActive)}
                className={`rounded-full px-3 py-1 text-xs font-extrabold transition ${
                  isActive
                    ? 'bg-emerald-600 text-white'
                    : 'bg-neutral-300 text-neutral-800 dark:bg-neutral-700 dark:text-neutral-200'
                }`}
              >
                {isActive ? 'ACTIVO EN PLANTA' : 'INACTIVO'}
              </button>
            </div>
          )}

          {/* Footer Buttons */}
          <div className="flex flex-wrap items-center justify-end gap-2.5 border-t border-neutral-200 pt-4 dark:border-[#332B2F]">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="dark:border-[#3A3035] dark:bg-[#221D20] dark:text-neutral-200"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="pink"
              disabled={isSubmitting}
              className="gap-1.5 bg-[#ECCCD9] font-extrabold text-[#141213] hover:bg-[#E4BDD0]"
            >
              <Save className="h-4 w-4" />
              {isSubmitting
                ? 'Guardando...'
                : editingStaff
                  ? 'Guardar Cambios de Empleado'
                  : 'Registrar Empleado'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
