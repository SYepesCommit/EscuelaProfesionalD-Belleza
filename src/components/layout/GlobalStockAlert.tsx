'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  Barcode,
  ChevronDown,
  ChevronUp,
  Package,
  X,
  XCircle,
} from 'lucide-react';
import { LowStockSummary } from '@/interfaces/inventory.interface';

interface GlobalStockAlertProps {
  summary: LowStockSummary | null;
}

export function GlobalStockAlert({ summary }: GlobalStockAlertProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  if (!summary || summary.criticalCount === 0 || isDismissed) {
    return null;
  }

  const thresholdPct = summary.thresholdPercent ?? 30;
  const outOfStockItems = summary.items.filter((i) => i.stock === 0);
  const lowStockItems = summary.items.filter((i) => i.stock > 0);

  return (
    <div className="border-b border-[#E4BDD0] bg-[#FAF0F5] px-3 py-1.5 text-[#141213] shadow-2xs transition-all sm:px-5 sm:py-2 dark:border-[#3D2833] dark:bg-[#23171D] dark:text-[#F5EEF1]">
      {/* Barra compacta de 1 sola línea en Móvil, POS y PC */}
      <div className="flex items-center justify-between gap-2">
        {/* Izquierda: Indicador % + Contadores compactos */}
        <div className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-2 overflow-hidden">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[#141213]/15 bg-[#ECCCD9] px-2.5 py-0.5 text-[11px] font-extrabold text-[#141213] shadow-2xs transition hover:bg-[#e5bdd0]"
          >
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-[#7A1E46]" />
            <span className="hidden md:inline">
              ALERTA DE REPOSICIÓN ({summary.criticalCount})
            </span>
            <span className="md:hidden">STOCK BAJO ({summary.criticalCount})</span>
          </button>

          {outOfStockItems.length > 0 && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-red-600 px-2 py-0.5 text-[11px] font-extrabold text-white shadow-2xs">
              <XCircle className="h-3 w-3 shrink-0" />
              <span>{outOfStockItems.length}</span>
              <span className="hidden xs:inline">Agotado(s)</span>
            </span>
          )}

          {lowStockItems.length > 0 && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-amber-400/70 bg-amber-100 px-2 py-0.5 text-[11px] font-extrabold text-amber-950 dark:border-amber-500/40 dark:bg-amber-950/80 dark:text-amber-200">
              <span>{lowStockItems.length}</span>
              <span className="hidden sm:inline">
                Por Agotarse (Límite Configurado)
              </span>
              <span className="sm:hidden">En Límite</span>
            </span>
          )}

          {/* Vista previa rápida de productos en pantallas grandes (xl) */}
          <div className="hidden min-w-0 items-center gap-2 xl:flex">
            {summary.items.slice(0, 2).map((item) => {
              const isZero = item.stock === 0;
              const pct =
                item.stockPercent ??
                Math.min(100, Math.round((item.stock / item.minStock) * 100));

              return (
                <div
                  key={item.id}
                  className="flex items-center gap-2 rounded-full border border-[#E4BDD0] bg-white/90 px-2.5 py-0.5 text-xs dark:border-[#3D2E35] dark:bg-[#181215]"
                >
                  <span className="max-w-[150px] truncate font-bold text-[#141213] dark:text-[#F5EEF1]">
                    {item.name}
                  </span>
                  <div className="h-1.5 w-12 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
                    <div
                      className={`h-full rounded-full ${
                        isZero ? 'bg-red-600' : 'bg-amber-500'
                      }`}
                      style={{ width: `${Math.max(6, pct)}%` }}
                    />
                  </div>
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[10px] font-black ${
                      isZero
                        ? 'bg-red-600 text-white'
                        : 'bg-[#ECCCD9] text-[#141213]'
                    }`}
                  >
                    {isZero ? '0%' : `${pct}%`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Derecha: Botones compactos Ver / Abastecer / Cerrar */}
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="inline-flex items-center gap-1 rounded-xl border border-[#E4BDD0] bg-white px-2.5 py-1 text-[11px] font-extrabold text-[#141213] transition hover:bg-[#F5E4EC] dark:border-[#3D2E35] dark:bg-[#181215] dark:text-[#ECCCD9] dark:hover:bg-[#2C2127]"
          >
            <span className="hidden sm:inline">
              {isExpanded ? 'Ocultar' : `Ver (${summary.criticalCount})`}
            </span>
            <span className="sm:hidden">{summary.criticalCount}</span>
            {isExpanded ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </button>

          <Link
            href="/inventario"
            className="inline-flex items-center gap-1 rounded-xl bg-[#141213] px-2.5 py-1 text-[11px] font-extrabold text-[#ECCCD9] shadow-2xs transition hover:bg-[#2A2528] dark:bg-[#ECCCD9] dark:text-[#141213] dark:hover:bg-[#E4BDD0]"
          >
            <Package className="h-3.5 w-3.5" />
            <span className="hidden xs:inline">Abastecer</span>
            <ArrowRight className="hidden sm:inline h-3 w-3" />
          </Link>

          <button
            type="button"
            onClick={() => setIsDismissed(true)}
            className="inline-flex h-6 w-6 items-center justify-center rounded-lg text-neutral-500 transition hover:bg-black/10 hover:text-[#141213] dark:text-[#C4B5BC] dark:hover:bg-white/10 dark:hover:text-white"
            title="Ocultar aviso temporalmente"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Panel desplegable con barras de progreso según el % configurado de cada producto */}
      {isExpanded && (
        <div className="mt-2.5 grid grid-cols-1 gap-2.5 border-t border-[#E4BDD0] pt-2.5 sm:grid-cols-2 lg:grid-cols-4 dark:border-[#3D2833]">
          {summary.items.map((item) => {
            const isZero = item.stock === 0;
            const itemLimitPct = item.alertPercent ?? thresholdPct;
            const pct =
              item.stockPercent ??
              Math.min(100, Math.round((item.stock / item.minStock) * 100));
            const thresholdUnits =
              item.alertThresholdUnits ??
              Math.ceil((item.minStock * itemLimitPct) / 100);
            const missingToFull = Math.max(0, item.minStock - item.stock);

            return (
              <div
                key={item.id}
                className="flex min-w-0 flex-col justify-between rounded-xl border border-[#E4BDD0] bg-white p-3 shadow-xs dark:border-[#3A2B33] dark:bg-[#181316]"
              >
                <div className="min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1 truncate font-mono text-[10px] font-bold text-neutral-500 dark:text-[#C4B5BC]">
                      <Barcode className="h-3 w-3 shrink-0" />
                      {item.barcode}
                    </span>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black ${
                        isZero
                          ? 'bg-red-600 text-white'
                          : 'bg-amber-100 text-amber-950 dark:bg-amber-950 dark:text-amber-200'
                      }`}
                    >
                      {isZero
                        ? '0% • AGOTADO'
                        : `${pct}% • Quedan ${item.stock}/${item.minStock}`}
                    </span>
                  </div>

                  <div className="mt-1 truncate text-xs font-extrabold text-[#141213] dark:text-white">
                    {item.name}
                  </div>
                  <div className="truncate text-[11px] text-neutral-500 dark:text-[#B8A8B0]">
                    {item.category}
                  </div>
                </div>

                {/* Barra visual con marcador de umbral configurable */}
                <div className="mt-2.5 space-y-1">
                  <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-[#2C2428]">
                    {/* Línea divisoria del % configurado */}
                    <div
                      className="absolute inset-y-0 z-10 w-0.5 bg-[#141213]/60 dark:bg-white/70"
                      style={{ left: `${itemLimitPct}%` }}
                      title={`Umbral de alerta: ${itemLimitPct}%`}
                    />
                    <div
                      className={`h-full rounded-full transition-all ${
                        isZero
                          ? 'bg-red-600'
                          : 'bg-gradient-to-r from-red-500 to-amber-500'
                      }`}
                      style={{ width: `${Math.max(4, pct)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-neutral-600 dark:text-[#C4B5BC]">
                    <span>
                      Límite individual: &le; {itemLimitPct}% ({thresholdUnits} uds)
                    </span>
                    <span className="font-extrabold text-[#141213] dark:text-[#ECCCD9]">
                      Reponer +{missingToFull} uds
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
