'use client';

import React from 'react';
import { Delete, Check } from 'lucide-react';
import { Button } from './button';

interface TouchNumpadProps {
  label: string;
  value: string;
  onChange: (newValue: string) => void;
  onConfirm?: () => void;
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0'];

export function TouchNumpad({
  label,
  value,
  onChange,
  onConfirm,
}: TouchNumpadProps) {
  const handlePress = (digit: string) => {
    onChange(`${value}${digit}`);
  };

  const handleBackspace = () => {
    onChange(value.slice(0, -1));
  };

  const handleClear = () => {
    onChange('');
  };

  return (
    <div className="rounded-2xl border-2 border-[#EBC8D8] bg-[#FAF0F5] p-3.5 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-extrabold uppercase tracking-wider text-[#222222]">
          {label}
        </span>
        <button
          type="button"
          onClick={handleClear}
          className="rounded-lg bg-white px-2.5 py-1 text-xs font-bold text-red-600 shadow-sm hover:bg-red-50"
        >
          Limpiar
        </button>
      </div>

      <div className="mb-3 flex h-12 items-center justify-between rounded-xl border border-[#222222]/20 bg-white px-4 font-mono text-lg font-extrabold text-[#1A1A1A]">
        <span>{value || '—'}</span>
        <button
          type="button"
          onClick={handleBackspace}
          className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-black"
        >
          <Delete className="h-5 w-5" />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {KEYS.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => handlePress(key)}
            className="flex h-12 items-center justify-center rounded-xl border border-neutral-200 bg-white font-mono text-base font-extrabold text-[#1A1A1A] shadow-sm transition active:scale-95 active:bg-[#F0D0DF]"
          >
            {key}
          </button>
        ))}

        {onConfirm ? (
          <Button
            type="button"
            variant="default"
            onClick={onConfirm}
            className="h-12 rounded-xl text-xs font-extrabold"
          >
            <Check className="h-4 w-4 text-[#F0D0DF]" />
            OK
          </Button>
        ) : (
          <button
            type="button"
            onClick={handleBackspace}
            className="flex h-12 items-center justify-center rounded-xl border border-neutral-200 bg-neutral-100 text-sm font-bold text-[#222222] active:scale-95"
          >
            <Delete className="h-5 w-5" />
          </button>
        )}
      </div>
    </div>
  );
}
