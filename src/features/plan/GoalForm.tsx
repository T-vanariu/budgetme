import { useRef, useState } from 'react';
import { AlertTriangle, FileUp, Loader2 } from 'lucide-react';
import { useAuth } from '@/app/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/ui/field';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { PARSE_MESSAGES, parseDocument, uploadDocument } from '@/data/uploads';
import type { GoalInput } from '@/data/goals';
import { validateUpload } from '@/lib/files';
import { formatDayYear, isISODate } from '@/lib/dates';
import { projectGoal, type GoalContext } from '@/lib/goals';
import { formatMoney, MONEY_ERRORS, parseMoney, toInput } from '@/lib/money';
import { toea } from '@/types/domain';

type Errors = Partial<Record<'title' | 'target' | 'starting' | 'perPay' | 'date' | 'quote' | 'form', string>>;

/** Optional money field: blank means zero. */
function parseOptional(s: string) {
  if (!s.trim()) return { ok: true as const, toea: 0 };
  const r = parseMoney(s);
  return r.ok ? { ok: true as const, toea: r.toea as number } : r;
}

export function validateGoal(
  raw: { title: string; target: string; starting: string; perPay: string; date: string },
  today: string,
): { ok: true; values: Omit<GoalInput, 'kind' | 'document_id'> } | { ok: false; errors: Errors } {
  const errors: Errors = {};
  if (!raw.title.trim()) errors.title = 'Give the goal a name.';
  else if (raw.title.trim().length > 80) errors.title = 'Keep it under 80 characters.';
  const target = parseMoney(raw.target);
  if (!target.ok) errors.target = MONEY_ERRORS[target.reason];
  const starting = parseOptional(raw.starting);
  if (!starting.ok) errors.starting = MONEY_ERRORS[starting.reason];
  const perPay = parseOptional(raw.perPay);
  if (!perPay.ok) errors.perPay = MONEY_ERRORS[perPay.reason];
  if (target.ok && starting.ok && starting.toea >= target.toea) errors.starting = 'Already saved must be less than the target.';
  if (raw.date && !isISODate(raw.date)) errors.date = 'Pick a valid date.';
  else if (raw.date && raw.date < today) errors.date = 'Target date is in the past.';
  if (Object.keys(errors).length || !target.ok || !starting.ok || !perPay.ok) return { ok: false, errors };
  return {
    ok: true,
    values: { title: raw.title.trim(), target_amount: target.toea, starting_balance: starting.toea, per_pay: perPay.toea, target_date: raw.date || null },
  };
}

