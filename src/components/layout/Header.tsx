'use client';

import React from 'react';
import {
  Fingerprint,
  Barcode,
  LogOut,
  ShieldAlert,
  UserCheck,
  Clock,
  Eye,
  Monitor,
  TabletSmartphone,
  Moon,
  Sun,
  Menu,
  RotateCw,
} from 'lucide-react';
import { AuthUser } from '@/interfaces/auth.interface';
import { ROLE_PERMISSIONS } from '@/lib/permissions';
import { useUiMode } from '@/hooks/useUiMode';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDateTimeCo } from '@/lib/utils';

interface HeaderProps {
  user: AuthUser | null;
  fingerprintConnected: boolean;
  onLogout: () => void;
  onOpenMobileMenu?: () => void;
  onRefreshData?: () => void;
  isRefreshingData?: boolean;
}

export function Header({
  user,
  fingerprintConnected,
  onLogout,
  onOpenMobileMenu,
  onRefreshData,
  isRefreshingData = false,
}: HeaderProps) {
  const roleConfig = user ? ROLE_PERMISSIONS[user.role] : null;
  const { isTouchMode, toggleMode, isDarkMode, toggleTheme } = useUiMode();

  return (
    <header className="flex min-h-14 sm:min-h-16 flex-wrap items-center justify-between gap-2 border-b border-neutral-200 dark:border-[#332B2F] bg-white dark:bg-[#171516] px-3.5 py-2 sm:px-6 transition-all">
      {/* Lado Izquierdo: Botón Menú Móvil + Controles Híbridos */}
      <div className="flex items-center gap-2">
        {/* Botón Hamburguesa (Solo Móvil < md) */}
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="flex md:hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#E4BDD0] dark:border-white/15 bg-[#F9EFF3] dark:bg-[#241E21] text-[#141213] dark:text-[#ECCCD9] shadow-xs active:scale-95"
          title="Abrir menú de navegación"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* 1. Interruptor Híbrido: Modo Escritorio <-> Modo Táctil POS */}
        <button
          type="button"
          onClick={toggleMode}
          className={`flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 sm:px-3.5 sm:py-2 text-xs font-extrabold shadow-xs transition-all active:scale-95 ${
            isTouchMode
              ? 'border-[#232222] dark:border-[#ECCCD9] bg-[#232222] text-[#ECCCD9]'
              : 'border-[#E4BDD0] dark:border-white/15 bg-[#F9EFF3] dark:bg-[#241E21] text-[#232222] dark:text-[#ECCCD9]'
          }`}
          title="Cambiar entre Modo Escritorio y Modo Táctil POS"
        >
          {isTouchMode ? (
            <>
              <TabletSmartphone className="h-4 w-4 shrink-0 text-[#ECCCD9]" />
              <span className="hidden sm:inline">MODO TÁCTIL POS</span>
              <span className="sm:hidden">POS</span>
            </>
          ) : (
            <>
              <Monitor className="h-4 w-4 shrink-0" />
              <span className="hidden lg:inline">Modo Escritorio (Cambiar a Táctil POS)</span>
              <span className="hidden sm:inline lg:hidden">Escritorio</span>
              <span className="sm:hidden">PC</span>
            </>
          )}
        </button>

        {/* 2. Interruptor de Tema: Modo Claro <-> Modo Oscuro */}
        <button
          type="button"
          onClick={toggleTheme}
          className={`flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs font-extrabold shadow-xs transition-all active:scale-95 ${
            isDarkMode
              ? 'border-[#ECCCD9]/60 bg-[#232222] text-[#ECCCD9]'
              : 'border-neutral-200 bg-white text-[#232222] hover:bg-[#F9EFF3]'
          }`}
          title="Alternar entre Modo Claro y Modo Oscuro"
        >
          {isDarkMode ? (
            <>
              <Sun className="h-4 w-4 shrink-0 text-[#ECCCD9]" />
              <span className="hidden sm:inline">Modo Claro</span>
            </>
          ) : (
            <>
              <Moon className="h-4 w-4 shrink-0 text-[#232222]" />
              <span className="hidden sm:inline">Modo Oscuro</span>
            </>
          )}
        </button>

        {/* 3. Botón de Sincronización Manual Inmediata (Sin refrescar la página) */}
        <button
          type="button"
          onClick={onRefreshData}
          disabled={isRefreshingData}
          className="flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white dark:border-[#3A3035] dark:bg-[#201C1E] px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs font-bold text-[#141213] dark:text-[#ECCCD9] hover:bg-[#FAF0F5] dark:hover:bg-[#2A2327] shadow-xs active:scale-95 transition-all"
          title="Sincronizar y actualizar datos de todos los módulos ahora mismo sin recargar la página"
        >
          <RotateCw className={`h-3.5 w-3.5 text-[#7A1E46] dark:text-[#ECCCD9] ${isRefreshingData ? 'animate-spin' : ''}`} />
          <span className="hidden md:inline">Actualizar Datos</span>
          <span className="md:hidden">Sincronizar</span>
        </button>

        {/* Badges de Hardware (Solo visibles en pantallas amplias xl) */}
        <div className="hidden xl:flex items-center gap-2">
          <Badge variant="pink" className="gap-1.5 px-3 py-1">
            <Barcode className="h-3.5 w-3.5" />
            Escáner USB
          </Badge>

          <Badge
            variant={fingerprintConnected ? 'success' : 'secondary'}
            className="gap-1.5 px-3 py-1"
          >
            <Fingerprint className="h-3.5 w-3.5" />
            {fingerprintConnected ? 'Huellero Conectado' : 'Huellero USB'}
          </Badge>
        </div>

        {roleConfig?.isReadOnly && (
          <Badge variant="warning" className="hidden lg:inline-flex gap-1.5 px-3 py-1">
            <Eye className="h-3.5 w-3.5" />
            Contabilidad
          </Badge>
        )}

        {user?.isTemporaryGuest && user.accessExpiresAt && (
          <Badge
            variant="outline"
            className="hidden lg:inline-flex gap-1.5 border-amber-300 bg-amber-50 px-3 py-1 text-amber-900"
          >
            <Clock className="h-3.5 w-3.5" />
            Vence: {formatDateTimeCo(user.accessExpiresAt)}
          </Badge>
        )}
      </div>

      {/* Lado Derecho: Usuario + Salir */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {user ? (
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="text-right min-w-0">
              <div className="flex items-center justify-end gap-1">
                <UserCheck className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span className="text-xs sm:text-sm font-bold text-[#222222] dark:text-neutral-100 truncate max-w-[130px] sm:max-w-[220px] md:max-w-none">
                  {user.fullName}
                </span>
              </div>
              <span className="hidden sm:block text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                Rol: <strong>{user.role}</strong> &bull; Cód: {user.accessCode}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={onLogout}
              className="h-8 sm:h-9 px-2.5 sm:px-3 text-xs shrink-0"
              title="Cambiar de usuario o cerrar turno"
            >
              <LogOut className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Salir</span>
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-xs text-amber-700">
            <ShieldAlert className="h-4 w-4" />
            <span>Sin sesión</span>
          </div>
        )}
      </div>
    </header>
  );
}
