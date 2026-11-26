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
          const scannedCode = bufferRef.current.trim();
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
