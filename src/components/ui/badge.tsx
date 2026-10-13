import * as React from 'react';
import { cn } from '@/lib/utils';

const tones = {
  neutral: 'bg-surface2 text-text',
  warn: 'bg-[color-mix(in_srgb,var(--over)_14%,transparent)] text-over',
  good: 'bg-[color-mix(in_srgb,var(--save)_14%,transparent)] text-save',
  info: 'bg-[color-mix(in_srgb,var(--needs)_14%,transparent)] text-needs',
  wants: 'bg-[color-mix(in_srgb,var(--wants)_14%,transparent)] text-wants',
} as const;

export function Badge({ tone = 'neutral', className, ...props }: React.HTMLAttributes<HTMLSpanElement> & { tone?: keyof typeof tones }) {
  return <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold', tones[tone], className)} {...props} />;
}
