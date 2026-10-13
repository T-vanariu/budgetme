import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { toast } from '@/components/ui/sonner';
import { sideColumns, useUpdateProfile } from '@/data/profile';
import { isValidSplit } from '@/lib/engine';
import type { SideAllocation, Split } from '@/types/domain';
import { SplitSliders } from '../plan/SplitSliders';

const MODES = [
  { id: 'same', label: 'Same as salary', help: 'Side income is split like your salary.' },
  { id: 'savings', label: 'All to savings', help: 'Every kina from the side hustle goes to Savings + debt.' },
  { id: 'custom', label: 'Custom', help: 'Choose a separate split. It must total 100%.' },
] as const;

export function SideAllocationCard({ current, salarySplit }: { current: SideAllocation; salarySplit: Split }) {
  const update = useUpdateProfile();
  const [mode, setMode] = useState<SideAllocation['mode']>(current.mode);
  const [split, setSplit] = useState<Split>(current.mode === 'custom' ? current.split : [20, 20, 60]);
  useEffect(() => {
    setMode(current.mode);
    if (current.mode === 'custom') setSplit(current.split);
  }, [current]);

  const next: SideAllocation = mode === 'custom' ? { mode, split } : { mode };
  const unchanged =
    next.mode === current.mode && (next.mode !== 'custom' || (current.mode === 'custom' && next.split.every((v, i) => v === current.split[i])));
  const valid = mode !== 'custom' || isValidSplit(split);

  return (
    <div className="grid gap-4">
      <ToggleGroup type="single" aria-label="Side-hustle allocation" value={mode} onValueChange={(v) => v && setMode(v as SideAllocation['mode'])}>
        {MODES.map((m) => (
          <ToggleGroupItem key={m.id} value={m.id}>
            {m.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <p className="text-sm text-muted">
        {MODES.find((m) => m.id === mode)?.help}
        {mode === 'same' && ` (${salarySplit.join(' / ')})`}
      </p>
      {mode === 'custom' && <SplitSliders value={split} onChange={setSplit} idPrefix="side" />}
      <Button
        disabled={!valid || unchanged || update.isPending}
        onClick={async () => {
          try {
            await update.mutateAsync(sideColumns(next));
            toast.success('Side-hustle allocation saved');
          } catch {
            toast.error("Couldn't save. Try again.");
          }
        }}
      >
        Apply
      </Button>
    </div>
  );
}
