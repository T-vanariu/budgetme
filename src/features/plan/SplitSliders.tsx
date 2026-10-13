import { Slider } from '@/components/ui/slider';
import { BUCKET_VAR } from '@/config/buckets';
import { splitTotal } from '@/lib/engine';
import { cn } from '@/lib/utils';
import { BUCKET_LABEL, BUCKETS, type Split } from '@/types/domain';

export function totalHint(total: number): string {
  if (total === 100) return 'Total 100%. Ready to apply.';
  return total < 100 ? `Total ${total}%. Add ${100 - total} point${100 - total === 1 ? '' : 's'}.` : `Total ${total}%. Remove ${total - 100} point${total - 100 === 1 ? '' : 's'}.`;
}

/** Three independent sliders with a running total. Callers decide what "apply" means. */
export function SplitSliders({ value, onChange, idPrefix }: { value: Split; onChange: (s: Split) => void; idPrefix: string }) {
  const total = splitTotal(value);
  return (
    <div className="grid gap-4">
      {BUCKETS.map((b, i) => (
        <div key={b} className="grid gap-1">
          <div className="flex items-center justify-between text-sm">
            <label id={`${idPrefix}-${b}`} className="flex items-center gap-2 font-semibold">
              <span className="size-2.5 rounded-full" style={{ background: BUCKET_VAR[b] }} aria-hidden />
              {BUCKET_LABEL[b]}
            </label>
            <span className="num font-semibold">{value[i]}%</span>
          </div>
          <Slider
            min={0}
            max={100}
            step={1}
            value={[value[i]]}
            rangeColor={BUCKET_VAR[b]}
            thumbLabel={`${BUCKET_LABEL[b]} percent`}
            aria-labelledby={`${idPrefix}-${b}`}
            onValueChange={([v]) => {
              const next = [...value] as [number, number, number];
              next[i] = v;
              onChange(next);
            }}
          />
        </div>
      ))}
      <p role="status" aria-live="polite" className={cn('num text-sm font-semibold', total === 100 ? 'text-save' : 'text-over')}>
        {totalHint(total)}
      </p>
    </div>
  );
}
