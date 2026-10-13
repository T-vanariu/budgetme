import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/ui/field';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { toast } from '@/components/ui/sonner';
import { useAddIncome } from '@/data/income';
import { isISODate } from '@/lib/dates';
import { formatMoney, MONEY_ERRORS, parseMoney } from '@/lib/money';
import type { IncomeSource } from '@/types/domain';

export function IncomeForm({ sources, today }: { sources: IncomeSource[]; today: string }) {
  const add = useAddIncome();
  const salary = sources.find((s) => s.kind === 'salary');
  const [sourceId, setSourceId] = useState(salary?.id ?? sources[0]?.id ?? '');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(today);
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<Partial<Record<'amount' | 'date' | 'note' | 'form', string>>>({});

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: typeof errors = {};
    const m = parseMoney(amount);
    if (!m.ok) next.amount = MONEY_ERRORS[m.reason];
    if (!isISODate(date)) next.date = 'Pick a date.';
    if (note.length > 200) next.note = 'Keep the note under 200 characters.';
    setErrors(next);
    if (Object.keys(next).length || !m.ok) return;
    try {
      await add.mutateAsync({ source_id: sourceId, amount: m.toea, received_on: date, note: note.trim() || null });
      const src = sources.find((s) => s.id === sourceId);
      toast.success(`Logged ${formatMoney(m.toea)} ${src?.kind === 'salary' ? 'salary' : src?.name.toLowerCase() ?? 'income'}`);
      setAmount('');
      setNote('');
    } catch {
      setErrors({ form: "Couldn't save. Try again." });
    }
  };

  return (
    <form onSubmit={submit} noValidate className="grid gap-4">
      <ToggleGroup type="single" aria-label="Income source" value={sourceId} onValueChange={(v) => v && setSourceId(v)}>
        {sources.filter((s) => s.isActive).map((s) => (
          <ToggleGroupItem key={s.id} value={s.id}>
            {s.name}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <div className="grid gap-4 md:grid-cols-2">
        <Field id="income-amount" label="Amount (K)" error={errors.amount}>
          <Input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} className="num text-lg" placeholder="0.00" />
        </Field>
        <Field id="income-date" label="Received on" error={errors.date}>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
      </div>
      <Field id="income-note" label="Note (optional)" error={errors.note}>
        <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Market stall" />
      </Field>
      {errors.form && <p role="alert" className="text-sm font-semibold text-over">{errors.form}</p>}
      <Button type="submit" disabled={add.isPending}>{add.isPending ? 'Saving…' : 'Log income'}</Button>
    </form>
  );
}
