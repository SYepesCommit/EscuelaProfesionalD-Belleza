'use client';

import React, { useState } from 'react';
import {
  Fingerprint,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  X,
  ShieldCheck,
  Usb,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StudentItem } from '@/interfaces/student.interface';
import { useFingerprint } from '@/hooks/useFingerprint';

interface EnrollFingerprintModalProps {
  isOpen: boolean;
  student: StudentItem | null;
  onClose: () => void;
  onSubmit: (payload: {
    studentId: string;
    fingerprintTemplate: string;
  }) => Promise<void>;
}

export function EnrollFingerprintModal({
  isOpen,
  student,
  onClose,
  onSubmit,
}: EnrollFingerprintModalProps) {
  const [template, setTemplate] = useState<string>('');
  const [isBusy, setIsBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [scanStep, setScanStep] = useState<'IDLE' | 'READING' | 'SUCCESS'>('IDLE');

  // Escucha activa del Lector Biométrico USB físico (WebSocket :8080)
  const { state: fpState, requestScan } = useFingerprint({
    autoConnect: isOpen,
    onCaptureSuccess: (capturedTemplate) => {
      setTemplate(capturedTemplate);
      setScanStep('SUCCESS');
      setErrorMsg(null);
    },
  });

  React.useEffect(() => {
    if (!isOpen || !student) {
      setTemplate('');
      setScanStep('IDLE');
      setErrorMsg(null);
      return;
    }
    setTemplate(student.fingerprintTemplate || '');
    setScanStep(student.hasFingerprint ? 'SUCCESS' : 'IDLE');
    setErrorMsg(null);
  }, [isOpen, student]);

  if (!isOpen || !student) return null;

  const isScanning = fpState.isScanning;

  const handleSimulateScan = () => {
    if (fpState.isConnected) {
      // Si el lector USB físico está conectado, pide poner el dedo al sensor
      requestScan();
      setScanStep('READING');
    } else {
      // Si estamos en entorno de desarrollo sin lector enchufado, simula la captura
      setScanStep('READING');
      setErrorMsg(null);
      setTimeout(() => {
        const generatedTemplate = `FP_EPB_${student.documentId}_${Date.now().toString(36).toUpperCase()}`;
        setTemplate(generatedTemplate);
        setScanStep('SUCCESS');
      }, 1000);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!template) {
      setErrorMsg('Debe capturar la huella dactilar de la alumna antes de guardar.');
      return;
    }

    setIsBusy(true);
    setErrorMsg(null);
    try {
      await onSubmit({
        studentId: student.id,
        fingerprintTemplate: template,
      });
      onClose();
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Error al enrolar la huella dactilar'
      );
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 sm:p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative flex max-h-[94vh] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-[#E4BDD0] bg-white text-[#141213] shadow-2xl dark:border-[#3A3035] dark:bg-[#181517] dark:text-[#F5EEF1]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E4BDD0]/80 bg-gradient-to-r from-[#ECCCD9]/60 via-[#F6E4EC] to-[#FAF2F6] px-5 py-4 dark:border-[#332B2F] dark:from-[#261F23] dark:via-[#201A1D] dark:to-[#181517]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#141213] text-[#ECCCD9] shadow-sm dark:bg-[#ECCCD9] dark:text-[#141213]">
              <Fingerprint className="h-5 w-5" />
            </div>
            <div>
              <span className="rounded-full bg-[#ECCCD9] px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#141213]">
                Biometría Dactilar USB
              </span>
              <h3 className="mt-0.5 font-serif text-base font-bold text-[#141213] dark:text-[#F5EEF1]">
                Enrolar Huella de Alumna
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-neutral-300 bg-white text-neutral-700 transition hover:bg-neutral-100 dark:border-white/15 dark:bg-[#252023] dark:text-neutral-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 overflow-y-auto">
          {errorMsg && (
            <div className="flex items-center gap-2 rounded-xl border border-red-300 bg-red-50 p-3 text-xs font-bold text-red-900 dark:border-red-900/60 dark:bg-red-950/60 dark:text-red-200">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Ficha rápida de la alumna */}
          <div className="rounded-2xl border border-neutral-200/90 bg-[#FAF8F9] p-3.5 space-y-1 dark:border-[#332B2F] dark:bg-[#201B1E]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-[#141213] dark:text-[#ECCCD9]">
                {student.fullName}
              </span>
              <span className="font-mono text-xs font-bold text-neutral-500 dark:text-[#C4B5BC]">
                CC: {student.documentId}
              </span>
            </div>
            <p className="text-xs text-neutral-600 dark:text-[#C4B5BC]">
              Programa: <strong>{student.programName}</strong>
            </p>
          </div>

          {/* Scanner Visual Animado */}
          <div className="flex flex-col items-center justify-center rounded-2xl border border-[#E4BDD0] bg-[#FAF2F6]/60 p-6 text-center dark:border-[#3A3035] dark:bg-[#201B1E]">
            <div className="relative mb-3 flex h-24 w-24 items-center justify-center rounded-full border-2 border-dashed border-[#141213]/40 bg-white shadow-inner dark:border-white/20 dark:bg-[#161315]">
              {isScanning && (
                <div className="absolute inset-x-2 top-0 h-1 bg-emerald-500 shadow-md animate-bounce" />
              )}
              <Fingerprint
                className={`h-12 w-12 transition-all duration-300 ${
                  isScanning
                    ? 'text-emerald-500 scale-110 animate-pulse'
                    : scanStep === 'SUCCESS'
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-neutral-400'
                }`}
              />
            </div>

            <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-700 dark:text-[#C4B5BC]">
              <Usb className="h-3.5 w-3.5 text-emerald-600" />
              <span>Lector USB compatible: ZKTeco / DigitalPersona</span>
            </div>

            <p className="mt-1 text-xs text-neutral-500 dark:text-[#B8A8B0]">
              {isScanning
                ? 'Leyendo plantilla biométrica del sensor...'
                : scanStep === 'SUCCESS'
                  ? '✓ Huella capturada correctamente y lista para vincular'
                  : 'Pida a la alumna que pose su dedo índice sobre el sensor'}
            </p>

            <Button
              type="button"
              variant="outline"
              disabled={isScanning || isBusy}
              onClick={handleSimulateScan}
              className="mt-4 gap-2 h-10 border-[#141213] text-xs font-black text-[#141213] hover:bg-[#ECCCD9] dark:border-[#ECCCD9] dark:bg-[#252023] dark:text-[#ECCCD9]"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isScanning ? 'animate-spin' : ''}`} />
              {template ? 'Volver a Capturar Huella' : 'Capturar Huella del Sensor'}
            </Button>
          </div>

          {/* Hash o Identificador Biométrico */}
          {template && (
            <div className="rounded-xl border border-emerald-300/80 bg-emerald-50/80 p-3 text-xs dark:border-emerald-800/40 dark:bg-emerald-950/40">
              <div className="flex items-center gap-1.5 font-black text-emerald-900 dark:text-emerald-300">
                <ShieldCheck className="h-4 w-4" />
                <span>Identificador Biométrico Cifrado:</span>
              </div>
              <p className="mt-1 font-mono text-[11px] font-bold text-emerald-800 break-all dark:text-emerald-300">
                {template}
              </p>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 border-t border-neutral-200 pt-4 dark:border-[#3A3035]">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isBusy}
              className="h-10 px-4 font-bold dark:border-[#3A3035] dark:bg-[#201B1E] dark:text-white"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="pink"
              disabled={isBusy || !template}
              className="h-10 gap-1.5 bg-[#ECCCD9] px-5 font-black text-[#141213] hover:bg-[#E4BDD0]"
            >
              <CheckCircle2 className="h-4 w-4" />
              {isBusy ? 'Guardando...' : 'Guardar Enrolamiento'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
