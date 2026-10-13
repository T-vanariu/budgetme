import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/ui/field';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { toast } from '@/components/ui/sonner';
import { useUpdateProfile } from '@/data/profile';
import { useUpdateIncomeSource } from '@/data/income';
import { isISODate } from '@/lib/dates';
import { CYCLE_LABEL } from '@/lib/periods';
import { MONEY_ERRORS, parseMoney, toInput } from '@/lib/money';
import type { IncomeSource, PayCycle, Profile } from '@/types/domain';

/** Pay cycle, a real payday to anchor periods on, and the expected salary. */
export function PayCycleCard({ profile, salary }: { profile: Profile; salary: IncomeSource | undefined }) {
  const updateProfile = useUpdateProfile();
  const updateSource = useUpdateIncomeSource();
  const [cycle, setCycle] = useState<PayCycle>(profile.payCycle);
  const [anchor, setAnchor] = useState(profile.payAnchorDate);
  const [expected, setExpected] = useState(salary?.expectedAmount ? toInput(salary.expectedAmount) : '');
  const [errors, setErrors] = useState<Partial<Record<'anchor' | 'expected', string>>>({});

  useEffect(() => {
    setCycle(profile.payCycle);
    setAnchor(profile.payAnchorDate);
  }, [profile.payCycle, profile.payAnchorDate]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: typeof errors = {};
    if (!isISODate(anchor)) next.anchor = 'Pick the date of a real payday.';
    const m = expected.trim() ? parseMoney(expected) : null;
    if (m && !m.ok) next.expected = MONEY_ERRORS[m.reason];
    setErrors(next);
    if (Object.keys(next).length) return;
    try {
      if (cycle !== profile.payCycle || anchor !== profile.payAnchorDate) {
        await updateProfile.mutateAsync({ pay_cycle: cycle, pay_anchor_date: anchor });
      }
      if (salary) await updateSource.mutateAsync({ id: salary.id, expected_amount: m && m.ok ? m.toea : null });
      toast.success('Pay settings saved');
    } catch {
      toast.error("Couldn't save pay settings.");
    }
  };

  return (
    <form onSubmit={save} noValidate className="grid gap-4">
      <ToggleGroup type="single" aria-label="Pay cycle" value={cycle} onValueChange={(v) => v && setCycle(v as PayCycle)}>
        {(['weekly', 'fortnightly', 'monthly'] as const).map((c) => (
          <ToggleGroupItem key={c} value={c}>
            {CYCLE_LABEL[c]}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <div className="grid gap-4 md:grid-cols-2">
        <Field id="anchor" label="A recent payday" error={errors.anchor} hint="Pay periods are counted from this date.">
          <Input type="date" value={anchor} onChange={(e) => setAnchor(e.target.value)} />
        </Field>
        <Field id="expected" label="Usual salary per pay (K)" error={errors.expected} hint="Used for planning until you log this pay's salary.">
          <Input inputMode="decimal" value={expected} onChange={(e) => setExpected(e.target.value)} className="num" />
        </Field>
      </div>
      <Button type="submit" variant="outline" disabled={updateProfile.isPending || updateSource.isPending}>
        Save pay settings
      </Button>
    </form>
  );
}
