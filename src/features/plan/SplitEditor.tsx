import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { isValidSplit, SPLIT_PRESETS } from '@/lib/engine';
import type { Split } from '@/types/domain';
import { SplitSliders } from './SplitSliders';

/** Split sliders + presets. Apply stays disabled until the split totals exactly 100. */
export function SplitEditor({ current, onApply }: { current: Split; onApply: (s: Split) => Promise<void> }) {
  const [draft, setDraft] = useState<Split>(current);
  const [busy, setBusy] = useState(false);
  useEffect(() => setDraft(current), [current]);

  const changed = draft.some((v, i) => v !== current[i]);
  const preset = SPLIT_PRESETS.find((p) => p.split.every((v, i) => v === draft[i]))?.label ?? '';

  return (
    <div className="grid gap-4">
      <ToggleGroup
        type="single"
        aria-label="Presets"
        value={preset}
        onValueChange={(v) => {
          const p = SPLIT_PRESETS.find((x) => x.label === v);
          if (p) setDraft(p.split);
        }}
      >
        {SPLIT_PRESETS.map((p) => (
          <ToggleGroupItem key={p.label} value={p.label}>
            {p.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <SplitSliders value={draft} onChange={setDraft} idPrefix="split" />
      <div className="flex gap-2">
        <Button
          disabled={!isValidSplit(draft) || !changed || busy}
          onClick={async () => {
            setBusy(true);
            try {
              await onApply(draft);
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? 'Applying…' : 'Apply'}
        </Button>
        {changed && (
          <Button variant="ghost" onClick={() => setDraft(current)}>
            Reset
          </Button>
        )}
      </div>
    </div>
  );
}
