'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Fingerprint,
  KeyRound,
  MessageSquare,
  PhoneCall,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  UserCheck,
  UserPlus,
} from 'lucide-react';
import {
  BiometricActionConfirmModal,
  AuthorizedUserResult,
} from '@/components/auth/BiometricActionConfirmModal';
import {
  ClientPresaleItem,
  ClientProtectionStatusType,
  RegisterPresalePayload,
} from '@/interfaces/sale.interface';
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
import { formatDateTimeCo } from '@/lib/utils';
import { buildPresaleFollowUpMessage, buildWhatsAppUrl } from '@/lib/whatsapp';

interface PresalesProtectionBoardProps {
  presales: ClientPresaleItem[];
  onRegisterPresale: (payload: RegisterPresalePayload) => Promise<void>;
  onClaimOpportunity?: (
    presaleId: string,
    sellerSecretCode: string,
    note?: string
  ) => Promise<void>;
  onUpdateNotes?: (presaleId: string, notes: string) => Promise<void>;
}

const COURSE_OR_KIT_PRESETS = [
  'Técnico en Cosmetología & Estética',
  'Especialización Uñas Acrílicas',
  'Diplomado Colorimetría & Balayage',
  'Kit Profesional Inicial Acrílico',
  'Kit Peluquería & Secador Pro',
];

const STATUS_FILTERS: {
  key: 'ALL' | ClientProtectionStatusType;
  label: string;
}[] = [
  { key: 'ALL', label: 'Todos los Prospectos' },
  { key: 'PROTEGIDO_3_DIAS', label: 'Protegidos 3 Días' },
  { key: 'LIBERADO_DIA_4', label: 'Liberados 4to Día' },
  { key: 'SEGUNDA_OPORTUNIDAD_24H', label: '2da Oportunidad 24h' },
  { key: 'LIBRE_DEFINITIVO', label: 'Piscina Libre' },
  { key: 'VENTA_CERRADA', label: 'Venta Cerrada' },
];

