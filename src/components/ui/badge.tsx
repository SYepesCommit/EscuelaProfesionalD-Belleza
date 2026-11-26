import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-[#232222] text-white dark:bg-[#332E30] dark:text-[#ECCCD9]',
        pink: 'epb-pink-surface border-[#D9AFC2] bg-[#ECCCD9] !text-[#141213] font-extrabold shadow-sm',
        secondary:
          'border-neutral-200 bg-[#F8F9FA] text-[#232222] dark:border-[#3A3236] dark:bg-[#262224] dark:text-[#F5EBF0]',
        destructive:
          'border-red-300 bg-red-100 !text-red-900 font-bold dark:border-red-800 dark:bg-red-950/90 dark:!text-red-200',
        warning:
          'border-amber-300 bg-amber-100 !text-amber-950 font-bold dark:border-amber-700 dark:bg-amber-950/90 dark:!text-amber-200',
        success:
          'border-emerald-300 bg-emerald-100 !text-emerald-950 font-bold dark:border-emerald-800 dark:bg-emerald-950/90 dark:!text-emerald-200',
        outline: 'text-[#232222] border-neutral-300 dark:text-[#F5EBF0] dark:border-[#4A3F44]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
