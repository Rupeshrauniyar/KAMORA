import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils/format';

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium tracking-[-0.01em] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0E1116] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-45 cursor-pointer select-none',
  {
    variants: {
      variant: {
        primary:
          'bg-[#0E1116] text-white hover:bg-[#1E242E] shadow-soft active:scale-[0.985]',
        light:
          'bg-white text-[#0E1116] hover:bg-[#F2F0EB] shadow-soft active:scale-[0.985]',
        secondary:
          'bg-white text-[#11151B] border border-[#E6E3DC] hover:border-[#11151B]/30 hover:bg-[#F2F0EB]/60',
        soft: 'bg-[#F2F0EB] text-[#11151B] hover:bg-[#E6E3DC]',
        ghost: 'text-[#11151B] hover:bg-[#F2F0EB] hover:text-[#0E1116]',
        danger: 'bg-[#B42318] text-white hover:bg-[#912018]',
        outline:
          'border border-[#11151B] text-[#11151B] bg-transparent hover:bg-[#0E1116] hover:text-white',
      },
      size: {
        sm: 'h-9 px-4 text-xs rounded-full',
        md: 'h-11 px-5 text-sm rounded-full',
        lg: 'h-13 px-7 text-sm font-semibold rounded-full',
        icon: 'h-10 w-10 rounded-full',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, type = 'button', ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';
