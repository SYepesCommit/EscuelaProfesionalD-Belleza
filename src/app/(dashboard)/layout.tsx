'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { ShieldAlert, ArrowRight } from 'lucide-react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { GlobalStockAlert } from '@/components/layout/GlobalStockAlert';
import { BiometricAccessScreen } from '@/components/layout/BiometricAccessScreen';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuthSession } from '@/hooks/useAuthSession';
import { useFingerprint } from '@/hooks/useFingerprint';
import { UiModeProvider } from '@/hooks/useUiMode';
import { InventoryProvider, useSharedInventory } from '@/context/InventoryContext';
import { AuthUser, UserRoleType } from '@/interfaces/auth.interface';
import { canRoleAccessPath, ROLE_PERMISSIONS } from '@/lib/permissions';

function DashboardContent({
  children,
  isMobileMenuOpen,
  setIsMobileMenuOpen,
  pathname,
  user,
  fpState,
  handleLogout,
}: {
  children: React.ReactNode;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (v: boolean) => void;
  pathname: string;
  user: AuthUser;
  fpState: { isConnected: boolean; isScanning: boolean; error: string | null };
  handleLogout: () => void;
}) {
  const { lowStockSummary, reloadInventory } = useSharedInventory();
  const [isRefreshingGlobal, setIsRefreshingGlobal] = useState(false);
  const isAllowed = canRoleAccessPath(user.role, pathname);
  const roleConfig = ROLE_PERMISSIONS[user.role as UserRoleType];

  const handleGlobalRefresh = async () => {
    setIsRefreshingGlobal(true);
    try {
      await reloadInventory();
      // Dispara evento global de revalidación para que los hooks activos sincronicen
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('focus'));
      }
    } finally {
      setTimeout(() => setIsRefreshingGlobal(false), 500);
    }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-transparent">
      <Sidebar
        user={user}
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
        stockAlertCount={lowStockSummary?.criticalCount}
      />
      <div className="flex flex-1 min-w-0 flex-col overflow-hidden">
        <Header
          user={user}
          fingerprintConnected={fpState.isConnected}
          onLogout={handleLogout}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
          onRefreshData={handleGlobalRefresh}
          isRefreshingData={isRefreshingGlobal}
        />
        <GlobalStockAlert summary={lowStockSummary} />
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-3.5 sm:p-5 lg:p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="min-w-0 max-w-full"
            >
              {isAllowed ? (
                children
              ) : (
                <div className="mx-auto mt-8 sm:mt-12 max-w-lg">
                  <Card className="border-amber-300 bg-amber-50/70">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base text-amber-950">
                        <ShieldAlert className="h-5 w-5 text-amber-700" />
                        Módulo Restringido para el Rol {user.role}
                      </CardTitle>
                      <CardDescription className="text-amber-900">
                        Su perfil actual ({roleConfig.label}) no tiene permisos para
                        operar la ruta <code>{pathname}</code>.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-wrap items-center justify-between gap-2">
                      <Link href={roleConfig.defaultRedirect}>
                        <Button variant="default" size="sm">
                          Ir a mi módulo principal ({roleConfig.defaultRedirect})
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button variant="outline" size="sm" onClick={handleLogout}>
                        Cambiar de Usuario / Rol
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const {
    user,
    isLoading,
    error,
    handleLoginByCode,
    handleLoginByFingerprint,
    handleLogout,
  } = useAuthSession();

  const { state: fpState } = useFingerprint({
    onCaptureSuccess: (template) => {
      if (!user) {
        void handleLoginByFingerprint(template);
      }
    },
  });

  if (!user) {
    return (
      <BiometricAccessScreen
        isLoading={isLoading}
        error={error}
        fingerprintConnected={fpState.isConnected}
        onLoginByCode={handleLoginByCode}
        onLoginByFingerprint={handleLoginByFingerprint}
      />
    );
  }

  return (
    <UiModeProvider>
      <InventoryProvider>
        <DashboardContent
          isMobileMenuOpen={isMobileMenuOpen}
          setIsMobileMenuOpen={setIsMobileMenuOpen}
          pathname={pathname}
          user={user}
          fpState={fpState}
          handleLogout={handleLogout}
        >
          {children}
        </DashboardContent>
      </InventoryProvider>
    </UiModeProvider>
  );
}