export function GoalForm({ ctx, onSubmit, onCancel }: { ctx: GoalContext; onSubmit: (g: GoalInput) => Promise<void>; onCancel?: () => void }) {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<GoalInput['kind']>('save_up');
  const [target, setTarget] = useState('');
  const [starting, setStarting] = useState('');
  const [perPay, setPerPay] = useState('');
  const [date, setDate] = useState('');
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [quoteExpiry, setQuoteExpiry] = useState<string | null>(null);
  const [quoteBusy, setQuoteBusy] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const preview = (() => {
    const t = parseMoney(target);
    if (!t.ok) return null;
    const s = parseOptional(starting);
    const p = parseOptional(perPay);
    if (!s.ok || !p.ok) return null;
    return projectGoal({ targetAmount: t.toea, startingBalance: toea(s.toea), perPay: toea(p.toea), targetDate: isISODate(date) ? date : null }, [], ctx);
  })();

  const onQuote = async (file: File | undefined) => {
    if (!file || !user) return;
    const problem = validateUpload(file, { allowPdf: true });
    if (problem) {
      setErrors({ quote: problem });
      return;
    }
    setErrors({});
    setQuoteBusy(true);
    try {
      const up = await uploadDocument(file, 'quotation', user.id);
      setDocumentId(up.receiptId);
      const r = await parseDocument(up.receiptId);
      const parsed = r.parsed;
      if (parsed) {
        const item = parsed.lineItems[0]?.description;
        setTitle([item, parsed.merchant ? `from ${parsed.merchant}` : null].filter(Boolean).join(' ').slice(0, 80) || title);
        if (parsed.total > 0) setTarget(toInput(parsed.total));
        setQuoteExpiry(parsed.validUntil);
        if (parsed.validUntil && parsed.validUntil >= ctx.today) setDate(parsed.validUntil);
      }
      if (!r.ok) setErrors({ quote: `${PARSE_MESSAGES[r.error]} The quote is still attached.` });
    } catch {
      setErrors({ quote: "Couldn't upload that quote. Try again or fill the goal in by hand." });
    } finally {
      setQuoteBusy(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = validateGoal({ title, target, starting, perPay, date }, ctx.today);
    if (!r.ok) {
      setErrors(r.errors);
      return;
    }
    setBusy(true);
    try {
      await onSubmit({ ...r.values, kind, document_id: documentId });
    } catch {
      setErrors({ form: "Couldn't save the goal. Try again." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="grid gap-4">
      <div className="flex flex-wrap items-center gap-3 rounded-ctl border border-dashed border-border p-3">
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={(e) => {
            void onQuote(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
        <Button type="button" variant="outline" onClick={() => fileRef.current?.click()} disabled={quoteBusy}>
          {quoteBusy ? <Loader2 className="animate-spin" aria-hidden /> : <FileUp aria-hidden />}
          {quoteBusy ? 'Reading quote…' : 'Start from a quotation'}
        </Button>
        <p className="text-xs text-muted">Upload a quote or invoice and we'll fill in the title, total and expiry.</p>
        {errors.quote && (
          <p role="alert" className="w-full text-xs font-semibold text-over">
            {errors.quote}
          </p>
        )}
        {quoteExpiry && quoteExpiry < ctx.today && (
          <p role="alert" className="flex w-full items-center gap-2 text-xs font-semibold text-wants">
            <AlertTriangle className="size-4" aria-hidden /> This quote expired on {formatDayYear(quoteExpiry)}. Prices may have changed.
          </p>
        )}
        {quoteExpiry && quoteExpiry >= ctx.today && <p className="w-full text-xs text-muted">Quote valid until {formatDayYear(quoteExpiry)}.</p>}
      </div>

      <ToggleGroup type="single" aria-label="Goal type" value={kind} onValueChange={(v) => v && setKind(v as GoalInput['kind'])}>
        <ToggleGroupItem value="save_up">Save up</ToggleGroupItem>
        <ToggleGroupItem value="pay_off">Pay off</ToggleGroupItem>
      </ToggleGroup>

      <Field id="goal-title" label="Title" error={errors.title}>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={kind === 'save_up' ? 'e.g. Laptop for school' : 'e.g. Store credit'} />
      </Field>
      <div className="grid gap-4 md:grid-cols-2">
        <Field id="goal-target" label={kind === 'save_up' ? 'Target (K)' : 'Total owed (K)'} error={errors.target}>
          <Input inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value)} className="num" />
        </Field>
        <Field id="goal-starting" label={kind === 'save_up' ? 'Already saved (K)' : 'Already paid (K)'} error={errors.starting} hint="Leave blank if starting from zero.">
          <Input inputMode="decimal" value={starting} onChange={(e) => setStarting(e.target.value)} className="num" />
        </Field>
        <Field id="goal-perpay" label="Per pay (K)" error={errors.perPay}>
          <Input inputMode="decimal" value={perPay} onChange={(e) => setPerPay(e.target.value)} className="num" />
        </Field>
        <Field id="goal-date" label="Target date (optional)" error={errors.date}>
          <Input type="date" value={date} min={ctx.today} onChange={(e) => setDate(e.target.value)} />
        </Field>
      </div>

      {preview && (
        <p className="rounded-ctl bg-surface2 px-3 py-2 text-sm" role="status">
          {preview.requiredPerPay !== null && preview.paysLeft
            ? `To finish by the target date you need ${formatMoney(preview.requiredPerPay, { decimals: 0 })} a pay for ${preview.paysLeft} pay${preview.paysLeft === 1 ? '' : 's'}.`
            : 'Add a target date to see what you need per pay.'}
          {preview.eta && preview.remaining > 0 && ` At your per-pay amount you'll finish around ${formatDayYear(preview.eta)}.`}
        </p>
      )}

      {errors.form && <p role="alert" className="text-sm font-semibold text-over">{errors.form}</p>}
      <div className="flex gap-2">
        <Button type="submit" disabled={busy}>
          {busy ? 'Saving…' : 'Create goal'}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
