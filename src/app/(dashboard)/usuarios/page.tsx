'use client';

import React from 'react';
import { RolesAndGuestsPanel } from '@/components/staff/RolesAndGuestsPanel';
import { PageLoading } from '@/components/ui/page-loading';
import { useUsersManagement } from '@/hooks/useUsersManagement';
import { useAuthSession } from '@/hooks/useAuthSession';

export default function UsuariosRolesPage() {
  const { user } = useAuthSession();
  const { users, isLoading, createUser, updateUserAccess } =
    useUsersManagement();

  if (isLoading && users.length === 0) {
    return (
      <PageLoading
        title="Cargando Directorio de Usuarios, Roles y Credenciales..."
        subtitle="Verificando permisos por perfil y vigencia de pases temporales de Contabilidad"
      />
    );
  }

  return (
    <div className="space-y-5 min-w-0">
      <div>
        <h1 className="font-serif text-xl sm:text-2xl font-bold text-[#141213] dark:text-[#F5EEF1]">
          Gestión de Roles, Usuarios y Pases Temporales para Contabilidad
        </h1>
        <p className="mt-0.5 text-xs sm:text-sm text-neutral-600 dark:text-[#C4B5BC]">
          Administre los perfiles de Administrador, Asesor, Venta, Docente y otorgue accesos con fecha de caducidad para Contabilidad/Invitado.
        </p>
      </div>

      <RolesAndGuestsPanel
        users={users}
        operatorUserId={user?.id ?? ''}
        onCreateUser={createUser}
        onUpdateAccess={updateUserAccess}
      />
    </div>
  );
}
