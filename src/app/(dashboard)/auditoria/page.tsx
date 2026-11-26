'use client';

import React from 'react';
import { AuditTrailTable } from '@/components/audit/AuditTrailTable';
import { PageLoading } from '@/components/ui/page-loading';
import { useAuditLogs } from '@/hooks/useAuditLogs';

export default function AuditoriaPage() {
  const { logs, isLoading, reloadLogs } = useAuditLogs();

  if (isLoading && logs.length === 0) {
    return (
      <PageLoading
        title="Cargando Bitácora Forense de Auditoría..."
        subtitle="Traduciendo movimientos financieros, académicos y biométricos a lectura ejecutiva"
      />
    );
  }

  return (
    <div className="space-y-5 min-w-0">
      <div>
        <h1 className="font-serif text-xl sm:text-2xl font-bold text-[#141213] dark:text-[#F5EEF1]">
          Auditoría Forense y Trazabilidad de Movimientos
        </h1>
        <p className="mt-0.5 text-xs sm:text-sm text-neutral-600 dark:text-[#C4B5BC]">
          Registro inalterable traducido al español de cada cobro, ajuste de stock, bloqueo de alumna, asistencia por huella y liquidación.
        </p>
      </div>

      <AuditTrailTable
        logs={logs}
        onRefresh={reloadLogs}
        isRefreshing={isLoading}
      />
    </div>
  );
}
