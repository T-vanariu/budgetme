import { useState } from 'react';
import { FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { Field } from '@/components/ui/field';
import { MONEY_ERRORS, parseMoney, toInput } from '@/lib/money';
import { isISODate, todayISO } from '@/lib/dates';
import type { Category } from '@/types/domain';
import { CategoryChips } from './CategoryChips';

export interface ExpenseFormValues {
  amount: number;
  categoryId: string;
  merchant: string | null;
  date: string;
  goalId: string | null;
}

export interface ExpenseFormProps {
  categories: Category[];
  goals?: { id: string; title: string }[];
  initial?: Partial<{ amount: number; categoryId: string; merchant: string | null; date: string | null }>;
  submitLabel: string;
  onSubmit: (v: ExpenseFormValues) => Promise<void>;
  preview?: { url: string; isPdf: boolean } | null;
  notice?: string | null;
  autoFocusAmount?: boolean;
}

type Errors = Partial<Record<'amount' | 'category' | 'merchant' | 'date' | 'form', string>>;

export function validateExpense(
  raw: { amount: string; categoryId: string | null; merchant: string; date: string },
  today = todayISO(),
): { ok: true; values: Omit<ExpenseFormValues, 'goalId'> } | { ok: false; errors: Errors } {
  const errors: Errors = {};
  const money = parseMoney(raw.amount);
  if (!money.ok) errors.amount = MONEY_ERRORS[money.reason];
  if (!raw.categoryId) errors.category = 'Pick a category.';
  if (raw.merchant.trim().length > 80) errors.merchant = 'Keep it under 80 characters.';
  if (!isISODate(raw.date)) errors.date = 'Pick a date.';
  else if (raw.date > today) errors.date = "Date can't be in the future.";
  if (Object.keys(errors).length || !money.ok) return { ok: false, errors };
  return { ok: true, values: { amount: money.toea, categoryId: raw.categoryId!, merchant: raw.merchant.trim() || null, date: raw.date } };
}

export function ExpenseForm({ categories, goals = [], initial, submitLabel, onSubmit, preview, notice, autoFocusAmount }: ExpenseFormProps) {
  const [amount, setAmount] = useState(initial?.amount ? toInput(initial.amount) : '');
  const [categoryId, setCategoryId] = useState<string | null>(initial?.categoryId ?? null);
  const [merchant, setMerchant] = useState(initial?.merchant ?? '');
  const [date, setDate] = useState(initial?.date && isISODate(initial.date) ? initial.date : todayISO());
  const [goalId, setGoalId] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);

  const bucket = categories.find((c) => c.id === categoryId)?.bucket;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = validateExpense({ amount, categoryId, merchant, date });
    if (!r.ok) {
      setErrors(r.errors);
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      await onSubmit({ ...r.values, goalId: bucket === 'savings' && goalId ? goalId : null });
    } catch {
      setErrors({ form: "Couldn't save. Check your connection and try again." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="grid gap-4">
      {notice && (
        <p role="status" className="rounded-ctl bg-surface2 px-3 py-2 text-sm">
          {notice}
        </p>
      )}
      <div className={preview ? 'grid gap-4 md:grid-cols-[160px_1fr]' : 'grid gap-4'}>
        {preview && (
          <div className="overflow-hidden rounded-ctl border border-border bg-surface2">
            {preview.isPdf ? (
              <a href={preview.url} target="_blank" rel="noreferrer" className="flex h-40 flex-col items-center justify-center gap-2 text-sm font-semibold">
                <FileText className="size-8" aria-hidden /> Open PDF
              </a>
            ) : (
              <img src={preview.url} alt="Your receipt" className="max-h-72 w-full object-contain" />
            )}
          </div>
        )}
        <div className="grid gap-4">
          <Field id="amount" label="Amount (K)" error={errors.amount}>
            <Input inputMode="decimal" autoComplete="off" placeholder="0.00" autoFocus={autoFocusAmount} value={amount} onChange={(e) => setAmount(e.target.value)} className="num text-lg" />
          </Field>
          <CategoryChips categories={categories} value={categoryId} onChange={setCategoryId} error={errors.category} />
          {bucket === 'savings' && goals.length > 0 && (
            <Field id="goal" label="Apply to goal?" hint="Counts this toward a goal's progress.">
              <Select value={goalId} onChange={(e) => setGoalId(e.target.value)}>
                <option value="">No goal</option>
                {goals.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.title}
                  </option>
                ))}
              </Select>
            </Field>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            <Field id="merchant" label="Merchant (optional)" error={errors.merchant}>
              <Input autoComplete="off" value={merchant} onChange={(e) => setMerchant(e.target.value)} placeholder="e.g. Papindo" />
            </Field>
            <Field id="date" label="Date" error={errors.date}>
              <Input type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} />
            </Field>
          </div>
        </div>
      </div>
      {errors.form && (
        <p role="alert" className="text-sm font-semibold text-over">
          {errors.form}
        </p>
      )}
      <Button type="submit" size="lg" disabled={busy}>
        {busy ? 'Saving…' : submitLabel}
      </Button>
    </form>
  );
}
