'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FingerprintReaderState,
  FingerprintWsMessage,
} from '@/interfaces/hardware.interface';

interface UseFingerprintOptions {
  onCaptureSuccess?: (template: string) => void;
  onMatchFound?: (payload: FingerprintWsMessage) => void;
  autoConnect?: boolean;
}

export function useFingerprint(options?: UseFingerprintOptions) {
  const wsUrl =
    process.env.NEXT_PUBLIC_FINGERPRINT_WS_URL || 'ws://localhost:8080';
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const [state, setState] = useState<FingerprintReaderState>({
    isConnected: false,
    isScanning: false,
    lastEvent: null,
    lastTemplate: null,
    matchedEntityId: null,
    error: null,
  });

  const connect = useCallback(() => {
    try {
      if (wsRef.current?.readyState === WebSocket.OPEN) return;

      const socket = new WebSocket(wsUrl);
      wsRef.current = socket;

      socket.onopen = () => {
        setState((prev) => ({
          ...prev,
          isConnected: true,
          lastEvent: 'CONNECTED',
          error: null,
        }));
      };

      socket.onmessage = (event: MessageEvent<string>) => {
        try {
          const parsed = JSON.parse(event.data) as FingerprintWsMessage;
          setState((prev) => ({
            ...prev,
            isScanning: false,
            lastEvent: parsed.event,
            lastTemplate: parsed.template ?? prev.lastTemplate,
            matchedEntityId:
              parsed.matchedStudentId ??
              parsed.matchedUserId ??
              prev.matchedEntityId,
            error: parsed.event === 'ERROR' ? (parsed.errorMessage ?? 'Error de lectura') : null,
          }));

          if (parsed.event === 'CAPTURE_SUCCESS' && parsed.template) {
            optionsRef.current?.onCaptureSuccess?.(parsed.template);
          }

          if (parsed.event === 'MATCH_FOUND') {
            optionsRef.current?.onMatchFound?.(parsed);
          }
        } catch {
          setState((prev) => ({
            ...prev,
            error: 'Trama inválida recibida del agente biométrico USB',
          }));
        }
      };

      socket.onclose = () => {
        setState((prev) => ({
          ...prev,
          isConnected: false,
          isScanning: false,
          lastEvent: 'DISCONNECTED',
        }));

        reconnectTimerRef.current = setTimeout(() => {
          connect();
        }, 4000);
      };

      socket.onerror = () => {
        setState((prev) => ({
          ...prev,
          isConnected: false,
          error: 'Puente biométrico local (ws://localhost:8080) en espera',
        }));
      };
    } catch {
      setState((prev) => ({
        ...prev,
        isConnected: false,
        error: 'No se pudo inicializar conexión WebSocket con huellero',
      }));
    }
  }, [wsUrl]);

  const autoConnect = options?.autoConnect !== false;

  useEffect(() => {
    if (autoConnect) {
      connect();
    }
    return () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      wsRef.current?.close();
    };
  }, [connect, autoConnect]);

  const requestScan = useCallback(() => {
    setState((prev) => ({ ...prev, isScanning: true, error: null }));
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ command: 'START_CAPTURE' }));
    }
  }, []);

  /**
   * Simulador para pruebas locales en caso de que el computador aún no tenga conectado el lector USB físico
   */
  const simulateBiometricCapture = useCallback(
    (simulatedTemplate: string) => {
      setState((prev) => ({
        ...prev,
        isScanning: false,
        lastEvent: 'CAPTURE_SUCCESS',
        lastTemplate: simulatedTemplate,
        error: null,
      }));
      optionsRef.current?.onCaptureSuccess?.(simulatedTemplate);
    },
    []
  );

  return {
    state,
    requestScan,
    simulateBiometricCapture,
  };
}
