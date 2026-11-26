import { UserRoleType } from '@/interfaces/auth.interface';

export interface RolePermissionConfig {
  role: UserRoleType;
  label: string;
  description: string;
  defaultRedirect: string;
  allowedPaths: string[];
  isReadOnly: boolean;
  canManageUsers: boolean;
}

export const ROLE_PERMISSIONS: Record<UserRoleType, RolePermissionConfig> = {
  ADMIN: {
    role: 'ADMIN',
    label: 'Administrador General',
    description: 'Control total de la escuela, usuarios, accesos temporales, POS y auditoría.',
    defaultRedirect: '/agenda',
    allowedPaths: [
      '/agenda',
      '/alumnos',
      '/asistencia',
      '/personal',
      '/inventario',
      '/preventas',
      '/ventas',
      '/reportes',
      '/auditoria',
      '/usuarios',
    ],
    isReadOnly: false,
    canManageUsers: true,
  },
  ASESOR: {
    role: 'ASESOR',
    label: 'Asesor Académico / Recepción',
    description: 'Agendas por salón, alumnos, multas ($40.000 COP), asistencia biométrica y preventas.',
    defaultRedirect: '/agenda',
    allowedPaths: [
      '/agenda',
      '/alumnos',
      '/asistencia',
      '/preventas',
    ],
    isReadOnly: false,
    canManageUsers: false,
  },
  VENTA: {
    role: 'VENTA',
    label: 'Ejecutivo de Venta / Tienda POS',
    description: 'Inventario, preventas protegidas (3 días / 24h), facturación con escáner y sus comisiones.',
    defaultRedirect: '/ventas',
    allowedPaths: [
      '/inventario',
      '/preventas',
      '/ventas',
      '/reportes',
    ],
    isReadOnly: false,
    canManageUsers: false,
  },
  CONTABILIDAD: {
    role: 'CONTABILIDAD',
    label: 'Contabilidad / Invitado Externo',
    description: 'Acceso de solo lectura y verificación financiera a reportes, nómina quincenal, ventas, multas y auditoría.',
    defaultRedirect: '/reportes',
    allowedPaths: [
      '/reportes',
      '/personal',
      '/ventas',
      '/alumnos',
      '/auditoria',
    ],
    isReadOnly: true,
    canManageUsers: false,
  },
  PROFESOR: {
    role: 'PROFESOR',
    label: 'Docente de Planta',
    description: 'Consulta de agendas de salón y marcación biométrica.',
    defaultRedirect: '/agenda',
    allowedPaths: ['/agenda', '/asistencia'],
    isReadOnly: true,
    canManageUsers: false,
  },
};

export function canRoleAccessPath(role: UserRoleType, pathname: string): boolean {
  const config = ROLE_PERMISSIONS[role];
  if (!config) return false;
  return config.allowedPaths.some(
    (allowed) => pathname === allowed || pathname.startsWith(`${allowed}/`)
  );
}
