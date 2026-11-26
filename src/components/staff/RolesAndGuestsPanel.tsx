'use client';

import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  Calculator,
  CheckCircle2,
  Clock,
  Fingerprint,
  KeyRound,
  Power,
  Search,
  ShieldCheck,
  UserCheck,
  UserPlus,
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
    isActive: boolean;
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

  const [role, setRole] = useState<UserRoleType>('CONTABILIDAD');
  const [documentId, setDocumentId] = useState('');
  const [fullName, setFullName] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [sellerSecretCode, setSellerSecretCode] = useState('');
  const [hourlyRateCop, setHourlyRateCop] = useState('25000');
  const [commissionRatePct, setCommissionRatePct] = useState('5');
  const [guestDurationDays, setGuestDurationDays] = useState('7');
  const [roleFilter, setRoleFilter] = useState<'ALL' | UserRoleType>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    const isGuest = role === 'CONTABILIDAD';
    const expiresDate =
      isGuest && Number(guestDurationDays) > 0
        ? new Date(
            Date.now() + Number(guestDurationDays) * 24 * 60 * 60 * 1000
          ).toISOString()
        : null;

    try {
      const generatedCode = `${role.slice(0, 4)}-${documentId.slice(-4) || '01'}`;
      await onCreateUser({
        documentId: documentId.trim(),
        fullName: fullName.trim(),
        role,
        accessCode: generatedCode,
        sellerSecretCode:
          role === 'VENTA' || role === 'ASESOR'
            ? (sellerSecretCode.trim() || `SEC-${documentId.slice(-4) || '01'}`).toUpperCase()
            : undefined,
        hourlyRateCop: Number(hourlyRateCop || 0),
        commissionRatePct: Number(commissionRatePct || 0),
        isTemporaryGuest: isGuest,
        accessExpiresAt: expiresDate,
        operatorUserId,
      });

      setDocumentId('');
      setFullName('');
      setAccessCode('');
      setSellerSecretCode('');
      setFeedback({
        type: 'success',
        text: isGuest
          ? `Pase temporal de CONTABILIDAD habilitado por ${guestDurationDays} día(s).`
          : `Usuario con rol ${role} creado y auditado.`,
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Error creando usuario',
      });
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

      {/* 2. Formulario para Crear Usuario o Pase Contable Temporal */}
      <Card className="overflow-hidden border-[#E4BDD0] bg-white dark:border-[#332B2F] dark:bg-[#1B181A]">
        <CardHeader className="border-b border-[#E4BDD0]/60 bg-gradient-to-r from-[#ECCCD9]/50 to-[#FAF2F6] p-4 sm:p-5 dark:border-[#332B2F] dark:from-[#241E21] dark:to-[#1B181A]">
          <CardTitle className="flex items-center gap-2 text-base font-bold text-[#141213] dark:text-[#F5EEF1]">
            <UserPlus className="h-5 w-5 text-[#141213] dark:text-[#ECCCD9]" />
            Crear Nuevo Usuario o Pase Temporal para Contabilidad / Invitado
          </CardTitle>
          <CardDescription className="text-xs text-neutral-600 dark:text-[#C4B5BC]">
            Cuando elija el rol <strong>CONTABILIDAD</strong>, puede definir cuántos días durará activo su código de acceso antes de caducar automáticamente.
          </CardDescription>
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

          <form
            onSubmit={handleSubmit}
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            <div className="space-y-1">
              <Label className="text-xs font-bold text-[#141213] dark:text-[#F5EEF1]">
                Rol en el Sistema *
              </Label>
              <select
                className="flex h-10 w-full rounded-xl border border-neutral-300 bg-white px-3 text-xs font-bold text-[#141213] dark:border-[#3A3035] dark:bg-[#221D20] dark:text-white"
                value={role}
                onChange={(e) => setRole(e.target.value as UserRoleType)}
              >
                <option value="CONTABILIDAD">
                  CONTABILIDAD / INVITADO (Temporal Solo Lectura)
                </option>
                <option value="ASESOR">
                  ASESOR (Agenda, Alumnos, Multas, Asistencia, Preventas)
                </option>
                <option value="VENTA">
                  VENTA (Inventario, Preventas, Caja POS, Comisiones)
                </option>
                <option value="PROFESOR">
                  PROFESOR (Salones y Reloj Biométrico)
                </option>
                <option value="ADMIN">ADMIN (Control Total)</option>
              </select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-[#141213] dark:text-[#F5EEF1]">
                Nombre Completo *
              </Label>
              <Input
                placeholder="Ej: Lic. Martha Lucía Pineda"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="border-neutral-300 bg-white text-[#141213] dark:border-[#3A3035] dark:bg-[#221D20] dark:text-white"
                required
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-[#141213] dark:text-[#F5EEF1]">
                Cédula / Documento *
              </Label>
              <Input
                placeholder="Ej: 1020304050"
                value={documentId}
                onChange={(e) => setDocumentId(e.target.value)}
                className="border-neutral-300 bg-white text-[#141213] dark:border-[#3A3035] dark:bg-[#221D20] dark:text-white"
                required
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-[#141213] dark:text-[#F5EEF1] flex items-center gap-1">
                <Fingerprint className="h-3.5 w-3.5 text-emerald-600" />
                Huella Dactilar Requerida *
              </Label>
              <div className="flex items-center justify-between rounded-xl border border-emerald-300 bg-emerald-50/70 px-3 py-2 text-xs dark:border-emerald-800 dark:bg-emerald-950/30">
                <span className="font-mono text-emerald-900 font-bold dark:text-emerald-300">
                  {documentId ? `FP_${role}_${documentId.trim()}` : 'Enrolar Sensor USB'}
                </span>
                <Badge variant="success" className="text-[10px] font-bold">
                  Biometría Criptográfica
                </Badge>
              </div>
            </div>

            {(role === 'VENTA' || role === 'ASESOR') && (
              <div className="space-y-1">
                <Label className="text-xs font-bold text-[#141213] dark:text-[#F5EEF1]">
                  Código Secreto Comercial (Preventas / Caja)
                </Label>
                <Input
                  placeholder="Ej: MARTHA-999"
                  value={sellerSecretCode}
                  onChange={(e) =>
                    setSellerSecretCode(e.target.value.toUpperCase())
                  }
                  className="font-mono border-neutral-300 bg-white text-[#141213] dark:border-[#3A3035] dark:bg-[#221D20] dark:text-white"
                />
              </div>
            )}

            {role === 'CONTABILIDAD' ? (
              <div className="space-y-1">
                <Label className="text-xs font-bold text-[#141213] dark:text-[#F5EEF1]">
                  Vigencia del Pase Temporal (Días)
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
            ) : (
              <div className="space-y-1">
                <Label className="text-xs font-bold text-[#141213] dark:text-[#F5EEF1]">
                  Valor Hora (COP) / % Comisión
                </Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="Hora COP"
                    value={hourlyRateCop}
                    onChange={(e) => setHourlyRateCop(e.target.value)}
                    className="border-neutral-300 bg-white text-[#141213] dark:border-[#3A3035] dark:bg-[#221D20] dark:text-white"
                  />
                  <Input
                    type="number"
                    placeholder="% Com"
                    value={commissionRatePct}
                    onChange={(e) => setCommissionRatePct(e.target.value)}
                    className="border-neutral-300 bg-white text-[#141213] dark:border-[#3A3035] dark:bg-[#221D20] dark:text-white"
                  />
                </div>
              </div>
            )}

            <div className="sm:col-span-2 lg:col-span-3 flex justify-end">
              <Button
                type="submit"
                variant="pink"
                className={`gap-1.5 bg-[#ECCCD9] font-extrabold text-[#141213] hover:bg-[#E4BDD0] ${
                  isTouchMode ? 'h-12 px-5 text-sm' : 'h-10 px-4 text-xs'
                }`}
              >
                <KeyRound className="h-4 w-4" />
                <span>
                  {role === 'CONTABILIDAD'
                    ? 'Habilitar Acceso Temporal de Contabilidad'
                    : 'Crear Usuario con Rol'}
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
                        CC: {u.documentId} &bull; Hora: {formatCop(u.hourlyRateCop)}
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
                      <span className="text-neutral-500 text-[11px]">Identificador Sistema:</span>
                      <strong>{u.accessCode}</strong>
                    </div>
                    <div className="mt-1 flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                      <Fingerprint className="h-3.5 w-3.5" />
                      <span>{u.hasFingerprint ? 'Huella Enrolada en USB' : 'Huella Pendiente'}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
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
                      {u.isActive ? 'Revocar Acceso' : 'Reactivar'}
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
                    Autenticación Biométrica
                  </TableHead>
                  <TableHead className="font-bold text-[#141213] dark:text-[#ECCCD9]">
                    Vigencia / Expiración
                  </TableHead>
                  <TableHead className="font-bold text-[#141213] dark:text-[#ECCCD9]">
                    Estado
                  </TableHead>
                  <TableHead className="text-right font-bold text-[#141213] dark:text-[#ECCCD9]">
                    Control de Acceso
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
                          CC: {u.documentId} &bull; Hora:{' '}
                          {formatCop(u.hourlyRateCop)}
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
                        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                          <Fingerprint className="h-4 w-4 shrink-0" />
                          <span>{u.hasFingerprint ? 'Huella Activa' : 'Sin Enrolar'}</span>
                        </div>
                        <div className="font-mono text-[10px] text-neutral-400 dark:text-neutral-500">
                          Ref: {u.accessCode}
                        </div>
                      </TableCell>
                      <TableCell>
                        {u.isTemporaryGuest && u.accessExpiresAt ? (
                          <div className="space-y-0.5 text-xs">
                            <div className="flex items-center gap-1 font-bold text-amber-800 dark:text-amber-300">
                              <Calculator className="h-3.5 w-3.5" />
                              Pase Contable Temporal
                            </div>
                            <div className="flex items-center gap-1 text-[11px] text-neutral-500 dark:text-[#B8A8B0]">
                              <Clock className="h-3 w-3" />
                              Vence: {formatDateTimeCo(u.accessExpiresAt)}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-neutral-500 dark:text-[#B8A8B0]">
                            Permanente (Planta)
                          </span>
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
                              Renovar +7 Días
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
