'use client';

import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  Calculator,
  CheckCircle2,
  Clock,
  Edit3,
  KeyRound,
  Power,
  Search,
  ShieldCheck,
  UserCheck,
  UserPlus,
  X,
} from 'lucide-react';
import {
  CreateUserRolePayload,
  UserRoleType,
} from '@/interfaces/auth.interface';
import { SystemUserItem } from '@/services/auth.service';
import { ROLE_PERMISSIONS } from '@/lib/permissions';
import { STAFF_ROLE_META } from './staff-role-meta';
import { useUiMode } from '@/hooks/useUiMode';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatCop, formatDateTimeCo } from '@/lib/utils';

interface RolesAndGuestsPanelProps {
  users: SystemUserItem[];
  operatorUserId: string;
  onCreateUser: (payload: CreateUserRolePayload) => Promise<void>;
  onUpdateAccess: (params: {
    targetUserId: string;
    isActive?: boolean;
    fullName?: string;
    documentId?: string;
    role?: UserRoleType;
    accessCode?: string;
    sellerSecretCode?: string | null;
    hourlyRateCop?: number;
    commissionRatePct?: number;
    accessExpiresAt?: string | null;
    operatorUserId: string;
  }) => Promise<void>;
}

export function RolesAndGuestsPanel({
  users,
  operatorUserId,
  onCreateUser,
  onUpdateAccess,
}: RolesAndGuestsPanelProps) {
  const { isTouchMode } = useUiMode();

  // Estado de edición: null = Creando nuevo usuario; SystemUserItem = Editando existente
  const [editingUser, setEditingUser] = useState<SystemUserItem | null>(null);

  const [role, setRole] = useState<UserRoleType>('VENTA');
  const [documentId, setDocumentId] = useState('');
  const [fullName, setFullName] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [sellerSecretCode, setSellerSecretCode] = useState('');
  // Modalidad de remuneración: 'HOURLY' (Por Hora) vs 'CONTRACT' (Por Contrato / Salario Fijo)
  const [payScheme, setPayScheme] = useState<'HOURLY' | 'CONTRACT'>('HOURLY');
  const [hourlyRateCop, setHourlyRateCop] = useState('25000');
  const [commissionRatePct, setCommissionRatePct] = useState('0');
  const [guestDurationDays, setGuestDurationDays] = useState('7');

  const [roleFilter, setRoleFilter] = useState<'ALL' | UserRoleType>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (roleFilter !== 'ALL' && u.role !== roleFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const mName = u.fullName.toLowerCase().includes(q);
        const mDoc = u.documentId.toLowerCase().includes(q);
        const mCode = u.accessCode.toLowerCase().includes(q);
        if (!mName && !mDoc && !mCode) return false;
      }
      return true;
    });
  }, [users, roleFilter, searchQuery]);

  const handleStartEdit = (user: SystemUserItem) => {
    setEditingUser(user);
    setRole(user.role);
    setFullName(user.fullName);
    setDocumentId(user.documentId);
    setAccessCode(user.accessCode);
    setSellerSecretCode(user.sellerSecretCode || '');
    if (user.hourlyRateCop > 0) {
      setPayScheme('HOURLY');
      setHourlyRateCop(String(user.hourlyRateCop));
    } else {
      setPayScheme('CONTRACT');
      setHourlyRateCop('0');
    }
    setCommissionRatePct(String(user.commissionRatePct ?? 0));
    setFeedback(null);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleCancelEdit = () => {
    setEditingUser(null);
    setDocumentId('');
    setFullName('');
    setAccessCode('');
    setSellerSecretCode('');
    setPayScheme('HOURLY');
    setHourlyRateCop('25000');
    setCommissionRatePct('0');
    setFeedback(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    setIsSubmitting(true);

    const isGuest = role === 'CONTABILIDAD';
    const expiresDate =
      isGuest && Number(guestDurationDays) > 0
        ? new Date(
            Date.now() + Number(guestDurationDays) * 24 * 60 * 60 * 1000
          ).toISOString()
        : null;

    const effectiveAccessCode =
      accessCode.trim().toUpperCase() ||
      `${role.slice(0, 4)}-${documentId.trim().slice(-4) || '01'}`;

    const effectiveHourlyCop =
      isGuest || payScheme === 'CONTRACT' ? 0 : Math.max(0, Number(hourlyRateCop) || 0);

    const effectiveCommissionPct = isGuest
      ? 0
      : Math.max(0, Number(commissionRatePct) || 0);

    try {
      if (editingUser) {
        await onUpdateAccess({
          targetUserId: editingUser.id,
          fullName: fullName.trim(),
          documentId: documentId.trim(),
          role,
          accessCode: effectiveAccessCode,
          sellerSecretCode:
            role === 'VENTA' || role === 'ASESOR'
              ? (sellerSecretCode.trim() || effectiveAccessCode).toUpperCase()
              : null,
          hourlyRateCop: effectiveHourlyCop,
          commissionRatePct: effectiveCommissionPct,
          accessExpiresAt: isGuest ? expiresDate : null,
          operatorUserId,
        });

        setFeedback({
          type: 'success',
          text: `Datos y rol de ${fullName.trim()} actualizados correctamente.`,
        });
        setEditingUser(null);
      } else {
        await onCreateUser({
          documentId: documentId.trim(),
          fullName: fullName.trim(),
          role,
          accessCode: effectiveAccessCode,
          sellerSecretCode:
            role === 'VENTA' || role === 'ASESOR'
              ? (sellerSecretCode.trim() || effectiveAccessCode).toUpperCase()
              : undefined,
          hourlyRateCop: effectiveHourlyCop,
          commissionRatePct: effectiveCommissionPct,
          isTemporaryGuest: isGuest,
          accessExpiresAt: expiresDate,
          operatorUserId,
        });

        setFeedback({
          type: 'success',
          text: isGuest
            ? `Pase temporal de CONTABILIDAD habilitado por ${guestDurationDays} día(s).`
            : `Usuario ${fullName.trim()} (${role}) creado con código ${effectiveAccessCode}.`,
        });
      }

      setDocumentId('');
      setFullName('');
      setAccessCode('');
      setSellerSecretCode('');
      setCommissionRatePct('0');
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Error guardando usuario',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-5 min-w-0">
      {/* 1. Tarjetas de Perfiles y Permisos del Sistema */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {(
          ['ADMIN', 'ASESOR', 'VENTA', 'PROFESOR', 'CONTABILIDAD'] as UserRoleType[]
        ).map((r) => {
          const cfg = ROLE_PERMISSIONS[r];
          const meta = STAFF_ROLE_META[r];
          return (
            <div
              key={r}
              className="flex flex-col justify-between rounded-2xl border border-[#E4BDD0] bg-white p-4 shadow-xs dark:border-[#332B2F] dark:bg-[#1B181A]"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-extrabold ${meta.badgeClass}`}
                  >
                    {r}
                  </span>
                  <span className="text-[11px] font-bold text-neutral-500 dark:text-[#C4B5BC]">
                    {cfg.isReadOnly ? 'Solo Lectura' : 'Operativo'}
                  </span>
                </div>
                <h3 className="mt-2 text-sm font-extrabold text-[#141213] dark:text-white">
                  {cfg.label}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-neutral-600 dark:text-[#B8A8B0]">
                  {cfg.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* 2. Formulario Estructurado para Crear o Editar Usuario */}
      <Card className="overflow-hidden border-[#E4BDD0] bg-white dark:border-[#332B2F] dark:bg-[#1B181A]">
        <CardHeader className="border-b border-[#E4BDD0]/60 bg-gradient-to-r from-[#ECCCD9]/50 to-[#FAF2F6] p-4 sm:p-5 dark:border-[#332B2F] dark:from-[#241E21] dark:to-[#1B181A]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2 text-base font-bold text-[#141213] dark:text-[#F5EEF1]">
                {editingUser ? (
                  <>
                    <Edit3 className="h-5 w-5 text-[#141213] dark:text-[#ECCCD9]" />
                    <span>Editando Usuario: {editingUser.fullName}</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="h-5 w-5 text-[#141213] dark:text-[#ECCCD9]" />
                    <span>Registrar Nuevo Usuario o Pase Temporal</span>
                  </>
                )}
              </CardTitle>
              <CardDescription className="text-xs text-neutral-600 dark:text-[#C4B5BC]">
                {editingUser
                  ? 'Modifique el rol, nombre, documento, código/PIN de acceso, modalidad de pago o comisión.'
                  : 'Configure el perfil, su PIN/Código de acceso, modalidad de pago (Por Hora o Por Contrato) y comisión opcional.'}
              </CardDescription>
            </div>

            {editingUser && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCancelEdit}
                className="h-8 gap-1 text-xs font-bold"
              >
                <X className="h-3.5 w-3.5" />
                Cancelar Edición
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4 p-4 sm:p-5">
          {feedback && (
            <div
              className={`flex items-center justify-between gap-2 rounded-xl border px-4 py-2.5 text-xs font-bold ${
                feedback.type === 'success'
                  ? 'border-emerald-400/70 bg-emerald-50 text-emerald-950 dark:border-emerald-500/40 dark:bg-emerald-950/60 dark:text-emerald-100'
                  : 'border-red-400/70 bg-red-50 text-red-950 dark:border-red-500/40 dark:bg-red-950/60 dark:text-red-100'
              }`}
            >
              <div className="flex items-center gap-2">
                {feedback.type === 'success' ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                ) : (
                  <AlertCircle className="h-4 w-4 shrink-0" />
                )}
                <span>{feedback.text}</span>
              </div>
              <button
                type="button"
                onClick={() => setFeedback(null)}
                className="underline"
              >
                Cerrar
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* FILA 1: Identificación y Rol (4 columnas perfectamente alineadas) */}
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4 items-end">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-[#141213] dark:text-[#F5EEF1]">
                  1. Rol en el Sistema *
                </Label>
                <select
                  className="flex h-10 w-full rounded-xl border border-neutral-300 bg-white px-3 text-xs font-bold text-[#141213] dark:border-[#3A3035] dark:bg-[#221D20] dark:text-white"
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRoleType)}
                >
                  <option value="VENTA">VENTA (Caja POS & Preventas)</option>
                  <option value="ASESOR">ASESOR (Recepción & Alumnas)</option>
                  <option value="PROFESOR">PROFESOR (Salones & Asistencia)</option>
                  <option value="ADMIN">ADMIN (Dirección General)</option>
                  <option value="CONTABILIDAD">CONTABILIDAD (Invitado Lectura)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-[#141213] dark:text-[#F5EEF1]">
                  2. Nombre Completo *
                </Label>
                <Input
                  placeholder="Ej: Laura Ríos Gómez"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="h-10 text-xs border-neutral-300 bg-white text-[#141213] dark:border-[#3A3035] dark:bg-[#221D20] dark:text-white"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-[#141213] dark:text-[#F5EEF1]">
                  3. Cédula / Documento *
                </Label>
                <Input
                  placeholder="Ej: 1020304050"
                  value={documentId}
                  onChange={(e) => setDocumentId(e.target.value)}
                  className="h-10 text-xs font-mono border-neutral-300 bg-white text-[#141213] dark:border-[#3A3035] dark:bg-[#221D20] dark:text-white"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-[#141213] dark:text-[#F5EEF1]">
                    4. PIN / Código de Acceso
                  </Label>
                  <button
                    type="button"
                    onClick={() =>
                      setAccessCode(
                        `${role.slice(0, 4)}-${documentId.trim().slice(-4) || '01'}`
                      )
                    }
                    className="text-[10px] font-bold text-[#7A1E46] hover:underline dark:text-[#ECCCD9]"
                  >
                    Auto-generar
                  </button>
                </div>
                <Input
                  placeholder="Ej: LAURA-01 (o automático)"
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                  className="h-10 text-xs font-mono font-bold border-neutral-300 bg-white text-[#141213] dark:border-[#3A3035] dark:bg-[#221D20] dark:text-white"
                />
              </div>
            </div>

            {/* FILA 2: Condiciones de Pago, Contrato/Hora y Comisión Opcional */}
            <div className="rounded-2xl border border-[#E4BDD0] bg-[#FAF3F6]/70 p-4 dark:border-[#332B2F] dark:bg-[#201B1E]">
              {role === 'CONTABILIDAD' ? (
                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 items-end">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-[#141213] dark:text-[#F5EEF1]">
                      Vigencia del Pase Temporal de Contabilidad (Días)
                    </Label>
                    <select
                      className="flex h-10 w-full rounded-xl border border-amber-300 bg-amber-50 px-3 text-xs font-extrabold text-amber-950 dark:border-amber-500/50 dark:bg-amber-950/60 dark:text-amber-100"
                      value={guestDurationDays}
                      onChange={(e) => setGuestDurationDays(e.target.value)}
                    >
                      <option value="1">24 Horas (1 Día de Auditoría Contable)</option>
                      <option value="3">3 Días (Cierre Contable)</option>
                      <option value="7">7 Días (1 Semana)</option>
                      <option value="15">15 Días (Quincena)</option>
                      <option value="30">30 Días (Mes Completo)</option>
                    </select>
                  </div>
                  <div className="text-xs text-neutral-600 dark:text-[#B8A9B1] pb-2">
                    El perfil de Contabilidad es de <strong>Solo Lectura</strong> y no liquida horas ni comisiones de venta.
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4 items-end">
                  {/* Decisión: Pago por Hora vs Por Contrato */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-[#141213] dark:text-[#F5EEF1]">
                      Modalidad de Vinculación
                    </Label>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => setPayScheme('HOURLY')}
                        className={`h-10 rounded-xl border px-2.5 text-xs font-bold transition ${
                          payScheme === 'HOURLY'
                            ? 'border-[#141213] bg-[#141213] text-[#ECCCD9] dark:border-[#ECCCD9] dark:bg-[#ECCCD9] dark:!text-[#141213]'
                            : 'border-[#D9AFC2] bg-white text-[#141213] hover:bg-[#FAF0F5] dark:border-[#3A3035] dark:bg-[#161315] dark:text-white'
                        }`}
                      >
                        Por Hora
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPayScheme('CONTRACT');
                          setHourlyRateCop('0');
                        }}
                        className={`h-10 rounded-xl border px-2.5 text-xs font-bold transition ${
                          payScheme === 'CONTRACT'
                            ? 'border-[#141213] bg-[#141213] text-[#ECCCD9] dark:border-[#ECCCD9] dark:bg-[#ECCCD9] dark:!text-[#141213]'
                            : 'border-[#D9AFC2] bg-white text-[#141213] hover:bg-[#FAF0F5] dark:border-[#3A3035] dark:bg-[#161315] dark:text-white'
                        }`}
                      >
                        Por Contrato
                      </button>
                    </div>
                  </div>

                  {/* Valor Hora o Indicador de Contrato */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-[#141213] dark:text-[#F5EEF1]">
                      {payScheme === 'HOURLY'
                        ? 'Valor de la Hora (COP)'
                        : 'Esquema por Contrato Fijo'}
                    </Label>
                    {payScheme === 'HOURLY' ? (
                      <Input
                        type="number"
                        min={0}
                        step={1000}
                        placeholder="Ej: 25000"
                        value={hourlyRateCop}
                        onChange={(e) => setHourlyRateCop(e.target.value)}
                        className="h-10 text-xs font-bold border-neutral-300 bg-white text-[#141213] dark:border-[#3A3035] dark:bg-[#161315] dark:text-white"
                      />
                    ) : (
                      <div className="flex h-10 items-center rounded-xl border border-[#D9AFC2] bg-white px-3 text-xs font-semibold text-neutral-600 dark:border-[#3A3035] dark:bg-[#161315] dark:text-[#C7B8C0]">
                        Salario / Contrato Fijo ($0/hora)
                      </div>
                    )}
                  </div>

                  {/* % Comisión de Ventas (100% Opcional) */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-[#141213] dark:text-[#F5EEF1]">
                      % Comisión Ventas (Opcional)
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      step={0.5}
                      placeholder="0 (Opcional)"
                      value={commissionRatePct}
                      onChange={(e) => setCommissionRatePct(e.target.value)}
                      className="h-10 text-xs border-neutral-300 bg-white text-[#141213] dark:border-[#3A3035] dark:bg-[#161315] dark:text-white"
                    />
                  </div>

                  {/* Código Secreto Comercial Opcional */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-[#141213] dark:text-[#F5EEF1]">
                      Cód. Preventas (Opcional)
                    </Label>
                    <Input
                      placeholder="Igual al PIN si se deja vacío"
                      value={sellerSecretCode}
                      onChange={(e) => setSellerSecretCode(e.target.value.toUpperCase())}
                      className="h-10 text-xs font-mono border-neutral-300 bg-white text-[#141213] dark:border-[#3A3035] dark:bg-[#161315] dark:text-white"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5">
              {editingUser && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancelEdit}
                  className="h-10 px-4 text-xs font-bold"
                >
                  Cancelar
                </Button>
              )}
              <Button
                type="submit"
                variant="pink"
                disabled={isSubmitting}
                className={`gap-1.5 bg-[#ECCCD9] font-extrabold text-[#141213] hover:bg-[#E4BDD0] ${
                  isTouchMode ? 'h-12 px-5 text-sm' : 'h-10 px-5 text-xs'
                }`}
              >
                <KeyRound className="h-4 w-4" />
                <span>
                  {isSubmitting
                    ? 'Guardando...'
                    : editingUser
                    ? 'Guardar Cambios del Usuario'
                    : role === 'CONTABILIDAD'
                    ? 'Habilitar Pase Temporal de Contabilidad'
                    : 'Registrar Usuario'}
                </span>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* 3. Directorio de Usuarios, Roles y Accesos Temporales */}
      <Card className="overflow-hidden border-[#E4BDD0] bg-white dark:border-[#332B2F] dark:bg-[#1B181A]">
        <CardHeader className="border-b border-[#E4BDD0]/60 bg-[#FAF2F6]/60 p-4 sm:p-5 dark:border-[#332B2F] dark:bg-[#221D20]">
          <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
            <CardTitle className="flex items-center gap-2 text-base font-bold text-[#141213] dark:text-[#F5EEF1]">
              <ShieldCheck className="h-5 w-5 text-[#141213] dark:text-[#ECCCD9]" />
              Directorio de Usuarios, Credenciales y Accesos ({filteredUsers.length})
            </CardTitle>

            <div className="relative w-full lg:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar usuario, cédula o código..."
                className="h-9 border-neutral-300 bg-white pl-9 text-xs text-[#141213] dark:border-[#3A3035] dark:bg-[#181517] dark:text-white"
              />
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {(
              ['ALL', 'ADMIN', 'ASESOR', 'VENTA', 'PROFESOR', 'CONTABILIDAD'] as const
            ).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRoleFilter(r)}
                className={`rounded-xl border px-3 py-1 text-xs font-extrabold transition ${
                  roleFilter === r
                    ? 'border-[#141213] bg-[#ECCCD9] text-[#141213]'
                    : 'border-neutral-200 bg-white text-neutral-700 hover:bg-[#FAF0F5] dark:border-[#3A3035] dark:bg-[#181517] dark:text-[#E5D8DF]'
                }`}
              >
                {r === 'ALL' ? 'Todos los Roles' : r}
              </button>
            ))}
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {/* Vista Móvil (< md) */}
          <div className="divide-y divide-neutral-200 md:hidden dark:divide-[#332B2F]">
            {filteredUsers.map((u) => {
              const isExpired =
                u.accessExpiresAt &&
                new Date().getTime() > new Date(u.accessExpiresAt).getTime();
              const meta = STAFF_ROLE_META[u.role];

              return (
                <div key={u.id} className="space-y-2.5 p-4 text-xs">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span
                        className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-extrabold ${meta.badgeClass}`}
                      >
                        {u.role}
                      </span>
                      <div className="mt-1 text-sm font-extrabold text-[#141213] dark:text-white">
                        {u.fullName}
                      </div>
                      <div className="text-neutral-500 dark:text-[#B8A8B0]">
                        CC: {u.documentId} &bull;{' '}
                        {u.hourlyRateCop > 0
                          ? `Hora: ${formatCop(u.hourlyRateCop)}`
                          : 'Por Contrato'}
                        {u.commissionRatePct > 0 ? ` • Com: ${u.commissionRatePct}%` : ''}
                      </div>
                    </div>

                    {!u.isActive ? (
                      <Badge variant="destructive">Revocado</Badge>
                    ) : isExpired ? (
                      <Badge variant="warning">Expirado</Badge>
                    ) : (
                      <Badge variant="success">Activo</Badge>
                    )}
                  </div>

                  <div className="rounded-xl border border-neutral-200 bg-[#FAF7F9] p-2.5 font-mono dark:border-[#332B2F] dark:bg-[#221D20]">
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-500 text-[11px]">PIN / Código Acceso:</span>
                      <strong>{u.accessCode}</strong>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => handleStartEdit(u)}
                      className="text-xs font-bold"
                    >
                      <Edit3 className="mr-1 h-3.5 w-3.5" />
                      Editar
                    </Button>
                    {u.role === 'CONTABILIDAD' && (
                      <Button
                        type="button"
                        size="sm"
                        variant="pink"
                        onClick={() =>
                          void onUpdateAccess({
                            targetUserId: u.id,
                            isActive: true,
                            accessExpiresAt: new Date(
                              Date.now() + 7 * 24 * 60 * 60 * 1000
                            ).toISOString(),
                            operatorUserId,
                          })
                        }
                        className="bg-[#ECCCD9] text-xs font-extrabold text-[#141213]"
                      >
                        Renovar +7 Días
                      </Button>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      variant={u.isActive ? 'outline' : 'default'}
                      onClick={() =>
                        void onUpdateAccess({
                          targetUserId: u.id,
                          isActive: !u.isActive,
                          accessExpiresAt: u.accessExpiresAt,
                          operatorUserId,
                        })
                      }
                      className="text-xs font-bold dark:border-[#3A3035] dark:bg-[#252023] dark:text-white"
                    >
                      <Power className="h-3.5 w-3.5" />
                      {u.isActive ? 'Revocar' : 'Reactivar'}
                    </Button>
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
                    Nombre / Documento
                  </TableHead>
                  <TableHead className="font-bold text-[#141213] dark:text-[#ECCCD9]">
                    Rol Asignado
                  </TableHead>
                  <TableHead className="font-bold text-[#141213] dark:text-[#ECCCD9]">
                    PIN / Código Acceso
                  </TableHead>
                  <TableHead className="font-bold text-[#141213] dark:text-[#ECCCD9]">
                    Modalidad & Comisión
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
                {filteredUsers.map((u) => {
                  const isExpired =
                    u.accessExpiresAt &&
                    new Date().getTime() > new Date(u.accessExpiresAt).getTime();
                  const meta = STAFF_ROLE_META[u.role];

                  return (
                    <TableRow
                      key={u.id}
                      className="border-neutral-200 dark:border-[#332B2F]"
                    >
                      <TableCell>
                        <div className="font-extrabold text-[#141213] dark:text-white">
                          {u.fullName}
                        </div>
                        <div className="text-xs text-neutral-500 dark:text-[#B8A8B0]">
                          CC: {u.documentId}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-extrabold ${meta.badgeClass}`}
                        >
                          {u.role}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="font-mono text-xs font-bold text-[#141213] dark:text-white">
                          {u.accessCode}
                        </div>
                        {u.sellerSecretCode && (
                          <div className="font-mono text-[10px] text-neutral-500">
                            Preventa: {u.sellerSecretCode}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {u.isTemporaryGuest && u.accessExpiresAt ? (
                          <div className="space-y-0.5 text-xs">
                            <div className="flex items-center gap-1 font-bold text-amber-800 dark:text-amber-300">
                              <Calculator className="h-3.5 w-3.5" />
                              Pase Temporal
                            </div>
                            <div className="flex items-center gap-1 text-[11px] text-neutral-500 dark:text-[#B8A8B0]">
                              <Clock className="h-3 w-3" />
                              Vence: {formatDateTimeCo(u.accessExpiresAt)}
                            </div>
                          </div>
                        ) : (
                          <div className="text-xs">
                            <div className="font-bold text-[#141213] dark:text-white">
                              {u.hourlyRateCop > 0
                                ? `Por Hora: ${formatCop(u.hourlyRateCop)}/h`
                                : 'Por Contrato Fijo'}
                            </div>
                            <div className="text-[11px] text-neutral-500 dark:text-[#B8A8B0]">
                              Comisión: {u.commissionRatePct > 0 ? `${u.commissionRatePct}%` : 'No aplica (0%)'}
                            </div>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {!u.isActive ? (
                          <Badge variant="destructive">Revocado</Badge>
                        ) : isExpired ? (
                          <Badge variant="warning">Caducado</Badge>
                        ) : (
                          <Badge variant="success" className="gap-1">
                            <UserCheck className="h-3 w-3" />
                            Activo
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => handleStartEdit(u)}
                            className="h-8 gap-1 text-xs font-bold border-[#D9AFC2] hover:bg-[#FAF0F5] dark:border-[#3A3035] dark:bg-[#252023] dark:text-white"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                            Editar
                          </Button>

                          {u.role === 'CONTABILIDAD' && (
                            <Button
                              type="button"
                              size="sm"
                              variant="pink"
                              className="h-8 bg-[#ECCCD9] text-xs font-extrabold text-[#141213] hover:bg-[#E4BDD0]"
                              onClick={() =>
                                void onUpdateAccess({
                                  targetUserId: u.id,
                                  isActive: true,
                                  accessExpiresAt: new Date(
                                    Date.now() + 7 * 24 * 60 * 60 * 1000
                                  ).toISOString(),
                                  operatorUserId,
                                })
                              }
                            >
                              Renovar +7d
                            </Button>
                          )}

                          <Button
                            type="button"
                            size="sm"
                            variant={u.isActive ? 'outline' : 'default'}
                            className="h-8 text-xs font-bold dark:border-[#3A3035] dark:bg-[#252023] dark:text-white"
                            onClick={() =>
                              void onUpdateAccess({
                                targetUserId: u.id,
                                isActive: !u.isActive,
                                accessExpiresAt: u.accessExpiresAt,
                                operatorUserId,
                              })
                            }
                          >
                            <Power className="h-3.5 w-3.5" />
                            {u.isActive ? 'Revocar' : 'Reactivar'}
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
    </div>
  );
}
