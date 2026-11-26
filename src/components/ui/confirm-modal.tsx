'use client';

import React from 'react';
import { AlertTriangle, Info, Trash2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info' | 'success';
  isBusy?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export function ConfirmModal({
  isOpen,
  title,
  description,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'danger',
  isBusy = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  const iconByVariant = {
    danger: <Trash2 className="h-6 w-6 text-red-600 dark:text-red-400" />,
    warning: <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400" />,
    info: <Info className="h-6 w-6 text-blue-600 dark:text-blue-400" />,
    success: <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />,
  };

  const bgIconByVariant = {
    danger: 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900/40',
    warning: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/40',
    info: 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900/40',
    success: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/40',
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="w-full max-w-md rounded-2xl border border-[#ECCCD9] dark:border-white/10 bg-white dark:bg-[#1E1D1D] p-6 shadow-2xl transition-all"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start gap-4">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${bgIconByVariant[variant]}`}
          >
            {iconByVariant[variant]}
          </div>

          <div className="space-y-1.5 flex-1 pt-0.5">
            <h3 className="font-serif text-lg font-bold text-[#1A1A1A] dark:text-neutral-100">
              {title}
            </h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed">
              {description}
            </p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3 border-t border-neutral-100 dark:border-white/5 pt-4">
          <Button
            type="button"
            variant="outline"
            disabled={isBusy}
            onClick={onCancel}
            className="text-xs"
          >
            {cancelText}
          </Button>

          <Button
            type="button"
            variant={variant === 'danger' ? 'destructive' : variant === 'warning' ? 'default' : 'pink'}
            disabled={isBusy}
            onClick={() => void onConfirm()}
            className="text-xs font-bold"
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
}
