'use client';

import React from 'react';
import { PresalesProtectionBoard } from '@/components/sales/PresalesProtectionBoard';
import { PageLoading } from '@/components/ui/page-loading';
import { useSalesAndPresales } from '@/hooks/useSalesAndPresales';

export default function PreventasPage() {
  const {
    presales,
    isLoading,
    registerPresale,
    claimPresaleOpportunity,
    updatePresaleNotes,
  } = useSalesAndPresales();

  if (isLoading && presales.length === 0) {
    return (
      <PageLoading
        title="Cargando Tablero de Preventas y Blindaje 72h / 24h..."
        subtitle="Verificando ventanas de protección de 3 días, liberación al 4to día y piscina libre"
      />
    );
  }

  return (
    <div className="space-y-5 min-w-0">
      <div>
        <h1 className="font-serif text-xl sm:text-2xl font-bold text-[#141213] dark:text-[#F5EEF1]">
          Preventas, Código Secreto y Protección de Clientes (3 Días / 4to Día / 24h)
        </h1>
        <p className="mt-0.5 text-xs sm:text-sm text-neutral-600 dark:text-[#C4B5BC]">
          Asignación estricta de prospectos por código secreto comercial y liberación automática al 4to día y tras 24 horas de segunda atención.
        </p>
      </div>

      <PresalesProtectionBoard
        presales={presales}
        onRegisterPresale={registerPresale}
        onClaimOpportunity={claimPresaleOpportunity}
        onUpdateNotes={updatePresaleNotes}
      />
    </div>
  );
}
