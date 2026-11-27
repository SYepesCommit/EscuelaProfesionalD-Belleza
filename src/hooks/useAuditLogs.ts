'use client';

import { useCallback, useEffect, useState } from 'react';
import { AuditLogItem } from '@/interfaces/audit.interface';
import { fetchAuditLogs } from '@/services/audit.service';

export function useAuditLogs() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadLogs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchAuditLogs();
      setLogs(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Error cargando auditoría'
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadLogs();
  }, [loadLogs]);

  useEffect(() => {
    const handleManualRefresh = () => {
      void loadLogs();
    };
    window.addEventListener('epb:manual-refresh', handleManualRefresh);
    return () => {
      window.removeEventListener('epb:manual-refresh', handleManualRefresh);
    };
  }, [loadLogs]);

  return {
    logs,
    isLoading,
    error,
    reloadLogs: loadLogs,
  };
}
