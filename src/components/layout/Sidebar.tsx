'use client';

import React, { useEffect, useState } from 'react';
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
  UserCog,
  Eye,
  Pin,
  PinOff,
  PanelLeftOpen,
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
  { label: 'Centro de Mando', href: '/dashboard', icon: LayoutDashboard, badge: 'Inicio' },
  { label: 'Agendas Salón', href: '/agenda', icon: CalendarDays },
  { label: 'Alumnas y Cartera', href: '/alumnos', icon: GraduationCap },
  { label: 'Asistencia Huella', href: '/asistencia', icon: Fingerprint },
  { label: 'Personal y Nómina', href: '/personal', icon: Users },
  { label: 'Inventario y Stock', href: '/inventario', icon: Package },
  { label: 'Preventas 3d/24h', href: '/preventas', icon: ShieldCheck },
  { label: 'Terminal Caja POS', href: '/ventas', icon: ShoppingCart },
  { label: 'Reportes y Mes', href: '/reportes', icon: BarChart3 },
  { label: 'Auditoría Forense', href: '/auditoria', icon: FileSearch },
  { label: 'Roles y Accesos', href: '/usuarios', icon: UserCog, badge: 'Admin' },
];

const SIDEBAR_PIN_STORAGE_KEY = 'epb_sidebar_pinned_v1';

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

  // Por defecto inicia en modo Dock Compacto (auto-desplegable al pasar el mouse)
  // El usuario puede fijarlo con el ícono de Pin si prefiere dejarlo abierto siempre.
  const [isPinned, setIsPinned] = useState<boolean>(false);
  const [isHovered, setIsHovered] = useState<boolean>(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(SIDEBAR_PIN_STORAGE_KEY);
      if (saved === 'true') setIsPinned(true);
    } catch {
      // ignore storage errors
    }
  }, []);

  const togglePin = () => {
    const next = !isPinned;
    setIsPinned(next);
    if (!next) {
      setIsHovered(false);
    }
    try {
      window.localStorage.setItem(SIDEBAR_PIN_STORAGE_KEY, String(next));
    } catch {
      // ignore storage errors
    }
  };

  const allowedNavItems = ALL_NAV_ITEMS.filter((item) =>
    canRoleAccessPath(user.role, item.href)
  );

  // El menú se muestra expandido si: está abierto en móvil, está fijado (pinned) o el cursor está encima (hover)
  const isExpanded = isMobileOpen || isPinned || isHovered;
  const showCollapsed = !isExpanded;

  return (
    <>
      {/* Backdrop oscuro en móvil cuando el menú está abierto */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/65 backdrop-blur-xs md:hidden animate-in fade-in duration-200"
          onClick={onCloseMobile}
        />
      )}

      {/* Espaciador fantasma cuando está en modo Dock (no fijado) pero expandido por Hover,
          para que el contenido de la pantalla no salte ni se empuje al pasar el mouse */}
      {!isPinned && (
        <div className="hidden md:block md:w-16 shrink-0" aria-hidden="true" />
      )}

      <aside
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={cn(
          'z-50 flex h-screen shrink-0 flex-col border-r border-[#E4BDD0] bg-white/98 backdrop-blur-md transition-all duration-200 ease-out dark:border-[#332B2F] dark:bg-[#171516]/98',
          // En móvil: drawer fijo
          'fixed inset-y-0 left-0',
          isMobileOpen ? 'translate-x-0 w-64 shadow-2xl' : '-translate-x-full md:translate-x-0',
          // Si está fijado ocupa su lugar en el flujo flex; si es Dock auto-expansible flota suavemente sobre el borde izquierdo al hacer hover
          isPinned ? 'md:relative' : 'md:fixed md:inset-y-0 md:left-0',
          showCollapsed
            ? 'md:w-16'
            : isTouchMode
            ? 'md:w-60 shadow-xl'
            : 'md:w-56 shadow-xl'
        )}
      >
        {/* Header Compacto del Logo + Botón Pin / Auto-Dock */}
        <div className="flex items-center justify-between border-b border-[#E4BDD0]/70 bg-gradient-to-r from-[#ECCCD9]/65 to-[#F9EFF3] px-3 py-2.5 dark:border-[#332B2F] dark:from-[#241E21] dark:to-[#1B181A]">
          {showCollapsed ? (
            <button
              type="button"
              onClick={() => setIsHovered(true)}
              className="flex w-full flex-col items-center justify-center py-0.5 text-[#141213] dark:text-[#ECCCD9]"
              title="Pase el cursor o toque para desplegar el menú"
            >
              <span className="font-serif text-base font-bold tracking-tight">EPB</span>
              <PanelLeftOpen className="mt-0.5 h-3.5 w-3.5 opacity-60" />
            </button>
          ) : (
            <>
              <div className="scale-95 origin-left">
                <BrandLogo />
              </div>

              {/* Botón Fijar / Modo Auto-Dock en Desktop */}
              <button
                type="button"
                onClick={togglePin}
                className={cn(
                  'hidden md:flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border transition',
                  isPinned
                    ? 'border-[#141213] bg-[#141213] text-[#ECCCD9] dark:border-[#ECCCD9] dark:bg-[#ECCCD9] dark:!text-[#141213]'
                    : 'border-[#D9AFC2] bg-white/80 text-neutral-600 hover:bg-white hover:text-[#141213] dark:border-[#3A3035] dark:bg-[#221D20] dark:text-[#ECCCD9]'
                )}
                title={
                  isPinned
                    ? 'Menú fijado (Clic para activar auto-ocultar al quitar el mouse)'
                    : 'Modo Auto-Dock activo (Clic para dejar el menú fijo abierto)'
                }
              >
                {isPinned ? <Pin className="h-3.5 w-3.5" /> : <PinOff className="h-3.5 w-3.5" />}
              </button>
            </>
          )}

          {isMobileOpen && (
            <button
              type="button"
              onClick={onCloseMobile}
              className="flex md:hidden h-7 w-7 items-center justify-center rounded-lg border border-neutral-200 dark:border-white/10 bg-white dark:bg-[#141213] text-neutral-600 dark:text-neutral-300"
              title="Cerrar menú"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Cinta Ultra-Compacta de Rol Activo */}
        {!showCollapsed ? (
          <div className="flex items-center justify-between border-b border-neutral-100 bg-[#FAF0F5]/60 px-3 py-2 dark:border-[#2C2629] dark:bg-[#201C1E]">
            <div className="flex items-center gap-1.5 min-w-0">
              {roleConfig.isReadOnly && (
                <Eye className="h-3.5 w-3.5 shrink-0 text-amber-700 dark:text-amber-300" />
              )}
              <span className="text-[11px] font-bold text-[#1A1A1A] dark:text-white truncate">
                {roleConfig.label}
              </span>
            </div>
            <span className="epb-pink-surface shrink-0 rounded-full bg-[#ECCCD9] px-2 py-0.5 text-[9px] font-extrabold !text-[#141213]">
              {user.role}
            </span>
          </div>
        ) : (
          <div className="flex justify-center border-b border-neutral-100 py-1.5 dark:border-[#2C2629]">
            <span
              className="epb-pink-surface rounded-md bg-[#ECCCD9] px-1.5 py-0.5 text-[8px] font-extrabold !text-[#141213]"
              title={roleConfig.label}
            >
              {user.role.slice(0, 3)}
            </span>
          </div>
        )}

        {/* Lista de Enlaces Compacta */}
        <nav
          className={cn(
            'flex-1 space-y-1 overflow-y-auto py-2',
            showCollapsed ? 'px-1.5' : 'px-2.5'
          )}
        >
          {allowedNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            const effectiveBadge =
              item.href === '/inventario' && stockAlertCount > 0
                ? `${stockAlertCount}`
                : item.badge;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => {
                  onCloseMobile?.();
                  if (!isPinned) setIsHovered(false);
                }}
                title={showCollapsed ? item.label : undefined}
                className={cn(
                  'group relative flex items-center rounded-xl font-semibold transition-all duration-150 active:scale-[0.98]',
                  showCollapsed
                    ? 'justify-center py-2.5 px-1.5'
                    : isTouchMode
                    ? 'justify-between px-3 py-2.5 text-xs sm:text-sm'
                    : 'justify-between px-3 py-2 text-xs',
                  isActive
                    ? 'text-white dark:!text-[#141213]'
                    : 'text-neutral-700 hover:bg-[#FAF0F5] hover:text-[#1A1A1A] dark:text-[#D8CAD1] dark:hover:bg-[#262124] dark:hover:text-white'
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="epb-active-nav"
                    className="absolute inset-0 rounded-xl bg-gradient-to-r from-[#222222] to-[#1A1A1A] shadow-sm dark:from-[#ECCCD9] dark:to-[#E4BDD0]"
                    transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                  />
                )}

                <div
                  className={cn(
                    'relative z-10 flex items-center gap-2.5 min-w-0',
                    showCollapsed ? 'justify-center' : ''
                  )}
                >
                  <Icon
                    className={cn(
                      'transition-colors shrink-0 h-4 w-4',
                      isActive
                        ? 'text-[#ECCCD9] dark:!text-[#141213]'
                        : 'text-neutral-500 group-hover:text-[#222222] dark:text-[#B5A3AC] dark:group-hover:text-[#ECCCD9]'
                    )}
                  />
                  {!showCollapsed && (
                    <span className={cn('truncate', isActive ? 'font-bold' : '')}>
                      {item.label}
                    </span>
                  )}
                </div>

                {/* Punto indicador en modo colapsado si hay alerta de stock */}
                {showCollapsed && item.href === '/inventario' && stockAlertCount > 0 && (
                  <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-rose-500" />
                )}

                {!showCollapsed && effectiveBadge && (
                  <span
                    className={cn(
                      'relative z-10 shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-extrabold',
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

        {/* Pie Minimalista: indica si está en Auto-Dock o Fijo */}
        {!showCollapsed && (
          <div className="border-t border-[#E4BDD0]/60 bg-[#FAF0F5]/50 px-3 py-2 text-[10px] text-neutral-500 flex items-center justify-between dark:border-[#2C2629] dark:bg-[#1E1A1C] dark:text-[#B8A9B1]">
            <span>{isPinned ? '📌 Menú fijo' : '✨ Auto-plegable al salir'}</span>
            <button
              type="button"
              onClick={togglePin}
              className="font-bold text-[#141213] hover:underline dark:text-[#ECCCD9]"
            >
              {isPinned ? 'Auto-ocultar' : 'Fijar'}
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
