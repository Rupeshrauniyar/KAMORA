import * as React from 'react';
import { cn } from '@/lib/utils/format';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'brand' | 'champagne' | 'dark' | 'success' | 'warning' | 'danger' | 'outline';
}

export function Badge({
  className,
  variant = 'default',
  ...props
}: BadgeProps) {
  const styles: Record<NonNullable<BadgeProps['variant']>, string> = {
    default: 'bg-[#F2F0EB] text-[#11151B] border border-[#E6E3DC]',
    brand: 'bg-[#0E1116] text-white border border-[#0E1116]',
    champagne: 'bg-[#B89768]/12 text-[#86683D] border border-[#B89768]/30',
    dark: 'bg-white/10 text-white/90 border border-white/15',
    success: 'bg-emerald-50 text-emerald-800 border border-emerald-200/80',
    warning: 'bg-amber-50 text-amber-900 border border-amber-200/80',
    danger: 'bg-rose-50 text-rose-800 border border-rose-200/80',
    outline: 'bg-transparent text-[#5C636E] border border-[#E6E3DC]',
  };

  return (
    <span
      className={cn(
        'font-mono-tech inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-medium',
        styles[variant],
        className
      )}
      {...props}
    />
  );
}
