'use client';

import React from 'react';
import { MonthlyCommissionsReport } from '@/components/sales/MonthlyCommissionsReport';
import { PageLoading } from '@/components/ui/page-loading';
import { useSalesAndPresales } from '@/hooks/useSalesAndPresales';

export default function ReportesPage() {
  const {
    monthKey,
    setMonthKey,
    monthlyReport,
    financialOverview,
    isLoading,
    reloadSalesData,
  } = useSalesAndPresales();

  if (isLoading && monthlyReport.length === 0) {
    return (
      <PageLoading
        title="Generando Reporte Mensual Consolidado de Comisiones..."
        subtitle="Calculando cierres de venta, blindajes de 3 días y liquidación por asesor"
      />
    );
  }

  return (
    <div className="space-y-5 min-w-0">
      <div>
        <h1 className="font-serif text-xl sm:text-2xl font-bold text-[#141213] dark:text-[#F5EEF1]">
          Reporte Mensual Consolidado y Liquidación de Comisiones
        </h1>
        <p className="mt-0.5 text-xs sm:text-sm text-neutral-600 dark:text-[#C4B5BC]">
          Ingresos institucionales, ventas POS, recaudos académicos y liquidación de comisiones con exportación a Excel / CSV.
        </p>
      </div>

      <MonthlyCommissionsReport
        monthKey={monthKey}
        onChangeMonth={(m) => {
          setMonthKey(m);
          void reloadSalesData();
        }}
        summary={monthlyReport}
        financialOverview={financialOverview}
      />
    </div>
  );
}
