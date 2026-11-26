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
  const [isLoading, setIsLoading] = useState<boolean>(true);
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
            return;
          }

          // Sincronizar ID con la base de datos actual por código de acceso
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
              return;
            }
          }
          setUser(parsedUser);
        }
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
      } finally {
        setIsLoading(false);
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
    isLoading,
    error,
    handleLoginByCode,
    handleLoginByFingerprint,
    handleLogout,
  };
}
