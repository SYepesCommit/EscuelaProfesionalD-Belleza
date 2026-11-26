'use client';

import React from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { useUiMode } from '@/hooks/useUiMode';
import { cn } from '@/lib/utils';

interface PageLoadingProps {
  title?: string;
  subtitle?: string;
  className?: string;
}

export function PageLoading({
  title = 'Cargando información...',
  subtitle = 'Conectando con la base de datos de la academia',
  className,
}: PageLoadingProps) {
  const { isTouchMode } = useUiMode();

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-3xl border border-[#ECCCD9]/60 dark:border-white/10 bg-white/70 dark:bg-[#1E1D1D]/70 p-12 text-center backdrop-blur-sm animate-in fade-in duration-200',
        isTouchMode ? 'min-h-[420px]' : 'min-h-[320px]',
        className
      )}
    >
      <div className="relative mb-4 flex items-center justify-center">
        {/* Anillo de pulso rosado */}
        <div className="absolute h-16 w-16 rounded-full bg-[#ECCCD9]/50 animate-ping" />
        
        <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-[#232222] dark:bg-[#ECCCD9] text-[#ECCCD9] dark:text-[#141213] shadow-lg">
          <Loader2 className="h-7 w-7 animate-spin" />
        </div>
      </div>

      <h3 className="font-serif text-lg font-bold text-[#1A1A1A] dark:text-neutral-100">
        {title}
      </h3>
      <p className="mt-1 max-w-sm text-xs text-neutral-500 dark:text-neutral-400">
        {subtitle}
      </p>

      {/* Indicador táctil / POS */}
      {isTouchMode && (
        <span className="mt-4 rounded-full bg-[#FAF1F5] dark:bg-white/5 px-3 py-1 text-[10px] font-bold text-[#7A1E46] dark:text-[#ECCCD9]">
          Optimizado para Pantalla Táctil POS
        </span>
      )}
    </div>
  );
}
