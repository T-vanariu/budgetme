import { BUCKET_LABEL, BUCKETS, type Category } from '@/types/domain';
import { cn } from '@/lib/utils';

const DOT: Record<Category['bucket'], string> = { need: 'bg-needs', want: 'bg-wants', savings: 'bg-save' };

/** Category picker grouped by bucket. A radio group so it works with keyboard and screen readers. */
export function CategoryChips({
  categories,
  value,
  onChange,
  error,
  id = 'category',
}: {
  categories: Category[];
  value: string | null;
  onChange: (id: string) => void;
  error?: string | null;
  id?: string;
}) {
  return (
    <fieldset aria-describedby={error ? `${id}-error` : undefined} aria-invalid={error ? true : undefined}>
      <legend className="mb-2 text-sm font-semibold">Category</legend>
      <div className="grid gap-3">
        {BUCKETS.map((b) => {
          const list = categories.filter((c) => c.bucket === b);
          if (!list.length) return null;
          return (
            <div key={b}>
              <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-muted">
                <span className={cn('size-2 rounded-full', DOT[b])} aria-hidden />
                {BUCKET_LABEL[b]}
              </p>
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={BUCKET_LABEL[b]}>
                {list.map((c) => {
                  const on = value === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      onClick={() => onChange(c.id)}
                      className={cn(
                        'min-h-touch rounded-full border px-3.5 text-sm font-semibold transition-colors',
                        on ? 'border-ink bg-ink text-onink' : 'border-border bg-surface hover:bg-surface2',
                        error && !value && 'border-over',
                      )}
                    >
                      {c.name}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-2 text-xs font-semibold text-over">
          {error}
        </p>
      )}
    </fieldset>
  );
}
