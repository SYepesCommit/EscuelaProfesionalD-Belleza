export type UserRoleType =
  | 'ADMIN'
  | 'ASESOR'
  | 'VENTA'
  | 'CONTABILIDAD'
  | 'PROFESOR';

export interface AuthUser {
  id: string;
  documentId: string;
  fullName: string;
  email: string | null;
  role: UserRoleType;
  accessCode: string;
  sellerSecretCode: string | null;
  isTemporaryGuest: boolean;
  accessExpiresAt: string | null;
}

export interface LoginByCodePayload {
  accessCode: string;
}

export interface LoginByBiometryPayload {
  fingerprintTemplate: string;
}

export interface AuthSessionResponse {
  authenticated: boolean;
  user: AuthUser | null;
  message?: string;
}

export interface CreateUserRolePayload {
  documentId: string;
  fullName: string;
  email?: string;
  phone?: string;
  role: UserRoleType;
  accessCode: string;
  sellerSecretCode?: string;
  fingerprintTemplate?: string;
  hourlyRateCop?: number;
  commissionRatePct?: number;
  isTemporaryGuest?: boolean;
  accessExpiresAt?: string | null;
  operatorUserId: string;
}
