'use client';

import { useCallback, useEffect, useState } from 'react';
import { AuthUser } from '@/interfaces/auth.interface';
import {
  loginWithAccessCode,
  loginWithFingerprint,
} from '@/services/auth.service';

const STORAGE_KEY = 'epb_active_operator_user';

export function useAuthSession() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const syncSession = async () => {
      try {
        const saved = window.localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsedUser = JSON.parse(saved) as AuthUser;
          if (
            parsedUser.accessExpiresAt &&
            new Date().getTime() > new Date(parsedUser.accessExpiresAt).getTime()
          ) {
            window.localStorage.removeItem(STORAGE_KEY);
            setError('Su acceso temporal de Contabilidad/Invitado ha expirado.');
            setIsInitializing(false);
            return;
          }

          // Restaurar sesión de inmediato en cliente para evitar pestañeo del login al recargar
          setUser(parsedUser);
          setIsInitializing(false);

          // Sincronizar silenciosamente con la base de datos en segundo plano
          const res = await fetch(
            `/api/auth?accessCode=${encodeURIComponent(parsedUser.accessCode)}`,
            { cache: 'no-store' }
          );
          if (res.ok) {
            const data = (await res.json()) as {
              authenticated: boolean;
              user: AuthUser | null;
            };
            if (data.authenticated && data.user) {
              setUser(data.user);
              window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data.user));
            }
          }
        }
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
      } finally {
        setIsInitializing(false);
      }
    };
    void syncSession();
  }, []);

  const handleLoginByCode = useCallback(async (accessCode: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await loginWithAccessCode({ accessCode });
      if (!response.authenticated || !response.user) {
        setError(response.message ?? 'Código de acceso inválido');
        return;
      }
      setUser(response.user);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(response.user));
    } catch {
      setError('Error de red al autenticar con código');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleLoginByFingerprint = useCallback(async (fingerprintTemplate: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await loginWithFingerprint({ fingerprintTemplate });
      if (!response.authenticated || !response.user) {
        setError(response.message ?? 'Huella no registrada en el sistema');
        return;
      }
      setUser(response.user);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(response.user));
    } catch {
      setError('Error al validar huella biométrica');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleLogout = useCallback(() => {
    window.localStorage.removeItem(STORAGE_KEY);
    setUser(null);
    setError(null);
  }, []);

  return {
    user,
    isInitializing,
    isLoading,
    error,
    handleLoginByCode,
    handleLoginByFingerprint,
    handleLogout,
  };
}
