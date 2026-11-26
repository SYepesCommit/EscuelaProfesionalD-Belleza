import React from 'react';
import Image from 'next/image';

interface BrandLogoProps {
  compact?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function BrandLogo({ compact = false, size = 'md' }: BrandLogoProps) {
  const dimensions =
    size === 'lg' ? 84 : size === 'sm' ? 40 : 52;

  return (
    <div className="flex items-center gap-3.5">
      <div
        className="relative shrink-0 overflow-hidden rounded-full border-2 border-[#232222]/20 bg-[#ECCCD9] shadow-md ring-2 ring-[#ECCCD9]"
        style={{ width: dimensions, height: dimensions }}
      >
        <Image
          src="/epb-logo.jpg"
          alt="Logo Escuela Profesional D' Belleza (EPB)"
          fill
          sizes="96px"
          className="object-cover"
          priority
        />
      </div>

      {!compact && (
        <div className="flex flex-col">
          <span className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-[#5A4850] dark:text-[#ECCCD9]/80">
            Escuela Profesional
          </span>
          <span className="font-serif text-xl font-bold leading-none tracking-tight text-[#1A1919] dark:text-white">
            D&apos; Belleza
          </span>
          <span className="mt-0.5 text-[10px] font-bold tracking-[0.16em] text-[#6E5A63] dark:text-[#C7B8C0]">
            EPB &bull; ACADEMIA
          </span>
        </div>
      )}
    </div>
  );
}
