'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  CalendarDays,
  GraduationCap,
  Fingerprint,
  Users,
  Package,
  ShieldCheck,
  ShoppingCart,
  BarChart3,
  FileSearch,
  Sparkles,
  UserCog,
  Eye,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { AuthUser } from '@/interfaces/auth.interface';
import { canRoleAccessPath, ROLE_PERMISSIONS } from '@/lib/permissions';
import { useUiMode } from '@/hooks/useUiMode';
import { cn } from '@/lib/utils';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

const ALL_NAV_ITEMS: NavItem[] = [
  { label: 'Centro de Mando POS', href: '/dashboard', icon: LayoutDashboard, badge: 'Inicio' },
  { label: 'Agendas por Salón', href: '/agenda', icon: CalendarDays },
  { label: 'Alumnos y Multas', href: '/alumnos', icon: GraduationCap },
  { label: 'Asistencia Biométrica', href: '/asistencia', icon: Fingerprint },
  { label: 'Personal y Quincenas', href: '/personal', icon: Users },
  { label: 'Inventario y Stock', href: '/inventario', icon: Package },
  { label: 'Preventas (3d / 24h)', href: '/preventas', icon: ShieldCheck },
  { label: 'Caja y Escáner POS', href: '/ventas', icon: ShoppingCart },
  { label: 'Reportes y Comisiones', href: '/reportes', icon: BarChart3 },
  { label: 'Auditoría Forense', href: '/auditoria', icon: FileSearch },
  { label: 'Roles y Accesos', href: '/usuarios', icon: UserCog, badge: 'Admin' },
];

interface SidebarProps {
  user: AuthUser;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
  stockAlertCount?: number;
}

