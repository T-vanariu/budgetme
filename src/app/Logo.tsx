import { cn } from '@/lib/utils';

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={cn('size-9', className)} aria-hidden>
      <rect width="40" height="40" rx="11" fill="#1B8A5A" />
      <circle cx="20" cy="20" r="11" fill="none" stroke="#fff" strokeWidth="3" />
      <rect x="18.5" y="13" width="3" height="14" rx="1.5" fill="#fff" />
      <path d="M21 20 l6 -6" stroke="#F0A45A" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <LogoMark />
      {!compact && <span className="font-display text-xl font-bold">BudgetMe</span>}
      {compact && <span className="sr-only">BudgetMe</span>}
    </div>
  );
}
