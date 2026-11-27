'use client';

import { useEffect, useRef } from 'react';
import { BarcodeScanEvent } from '@/interfaces/hardware.interface';

interface UseBarcodeScannerOptions {
  onScan: (event: BarcodeScanEvent) => void;
  minLength?: number;
  maxInterKeyDelayMs?: number;
  enabled?: boolean;
}

/**
 * Si un lector USB está configurado en modo ASCII decimal (ej: "514957..." para "319..."),
 * lo decodifica automáticamente a sus caracteres reales.
 */
export function normalizeBarcode(raw: string): string {
  if (raw.length >= 8 && raw.length % 2 === 0 && /^\d+$/.test(raw)) {
    const pairs = raw.match(/.{2}/g) ?? [];
    const allAsciiDigits = pairs.every((p) => {
      const code = Number(p);
      return code >= 48 && code <= 57;
    });
    if (allAsciiDigits) {
      return pairs.map((p) => String.fromCharCode(Number(p))).join('');
    }
  }
  return raw;
}

/**
 * Escucha ráfagas rápidas de eventos de teclado (modo HID USB) finalizadas en 'Enter'.
 * Ignora escritura humana normal midiendo el tiempo entre teclas (< 45ms).
 */
export function useBarcodeScanner({
  onScan,
  minLength = 4,
  maxInterKeyDelayMs = 45,
  enabled = true,
}: UseBarcodeScannerOptions): void {
  const bufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent): void => {
      const now = performance.now();
      const timeDiff = now - lastKeyTimeRef.current;

      if (timeDiff > maxInterKeyDelayMs) {
        bufferRef.current = '';
      }

      if (event.key === 'Enter') {
        if (bufferRef.current.length >= minLength) {
          event.preventDefault();
          const scannedCode = normalizeBarcode(bufferRef.current.trim());
          bufferRef.current = '';
          onScan({
            barcode: scannedCode,
            scannedAt: new Date().toISOString(),
          });
        }
        return;
      }

      if (event.key.length === 1) {
        bufferRef.current += event.key;
        lastKeyTimeRef.current = now;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, maxInterKeyDelayMs, minLength, onScan]);
}
