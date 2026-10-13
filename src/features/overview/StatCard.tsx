import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function StatCard({ label, value, hint, tone }: { label: string; value: string; hint?: ReactNode; tone?: 'over' | 'save' }) {
  return (
    <div className="card min-w-0">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p className={cn('num mt-1 truncate font-display text-2xl font-semibold md:text-3xl', tone === 'over' && 'text-over', tone === 'save' && 'text-save')}>
        {value}
      </p>
      {hint && <p className="mt-0.5 truncate text-xs text-muted">{hint}</p>}
    </div>
  );
}
