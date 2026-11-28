'use client';

import { useCallback, useEffect, useState } from 'react';
import { CreateUserRolePayload } from '@/interfaces/auth.interface';
import {
  createSystemUserRequest,
  fetchSystemUsers,
  SystemUserItem,
  updateSystemUserAccessRequest,
} from '@/services/auth.service';

export function useUsersManagement() {
  const [users, setUsers] = useState<SystemUserItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchSystemUsers();
      setUsers(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Error cargando usuarios y roles'
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const createUser = useCallback(
    async (payload: CreateUserRolePayload) => {
      await createSystemUserRequest(payload);
      await loadUsers();
    },
    [loadUsers]
  );

  const updateUserAccess = useCallback(
    async (params: {
      targetUserId: string;
      isActive?: boolean;
      fullName?: string;
      documentId?: string;
      role?: 'ADMIN' | 'ASESOR' | 'VENTA' | 'CONTABILIDAD' | 'PROFESOR';
      accessCode?: string;
      sellerSecretCode?: string | null;
      hourlyRateCop?: number;
      commissionRatePct?: number;
      accessExpiresAt?: string | null;
      operatorUserId: string;
    }) => {
      await updateSystemUserAccessRequest(params);
      await loadUsers();
    },
    [loadUsers]
  );

  return {
    users,
    isLoading,
    error,
    reloadUsers: loadUsers,
    createUser,
    updateUserAccess,
  };
}
