'use client';

import React, { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Award,
  BarChart3,
  BookOpen,
  Calendar,
  Download,
  FileSpreadsheet,
  GraduationCap,
  Printer,
  Receipt,
  ShoppingBag,
  Sparkles,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import {
  MonthlyFinancialOverview,
  SellerMonthlyCommissionSummary,
} from '@/interfaces/sale.interface';
import { useUiMode } from '@/hooks/useUiMode';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatCop } from '@/lib/utils';

interface MonthlyCommissionsReportProps {
  monthKey: string;
  onChangeMonth?: (month: string) => void;
  summary: SellerMonthlyCommissionSummary[];
  financialOverview?: MonthlyFinancialOverview | null;
}

function buildRecentMonths(currentMonth: string): string[] {
  const set = new Set<string>();
  if (currentMonth) set.add(currentMonth);
  const now = new Date();
  for (let i = -5; i <= 1; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    set.add(`${yyyy}-${mm}`);
  }
  return Array.from(set).sort().reverse();
}

export function MonthlyCommissionsReport({
  monthKey,
  onChangeMonth,
  summary,
  financialOverview,
}: MonthlyCommissionsReportProps) {
  const { isDarkMode, isTouchMode } = useUiMode();

  const availableMonths = useMemo(
    () => buildRecentMonths(monthKey),
    [monthKey]
  );

  const grandTotalSales = useMemo(
    () => summary.reduce((acc, s) => acc + s.totalSalesCop, 0),
    [summary]
  );
  const grandTotalCommissions = useMemo(
    () => summary.reduce((acc, s) => acc + s.totalCommissionCop, 0),
    [summary]
  );
  const totalTransactions = useMemo(
    () => summary.reduce((acc, s) => acc + s.salesCount, 0),
    [summary]
  );

  const chartData = useMemo(
    () =>
      summary.map((item) => ({
        name: item.sellerName.split(' ')[0],
        ventas: item.totalSalesCop,
        comision: item.totalCommissionCop,
      })),
    [summary]
  );

  // Función de Exportación a Excel / CSV en Pesos Colombianos
  const handleExportCsv = () => {
    const headers = [
      'Mes',
      'Vendedor',
      'Documento',
      'Ventas_Cerradas',
      'Porcentaje_Comision',
      'Total_Ventas_COP',
      'Total_Comision_COP',
    ];

    const rows = summary.map((s) => [
      s.monthKey,
      `"${s.sellerName.replace(/"/g, '""')}"`,
      s.documentId,
      s.salesCount,
      `${s.commissionRatePct}%`,
      s.totalSalesCop,
      s.totalCommissionCop,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(';'), ...rows.map((e) => e.join(';'))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Liquidacion_Comisiones_EPB_${monthKey}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Exportación del Libro Contable Consolidado del Mes (Ventas POS + Abonos Académicos + Multas)
  const handleExportAccountingBookCsv = () => {
    const movements = financialOverview?.detailedAccountingMovements || [];
    const headers = [
      'Fecha_Hora',
      'Tipo_Movimiento',
      'No_Factura_Recibo',
      'Cliente_o_Alumna',
      'Documento_CC_NIT',
      'Concepto_Detalle',
      'Medio_de_Pago',
      'Referencia_Cuenta_o_Regla',
      'Valor_COP',
    ];

    const rows = movements.map((m) => [
      new Date(m.date).toLocaleString('es-CO'),
      m.category,
      `"${(m.referenceNumber || '').replace(/"/g, '""')}"`,
      `"${(m.thirdPartyName || '').replace(/"/g, '""')}"`,
      `"${(m.thirdPartyDocument || '').replace(/"/g, '""')}"`,
      `"${(m.concept || '').replace(/"/g, '""')}"`,
      m.paymentMethod,
      `"${(m.paymentReference || '').replace(/"/g, '""')}"`,
      m.amountCop,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(';'), ...rows.map((e) => e.join(';'))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Libro_Contable_EPB_${monthKey}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 min-w-0">
      {/* Barra de Filtro de Mes, Exportación Excel e Impresión */}
      <div className="flex flex-col justify-between gap-3 rounded-3xl border-2 border-[#E4BDD0] bg-white p-4 sm:p-5 shadow-sm sm:flex-row sm:items-center dark:border-[#332B2F] dark:bg-[#1B181A]">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#ECCCD9] text-[#141213] dark:bg-[#33252B] dark:text-[#ECCCD9]">
            <Calendar className="h-6 w-6" />
          </div>
          <div>
            <div className="text-xs font-black uppercase tracking-wider text-neutral-500 dark:text-[#C4B5BC]">
              Corte y Liquidación Consolidada
            </div>
            <div className="text-base sm:text-lg font-black text-[#141213] dark:text-white">
              Período Contable: {monthKey || 'Actual'}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onChangeMonth && (
            <select
              value={monthKey}
              onChange={(e) => onChangeMonth(e.target.value)}
              className={`rounded-xl border border-[#E4BDD0] bg-[#FAF2F6] px-3.5 text-xs font-extrabold text-[#141213] dark:border-[#3A3035] dark:bg-[#252023] dark:text-white ${
                isTouchMode ? 'h-12 text-sm' : 'h-10'
              }`}
            >
              {availableMonths.map((m) => (
                <option key={m} value={m}>
                  Mes: {m}
                </option>
              ))}
            </select>
          )}

          <Button
            type="button"
            variant="outline"
            onClick={handleExportCsv}
            className={`gap-1.5 border-emerald-300 font-extrabold text-emerald-800 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-300 dark:hover:bg-emerald-950/50 ${
              isTouchMode ? 'h-12 px-4 text-sm' : 'h-10 text-xs'
            }`}
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            <span>Comisiones (.CSV)</span>
          </Button>

          {financialOverview?.detailedAccountingMovements && (
            <Button
              type="button"
              onClick={handleExportAccountingBookCsv}
              className={`gap-1.5 bg-emerald-600 font-extrabold text-white hover:bg-emerald-700 ${
                isTouchMode ? 'h-12 px-4 text-sm' : 'h-10 text-xs'
              }`}
            >
              <Download className="h-4 w-4" />
              <span>Exportar Libro Contable Mes (.CSV / Excel)</span>
            </Button>
          )}

          <Button
            type="button"
            variant="outline"
            onClick={() => window.print()}
            className={`gap-1.5 font-extrabold dark:border-[#3A3035] dark:bg-[#252023] dark:text-white ${
              isTouchMode ? 'h-12 px-4 text-sm' : 'h-10 text-xs'
            }`}
          >
            <Printer className="h-4 w-4" />
            <span>Imprimir PDF</span>
          </Button>
        </div>
      </div>

      {/* Panorama Financiero Global de la Escuela (Si está disponible) */}
      {financialOverview && (
        <Card className="overflow-hidden border-[#E4BDD0] bg-white dark:border-[#332B2F] dark:bg-[#1B181A]">
          <CardHeader className="border-b border-[#E4BDD0]/60 bg-gradient-to-r from-[#ECCCD9]/40 to-[#FAF2F6] p-4 sm:p-5 dark:border-[#332B2F] dark:from-[#251E22] dark:to-[#1B181A]">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-base font-bold text-[#141213] dark:text-white">
                  <Wallet className="h-5 w-5 text-[#141213] dark:text-[#ECCCD9]" />
                  Ingresos Globales Consolidados del Mes ({monthKey})
                </CardTitle>
                <CardDescription className="text-xs text-neutral-600 dark:text-[#C4B5BC]">
                  Consolidación de Tienda POS + Matrículas y Pensiones Académicas + Multas por Inasistencia
                </CardDescription>
              </div>
              <Badge variant="pink" className="font-extrabold">
                Medellín &bull; NIT: 900.584.219-4
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="p-4 sm:p-6 space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
              <div className="rounded-2xl border border-neutral-200 bg-[#FAF7F9] p-3.5 text-center dark:border-[#332B2F] dark:bg-[#221D20]">
                <span className="text-[11px] font-bold text-neutral-500 dark:text-[#B8A8B0] block">
                  Tienda POS &bull; Productos
                </span>
                <span className="text-lg font-black text-[#141213] dark:text-white">
                  {formatCop(financialOverview.posSalesTotalCop)}
                </span>
                <span className="text-[10px] text-neutral-400 block mt-0.5">
                  {financialOverview.salesCount} compras
                </span>
              </div>

              <div className="rounded-2xl border border-neutral-200 bg-[#FAF7F9] p-3.5 text-center dark:border-[#332B2F] dark:bg-[#221D20]">
                <span className="text-[11px] font-bold text-neutral-500 dark:text-[#B8A8B0] block">
                  Abonos &bull; Alumnas
                </span>
                <span className="text-lg font-black text-blue-700 dark:text-blue-400">
                  {formatCop(financialOverview.tuitionTotalCop)}
                </span>
                <span className="text-[10px] text-neutral-400 block mt-0.5">
                  {financialOverview.tuitionReceiptsCount} recibos
                </span>
              </div>

              <div className="rounded-2xl border border-neutral-200 bg-[#FAF7F9] p-3.5 text-center dark:border-[#332B2F] dark:bg-[#221D20]">
                <span className="text-[11px] font-bold text-neutral-500 dark:text-[#B8A8B0] block">
                  Multas Inasistencia ($40k)
                </span>
                <span className="text-lg font-black text-amber-700 dark:text-amber-400">
                  {formatCop(financialOverview.finesTotalCop)}
                </span>
                <span className="text-[10px] text-neutral-400 block mt-0.5">
                  {financialOverview.finesCount} cobros
                </span>
              </div>

              <div className="rounded-2xl border-2 border-[#D9AFC2] bg-gradient-to-br from-[#FAF0F5] via-white to-[#ECCCD9]/40 p-3.5 text-center text-[#141213] shadow-xs dark:border-[#ECCCD9]/40 dark:bg-[#2A2126] dark:text-white">
                <span className="text-[11px] font-black uppercase tracking-wider text-[#7A1E46] dark:text-[#ECCCD9] block">
                  Gran Total Recaudado
                </span>
                <span className="text-lg font-black text-[#141213] dark:text-white">
                  {formatCop(financialOverview.schoolGrossIncomeCop)}
                </span>
                <span className="text-[10px] text-neutral-600 dark:text-[#ECCCD9]/80 block mt-0.5 font-semibold">
                  Flujo de caja total
                </span>
              </div>
            </div>

            {/* Desglose por Programas y Carreras Técnicas */}
            {financialOverview.courseBreakdown && financialOverview.courseBreakdown.length > 0 && (
              <div className="rounded-2xl border border-neutral-200 p-3.5 dark:border-[#332B2F]">
                <div className="flex items-center gap-2 text-xs font-black text-[#141213] dark:text-white mb-2.5">
                  <GraduationCap className="h-4 w-4 text-emerald-600" />
                  Rendimiento por Programas y Carreras Técnicas de Belleza:
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {financialOverview.courseBreakdown.map((course) => (
                    <div
                      key={course.courseId}
                      className="rounded-xl border border-neutral-200 bg-[#FAF7F9] p-3 text-xs dark:border-[#332B2F] dark:bg-[#221D20]"
                    >
                      <div className="font-extrabold text-[#141213] dark:text-white truncate">
                        {course.courseName}
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-neutral-500 dark:text-[#B8A8B0] mt-1">
                        <span>Alumnas matriculadas:</span>
                        <strong className="text-[#141213] dark:text-white">
                          {course.newStudentsCount}
                        </strong>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 4 Tarjetas KPI de Comisiones Comerciales */}
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-[#E4BDD0] bg-gradient-to-br from-[#FAF2F6] to-white p-4 shadow-xs dark:border-[#332B2F] dark:from-[#261F23] dark:to-[#1B181A]">
          <div className="text-xs font-bold text-neutral-500 dark:text-[#C4B5BC]">
            Período Consolidado
          </div>
          <div className="mt-1.5 text-xl sm:text-2xl font-black tracking-tight text-[#141213] dark:text-white">
            {monthKey}
          </div>
          <div className="mt-1 text-[11px] font-semibold text-neutral-500 dark:text-[#B8A8B0]">
            {summary.length} asesores comerciales
          </div>
        </div>

        <div className="rounded-2xl border border-[#E4BDD0] bg-white p-4 shadow-xs dark:border-[#332B2F] dark:bg-[#1B181A]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-500 dark:text-[#C4B5BC]">
              Facturas Cerradas en POS
            </span>
            <ShoppingBag className="h-4 w-4 text-[#141213] dark:text-[#ECCCD9]" />
          </div>
          <div className="mt-1.5 text-xl sm:text-2xl font-black tracking-tight text-[#141213] dark:text-white">
            {totalTransactions} ventas
          </div>
          <div className="mt-1 text-[11px] font-semibold text-neutral-500 dark:text-[#B8A8B0]">
            Protegidas 72h / 4to día / 24h
          </div>
        </div>

        <div className="rounded-2xl border border-[#E4BDD0] bg-white p-4 shadow-xs dark:border-[#332B2F] dark:bg-[#1B181A]">
          <div className="text-xs font-bold text-neutral-500 dark:text-[#C4B5BC]">
            Ventas Totales Comisionables
          </div>
          <div className="mt-1.5 text-xl sm:text-2xl font-black tracking-tight text-[#141213] dark:text-white">
            {formatCop(grandTotalSales)}
          </div>
          <div className="mt-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
            100% trazable en caja POS
          </div>
        </div>

        <div className="rounded-2xl border-2 border-[#D9AFC2] bg-gradient-to-br from-[#FAF0F5] via-white to-[#ECCCD9]/40 p-4 text-[#141213] shadow-xs dark:border-[#ECCCD9]/40 dark:bg-[#231D20] dark:text-white">
          <div className="text-xs font-black uppercase tracking-wider text-[#7A1E46] dark:text-[#ECCCD9]">
            Total Comisiones a Liquidar
          </div>
          <div className="mt-1.5 text-xl sm:text-2xl font-black tracking-tight text-[#141213] dark:text-white">
            {formatCop(grandTotalCommissions)}
          </div>
          <div className="mt-1 text-[11px] font-semibold text-neutral-600 dark:text-[#ECCCD9]/90">
            Liquidación de fin de mes
          </div>
        </div>
      </div>

      {/* Gráfica Comparativa Recharts */}
      <Card className="overflow-hidden border-[#E4BDD0] bg-white dark:border-[#332B2F] dark:bg-[#1B181A]">
        <CardHeader className="border-b border-[#E4BDD0]/60 bg-[#FAF2F6]/60 p-4 sm:p-5 dark:border-[#332B2F] dark:bg-[#221D20]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2 text-base font-bold text-[#141213] dark:text-[#F5EEF1]">
                <TrendingUp className="h-5 w-5 text-[#141213] dark:text-[#ECCCD9]" />
                Gráfica Comparativa de Ventas vs. Comisiones por Asesor
              </CardTitle>
              <CardDescription className="text-xs text-neutral-600 dark:text-[#C4B5BC]">
                Rendimiento comercial acumulado bajo la regla de blindaje de 3 días y liberación al 4to día
              </CardDescription>
            </div>
            <span className="rounded-full bg-[#ECCCD9] px-3 py-1 text-xs font-extrabold text-[#141213]">
              Tiempo Real (COP)
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={isDarkMode ? '#332B2F' : '#F0D0DF'}
                />
                <XAxis
                  dataKey="name"
                  stroke={isDarkMode ? '#E5D8DF' : '#141213'}
                  fontSize={12}
                />
                <YAxis
                  stroke={isDarkMode ? '#E5D8DF' : '#141213'}
                  fontSize={11}
                />
                <Tooltip
                  formatter={(value) => formatCop(Number(value ?? 0))}
                  contentStyle={{
                    backgroundColor: isDarkMode ? '#1B181A' : '#FFFFFF',
                    borderColor: isDarkMode ? '#ECCCD9' : '#EBC8D8',
                    color: isDarkMode ? '#F5EEF1' : '#141213',
                    borderRadius: '12px',
                  }}
                />
                <Bar
                  dataKey="ventas"
                  name="Ventas Cerradas (COP)"
                  fill={isDarkMode ? '#ECCCD9' : '#141213'}
                  radius={[8, 8, 0, 0]}
                />
                <Bar
                  dataKey="comision"
                  name="Comisión Liquidada (COP)"
                  fill={isDarkMode ? '#9D7B8B' : '#E4BDD0'}
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Planilla Mensual de Liquidación (Móvil Tarjetas + PC Tabla) */}
      <Card className="overflow-hidden border-[#E4BDD0] bg-white dark:border-[#332B2F] dark:bg-[#1B181A]">
        <CardHeader className="border-b border-[#E4BDD0]/60 bg-[#FAF2F6]/60 p-4 sm:p-5 dark:border-[#332B2F] dark:bg-[#221D20]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2 text-base font-bold text-[#141213] dark:text-[#F5EEF1]">
                <BarChart3 className="h-5 w-5 text-[#141213] dark:text-[#ECCCD9]" />
                Planilla Mensual de Liquidación de Comisiones por Vendedor
              </CardTitle>
              <CardDescription className="text-xs text-neutral-600 dark:text-[#C4B5BC]">
                Incluye ventas protegidas por la regla de los primeros 3 días, segundas oportunidades al 4to día y cierres libres.
              </CardDescription>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-[#ECCCD9] px-3 py-1 text-xs font-extrabold text-[#141213]">
              <Award className="h-3.5 w-3.5" />
              Corte Mensual
            </span>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {/* Vista Móvil (< md) */}
          <div className="divide-y divide-neutral-200 md:hidden dark:divide-[#332B2F]">
            {summary.map((item) => (
              <div key={item.sellerId} className="space-y-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-extrabold text-[#141213] dark:text-white">
                      {item.sellerName}
                    </div>
                    <div className="text-xs text-neutral-500 dark:text-[#B8A8B0]">
                      C.C. {item.documentId}
                    </div>
                  </div>
                  <Badge variant="pink">{item.salesCount} ventas</Badge>
                </div>

                <div className="grid grid-cols-3 gap-2 rounded-xl border border-neutral-200 bg-[#FAF7F9] p-2.5 text-xs dark:border-[#332B2F] dark:bg-[#221D20]">
                  <div>
                    <div className="text-[10px] text-neutral-500 dark:text-[#B8A8B0]">
                      % Comisión
                    </div>
                    <div className="font-bold text-[#141213] dark:text-white">
                      {item.commissionRatePct}%
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-neutral-500 dark:text-[#B8A8B0]">
                      Vendido
                    </div>
                    <div className="font-bold text-[#141213] dark:text-white">
                      {formatCop(item.totalSalesCop)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-neutral-500 dark:text-[#B8A8B0]">
                      Comisión
                    </div>
                    <div className="font-black text-[#141213] dark:text-[#ECCCD9]">
                      {formatCop(item.totalCommissionCop)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Vista Desktop (>= md) */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow className="border-neutral-200 bg-[#FAF7F9] dark:border-[#332B2F] dark:bg-[#221D20]">
                  <TableHead className="font-bold text-[#141213] dark:text-[#ECCCD9]">
                    Vendedor / Asesor Comercial
                  </TableHead>
                  <TableHead className="font-bold text-[#141213] dark:text-[#ECCCD9]">
                    Documento
                  </TableHead>
                  <TableHead className="font-bold text-[#141213] dark:text-[#ECCCD9]">
                    Ventas Asignadas
                  </TableHead>
                  <TableHead className="font-bold text-[#141213] dark:text-[#ECCCD9]">
                    % Comisión
                  </TableHead>
                  <TableHead className="font-bold text-[#141213] dark:text-[#ECCCD9]">
                    Volumen Vendido (COP)
                  </TableHead>
                  <TableHead className="text-right font-bold text-[#141213] dark:text-[#ECCCD9]">
                    Comisión Acumulada a Pagar
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.map((item) => (
                  <TableRow
                    key={item.sellerId}
                    className="border-neutral-200 dark:border-[#332B2F]"
                  >
                    <TableCell className="font-extrabold text-[#141213] dark:text-white">
                      {item.sellerName}
                    </TableCell>
                    <TableCell className="text-xs text-neutral-500 dark:text-[#B8A8B0]">
                      {item.documentId}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{item.salesCount} ventas</Badge>
                    </TableCell>
                    <TableCell className="font-bold text-[#141213] dark:text-white">
                      {item.commissionRatePct}%
                    </TableCell>
                    <TableCell className="font-bold text-[#141213] dark:text-white">
                      {formatCop(item.totalSalesCop)}
                    </TableCell>
                    <TableCell className="text-right text-base font-black text-[#141213] dark:text-[#ECCCD9]">
                      {formatCop(item.totalCommissionCop)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
