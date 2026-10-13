import { useState } from 'react';
import { Pause, Play, Plus, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/ui/field';
import { toast } from '@/components/ui/sonner';
import { useAddContribution, useDeleteGoal, useUpdateGoal, type GoalWithSaved } from '@/data/goals';
import { formatDayYear } from '@/lib/dates';
import { projectGoal, type GoalContext } from '@/lib/goals';
import { formatMoney, MONEY_ERRORS, parseMoney } from '@/lib/money';
import { toea } from '@/types/domain';
import { GoalRing } from './GoalRing';

export function GoalCard({ goal, ctx }: { goal: GoalWithSaved; ctx: GoalContext }) {
  const p = projectGoal({ ...goal, startingBalance: toea(goal.saved) }, [], ctx);
  const update = useUpdateGoal();
  const remove = useDeleteGoal();
  const contribute = useAddContribution();
  const [adding, setAdding] = useState(false);
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);
  const done = p.remaining === 0;
  const paused = goal.status === 'paused';

  const status = done ? { tone: 'good' as const, text: goal.kind === 'pay_off' ? 'Paid off' : 'Reached' } : p.onTrack ? { tone: 'good' as const, text: 'On track' } : { tone: 'warn' as const, text: goal.targetDate ? 'Slipping' : 'No plan yet' };

  const addContribution = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = parseMoney(amount);
    if (!r.ok) {
      setError(MONEY_ERRORS[r.reason]);
      return;
    }
    try {
      await contribute.mutateAsync({ goal_id: goal.id, amount: r.toea, contributed_on: ctx.today });
      toast.success(`Added ${formatMoney(r.toea)} to ${goal.title}`);
      setAmount('');
      setAdding(false);
      setError(null);
    } catch {
      setError("Couldn't save. Try again.");
    }
  };

  return (
    <article className="card grid gap-3">
      <div className="flex items-start gap-3">
        <GoalRing pct={p.pct} />
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold">{goal.title}</h3>
          <div className="mt-1 flex flex-wrap gap-1.5">
            <Badge>{goal.kind === 'pay_off' ? 'Pay off' : 'Save up'}</Badge>
            {paused ? <Badge>Paused</Badge> : <Badge tone={status.tone}>{status.text}</Badge>}
          </div>
        </div>
      </div>
      <div className="num grid grid-cols-2 gap-2 text-sm">
        <div>
          <p className="text-xs text-muted">{goal.kind === 'pay_off' ? 'Paid' : 'Saved'}</p>
          <p className="font-semibold">{formatMoney(p.saved, { decimals: 0 })} of {formatMoney(goal.targetAmount, { decimals: 0 })}</p>
        </div>
        <div>
          <p className="text-xs text-muted">Per pay</p>
          <p className="font-semibold">{formatMoney(goal.perPay, { decimals: 0 })}</p>
        </div>
        <div>
          <p className="text-xs text-muted">Finish</p>
          <p className="font-semibold">{done ? 'Done' : p.eta ? formatDayYear(p.eta) : '—'}</p>
        </div>
        <div>
          <p className="text-xs text-muted">Target</p>
          <p className="font-semibold">{goal.targetDate ? formatDayYear(goal.targetDate) : 'None'}</p>
        </div>
      </div>
      {!done && p.requiredPerPay !== null && p.paysLeft !== null && (
        <p className="text-sm">
          {p.paysLeft > 0
            ? `Needs ${formatMoney(p.requiredPerPay, { decimals: 0 })} a pay for ${p.paysLeft} pay${p.paysLeft === 1 ? '' : 's'} to hit the target.`
            : 'The target date has passed.'}
        </p>
      )}
      {adding ? (
        <form onSubmit={addContribution} noValidate className="flex items-end gap-2">
          <Field id={`contrib-${goal.id}`} label="Amount (K)" error={error} className="flex-1">
            <Input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus className="num" />
          </Field>
          <Button type="submit" disabled={contribute.isPending}>Add</Button>
          <Button type="button" variant="ghost" onClick={() => setAdding(false)}>Cancel</Button>
        </form>
      ) : (
        <div className="flex flex-wrap gap-2">
          {!done && (
            <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
              <Plus aria-hidden /> Add {goal.kind === 'pay_off' ? 'payment' : 'savings'}
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => update.mutate({ id: goal.id, status: paused ? 'active' : 'paused' })}>
            {paused ? <Play aria-hidden /> : <Pause aria-hidden />} {paused ? 'Resume' : 'Pause'}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            aria-label={`Delete goal ${goal.title}`}
            onClick={() => {
              if (window.confirm(`Delete "${goal.title}" and its contributions?`)) remove.mutate(goal.id, { onSuccess: () => toast.success('Goal deleted') });
            }}
          >
            <Trash2 aria-hidden /> Delete
          </Button>
        </div>
      )}
    </article>
  );
}
