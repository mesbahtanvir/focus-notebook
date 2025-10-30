'use client';

import { cn } from '@/lib/utils';

interface CurrencyBadgeProps {
  code: string;
  label?: string;
  tone?: 'base' | 'native';
  className?: string;
}

const toneClasses: Record<Required<CurrencyBadgeProps>['tone'], string> = {
  base: 'bg-amber-100 text-amber-900 border border-amber-200 dark:bg-amber-900/40 dark:text-amber-100 dark:border-amber-700',
  native: 'bg-sky-100 text-sky-900 border border-sky-200 dark:bg-sky-900/40 dark:text-sky-200 dark:border-sky-700',
};

export function CurrencyBadge({ code, label, tone = 'base', className }: CurrencyBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-wide shadow-sm',
        toneClasses[tone],
        className
      )}
      aria-label={label ? `${label} currency ${code}` : `Currency ${code}`}
    >
      {label && <span className="text-[0.65rem] font-medium">{label}</span>}
      <span>{code}</span>
    </span>
  );
}
