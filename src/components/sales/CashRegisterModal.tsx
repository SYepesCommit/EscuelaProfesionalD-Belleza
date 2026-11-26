'use client';

import React, { useState } from 'react';
import {
  Banknote,
  Calendar,
  CheckCircle2,
  DollarSign,
  Fingerprint,
  Lock,
  Printer,
  Sparkles,
  TrendingDown,
  TrendingUp,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { formatCop, formatDateTimeCo } from '@/lib/utils';
import {
  BiometricActionConfirmModal,
  AuthorizedUserResult,
} from '@/components/auth/BiometricActionConfirmModal';

interface CashRegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultCashierCode: string;
}

interface CashRegisterData {
  date: string;
  summary: {
    expectedCashCop: number;
    expectedTransfCop: number;
    expectedCardCop: number;
    grandTotalCop: number;
  };
  breakdown: {
    sales: {
      count: number;
      cashCop: number;
      transferCop: number;
      cardCop: number;
      totalCop: number;
    };
    studentPayments: {
      count: number;
      cashCop: number;
      transferCop: number;
      cardCop: number;
      totalCop: number;
    };
    fines: {
      count: number;
      cashCop: number;
      transferCop: number;
      cardCop: number;
      totalCop: number;
    };
  };
}

export function CashRegisterModal({
  isOpen,
  onClose,
  defaultCashierCode,
}: CashRegisterModalProps) {
  const [cashierCode, setCashierCode] = useState(defaultCashierCode);
  const [cashierName, setCashierName] = useState<string>('Laura Ríos (Vendedora A)');
  const [isBiometricAuthOpen, setIsBiometricAuthOpen] = useState(false);
  const [data, setData] = useState<CashRegisterData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [physicalCashCop, setPhysicalCashCop] = useState<number>(0);
  const [closureNotes, setClosureNotes] = useState('');
  const [closureResult, setClosureResult] = useState<{
    statusText: string;
    differenceCop: number;
    closedBy: string;
    closedAt: string;
  } | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Cargar resumen de caja del día
  const loadCashData = async () => {
    try {
      setIsLoading(true);
      setMessage(null);
      const res = await fetch('/api/cash-register');
      if (!res.ok) throw new Error('Error al cargar datos de caja');
      const json = await res.json();
      setData(json);
      setPhysicalCashCop(json.summary.expectedCashCop);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    if (isOpen) {
      loadCashData();
      setClosureResult(null);
    }
  }, [isOpen]);

  const handleCloseShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cashierCode.trim()) {
      setMessage('Ingrese el código de cajero o administrador');
      return;
    }

    try {
      setIsLoading(true);
      setMessage(null);
      const res = await fetch('/api/cash-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CLOSE_SHIFT',
          cashierCode: cashierCode.trim().toUpperCase(),
          physicalCashCop: Number(physicalCashCop) || 0,
          notes: closureNotes.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Error cerrando turno');

      setClosureResult({
        statusText: json.report.statusText,
        differenceCop: json.report.differenceCop,
        closedBy: json.report.closedBy,
        closedAt: json.report.closedAt,
      });
      setMessage(json.message);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Error al cerrar caja');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const expectedCash = data?.summary.expectedCashCop ?? 0;
  const difference = (Number(physicalCashCop) || 0) - expectedCash;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-xl max-h-[92vh] overflow-y-auto rounded-3xl border border-[#E4BDD0] bg-white text-[#141213] shadow-2xl dark:border-[#3A3035] dark:bg-[#181517] dark:text-[#F5EEF1]">
        {/* Cabecera */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-neutral-200 bg-gradient-to-r from-[#ECCCD9]/40 to-[#FAF2F6] px-5 py-4 dark:border-[#332B2F] dark:from-[#251E22] dark:to-[#1B181A]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#141213] text-[#ECCCD9] dark:bg-[#ECCCD9] dark:text-[#141213]">
              <Banknote className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-serif text-base sm:text-lg font-bold">
                Arqueo y Cierre Diario de Caja (Turno Z)
              </h2>
              <p className="text-xs text-neutral-600 dark:text-[#C4B5BC]">
                Consolidación de Efectivo, Nequi y Tarjeta en Escuela Profesional D&apos; Belleza
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-neutral-500 hover:bg-neutral-200 dark:hover:bg-[#332B2F]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {message && (
            <div
              className={`rounded-xl border p-3 text-xs font-bold ${
                closureResult
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                  : 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-300'
              }`}
            >
              {message}
            </div>
          )}

          {/* Tarjetas de Resumen Consolidado */}
          {data && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-2xl border border-neutral-200 bg-[#FAF7F9] p-3 text-center dark:border-[#332B2F] dark:bg-[#221D20]">
                <span className="text-xs font-extrabold text-neutral-800 dark:text-[#E8DCE2] block">
                  Efectivo Esperado
                </span>
                <span className="text-base sm:text-lg font-black text-emerald-800 dark:text-emerald-400">
                  {formatCop(data.summary.expectedCashCop)}
                </span>
              </div>
              <div className="rounded-2xl border border-neutral-200 bg-[#FAF7F9] p-3 text-center dark:border-[#332B2F] dark:bg-[#221D20]">
                <span className="text-xs font-extrabold text-neutral-800 dark:text-[#E8DCE2] block">
                  Nequi / Transf
                </span>
                <span className="text-base sm:text-lg font-black text-blue-800 dark:text-blue-400">
                  {formatCop(data.summary.expectedTransfCop)}
                </span>
              </div>
              <div className="rounded-2xl border border-neutral-200 bg-[#FAF7F9] p-3 text-center dark:border-[#332B2F] dark:bg-[#221D20]">
                <span className="text-xs font-extrabold text-neutral-800 dark:text-[#E8DCE2] block">
                  Tarjeta
                </span>
                <span className="text-base sm:text-lg font-black text-purple-800 dark:text-purple-400">
                  {formatCop(data.summary.expectedCardCop)}
                </span>
              </div>
              <div className="rounded-2xl border-2 border-[#E4BDD0] bg-[#ECCCD9]/40 p-3 text-center dark:border-[#3A3035] dark:bg-[#2A2226]">
                <span className="text-xs font-black text-[#141213] dark:text-[#ECCCD9] block">
                  Gran Total Día
                </span>
                <span className="text-base sm:text-xl font-black text-[#141213] dark:text-white">
                  {formatCop(data.summary.grandTotalCop)}
                </span>
              </div>
            </div>
          )}

          {/* Desglose por Origen */}
          {data && (
            <div className="rounded-2xl border border-neutral-200 bg-white p-3.5 space-y-2.5 text-xs dark:border-[#332B2F] dark:bg-[#221D20]">
              <div className="font-bold text-[#141213] dark:text-[#ECCCD9] flex items-center justify-between">
                <span>Desglose por Tipo de Movimiento:</span>
                <span className="text-[11px] text-neutral-500 dark:text-[#B8A8B0]">
                  Turno Activo
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-200 dark:border-neutral-800 dark:bg-[#1A1719]">
                  <span className="font-extrabold text-[#141213] dark:text-white block">Ventas Productos</span>
                  <span className="text-[11px] font-semibold text-neutral-600 dark:text-[#C4B5BC]">
                    {data.breakdown.sales.count} facturas
                  </span>
                  <div className="text-sm font-black text-[#141213] dark:text-[#ECCCD9] mt-1">
                    {formatCop(data.breakdown.sales.totalCop)}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-200 dark:border-neutral-800 dark:bg-[#1A1719]">
                  <span className="font-extrabold text-[#141213] dark:text-white block">Abonos Alumnos</span>
                  <span className="text-[11px] font-semibold text-neutral-600 dark:text-[#C4B5BC]">
                    {data.breakdown.studentPayments.count} recibos
                  </span>
                  <div className="text-sm font-black text-[#141213] dark:text-[#ECCCD9] mt-1">
                    {formatCop(data.breakdown.studentPayments.totalCop)}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-200 dark:border-neutral-800 dark:bg-[#1A1719]">
                  <span className="font-extrabold text-[#141213] dark:text-white block">Multas Pagadas</span>
                  <span className="text-[11px] font-semibold text-neutral-600 dark:text-[#C4B5BC]">
                    {data.breakdown.fines.count} multas
                  </span>
                  <div className="text-sm font-black text-rose-700 dark:text-rose-400 mt-1">
                    {formatCop(data.breakdown.fines.totalCop)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Formulario de Conteo Físico y Cierre */}
          {!closureResult ? (
            <form onSubmit={handleCloseShift} className="space-y-4">
              <div className="rounded-2xl border-2 border-[#E4BDD0] bg-[#FAF2F6]/60 p-4 space-y-3 dark:border-[#3A3035] dark:bg-[#251E22]">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-black text-[#141213] dark:text-[#F5EEF1] flex items-center gap-1.5">
                    <DollarSign className="h-4 w-4 text-emerald-600" />
                    Dinero Físico Contado en la Gaveta (COP):
                  </Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setPhysicalCashCop(expectedCash)}
                    className="h-6 text-[10px] font-bold"
                  >
                    Copiar Esperado
                  </Button>
                </div>

                <Input
                  type="number"
                  min={0}
                  step={1000}
                  value={physicalCashCop || ''}
                  onChange={(e) => setPhysicalCashCop(Number(e.target.value))}
                  placeholder="0"
                  required
                  className="h-12 text-xl font-black tracking-tight text-right border-neutral-300 bg-white text-[#141213] dark:border-[#3A3035] dark:bg-[#181517] dark:text-white"
                />

                {/* Termómetro de Cuadre */}
                <div className="flex items-center justify-between pt-1 text-xs">
                  <span className="font-bold text-neutral-600 dark:text-[#C4B5BC]">
                    Diferencia (Contado - Esperado):
                  </span>
                  <div className="flex items-center gap-1.5 font-black">
                    {difference === 0 ? (
                      <span className="text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="h-4 w-4" /> CUADRE EXACTO ($0 COP)
                      </span>
                    ) : difference > 0 ? (
                      <span className="text-blue-700 dark:text-blue-400 flex items-center gap-1">
                        <TrendingUp className="h-4 w-4" /> SOBRANTE: +{formatCop(difference)}
                      </span>
                    ) : (
                      <span className="text-red-700 dark:text-red-400 flex items-center gap-1">
                        <TrendingDown className="h-4 w-4" /> FALTANTE: {formatCop(difference)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5 rounded-xl border border-neutral-200 bg-[#FAF7F9] p-2.5 dark:border-[#332B2F] dark:bg-[#201C1E]">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-[#141213] dark:text-[#F5EEF1] flex items-center gap-1">
                      <Fingerprint className="h-3.5 w-3.5 text-emerald-600" />
                      Responsable del Arqueo:
                    </Label>
                    <button
                      type="button"
                      onClick={() => setIsBiometricAuthOpen(true)}
                      className="text-[10px] font-bold text-emerald-700 hover:underline dark:text-emerald-400"
                    >
                      Cambiar Huella
                    </button>
                  </div>
                  <div className="flex items-center justify-between pt-0.5">
                    <span className="text-xs font-extrabold text-[#141213] dark:text-white">
                      {cashierName}
                    </span>
                    <Badge variant="pink" className="text-[9px]">
                      Verificado USB
                    </Badge>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold text-[#141213] dark:text-[#F5EEF1]">
                    Observaciones / Novedad:
                  </Label>
                  <Input
                    value={closureNotes}
                    onChange={(e) => setClosureNotes(e.target.value)}
                    placeholder="Ej: Turno entregado sin novedades"
                    className="h-10 text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="font-bold"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="pink"
                  disabled={isLoading}
                  className="bg-gradient-to-r from-[#ECCCD9] to-[#E4BDD0] !text-[#141213] border border-[#D9AFC2] hover:brightness-95 font-extrabold gap-2 dark:from-[#ECCCD9] dark:to-[#E4BDD0] dark:!text-[#141213]"
                >
                  <Lock className="h-4 w-4 text-[#141213]" />
                  <span>CERRAR TURNO Y GENERAR REPORTE Z</span>
                </Button>
              </div>
            </form>
          ) : (
            /* Vista de Reporte Z Listo para Imprimir */
            <div className="space-y-4">
              <div
                id="thermal-z-report"
                className="space-y-3 rounded-2xl border border-neutral-300 bg-[#FAF7F9] p-5 font-mono text-xs dark:border-[#3A3035] dark:bg-[#201B1E]"
              >
                <div className="text-center">
                  <div className="font-serif text-base font-black">
                    ESCUELA PROFESIONAL D&apos; BELLEZA
                  </div>
                  <div className="text-[11px] text-neutral-500 dark:text-[#B8A8B0]">
                    NIT: 900.584.219-4 &bull; MEDELLÍN, COLOMBIA
                  </div>
                  <div className="text-[11px] font-bold text-[#141213] dark:text-[#ECCCD9] mt-1">
                    *** COMPROBANTE DE CIERRE DIARIO (REPORTE Z) ***
                  </div>
                  <div className="text-[10px] text-neutral-500">
                    {formatDateTimeCo(closureResult.closedAt)}
                  </div>
                </div>

                <div className="space-y-1 border-y border-dashed border-neutral-300 py-2 dark:border-[#3A3035]">
                  <div className="flex justify-between">
                    <span>Responsable:</span>
                    <strong>{closureResult.closedBy}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Efectivo Esperado:</span>
                    <span>{formatCop(expectedCash)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Efectivo Contado:</span>
                    <strong>{formatCop(Number(physicalCashCop) || 0)}</strong>
                  </div>
                  <div className="flex justify-between border-t border-neutral-200 pt-1 font-bold">
                    <span>Resultado de Cuadre:</span>
                    <span>{closureResult.statusText}</span>
                  </div>
                </div>

                <div className="space-y-1 text-[11px]">
                  <div className="flex justify-between">
                    <span>Total Ventas Mostrador:</span>
                    <span>{formatCop(data?.breakdown.sales.totalCop ?? 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Abonos Estudiantes:</span>
                    <span>{formatCop(data?.breakdown.studentPayments.totalCop ?? 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Multas Recaudadas:</span>
                    <span>{formatCop(data?.breakdown.fines.totalCop ?? 0)}</span>
                  </div>
                  <div className="flex justify-between border-t border-dashed border-neutral-300 pt-1 font-black text-xs">
                    <span>GRAN TOTAL CONSOLIDADO:</span>
                    <span>{formatCop(data?.summary.grandTotalCop ?? 0)}</span>
                  </div>
                </div>

                <div className="text-center text-[10px] text-neutral-500 pt-1">
                  Registro sellado e inmutable en Auditoría Forense EPB.
                </div>
              </div>

              <div className="flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => window.print()}
                  className="font-bold gap-1.5"
                >
                  <Printer className="h-4 w-4" />
                  Imprimir Reporte Z (80mm)
                </Button>
                <Button
                  type="button"
                  variant="pink"
                  onClick={onClose}
                  className="bg-[#ECCCD9] font-extrabold text-[#141213]"
                >
                  Finalizar
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Validación Biométrica para Responsable de Arqueo */}
      <BiometricActionConfirmModal
        isOpen={isBiometricAuthOpen}
        title="Responsable de Arqueo y Cierre Z"
        description="Coloque su huella en el lector biométrico USB para firmar y sellar el cuadre de caja de este turno."
        requiredRoles={['ADMIN', 'VENTA', 'CONTABILIDAD']}
        onClose={() => setIsBiometricAuthOpen(false)}
        onAuthorized={(user) => {
          setCashierCode(user.sellerSecretCode || user.userId);
          setCashierName(user.fullName);
        }}
      />
    </div>
  );
}