export function Sidebar({
  user,
  isMobileOpen = false,
  onCloseMobile,
  stockAlertCount = 0,
}: SidebarProps) {
  const pathname = usePathname();
  const roleConfig = ROLE_PERMISSIONS[user.role];
  const { isTouchMode } = useUiMode();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const allowedNavItems = ALL_NAV_ITEMS.filter((item) =>
    canRoleAccessPath(user.role, item.href)
  );

  // En móvil (drawer abierto) siempre mostramos el contenido expandido con texto completo
  const showCollapsed = isCollapsed && !isMobileOpen;

  return (
    <>
      {/* Backdrop oscuro en móvil cuando el menú está abierto */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/65 backdrop-blur-xs md:hidden animate-in fade-in duration-200"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={cn(
          'z-50 flex h-screen shrink-0 flex-col border-r border-[#E4BDD0] bg-white/95 backdrop-blur-md transition-all duration-300 ease-in-out dark:border-[#332B2F] dark:bg-[#171516]',
          // En móvil: drawer fijo fuera de pantalla a menos que isMobileOpen sea true
          'fixed inset-y-0 left-0 md:relative md:translate-x-0',
          isMobileOpen ? 'translate-x-0 w-72 shadow-2xl' : '-translate-x-full md:translate-x-0',
          // En tablet/desktop: ancho según estado colapsado o modo touch
          showCollapsed ? 'md:w-20' : isTouchMode ? 'md:w-72' : 'md:w-68'
        )}
      >
        {/* Botón flotante para plegar / desplegar (Solo Desktop/Tablet) */}
        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden md:flex absolute -right-3.5 top-6 z-30 h-7 w-7 items-center justify-center rounded-full border border-[#E4BDD0] bg-white text-neutral-600 shadow-md transition hover:bg-[#FAF0F5] hover:text-black dark:border-[#332B2F] dark:bg-[#1E1B1D] dark:text-neutral-300"
          title={showCollapsed ? 'Expandir menú' : 'Plegar menú'}
        >
          {showCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>

        {/* Header del Logo + Botón Cerrar en Móvil */}
        <div className="flex items-center justify-between border-b border-[#E4BDD0]/70 bg-gradient-to-r from-[#ECCCD9]/65 to-[#F9EFF3] p-4 dark:border-[#332B2F] dark:from-[#241E21] dark:to-[#1B181A]">
          {showCollapsed ? (
            <div className="flex w-full justify-center py-1">
              <span className="font-serif text-xl font-bold tracking-tight text-[#141213] dark:text-[#ECCCD9]">
                EPB
              </span>
            </div>
          ) : (
            <BrandLogo />
          )}

          {isMobileOpen && (
            <button
              type="button"
              onClick={onCloseMobile}
              className="flex md:hidden h-8 w-8 items-center justify-center rounded-xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-[#141213] text-neutral-600 dark:text-neutral-300"
              title="Cerrar menú"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Perfil Activo */}
        {!showCollapsed ? (
          <div className="border-b border-neutral-100 bg-[#FAF0F5]/60 px-4 py-3 dark:border-[#2C2629] dark:bg-[#201C1E] transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-500 dark:text-[#C7B8C0]">
                Perfil Activo
              </span>
              <span className="epb-pink-surface rounded-full bg-[#ECCCD9] px-2.5 py-0.5 text-[10px] font-extrabold !text-[#141213]">
                {user.role}
              </span>
            </div>
            <div className="mt-1 text-xs font-bold text-[#1A1A1A] dark:text-white truncate">
              {roleConfig.label}
            </div>
            {roleConfig.isReadOnly && (
              <div className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-amber-800 dark:text-amber-300">
                <Eye className="h-3 w-3" />
                Modo Contabilidad (Solo Lectura)
              </div>
            )}
          </div>
        ) : (
          <div className="flex justify-center border-b border-neutral-100 py-2.5 dark:border-[#2C2629]">
            <span
              className="epb-pink-surface rounded-full bg-[#ECCCD9] px-2 py-0.5 text-[9px] font-extrabold !text-[#141213]"
              title={roleConfig.label}
            >
              {user.role.slice(0, 3)}
            </span>
          </div>
        )}

        {/* Título de sección */}
        {!showCollapsed && (
          <div className="px-4 pt-3">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400 dark:text-neutral-500">
              {isTouchMode ? 'Botonera Táctil POS' : `Módulos (${allowedNavItems.length})`}
            </span>
          </div>
        )}

        {/* Lista de Enlaces */}
        <nav
          className={cn(
            'flex-1 space-y-1.5 overflow-y-auto py-2.5',
            showCollapsed ? 'px-2' : 'px-3'
          )}
        >
          {allowedNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            const effectiveBadge =
              item.href === '/inventario' && stockAlertCount > 0
                ? `${stockAlertCount} aviso${stockAlertCount > 1 ? 's' : ''}`
                : item.badge;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => onCloseMobile?.()}
                title={showCollapsed ? item.label : undefined}
                className={cn(
                  'group relative flex items-center rounded-xl font-semibold transition-all duration-200 active:scale-[0.98]',
                  showCollapsed
                    ? 'justify-center py-3 px-2'
                    : isTouchMode
                    ? 'justify-between px-4 py-3.5 text-sm sm:text-base'
                    : 'justify-between px-4 py-2.5 text-sm',
                  isActive
                    ? 'text-white dark:!text-[#141213]'
                    : 'text-neutral-700 hover:bg-[#FAF0F5] hover:text-[#1A1A1A] dark:text-[#D8CAD1] dark:hover:bg-[#262124] dark:hover:text-white'
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="epb-active-nav"
                    className="absolute inset-0 rounded-xl bg-gradient-to-r from-[#222222] to-[#1A1A1A] shadow-md dark:from-[#ECCCD9] dark:to-[#E4BDD0]"
                    transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                  />
                )}

                <div
                  className={cn(
                    'relative z-10 flex items-center gap-3',
                    showCollapsed ? 'justify-center' : ''
                  )}
                >
                  <Icon
                    className={cn(
                      'transition-colors shrink-0',
                      isTouchMode ? 'h-5 w-5' : 'h-4 w-4',
                      isActive
                        ? 'text-[#ECCCD9] dark:!text-[#141213]'
                        : 'text-neutral-500 group-hover:text-[#222222] dark:text-[#B5A3AC] dark:group-hover:text-[#ECCCD9]'
                    )}
                  />
                  {!showCollapsed && (
                    <span className={isActive ? 'font-extrabold' : ''}>
                      {item.label}
                    </span>
                  )}
                </div>

                {!showCollapsed && effectiveBadge && (
                  <span
                    className={cn(
                      'relative z-10 rounded-full px-2 py-0.5 text-[10px] font-extrabold',
                      isActive
                        ? 'bg-[#ECCCD9] !text-[#141213] dark:bg-[#141213] dark:!text-[#ECCCD9]'
                        : 'epb-pink-surface bg-[#ECCCD9] !text-[#141213]'
                    )}
                  >
                    {effectiveBadge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer Info (Oculto al colapsar) */}
        {!showCollapsed && (
          <div className="m-3 rounded-2xl border border-[#E4BDD0] bg-[#FAF0F5] p-3.5 dark:border-[#362E32] dark:bg-[#221D20]">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 font-bold text-[#1A1A1A] dark:text-[#ECCCD9]">
                <Sparkles className="h-3.5 w-3.5 text-[#222222] dark:text-[#ECCCD9]" />
                Interfaz Híbrida
              </span>
              <span className="epb-pink-surface rounded-full bg-[#ECCCD9] px-2.5 py-0.5 text-[10px] font-extrabold !text-[#141213]">
                {isTouchMode ? 'Touch POS' : 'Desktop'}
              </span>
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-neutral-600 dark:text-[#C7B8C0]">
              {roleConfig.description}
            </p>
          </div>
        )}
      </aside>
    </>
  );
}