function formatRemainingTime(ms: number): string {
  if (ms <= 0) return 'Vencido';
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  }
  return `${hours.toString().padStart(2, '0')}:${minutes
    .toString()
    .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

export function PresalesProtectionBoard({
  presales,
  onRegisterPresale,
  onClaimOpportunity,
  onUpdateNotes,
}: PresalesProtectionBoardProps) {
  const { isTouchMode } = useUiMode();

  const [sellerSecretCode, setSellerSecretCode] = useState('LAURA-777');
  const [sellerName, setSellerName] = useState('Laura Ríos (Vendedora A)');
  const [isSellerBioModalOpen, setIsSellerBioModalOpen] = useState(false);
  const [clientDocument, setClientDocument] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [interestedCourseOrItem, setInterestedCourseOrItem] = useState('');
  const [statusFilter, setStatusFilter] = useState<
    'ALL' | ClientProtectionStatusType
  >('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Live timer tick every second for real-time countdowns
  const [nowTimestamp, setNowTimestamp] = useState<number>(Date.now());
  useEffect(() => {
    const timer = setInterval(() => {
      setNowTimestamp(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Modal / Prompt State for Claiming an Opportunity (Liberado Día 4)
  const [claimingPresale, setClaimingPresale] = useState<ClientPresaleItem | null>(null);
  const [claimSellerCode, setClaimSellerCode] = useState('CAMILA-888');
  const [claimSellerName, setClaimSellerName] = useState('Camila Salazar (Vendedora B)');
  const [isClaimBioModalOpen, setIsClaimBioModalOpen] = useState(false);
  const [claimNote, setClaimNote] = useState('');
  const [isClaiming, setIsClaiming] = useState(false);

  // Modal / Drawer State for Contact Notes
  const [editingNotesPresale, setEditingNotesPresale] = useState<ClientPresaleItem | null>(null);
  const [newNoteInput, setNewNoteInput] = useState('');
  const [isUpdatingNotes, setIsUpdatingNotes] = useState(false);

  const filteredPresales = useMemo(() => {
    return presales.filter((p) => {
      if (statusFilter !== 'ALL' && p.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchClient = p.clientName.toLowerCase().includes(q);
        const matchDoc = p.clientDocument.toLowerCase().includes(q);
        const matchSeller = p.effectiveCommissionSellerName
          .toLowerCase()
          .includes(q);
        const matchItem = p.interestedCourseOrItem.toLowerCase().includes(q);
        if (!matchClient && !matchDoc && !matchSeller && !matchItem)
          return false;
      }
      return true;
    });
  }, [presales, statusFilter, searchQuery]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    setIsSubmitting(true);
    try {
      await onRegisterPresale({
        sellerSecretCode: sellerSecretCode.trim().toUpperCase(),
        clientDocument: clientDocument.trim(),
        clientName: clientName.trim(),
        clientPhone: clientPhone.trim(),
        interestedCourseOrItem: interestedCourseOrItem.trim(),
      });
      setClientDocument('');
      setClientName('');
      setClientPhone('');
      setInterestedCourseOrItem('');
      setFeedback({
        type: 'success',
        text: 'Preventa y blindaje comercial registrado con éxito y auditado.',
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Error registrando preventa',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClaimSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!claimingPresale || !onClaimOpportunity) return;
    setIsClaiming(true);
    try {
      await onClaimOpportunity(
        claimingPresale.id,
        claimSellerCode.trim().toUpperCase(),
        claimNote.trim() || undefined
      );
      setClaimingPresale(null);
      setClaimNote('');
      setFeedback({
        type: 'success',
        text: `¡Prospecto tomado con éxito! Se ha activado la ventana de protección de 24 horas.`,
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Error al tomar el prospecto',
      });
    } finally {
      setIsClaiming(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNotesPresale || !onUpdateNotes || !newNoteInput.trim()) return;
    setIsUpdatingNotes(true);
    try {
      const stamp = `[${new Date().toLocaleDateString('es-CO')} ${new Date().toLocaleTimeString('es-CO')}] ${newNoteInput.trim()}`;
      const updated = editingNotesPresale.notes
        ? `${editingNotesPresale.notes}\n${stamp}`
        : stamp;
      await onUpdateNotes(editingNotesPresale.id, updated);
      setNewNoteInput('');
      setEditingNotesPresale(null);
      setFeedback({
        type: 'success',
        text: 'Bitácora de seguimiento comercial guardada.',
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Error guardando bitácora',
      });
    } finally {
      setIsUpdatingNotes(false);
    }
  };

  return (
    <div className="space-y-5 min-w-0">
      {/* 1. Tarjetas Explicativas de las 3 Fases de Blindaje */}
      <div className="grid grid-cols-1 gap-3.5 md:grid-cols-3">
        <Card className="border-[#E4BDD0] bg-[#FAF2F6] dark:border-[#3A3035] dark:bg-[#221D20]">
          <CardHeader className="pb-2">
            <span className="inline-flex w-fit items-center gap-1 rounded-full bg-[#ECCCD9] px-2.5 py-0.5 text-[11px] font-extrabold text-[#141213]">
              <Sparkles className="h-3 w-3" />
              Fase 1 &bull; Días 1 al 3 (72h)
            </span>
            <CardTitle className="mt-1.5 text-sm font-extrabold text-[#141213] dark:text-white">
              Blindaje Inicial de 3 Días (Vendedor A)
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs leading-relaxed text-neutral-700 dark:text-[#C4B5BC]">
            Al registrar la preventa con su código secreto, el cliente queda asignado
            al <strong>Vendedor A por 72 horas</strong>. Si otro vendedor factura dentro
            de esos 3 días, la comisión va automáticamente al Vendedor A.
          </CardContent>
        </Card>

        <Card className="border-amber-300 bg-amber-50/70 dark:border-amber-500/40 dark:bg-amber-950/30">
          <CardHeader className="pb-2">
            <Badge variant="warning" className="w-fit">
              Fase 2 &bull; Al 4to Día
            </Badge>
            <CardTitle className="mt-1.5 text-sm font-extrabold text-amber-950 dark:text-amber-100">
              Liberación Automática y 2da Oportunidad
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs leading-relaxed text-amber-900/90 dark:text-amber-200/80">
            Si pasan 3 días sin cierre, al <strong>4to día</strong> el cliente se libera
            como &ldquo;cliente sin atención previa&rdquo;. El siguiente vendedor que lo
            atienda toma la segunda oportunidad; si cierra la venta, la comisión es suya.
          </CardContent>
        </Card>

        <Card className="border-emerald-300 bg-emerald-50/70 dark:border-emerald-500/40 dark:bg-emerald-950/30">
          <CardHeader className="pb-2">
            <Badge variant="success" className="w-fit">
              Fase 3 &bull; Ventana 24 Horas
            </Badge>
            <CardTitle className="mt-1.5 text-sm font-extrabold text-emerald-950 dark:text-emerald-100">
              Liberación Definitiva tras 24h
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs leading-relaxed text-emerald-900/90 dark:text-emerald-200/80">
            Si en esa segunda atención no se concreta la venta durante las siguientes{' '}
            <strong>24 horas</strong>, el cliente queda en <strong>Piscina Libre</strong>{' '}
            para que cualquier vendedor que facture gane la comisión.
          </CardContent>
        </Card>
      </div>

      {/* 2. Formulario de Registro de Preventa / Blindaje */}
      <Card className="overflow-hidden border-[#E4BDD0] bg-white dark:border-[#332B2F] dark:bg-[#1B181A]">
        <CardHeader className="border-b border-[#E4BDD0]/60 bg-gradient-to-r from-[#ECCCD9]/45 to-[#FAF2F6] p-4 sm:p-5 dark:border-[#332B2F] dark:from-[#241E21] dark:to-[#1B181A]">
          <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
            <div>
              <CardTitle className="flex items-center gap-2 text-base font-bold text-[#141213] dark:text-[#F5EEF1]">
                <UserPlus className="h-5 w-5 text-[#141213] dark:text-[#ECCCD9]" />
                Registrar Preventa / Atención a Prospecto con Código Secreto
              </CardTitle>
              <CardDescription className="text-xs text-neutral-600 dark:text-[#C4B5BC]">
                Seleccione o digite su código secreto comercial para activar el blindaje de 72 horas.
              </CardDescription>
            </div>

            {/* Selector Rápido de Código Secreto */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-bold text-neutral-600 dark:text-[#C4B5BC]">
                Códigos rápidos:
              </span>
              {[
                { code: 'LAURA-777', label: 'Laura (Vendedora A)' },
                { code: 'CAMILA-888', label: 'Camila (Vendedora B)' },
              ].map((s) => (
                <button
                  key={s.code}
                  type="button"
                  onClick={() => setSellerSecretCode(s.code)}
                  className={`rounded-xl border px-2.5 py-1 text-xs font-extrabold transition ${
                    sellerSecretCode === s.code
                      ? 'border-[#141213] bg-[#ECCCD9] text-[#141213]'
                      : 'border-neutral-300 bg-white text-neutral-700 hover:bg-[#FAF0F5] dark:border-[#3A3035] dark:bg-[#221D20] dark:text-[#E5D8DF]'
                  }`}
                >
                  {s.code}
                </button>
              ))}
            </div>
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

          <form
            onSubmit={handleSubmit}
            className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-5"
          >
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-[#141213] dark:text-[#F5EEF1] flex items-center gap-1">
                  <Fingerprint className="h-3.5 w-3.5 text-emerald-600" />
                  Vendedor (Huella USB)
                </Label>
                <button
                  type="button"
                  onClick={() => setIsSellerBioModalOpen(true)}
                  className="text-[10px] font-bold text-emerald-700 hover:underline dark:text-emerald-400"
                >
                  Cambiar Huella
                </button>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-neutral-300 bg-[#FAF7F9] px-2.5 py-2 text-xs dark:border-[#3A3035] dark:bg-[#201C1E]">
                <span className="font-extrabold text-[#141213] dark:text-white truncate">
                  {sellerName}
                </span>
                <Badge variant="pink" className="text-[9px] shrink-0">
                  Verificado
                </Badge>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-[#141213] dark:text-[#F5EEF1]">
                Cédula / Doc. Cliente *
              </Label>
              <Input
                value={clientDocument}
                onChange={(e) => setClientDocument(e.target.value)}
                placeholder="Ej: 1055889911"
                className={`border-neutral-300 bg-white text-[#141213] dark:border-[#3A3035] dark:bg-[#221D20] dark:text-white ${
                  isTouchMode ? 'h-12' : 'h-10'
                }`}
                required
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-[#141213] dark:text-[#F5EEF1]">
                Nombre del Cliente *
              </Label>
              <Input
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Nombre completo"
                className={`border-neutral-300 bg-white text-[#141213] dark:border-[#3A3035] dark:bg-[#221D20] dark:text-white ${
                  isTouchMode ? 'h-12' : 'h-10'
                }`}
                required
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-[#141213] dark:text-[#F5EEF1]">
                Teléfono / WhatsApp *
              </Label>
              <Input
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                placeholder="310..."
                className={`border-neutral-300 bg-white text-[#141213] dark:border-[#3A3035] dark:bg-[#221D20] dark:text-white ${
                  isTouchMode ? 'h-12' : 'h-10'
                }`}
                required
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-[#141213] dark:text-[#F5EEF1]">
                Curso o Kit de Interés *
              </Label>
              <div className="flex gap-2">
                <Input
                  value={interestedCourseOrItem}
                  onChange={(e) => setInterestedCourseOrItem(e.target.value)}
                  placeholder="Kit Acrílico / Curso"
                  className={`border-neutral-300 bg-white text-[#141213] dark:border-[#3A3035] dark:bg-[#221D20] dark:text-white ${
                    isTouchMode ? 'h-12' : 'h-10'
                  }`}
                  required
                />
                <Button
                  type="submit"
                  variant="pink"
                  disabled={isSubmitting}
                  className={`shrink-0 gap-1.5 bg-[#ECCCD9] font-extrabold text-[#141213] hover:bg-[#E4BDD0] ${
                    isTouchMode ? 'h-12 px-4' : 'h-10 px-3.5'
                  }`}
                >
                  <KeyRound className="h-4 w-4" />
                  <span>{isSubmitting ? '...' : 'Blindar'}</span>
                </Button>
              </div>
            </div>
          </form>

          {/* Chips rápidos de Curso / Kit de Interés */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[11px] font-semibold text-neutral-500 dark:text-[#B8A8B0]">
              Intereses frecuentes:
            </span>
            {COURSE_OR_KIT_PRESETS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setInterestedCourseOrItem(item)}
                className={`rounded-lg border px-2.5 py-1 text-[11px] font-bold transition ${
                  interestedCourseOrItem === item
                    ? 'border-[#141213] bg-[#ECCCD9] text-[#141213]'
                    : 'border-neutral-200 bg-[#FAF7F9] text-neutral-700 hover:bg-[#FAF0F5] dark:border-[#332B2F] dark:bg-[#221D20] dark:text-[#E5D8DF]'
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 3. Tablero de Clientes en Preventa y Estado de Protección */}
      <Card className="overflow-hidden border-[#E4BDD0] bg-white dark:border-[#332B2F] dark:bg-[#1B181A]">
        <CardHeader className="border-b border-[#E4BDD0]/60 bg-[#FAF2F6]/60 p-4 sm:p-5 dark:border-[#332B2F] dark:bg-[#221D20]">
          <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
            <CardTitle className="flex items-center gap-2 text-base font-bold text-[#141213] dark:text-[#F5EEF1]">
              <ShieldCheck className="h-5 w-5 text-[#141213] dark:text-[#ECCCD9]" />
              Tablero de Clientes en Preventa y Dueño de Comisión ({filteredPresales.length})
            </CardTitle>

            <div className="relative w-full lg:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar cliente, cédula o vendedor..."
                className="h-9 border-neutral-300 bg-white pl-9 text-xs text-[#141213] dark:border-[#3A3035] dark:bg-[#181517] dark:text-white"
              />
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setStatusFilter(f.key)}
                className={`rounded-xl border px-3 py-1.5 text-xs font-extrabold transition ${
                  statusFilter === f.key
                    ? 'border-[#141213] bg-[#ECCCD9] text-[#141213]'
                    : 'border-neutral-200 bg-white text-neutral-700 hover:bg-[#FAF0F5] dark:border-[#3A3035] dark:bg-[#181517] dark:text-[#E5D8DF]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {filteredPresales.length === 0 ? (
            <div className="p-8 text-center text-xs text-neutral-500 dark:text-[#B8A8B0]">
              No hay prospectos en preventa que coincidan con el filtro seleccionado.
            </div>
          ) : (
            <>
              {/* Vista Móvil (< md): Tarjetas apiladas */}
              <div className="divide-y divide-neutral-200 md:hidden dark:divide-[#332B2F]">
                {filteredPresales.map((p) => {
                  const targetTime =
                    p.status === 'PROTEGIDO_3_DIAS'
                      ? new Date(p.protectedUntilDay3).getTime()
                      : p.status === 'SEGUNDA_OPORTUNIDAD_24H' && p.secondWindowUntil24h
                      ? new Date(p.secondWindowUntil24h).getTime()
                      : null;
                  const remainingMs = targetTime ? Math.max(0, targetTime - nowTimestamp) : 0;

                  return (
                    <div key={p.id} className="space-y-2.5 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="font-extrabold text-[#141213] dark:text-white">
                            {p.clientName}
                          </h3>
                          <p className="text-xs text-neutral-500 dark:text-[#B8A8B0]">
                            C.C. {p.clientDocument} &bull; Tel: {p.clientPhone}
                          </p>
                        </div>
                        <Badge
                          variant={
                            p.status === 'PROTEGIDO_3_DIAS'
                              ? 'pink'
                              : p.status === 'LIBERADO_DIA_4'
                              ? 'warning'
                              : 'success'
                          }
                        >
                          {p.statusLabel}
                        </Badge>
                      </div>

                      <div className="rounded-xl border border-neutral-200 bg-[#FAF7F9] p-2.5 text-xs dark:border-[#332B2F] dark:bg-[#221D20]">
                        <div className="font-bold text-[#141213] dark:text-[#ECCCD9]">
                          Interés: {p.interestedCourseOrItem}
                        </div>
                        <div className="mt-1 flex items-center gap-1.5 text-[11px] font-mono text-neutral-700 dark:text-[#E5D8DF]">
                          <Clock className="h-3.5 w-3.5 text-[#141213] dark:text-[#ECCCD9]" />
                          {targetTime ? (
                            <span className="font-bold">
                              Restante:{' '}
                              <span className="text-[#991B1B] dark:text-[#F87171]">
                                {formatRemainingTime(remainingMs)}
                              </span>{' '}
                              (hasta {formatDateTimeCo(new Date(targetTime))})
                            </span>
                          ) : (
                            <span>Sin límite temporal activo</span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col justify-between gap-1 rounded-xl border border-[#E4BDD0] bg-[#FAF2F6] p-2.5 text-xs dark:border-[#3A3035] dark:bg-[#261F23]">
                        <div className="flex items-center justify-between">
                          <span className="text-neutral-600 dark:text-[#C4B5BC]">
                            Vendedor Inicial (A):
                          </span>
                          <span className="font-bold text-[#141213] dark:text-white">
                            {p.initialSellerName}
                          </span>
                        </div>
                        <div className="flex items-center justify-between border-t border-[#E4BDD0]/60 pt-1 dark:border-[#3A3035]">
                          <span className="font-bold text-[#141213] dark:text-[#ECCCD9]">
                            ¿A quién va la comisión hoy?
                          </span>
                          <span className="rounded-full bg-[#ECCCD9] px-2 py-0.5 text-[11px] font-extrabold text-[#141213]">
                            {p.effectiveCommissionSellerName}
                          </span>
                        </div>
                        <p className="mt-1 text-[11px] text-neutral-600 dark:text-[#C4B5BC]">
                          {p.protectionRuleExplanation}
                        </p>

                        {/* Botones de Acción Móvil */}
                        <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-neutral-200/80 pt-2 dark:border-[#332B2F]">
                          {p.status === 'LIBERADO_DIA_4' && onClaimOpportunity && (
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => setClaimingPresale(p)}
                              className="h-8 gap-1 rounded-lg bg-amber-500 text-xs font-bold text-white hover:bg-amber-600"
                            >
                              <UserCheck className="h-3.5 w-3.5" />
                              Tomar Oportunidad (24h)
                            </Button>
                          )}
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingNotesPresale(p)}
                            className="h-8 gap-1 rounded-lg text-xs font-bold"
                          >
                            <MessageSquare className="h-3.5 w-3.5" />
                            Bitácora {p.notes ? '•' : ''}
                          </Button>
                          <a
                            href={buildWhatsAppUrl(
                              p.clientPhone,
                              buildPresaleFollowUpMessage({
                                clientName: p.clientName,
                                sellerName: p.effectiveCommissionSellerName || p.initialSellerName,
                                interestedItem: p.interestedCourseOrItem,
                              })
                            )}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex h-8 items-center gap-1 rounded-lg bg-emerald-600 px-2.5 text-xs font-bold text-white hover:bg-emerald-700"
                          >
                            WhatsApp
                          </a>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Vista Tablet / PC (>= md): Tabla completa con Timers y Acciones */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow className="border-neutral-200 bg-[#FAF7F9] dark:border-[#332B2F] dark:bg-[#221D20]">
                      <TableHead className="font-bold text-[#141213] dark:text-[#ECCCD9]">
                        Cliente / Documento
                      </TableHead>
                      <TableHead className="font-bold text-[#141213] dark:text-[#ECCCD9]">
                        Interés Comercial
                      </TableHead>
                      <TableHead className="font-bold text-[#141213] dark:text-[#ECCCD9]">
                        Estado &amp; Temporizador Vivo
                      </TableHead>
                      <TableHead className="font-bold text-[#141213] dark:text-[#ECCCD9]">
                        Vendedor A (Inicial)
                      </TableHead>
                      <TableHead className="font-bold text-[#141213] dark:text-[#ECCCD9]">
                        Dueño de Comisión Hoy
                      </TableHead>
                      <TableHead className="text-right font-bold text-[#141213] dark:text-[#ECCCD9]">
                        Acciones
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPresales.map((p) => {
                      const targetTime =
                        p.status === 'PROTEGIDO_3_DIAS'
                          ? new Date(p.protectedUntilDay3).getTime()
                          : p.status === 'SEGUNDA_OPORTUNIDAD_24H' && p.secondWindowUntil24h
                          ? new Date(p.secondWindowUntil24h).getTime()
                          : null;
                      const remainingMs = targetTime ? Math.max(0, targetTime - nowTimestamp) : 0;

                      return (
                        <TableRow
                          key={p.id}
                          className="border-neutral-200 dark:border-[#332B2F]"
                        >
                          <TableCell>
                            <div className="font-extrabold text-[#141213] dark:text-white">
                              {p.clientName}
                            </div>
                            <div className="text-xs text-neutral-500 dark:text-[#B8A8B0]">
                              CC: {p.clientDocument} &bull; Tel: {p.clientPhone}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs font-bold text-[#141213] dark:text-[#E5D8DF]">
                            {p.interestedCourseOrItem}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                p.status === 'PROTEGIDO_3_DIAS'
                                  ? 'pink'
                                  : p.status === 'LIBERADO_DIA_4'
                                  ? 'warning'
                                  : 'success'
                              }
                            >
                              {p.statusLabel}
                            </Badge>

                            {/* Live Timer Display */}
                            <div className="mt-1 flex items-center gap-1.5 text-[11px] font-mono text-neutral-700 dark:text-[#E5D8DF]">
                              <Clock className="h-3 w-3 shrink-0 text-[#141213] dark:text-[#ECCCD9]" />
                              {targetTime ? (
                                <span className="font-bold">
                                  Quedan:{' '}
                                  <span className="rounded bg-rose-100 px-1 py-0.5 font-mono font-black text-rose-800 dark:bg-rose-950 dark:text-rose-200">
                                    {formatRemainingTime(remainingMs)}
                                  </span>
                                </span>
                              ) : (
                                <span className="text-neutral-500">Sin reloj activo</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs font-bold text-[#141213] dark:text-white">
                            {p.initialSellerName}
                          </TableCell>
                          <TableCell>
                            <span className="inline-flex rounded-full bg-[#ECCCD9] px-2.5 py-0.5 text-xs font-extrabold text-[#141213]">
                              {p.effectiveCommissionSellerName}
                            </span>
                            <p className="mt-1 max-w-xs text-[11px] text-neutral-600 dark:text-[#C4B5BC]">
                              {p.protectionRuleExplanation}
                            </p>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {p.status === 'LIBERADO_DIA_4' && onClaimOpportunity && (
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={() => setClaimingPresale(p)}
                                  className="h-7 gap-1 rounded-lg bg-amber-500 px-2.5 text-xs font-bold text-white hover:bg-amber-600 shadow-sm"
                                  title="Tomar segunda oportunidad al 4to día"
                                >
                                  <UserCheck className="h-3.5 w-3.5" />
                                  <span>Tomar (24h)</span>
                                </Button>
                              )}
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => setEditingNotesPresale(p)}
                                className="h-7 gap-1 rounded-lg border-neutral-300 text-xs font-bold text-neutral-700 hover:bg-[#FAF0F5] dark:border-[#3A3035] dark:text-white"
                                title="Ver o añadir bitácora de llamadas/WhatsApp"
                              >
                                <MessageSquare className="h-3.5 w-3.5" />
                                <span>Bitácora</span>
                                {p.notes && (
                                  <span className="h-1.5 w-1.5 rounded-full bg-[#141213] dark:bg-[#ECCCD9]" />
                                )}
                              </Button>
                              <a
                                href={buildWhatsAppUrl(
                                  p.clientPhone,
                                  buildPresaleFollowUpMessage({
                                    clientName: p.clientName,
                                    sellerName:
                                      p.effectiveCommissionSellerName || p.initialSellerName,
                                    interestedItem: p.interestedCourseOrItem,
                                  })
                                )}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex h-7 items-center gap-1 rounded-lg bg-emerald-600 px-2.5 text-xs font-bold text-white hover:bg-emerald-700"
                                title="Contactar prospecto por WhatsApp"
                              >
                                <span>WhatsApp</span>
                              </a>
                            </div>
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

      {/* Modal / Dialog para Tomar Oportunidad (Día 4) */}
      {claimingPresale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border border-amber-300 bg-white p-5 shadow-2xl dark:border-amber-500/40 dark:bg-[#1C181A]">
            <div className="flex items-start justify-between gap-2 border-b border-neutral-200 pb-3 dark:border-[#332B2F]">
              <div className="flex items-center gap-2">
                <div className="rounded-xl bg-amber-100 p-2 text-amber-900 dark:bg-amber-950/70 dark:text-amber-200">
                  <UserCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-[#141213] dark:text-white">
                    Tomar Segunda Oportunidad (24h)
                  </h3>
                  <p className="text-xs text-neutral-500 dark:text-[#B8A8B0]">
                    Cliente liberado al 4to día sin atención previa
                  </p>
                </div>
              </div>
            </div>

            <div className="my-3 rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-xs dark:border-amber-900/50 dark:bg-amber-950/30">
              <p className="font-bold text-amber-950 dark:text-amber-100">
                Prospecto: {claimingPresale.clientName} (CC: {claimingPresale.clientDocument})
              </p>
              <p className="mt-1 text-neutral-600 dark:text-[#C4B5BC]">
                Atendido inicialmente por: <strong>{claimingPresale.initialSellerName}</strong>. Al
                tomarlo, se iniciará tu ventana de <strong>24 horas exclusivas</strong> para el
                cierre comercial.
              </p>
            </div>

            <form onSubmit={handleClaimSubmit} className="space-y-3">
              <div className="space-y-1.5 rounded-xl border border-neutral-200 bg-[#FAF7F9] p-3 dark:border-[#332B2F] dark:bg-[#201C1E]">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-[#141213] dark:text-white flex items-center gap-1.5">
                    <Fingerprint className="h-4 w-4 text-emerald-600" />
                    Vendedor que Reclama (Huella USB):
                  </Label>
                  <button
                    type="button"
                    onClick={() => setIsClaimBioModalOpen(true)}
                    className="text-[10px] font-bold text-emerald-700 hover:underline dark:text-emerald-400"
                  >
                    Cambiar Huella
                  </button>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="font-extrabold text-xs text-[#141213] dark:text-white">
                    {claimSellerName}
                  </span>
                  <Badge variant="pink" className="text-[10px] font-bold">
                    Biometría Confirmada
                  </Badge>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-[#141213] dark:text-white">
                  Nota o Compromiso de Contacto (Opcional)
                </Label>
                <Input
                  value={claimNote}
                  onChange={(e) => setClaimNote(e.target.value)}
                  placeholder="Ej: Contactado por WhatsApp, cita agendada hoy 3pm..."
                  className="border-neutral-300 bg-white text-[#141213] dark:border-[#3A3035] dark:bg-[#221D20] dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-200 dark:border-[#332B2F]">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setClaimingPresale(null)}
                  disabled={isClaiming}
                  className="h-9 text-xs font-bold"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isClaiming}
                  className="h-9 gap-1.5 bg-amber-500 text-xs font-extrabold text-white hover:bg-amber-600"
                >
                  <UserCheck className="h-4 w-4" />
                  <span>{isClaiming ? 'Asignando...' : 'Confirmar y Activar 24h'}</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal / Dialog para Bitácora de Llamadas & WhatsApp */}
      {editingNotesPresale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl border border-[#E4BDD0] bg-white p-5 shadow-2xl dark:border-[#3A3035] dark:bg-[#1C181A]">
            <div className="flex items-start justify-between gap-2 border-b border-neutral-200 pb-3 dark:border-[#332B2F]">
              <div className="flex items-center gap-2">
                <div className="rounded-xl bg-[#ECCCD9] p-2 text-[#141213]">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-[#141213] dark:text-white">
                    Bitácora Comercial y Seguimiento
                  </h3>
                  <p className="text-xs text-neutral-500 dark:text-[#B8A8B0]">
                    {editingNotesPresale.clientName} &bull; Tel: {editingNotesPresale.clientPhone}
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Actions (Call / WhatsApp link) */}
            <div className="my-3 flex items-center gap-2 rounded-xl border border-neutral-200 bg-[#FAF7F9] p-2.5 text-xs dark:border-[#332B2F] dark:bg-[#221D20]">
              <a
                href={`tel:${editingNotesPresale.clientPhone}`}
                className="inline-flex items-center gap-1 rounded-lg border border-neutral-300 bg-white px-2.5 py-1 text-xs font-bold text-neutral-800 hover:bg-neutral-50 dark:border-[#3A3035] dark:bg-[#181517] dark:text-white"
              >
                <PhoneCall className="h-3.5 w-3.5 text-emerald-600" />
                Llamar
              </a>
              <a
                href={`https://wa.me/57${editingNotesPresale.clientPhone.replace(/\D/g, '')}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-emerald-700"
              >
                <MessageSquare className="h-3.5 w-3.5" />
                WhatsApp
              </a>
              <span className="text-[11px] text-neutral-500 ml-auto">
                Interés: {editingNotesPresale.interestedCourseOrItem}
              </span>
            </div>

            {/* Historial previo */}
            <div className="space-y-1">
              <Label className="text-xs font-bold text-[#141213] dark:text-white">
                Historial de Interacciones Registradas:
              </Label>
              <div className="max-h-40 overflow-y-auto rounded-xl border border-neutral-200 bg-[#FAF7F9] p-3 text-xs font-mono whitespace-pre-wrap text-neutral-700 dark:border-[#332B2F] dark:bg-[#221D20] dark:text-[#E5D8DF]">
                {editingNotesPresale.notes || 'No hay notas registradas para este prospecto.'}
              </div>
            </div>

            {/* Formulario de Nueva Nota */}
            <form onSubmit={handleAddNote} className="mt-3 space-y-3">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-[#141213] dark:text-white">
                  Añadir Nueva Entrada de Seguimiento:
                </Label>
                <Input
                  value={newNoteInput}
                  onChange={(e) => setNewNoteInput(e.target.value)}
                  placeholder="Ej: Se envió cotización de Kit Acrílico por WhatsApp..."
                  className="border-neutral-300 bg-white text-[#141213] dark:border-[#3A3035] dark:bg-[#221D20] dark:text-white"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-200 dark:border-[#332B2F]">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingNotesPresale(null)}
                  disabled={isUpdatingNotes}
                  className="h-9 text-xs font-bold"
                >
                  Cerrar
                </Button>
                <Button
                  type="submit"
                  disabled={isUpdatingNotes}
                  className="h-9 gap-1.5 bg-[#ECCCD9] text-xs font-extrabold text-[#141213] hover:bg-[#E4BDD0]"
                >
                  <MessageSquare className="h-4 w-4" />
                  <span>{isUpdatingNotes ? 'Guardando...' : 'Añadir Entrada'}</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modales de Confirmación Biométrica por Huella USB */}
      <BiometricActionConfirmModal
        isOpen={isSellerBioModalOpen}
        title="Identificación de Vendedor por Huella"
        description="Ponga su dedo sobre el sensor biométrico USB para certificar la autoría de esta preventa y activar su blindaje de 72 horas."
        requiredRoles={['ADMIN', 'VENTA', 'ASESOR']}
        onClose={() => setIsSellerBioModalOpen(false)}
        onAuthorized={(user) => {
          setSellerSecretCode(user.sellerSecretCode || user.userId);
          setSellerName(user.fullName);
        }}
      />

      <BiometricActionConfirmModal
        isOpen={isClaimBioModalOpen}
        title="Reclamar Oportunidad (24h) por Huella"
        description="Confirme con su huella dactilar para asumir la responsabilidad de la segunda atención y activar sus 24 horas de exclusividad."
        requiredRoles={['ADMIN', 'VENTA', 'ASESOR']}
        onClose={() => setIsClaimBioModalOpen(false)}
        onAuthorized={(user) => {
          setClaimSellerCode(user.sellerSecretCode || user.userId);
          setClaimSellerName(user.fullName);
        }}
      />
    </div>
  );
}
