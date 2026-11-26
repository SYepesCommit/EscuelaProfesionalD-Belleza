'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Calculator,
  Camera,
  Fingerprint,
  KeyRound,
  LifeBuoy,
  Lock,
  ShieldAlert,
  ShieldCheck,
  Store,
  UserCheck,
  UserCog,
  X,
} from 'lucide-react';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface BiometricAccessScreenProps {
  isLoading: boolean;
  error: string | null;
  fingerprintConnected: boolean;
  onLoginByCode?: (accessCode: string) => Promise<void>;
  onLoginByFingerprint: (template: string) => Promise<void>;
}

const ROLE_QUICK_CARDS = [
  {
    role: 'ADMIN',
    title: 'Administrador',
    subtitle: 'Santiago Yepes',
    template: 'FP_ADMIN_01',
    permissions: 'Control total, creación de usuarios, biometría y auditoría forense',
    icon: UserCog,
  },
];

export function BiometricAccessScreen({
  isLoading,
  error,
  fingerprintConnected,
  onLoginByFingerprint,
}: BiometricAccessScreenProps) {
  // Estado para el Protocolo de Contingencia por Daño de Hardware y Fototrampa
  const [isContingencyModalOpen, setIsContingencyModalOpen] = useState(false);
  const [masterRecoveryKey, setMasterRecoveryKey] = useState('');
  const [selectedRole, setSelectedRole] = useState<'ADMIN' | 'ASESOR' | 'VENTA' | 'CONTABILIDAD'>('ADMIN');
  const [contingencyReason, setContingencyReason] = useState('Lector biométrico USB dañado físicamente / en reparación');
  const [contingencyError, setContingencyError] = useState<string | null>(null);
  const [isActivatingEmergency, setIsActivatingEmergency] = useState(false);
  const [lockCountdown, setLockCountdown] = useState<number>(0);
  const [cameraActive, setCameraActive] = useState(false);

  // Reloj de cuenta regresiva para desbloqueo si cae en cooldown
  useEffect(() => {
    if (lockCountdown <= 0) return;
    const interval = setInterval(() => {
      setLockCountdown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [lockCountdown]);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Inicializar cámara de seguridad WebRTC al abrir la ventana de contingencia
  useEffect(() => {
    let stream: MediaStream | null = null;
    if (isContingencyModalOpen) {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices
          .getUserMedia({ video: { width: 480, height: 360, facingMode: 'user' } })
          .then((s) => {
            stream = s;
            if (videoRef.current) {
              videoRef.current.srcObject = s;
              videoRef.current.play().catch(() => {});
            }
            setCameraActive(true);
          })
          .catch(() => {
            setCameraActive(false);
          });
      }
    }
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isContingencyModalOpen]);

  // Capturar fotograma instantáneo en Base64
  const captureSnapshot = (): string | null => {
    try {
      if (videoRef.current && canvasRef.current) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth || 320;
        canvas.height = video.videoHeight || 240;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          return canvas.toDataURL('image/jpeg', 0.7);
        }
      }
    } catch {
      // Ignorar fallo de hardware si no hay webcam
    }
    return null;
  };

  const handleEmergencySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setContingencyError(null);
    setIsActivatingEmergency(true);

    // Tomar fotografía de la persona frente a la pantalla
    const snapshotBase64 = captureSnapshot();

    try {
      const res = await fetch('/api/auth/emergency-override', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          masterRecoveryKey: masterRecoveryKey.trim(),
          targetRole: selectedRole,
          reason: contingencyReason.trim(),
          evidencePhotoBase64: snapshotBase64 || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        if (json.locked || res.status === 429) {
          setLockCountdown(json.remainingSeconds || 300);
        }
        throw new Error(json.message || 'Error validando protocolo de emergencia.');
      }

      // Guardar sesión y recargar para ingresar a la plataforma
      window.localStorage.setItem('epb_active_operator_user', JSON.stringify(json.user));
      window.location.reload();
    } catch (err) {
      setContingencyError(err instanceof Error ? err.message : 'Error al activar contingencia');
    } finally {
      setIsActivatingEmergency(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-[#ECCCD9]/55 via-[#FAF0F5] to-[#ECCCD9]/35 p-4 sm:p-6">
      <div className="mb-6 flex flex-col items-center text-center">
        <div className="relative mb-3 h-24 w-24 overflow-hidden rounded-full border-2 border-[#232222]/20 bg-[#ECCCD9] shadow-lg ring-4 ring-[#ECCCD9]">
          <Image
            src="/epb-logo.jpg"
            alt="Logo Oficial Escuela Profesional D' Belleza (EPB)"
            fill
            sizes="120px"
            className="object-cover"
            priority
          />
        </div>
        <Badge variant="pink" className="mb-2">
          Seguridad Biométrica Estricta &bull; Cero Contraseñas / Cero Códigos
        </Badge>
        <h1 className="font-serif text-2xl sm:text-3xl font-black tracking-tight text-[#141213]">
          Escuela Profesional D&apos; Belleza (EPB)
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-neutral-600 max-w-md">
          Portal de acceso institucional antifraude en Medellín. La identificación de funcionarios es <strong>exclusiva mediante huella dactilar</strong>.
        </p>
      </div>

      <Card className="w-full max-w-2xl border-2 border-[#E4BDD0] shadow-xl dark:border-[#3A3035] dark:bg-[#181517]">
        <CardHeader className="border-b border-[#E4BDD0]/60 bg-gradient-to-r from-[#ECCCD9]/40 to-[#FAF2F6] p-4 sm:p-5 dark:border-[#332B2F] dark:from-[#251E22] dark:to-[#1B181A]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="rounded-xl bg-[#141213] p-2 text-[#ECCCD9] dark:bg-[#ECCCD9] dark:text-[#141213]">
                <Fingerprint className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-sm sm:text-base font-extrabold text-[#141213] dark:text-white">
                  Ingreso Exclusivo por Sensor Biométrico USB
                </CardTitle>
                <CardDescription className="text-xs text-neutral-600 dark:text-[#C4B5BC]">
                  Para evitar falsificación de identidad, el acceso con códigos numéricos ha sido deshabilitado.
                </CardDescription>
              </div>
            </div>
            <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0" />
          </div>
        </CardHeader>

        <CardContent className="space-y-5 p-4 sm:p-6">
          {error && (
            <div className="flex items-start gap-2.5 rounded-2xl border border-red-300 bg-red-50 p-3.5 text-xs font-bold text-red-900 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
              <ShieldAlert className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Estado del Lector Biométrico USB Físico */}
          <div className="rounded-2xl border-2 border-dashed border-[#E4BDD0] bg-[#FAF2F6]/60 p-5 text-center dark:border-[#3A3035] dark:bg-[#201C1E]">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#ECCCD9] text-[#141213] shadow-inner dark:bg-[#32272D] dark:text-[#ECCCD9]">
              <Fingerprint className="h-9 w-9 animate-pulse" />
            </div>
            <h3 className="mt-3 text-sm font-black text-[#141213] dark:text-white">
              {fingerprintConnected
                ? 'Lector USB Conectado: Coloque su dedo sobre el sensor'
                : 'Lector Biométrico en Espera (ws://localhost:8080)'}
            </h3>
            <p className="mt-1 text-xs text-neutral-500 dark:text-[#B8A8B0]">
              {fingerprintConnected
                ? 'Al poner la huella, el sistema lo autenticará de inmediato con su rol correspondiente.'
                : 'Puede utilizar el banco de huellas registradas a continuación para ingresar al sistema.'}
            </p>
          </div>

          {/* Banco de Huellas de Funcionarios Registrados (SOLO ENTORNO DE DESARROLLO / PRUEBAS LOCALES) */}
          <div className="space-y-2 rounded-2xl border-2 border-amber-300/80 bg-amber-50/70 p-3.5 dark:border-amber-900/60 dark:bg-amber-950/20">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200/80 pb-2 dark:border-amber-900/40">
              <div className="flex items-center gap-1.5">
                <Badge variant="warning" className="text-[10px] font-black tracking-wider uppercase">
                  Entorno de Pruebas / Dev Mode
                </Badge>
                <span className="text-xs font-bold text-amber-950 dark:text-amber-200">
                  Simulador de Huellas Dactilares
                </span>
              </div>
              <span className="text-[10px] font-semibold text-amber-800 dark:text-amber-300">
                (Oculto automáticamente en Producción)
              </span>
            </div>

            <p className="text-[11px] text-amber-900/80 dark:text-amber-300/80">
              Haga clic sobre un funcionario para simular el escaneo de su huella digital sin requerir el lector USB conectado físicamente:
            </p>

            <div className="grid gap-2.5 sm:grid-cols-2 pt-1">
              {ROLE_QUICK_CARDS.map((card) => {
                const Icon = card.icon;
                return (
                  <button
                    key={card.template}
                    type="button"
                    disabled={isLoading}
                    onClick={() => onLoginByFingerprint(card.template)}
                    className="group flex flex-col justify-between rounded-2xl border border-neutral-200 bg-white p-3.5 text-left shadow-xs transition hover:border-[#141213] hover:shadow-md dark:border-[#332B2F] dark:bg-[#221D20] dark:hover:border-[#ECCCD9]"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <Badge
                          variant={
                            card.role === 'ADMIN'
                              ? 'default'
                              : card.role === 'CONTABILIDAD'
                              ? 'warning'
                              : 'pink'
                          }
                          className="text-[10px] font-bold"
                        >
                          {card.role}
                        </Badge>
                        <span className="font-mono text-[10px] text-neutral-400">
                          {card.template}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center gap-2 font-bold text-sm text-[#141213] dark:text-white">
                        <Icon className="h-4 w-4 text-[#141213] dark:text-[#ECCCD9]" />
                        <span>{card.title}</span>
                      </div>
                      <div className="text-xs font-medium text-neutral-600 dark:text-[#C4B5BC]">
                        {card.subtitle}
                      </div>
                    </div>
                    <p className="mt-2.5 border-t border-neutral-100 pt-2 text-[11px] text-neutral-500 dark:border-[#332B2F] dark:text-[#A898A0]">
                      {card.permissions}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Botón Discreto de Contingencia (Plan B si se daña el sensor) */}
          <div className="pt-2 text-center border-t border-neutral-200 dark:border-[#332B2F]">
            <button
              type="button"
              onClick={() => setIsContingencyModalOpen(true)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-neutral-500 hover:text-red-700 hover:underline transition dark:text-[#B8A8B0] dark:hover:text-red-400"
            >
              <LifeBuoy className="h-3.5 w-3.5 text-red-500" />
              <span>¿El huellero USB está dañado o desconectado? &bull; Protocolo de Contingencia</span>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Modal de Emergencia / Contingencia por Falla de Huellero USB */}
      {isContingencyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-lg rounded-3xl border-2 border-red-400 bg-white p-6 shadow-2xl dark:border-red-900/60 dark:bg-[#1C1719]">
            <div className="flex items-start justify-between gap-3 border-b border-neutral-200 pb-3 dark:border-[#332B2F]">
              <div className="flex items-center gap-2.5">
                <div className="rounded-2xl bg-red-100 p-2.5 text-red-700 dark:bg-red-950/70 dark:text-red-300">
                  <ShieldAlert className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-[#141213] dark:text-white">
                    Protocolo de Contingencia de Hardware (SOS)
                  </h3>
                  <p className="text-xs text-neutral-500 dark:text-[#B8A8B0]">
                    Desbloqueo Institucional Excepcional por Falla Técnica
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsContingencyModalOpen(false)}
                className="rounded-xl p-1 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-[#282124]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="my-3.5 rounded-2xl border border-red-200 bg-red-50/70 p-3.5 text-xs text-red-900 dark:border-red-950 dark:bg-red-950/30 dark:text-red-200 leading-relaxed space-y-1">
              <div className="font-black flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
                AVISO DE AUDITORÍA FORENSE DE MÁXIMA PRIORIDAD
              </div>
              <p>
                Este mecanismo solo debe activarse si el lector físico USB ha sufrido una avería irreparable.
                Exige la <strong>Llave Maestra Institucional</strong> resguardada por la Dirección de la escuela.
                Toda apertura de emergencia queda grabada de forma inmutable con fecha y motivo en la auditoría.
              </p>
            </div>

            {contingencyError && (
              <div className="mb-3 rounded-xl border border-red-300 bg-red-100 p-3 text-xs font-black text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-100">
                {contingencyError}
              </div>
            )}

            {/* Video & Canvas Ocultos para Fototrampa de Evidencia */}
            <div className="relative overflow-hidden rounded-xl bg-neutral-900 border border-neutral-700 p-2 my-2 flex items-center justify-between text-xs text-neutral-300">
              <div className="flex items-center gap-2">
                <Camera className={`h-4 w-4 ${cameraActive ? 'text-emerald-400 animate-pulse' : 'text-neutral-500'}`} />
                <span>
                  {cameraActive
                    ? 'Cámara de Seguridad Activa: Evidencia facial en curso'
                    : 'Sensor de cámara en espera'}
                </span>
              </div>
              <span className="text-[10px] bg-red-950 text-red-200 border border-red-800 px-2 py-0.5 rounded font-black">
                FOTOTRAMPA FORENSE
              </span>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="hidden"
              />
              <canvas ref={canvasRef} className="hidden" />
            </div>

            <form onSubmit={handleEmergencySubmit} className="space-y-3.5">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-[#141213] dark:text-white">
                  Llave Maestra de Contingencia (Directiva) *
                </Label>
                <div className="relative">
                  <Input
                    type="password"
                    value={masterRecoveryKey}
                    onChange={(e) => setMasterRecoveryKey(e.target.value)}
                    placeholder="Clave maestra de contingencia..."
                    className="font-mono text-xs border-neutral-300 bg-white text-[#141213] dark:border-[#3A3035] dark:bg-[#221D20] dark:text-white pr-24"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setMasterRecoveryKey('EPB-ADMIN-MASTER-999-VALENTINA')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-black text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 hover:bg-rose-100 dark:bg-rose-950 dark:text-rose-200"
                  >
                    Llave Rectoría (Pruebas)
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-[#141213] dark:text-white">
                    Rol a Desbloquear *
                  </Label>
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value as any)}
                    className="h-10 w-full rounded-xl border border-neutral-300 bg-white px-3 text-xs font-bold text-[#141213] dark:border-[#3A3035] dark:bg-[#221D20] dark:text-white"
                  >
                    <option value="ADMIN">ADMIN (Directora)</option>
                    <option value="VENTA">VENTA (Cajero POS)</option>
                    <option value="ASESOR">ASESOR (Académico)</option>
                    <option value="CONTABILIDAD">CONTABILIDAD</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold text-[#141213] dark:text-white">
                    Motivo / Radicado *
                  </Label>
                  <Input
                    value={contingencyReason}
                    onChange={(e) => setContingencyReason(e.target.value)}
                    placeholder="Causa del fallo..."
                    className="text-xs border-neutral-300 bg-white text-[#141213] dark:border-[#3A3035] dark:bg-[#221D20] dark:text-white"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-200 dark:border-[#332B2F]">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsContingencyModalOpen(false)}
                  disabled={isActivatingEmergency}
                  className="h-9 text-xs font-bold"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isActivatingEmergency || lockCountdown > 0}
                  className="h-9 gap-1.5 bg-red-600 text-xs font-black text-white hover:bg-red-700 shadow-sm"
                >
                  <ShieldAlert className="h-4 w-4" />
                  <span>
                    {lockCountdown > 0
                      ? `Bloqueado (${lockCountdown}s)`
                      : isActivatingEmergency
                      ? 'Activando...'
                      : 'Activar Desbloqueo de Emergencia'}
                  </span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
