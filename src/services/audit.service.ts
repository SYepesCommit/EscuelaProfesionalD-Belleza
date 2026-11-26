import { AuditLogItem } from '@/interfaces/audit.interface';

export async function fetchAuditLogs(): Promise<AuditLogItem[]> {
  const res = await fetch('/api/audit', { cache: 'no-store' });
  if (!res.ok) throw new Error('Error cargando registros de auditoría');
  return (await res.json()) as AuditLogItem[];
}
