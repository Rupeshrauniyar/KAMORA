import * as React from 'react';
import { cn } from '@/lib/utils/format';

export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-[22px] border border-[#E6E3DC] bg-white shadow-soft',
        className
      )}
      {...props}
    />
  );
}

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      'flex h-11 w-full rounded-[12px] border border-[#E6E3DC] bg-white px-3.5 text-sm text-[#11151B] placeholder:text-[#8A9099] transition focus:border-[#0E1116] focus:outline-none focus:ring-2 focus:ring-[#0E1116]/10 disabled:cursor-not-allowed disabled:bg-[#F2F0EB]/60',
      className
    )}
    {...props}
  />
));
Input.displayName = 'Input';

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      'flex min-h-[96px] w-full rounded-[12px] border border-[#E6E3DC] bg-white px-3.5 py-2.5 text-sm text-[#11151B] placeholder:text-[#8A9099] transition focus:border-[#0E1116] focus:outline-none focus:ring-2 focus:ring-[#0E1116]/10 disabled:cursor-not-allowed disabled:bg-[#F2F0EB]/60',
      className
    )}
    {...props}
  />
));
Textarea.displayName = 'Textarea';

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      'flex h-11 w-full rounded-[12px] border border-[#E6E3DC] bg-white px-3.5 text-sm text-[#11151B] transition focus:border-[#0E1116] focus:outline-none focus:ring-2 focus:ring-[#0E1116]/10 disabled:cursor-not-allowed disabled:bg-[#F2F0EB]/60',
      className
    )}
    {...props}
  />
));
Select.displayName = 'Select';
