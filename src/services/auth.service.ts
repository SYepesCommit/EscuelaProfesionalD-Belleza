import {
  AuthSessionResponse,
  CreateUserRolePayload,
  LoginByBiometryPayload,
  LoginByCodePayload,
  UserRoleType,
} from '@/interfaces/auth.interface';

export interface SystemUserItem {
  id: string;
  documentId: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  role: UserRoleType;
  accessCode: string;
  sellerSecretCode: string | null;
  hasFingerprint: boolean;
  hourlyRateCop: number;
  commissionRatePct: number;
  isTemporaryGuest: boolean;
  accessExpiresAt: string | null;
  isActive: boolean;
}

export async function fetchCurrentSession(): Promise<AuthSessionResponse> {
  const res = await fetch('/api/auth', { cache: 'no-store' });
  return (await res.json()) as AuthSessionResponse;
}

export async function loginWithAccessCode(
  payload: LoginByCodePayload
): Promise<AuthSessionResponse> {
  const res = await fetch('/api/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return (await res.json()) as AuthSessionResponse;
}

export async function loginWithFingerprint(
  payload: LoginByBiometryPayload
): Promise<AuthSessionResponse> {
  const res = await fetch('/api/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return (await res.json()) as AuthSessionResponse;
}

export async function fetchSystemUsers(): Promise<SystemUserItem[]> {
  const res = await fetch('/api/users', { cache: 'no-store' });
  if (!res.ok) throw new Error('Error cargando usuarios y roles');
  return (await res.json()) as SystemUserItem[];
}

export async function createSystemUserRequest(
  payload: CreateUserRolePayload
): Promise<void> {
  const res = await fetch('/api/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = (await res.json()) as { message?: string };
    throw new Error(err.message ?? 'Error creando usuario');
  }
}

export async function updateSystemUserAccessRequest(params: {
  targetUserId: string;
  isActive?: boolean;
  fullName?: string;
  documentId?: string;
  role?: UserRoleType;
  accessCode?: string;
  sellerSecretCode?: string | null;
  hourlyRateCop?: number;
  commissionRatePct?: number;
  accessExpiresAt?: string | null;
  operatorUserId: string;
}): Promise<void> {
  const res = await fetch('/api/users', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = (await res.json()) as { message?: string };
    throw new Error(err.message ?? 'Error actualizando permisos del usuario');
  }
}
