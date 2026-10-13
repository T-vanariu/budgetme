import { useSearchParams } from 'react-router-dom';
import { X } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { periodLabel } from '@/lib/periods';
import type { HistoryRange, PayPeriod } from '@/types/domain';

const NAMED = [
  { id: 'this_pay', label: 'This pay' },
  { id: 'last_pay', label: 'Last pay' },
  { id: 'last_3', label: 'Last 3 pays' },
  { id: 'all', label: 'All history' },
] as const;

/** History range kept in the URL (?range=… or ?period=<index>) so drill-downs are linkable. */
export function useRangeParam(defaultRange: HistoryRange = 'this_pay'): [HistoryRange, (r: HistoryRange) => void] {
  const [params, setParams] = useSearchParams();
  const period = params.get('period');
  const named = params.get('range');
  const range: HistoryRange =
    period !== null && /^-?\d+$/.test(period)
      ? { period: Number(period) }
      : NAMED.some((n) => n.id === named)
        ? (named as HistoryRange)
        : defaultRange;
  const set = (r: HistoryRange) =>
    setParams(
      (p) => {
        const next = new URLSearchParams(p);
        next.delete('period');
        next.delete('range');
        if (typeof r === 'object') next.set('period', String(r.period));
        else next.set('range', r);
        return next;
      },
      { replace: true },
    );
  return [range, set];
}

export function rangeDescription(range: HistoryRange, periods: PayPeriod[]): string {
  if (typeof range === 'object') {
    const p = periods.find((x) => x.index === range.period);
    return p ? `the pay ${periodLabel(p)}` : 'that pay';
  }
  return { this_pay: 'this pay', last_pay: 'last pay', last_3: 'the last 3 pays', all: 'your history' }[range];
}

export function RangeChips({ range, onChange, periods }: { range: HistoryRange; onChange: (r: HistoryRange) => void; periods: PayPeriod[] }) {
  const specific = typeof range === 'object' ? periods.find((p) => p.index === range.period) : undefined;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <ToggleGroup
        type="single"
        aria-label="Date range"
        value={typeof range === 'object' ? '' : range}
        onValueChange={(v) => v && onChange(v as HistoryRange)}
      >
        {NAMED.map((n) => (
          <ToggleGroupItem key={n.id} value={n.id}>
            {n.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      {specific && (
        <span className="inline-flex min-h-touch items-center gap-1 rounded-full border border-ink bg-ink pl-4 pr-1 text-sm font-semibold text-onink">
          {periodLabel(specific)}
          <button
            type="button"
            onClick={() => onChange('all')}
            className="grid size-9 place-items-center rounded-full hover:bg-white/15"
            aria-label="Clear pay filter and show all history"
          >
            <X className="size-4" aria-hidden />
          </button>
        </span>
      )}
    </div>
  );
}
