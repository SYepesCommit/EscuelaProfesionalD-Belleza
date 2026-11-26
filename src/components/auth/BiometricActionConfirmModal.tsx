'use client';

import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Fingerprint,
  Lock,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFingerprint } from '@/hooks/useFingerprint';

export interface AuthorizedUserResult {
  userId: string;
  fullName: string;
  role: string;
  fingerprintTemplate: string;
  sellerSecretCode?: string | null;
}

interface BiometricActionConfirmModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  actionDetails?: {
    concept: string;
    amountCop?: number;
    extraNotice?: string;
  };
  requiredRoles?: ('ADMIN' | 'ASESOR' | 'VENTA' | 'CONTABILIDAD')[];
  onClose: () => void;
  onAuthorized: (user: AuthorizedUserResult) => Promise<void> | void;
}

const DEMO_STAFF_FINGERPRINTS = [
  {
    role: 'ADMIN',
    name: 'Santiago Yepes (Administrador)',
    template: 'FP_ADMIN_01',
    badge: 'Administrador General',
    code: 'SEC-ADMIN',
  },
];

export function BiometricActionConfirmModal({
  isOpen,
  title,
  description,
  actionDetails,
  requiredRoles,
  onClose,
  onAuthorized,
}: BiometricActionConfirmModalProps) {
  const [isVerifying, setIsVerifying] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [successUser, setSuccessUser] = useState<AuthorizedUserResult | null>(null);

  const { state: fpState, requestScan, simulateBiometricCapture } = useFingerprint({
    autoConnect: isOpen,
    onCaptureSuccess: async (template: string) => {
      await handleVerifyTemplate(template);
    },
  });

  if (!isOpen) return null;

  const handleVerifyTemplate = async (template: string) => {
    setIsVerifying(true);
    setAuthError(null);
    try {
      const res = await fetch('/api/auth/biometric-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template,
          requiredRoles: requiredRoles || [],
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || 'Huella dactilar no autorizada para esta operación.');
      }

      setSuccessUser(json.user);
      await onAuthorized(json.user);
      setTimeout(() => {
        setSuccessUser(null);
        onClose();
      }, 1000);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Error al verificar huella');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md animate-in fade-in">
      <div className="w-full max-w-md rounded-3xl border-2 border-[#E4BDD0] bg-white p-6 shadow-2xl dark:border-[#3A3035] dark:bg-[#181517]">
        {/* Encabezado */}
        <div className="flex items-start justify-between gap-3 border-b border-neutral-200 pb-4 dark:border-[#332B2F]">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-[#ECCCD9] p-3 text-[#141213] dark:bg-[#32272D] dark:text-[#ECCCD9]">
              <Fingerprint className="h-6 w-6 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-black text-[#141213] dark:text-white">
                {title}
              </h3>
              <p className="text-xs text-neutral-500 dark:text-[#B8A8B0]">
                Autorización Biométrica Obligatoria
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-[#252023] dark:hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Mensaje descriptivo y Detalles Financieros */}
        <div className="my-4 space-y-3">
          <p className="text-xs leading-relaxed text-neutral-700 dark:text-[#C4B5BC]">
            {description}
          </p>

          {actionDetails && (
            <div className="rounded-2xl border border-[#E4BDD0] bg-[#FAF2F6] p-3.5 space-y-1 text-xs dark:border-[#3A3035] dark:bg-[#241D21]">
              <div className="flex items-center justify-between font-bold text-[#141213] dark:text-white">
                <span>Operación:</span>
                <span>{actionDetails.concept}</span>
              </div>
              {typeof actionDetails.amountCop === 'number' && (
                <div className="flex items-center justify-between border-t border-[#E4BDD0]/60 pt-1 text-sm font-black text-rose-700 dark:text-rose-400">
                  <span>Monto Implicado:</span>
                  <span>${actionDetails.amountCop.toLocaleString('es-CO')} COP</span>
                </div>
              )}
              {actionDetails.extraNotice && (
                <p className="pt-1 text-[11px] text-neutral-500 dark:text-[#B8A8B0]">
                  {actionDetails.extraNotice}
                </p>
              )}
            </div>
          )}

          {/* Feedback de Estado */}
          {authError && (
            <div className="flex items-start gap-2 rounded-xl border border-red-300 bg-red-50 p-3 text-xs font-bold text-red-900 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
              <ShieldAlert className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
              <span>{authError}</span>
            </div>
          )}

          {successUser && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-xs font-bold text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>
                ¡Huella verificada! Autorizado por <strong>{successUser.fullName}</strong> ({successUser.role}).
              </span>
            </div>
          )}

          {/* Sensor USB Estado */}
          <div className="rounded-2xl border border-dashed border-neutral-300 bg-[#FAF7F9] p-4 text-center dark:border-[#332B2F] dark:bg-[#201C1E]">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#ECCCD9]/40 text-[#141213] dark:bg-[#2F252A] dark:text-[#ECCCD9]">
              <Fingerprint
                className={`h-8 w-8 ${
                  fpState.isScanning || isVerifying ? 'animate-bounce text-[#141213]' : ''
                }`}
              />
            </div>
            <p className="mt-2 text-xs font-extrabold text-[#141213] dark:text-white">
              {isVerifying
                ? 'Validando identidad en base de datos...'
                : fpState.isScanning
                ? 'Coloque su dedo sobre el lector USB ahora...'
                : 'Ponga su dedo sobre el sensor biométrico USB'}
            </p>
            <p className="text-[11px] text-neutral-500 dark:text-[#B8A8B0]">
              {fpState.isConnected
                ? 'Lector USB conectado y listo (Servicio local :8080)'
                : 'Simulador dactilar de seguridad disponible'}
            </p>

            <Button
              type="button"
              onClick={requestScan}
              disabled={isVerifying}
              className="mt-3 h-9 w-full gap-2 rounded-xl bg-[#141213] text-xs font-bold text-white hover:bg-neutral-800 dark:bg-[#ECCCD9] dark:text-[#141213]"
            >
              <Fingerprint className="h-4 w-4" />
              <span>Escanear Huella en Lector Físico</span>
            </Button>
          </div>

          {/* Banco de Huellas de Personal Autorizado (SOLO ENTORNO DE DESARROLLO / PRUEBAS) */}
          <div className="space-y-1.5 rounded-2xl border border-amber-300 bg-amber-50/70 p-2.5 dark:border-amber-900/60 dark:bg-amber-950/20">
            <div className="flex items-center justify-between border-b border-amber-200/80 pb-1 dark:border-amber-900/40">
              <span className="text-[10px] font-black uppercase text-amber-900 dark:text-amber-300">
                Entorno de Pruebas / Dev
              </span>
              <span className="text-[9px] text-amber-800 dark:text-amber-400">
                Simulador de huella
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              {DEMO_STAFF_FINGERPRINTS.filter(
                (staff) => !requiredRoles || requiredRoles.includes(staff.role as any)
              ).map((staff) => (
                <button
                  key={staff.template}
                  type="button"
                  onClick={() => simulateBiometricCapture(staff.template)}
                  disabled={isVerifying}
                  className="flex flex-col items-start rounded-xl border border-neutral-200 bg-white p-2.5 text-left text-xs transition hover:border-[#141213] hover:bg-[#FAF0F5] dark:border-[#332B2F] dark:bg-[#201C1E] dark:hover:border-[#ECCCD9]"
                >
                  <div className="flex items-center gap-1.5 font-bold text-[#141213] dark:text-white">
                    <Fingerprint className="h-3.5 w-3.5 text-emerald-600" />
                    <span className="truncate">{staff.name.split(' ')[0]}</span>
                  </div>
                  <span className="text-[10px] text-neutral-500 dark:text-[#B8A8B0]">
                    {staff.badge}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-200 dark:border-[#332B2F]">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isVerifying}
            className="h-9 text-xs font-bold"
          >
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  );
}
