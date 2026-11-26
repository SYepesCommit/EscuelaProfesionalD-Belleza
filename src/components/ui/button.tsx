import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#222222] disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'bg-gradient-to-b from-[#2A2A2A] to-[#1A1A1A] text-white shadow-md hover:from-[#1A1A1A] hover:to-black dark:from-[#ECCCD9] dark:to-[#E4BDD0] dark:!text-[#141213] dark:font-extrabold',
        pink:
          'epb-pink-surface bg-gradient-to-r from-[#ECCCD9] to-[#E4BDD0] !text-[#141213] font-extrabold shadow-sm ring-1 ring-[#D9AFC2] hover:brightness-95',
        destructive:
          'bg-gradient-to-b from-red-600 to-red-700 text-white shadow-sm hover:from-red-700 hover:to-red-800',
        outline:
          'border border-[#EBC8D8] bg-white/90 text-[#222222] shadow-sm hover:bg-[#FAF0F5] hover:border-[#222222]/30 dark:border-[#3F353A] dark:bg-[#242022] dark:text-[#F5EBF0] dark:hover:bg-[#2E292C]',
        secondary:
          'bg-[#FAF0F5] text-[#222222] shadow-sm hover:bg-[#F0D0DF]/60 dark:bg-[#2A2427] dark:text-[#F5EBF0]',
        ghost: 'hover:bg-[#F0D0DF]/40 text-[#222222] dark:text-[#F5EBF0] dark:hover:bg-[#2E292C]',
        link: 'text-[#222222] underline-offset-4 hover:underline dark:text-[#ECCCD9]',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 rounded-lg px-3 text-xs',
        lg: 'h-11 rounded-xl px-6 text-base',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
