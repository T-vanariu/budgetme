import { BUCKET_VAR } from '@/config/buckets';
import { formatMoney } from '@/lib/money';
import { cn } from '@/lib/utils';
import { BUCKET_LABEL, type BucketPlan } from '@/types/domain';

/** Planned vs spent with a pace tick at the share of the pay already gone. */
export function BucketBar({ plan, elapsed }: { plan: BucketPlan; elapsed: number }) {
  const over = plan.left < 0;
  const fill = Math.min(100, plan.usedPct);
  const label = BUCKET_LABEL[plan.bucket];
  return (
    <div className="grid gap-1.5">
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="flex items-center gap-2 font-semibold">
          <span className="size-2.5 rounded-full" style={{ background: BUCKET_VAR[plan.bucket] }} aria-hidden />
          {label}
        </span>
        <span className="num text-muted">
          {formatMoney(plan.spent, { decimals: 0 })} of {formatMoney(plan.planned, { decimals: 0 })}
        </span>
      </div>
      <div
        className="relative h-3 rounded-full bg-track"
        role="progressbar"
        aria-label={`${label} used`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.min(plan.usedPct, 100)}
        aria-valuetext={`${plan.usedPct}% used, ${elapsed}% of the pay gone`}
      >
        <div className="h-full rounded-full transition-[width]" style={{ width: `${fill}%`, background: over ? 'var(--over)' : BUCKET_VAR[plan.bucket] }} />
        <div className="absolute -top-1 h-5 w-0.5 rounded bg-text" style={{ left: `calc(${elapsed}% - 1px)` }} title={`Pace: ${elapsed}% of the pay gone`} aria-hidden />
      </div>
      <p className={cn('num text-xs', over ? 'font-semibold text-over' : 'text-muted')}>
        {over ? `${formatMoney(-plan.left, { decimals: 0 })} over budget` : `${formatMoney(plan.left, { decimals: 0 })} left · ${plan.usedPct}% used`}
      </p>
    </div>
  );
}
