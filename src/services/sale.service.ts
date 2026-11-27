import {
  ClientPresaleItem,
  CreateSalePayload,
  RegisterPresalePayload,
  SaleRecordItem,
  SellerMonthlyCommissionSummary,
  MonthlyReportResponse,
} from '@/interfaces/sale.interface';

export async function fetchPresales(): Promise<ClientPresaleItem[]> {
  const res = await fetch('/api/presales', { cache: 'no-store' });
  if (!res.ok) throw new Error('Error cargando preventas');
  return (await res.json()) as ClientPresaleItem[];
}

export async function registerPresaleRequest(
  payload: RegisterPresalePayload
): Promise<void> {
  const res = await fetch('/api/presales', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = (await res.json()) as { message?: string };
    throw new Error(err.message ?? 'Error registrando preventa');
  }
}

export async function claimPresaleOpportunityRequest(
  presaleId: string,
  sellerSecretCode: string,
  note?: string
): Promise<void> {
  const res = await fetch('/api/presales', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'CLAIM_OPPORTUNITY',
      presaleId,
      sellerSecretCode,
      note,
    }),
  });
  if (!res.ok) {
    const err = (await res.json()) as { message?: string };
    throw new Error(err.message ?? 'Error al tomar oportunidad del prospecto');
  }
}

export async function updatePresaleNotesRequest(
  presaleId: string,
  notes: string
): Promise<void> {
  const res = await fetch('/api/presales', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'UPDATE_NOTES',
      presaleId,
      notes,
    }),
  });
  if (!res.ok) {
    const err = (await res.json()) as { message?: string };
    throw new Error(err.message ?? 'Error al actualizar notas comerciales');
  }
}

export async function fetchSales(): Promise<SaleRecordItem[]> {
  const res = await fetch('/api/sales', { cache: 'no-store' });
  if (!res.ok) throw new Error('Error cargando historial de ventas');
  return (await res.json()) as SaleRecordItem[];
}

export async function createSaleRequest(
  payload: CreateSalePayload
): Promise<void> {
  const res = await fetch('/api/sales', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = (await res.json()) as { message?: string };
    throw new Error(err.message ?? 'Error procesando venta');
  }
}

export async function voidSaleRequest(params: {
  saleId: string;
  voidReason: string;
  operatorSecretCode: string;
}): Promise<void> {
  const res = await fetch('/api/sales', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = (await res.json()) as { message?: string };
    throw new Error(err.message ?? 'Error reversando venta');
  }
}

export async function fetchMonthlyCommissionsReport(
  monthKey?: string
): Promise<MonthlyReportResponse> {
  const query = monthKey ? `?monthKey=${encodeURIComponent(monthKey)}` : '';
  const res = await fetch(`/api/reports${query}`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Error cargando reporte mensual de comisiones');
  return (await res.json()) as MonthlyReportResponse;
}
