import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Camera, Keyboard, Loader2 } from 'lucide-react';
import { useLogSheet } from '@/app/log-context';
import { useAuth } from '@/app/auth';
import { useCategories } from '@/data/categories';
import { useGoals } from '@/data/goals';
import { useAddExpense } from '@/data/expenses';
import { PARSE_MESSAGES, parseDocument, uploadDocument } from '@/data/uploads';
import { CONFIDENCE_FLOOR } from '@/config/limits';
import { validateUpload } from '@/lib/files';
import { formatMoney } from '@/lib/money';
import { toast } from '@/components/ui/sonner';
import type { ParsedDocument } from '@/types/domain';
import { ExpenseForm, type ExpenseFormValues } from './ExpenseForm';
import { ResponsiveSheet } from './ResponsiveSheet';

type Step =
  | { kind: 'choose'; error?: string }
  | { kind: 'scanning' }
  | { kind: 'review'; receiptId: string; preview: { url: string; isPdf: boolean }; parsed: ParsedDocument }
  | { kind: 'manual'; receiptId?: string; preview?: { url: string; isPdf: boolean }; parsed?: ParsedDocument; notice?: string };

export function LogSheet() {
  const { open, start, close } = useLogSheet();
  const { user } = useAuth();
  const { data: categories = [] } = useCategories();
  const { data: goals = [] } = useGoals();
  const addExpense = useAddExpense();
  const [step, setStep] = useState<Step>({ kind: 'choose' });
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) setStep(start === 'manual' ? { kind: 'manual' } : { kind: 'choose' });
  }, [open, start]);
  useEffect(() => {
    if (open && start === 'scan') fileRef.current?.click();
  }, [open, start]);

  const onFile = async (file: File | undefined) => {
    if (!file || !user) return;
    const problem = validateUpload(file, { allowPdf: true });
    if (problem) {
      setStep({ kind: 'choose', error: problem });
      return;
    }
    setStep({ kind: 'scanning' });
    let uploaded;
    try {
      uploaded = await uploadDocument(file, 'receipt', user.id);
    } catch {
      setStep({ kind: 'choose', error: "Couldn't upload that file. Check your connection and try again." });
      return;
    }
    const preview = { url: uploaded.previewUrl, isPdf: uploaded.isPdf };
    const result = await parseDocument(uploaded.receiptId);
    if (result.ok && result.parsed.confidence >= CONFIDENCE_FLOOR) {
      setStep({ kind: 'review', receiptId: uploaded.receiptId, preview, parsed: result.parsed });
    } else {
      // Never stuck: fall back to manual entry with the image beside it and anything we did read.
      setStep({
        kind: 'manual',
        receiptId: uploaded.receiptId,
        preview,
        parsed: result.parsed,
        notice: result.ok ? PARSE_MESSAGES.low_confidence : PARSE_MESSAGES[result.error],
      });
    }
  };

  const save = async (v: ExpenseFormValues, receiptId?: string) => {
    await addExpense.mutateAsync({
      amount: v.amount,
      spent_on: v.date,
      category_id: v.categoryId,
      merchant: v.merchant,
      receipt_id: receiptId ?? null,
      entry_method: receiptId ? 'receipt' : 'manual',
      goal_id: v.goalId,
    });
    const cat = categories.find((c) => c.id === v.categoryId)?.name ?? '';
    toast.success(`Logged ${formatMoney(v.amount)} · ${cat}`);
    close();
  };

  const categoryIdFor = (p?: ParsedDocument) => categories.find((c) => c.name === p?.suggestedCategory)?.id;
  const goalOptions = goals.filter((g) => g.status === 'active').map((g) => ({ id: g.id, title: g.title }));

  const title = { choose: 'Log an expense', scanning: 'Reading receipt', review: 'Check the details', manual: 'Type it in' }[step.kind];

  return (
    <ResponsiveSheet open={open} onOpenChange={(o) => !o && close()} title={title}>
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          void onFile(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={step.kind} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}>
          {step.kind === 'choose' && (
            <div className="grid gap-3">
              <div className="grid gap-3 md:grid-cols-2">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex min-h-28 flex-col items-center justify-center gap-2 rounded-card border border-border bg-surface p-4 font-semibold hover:bg-surface2"
                >
                  <Camera className="size-7" aria-hidden />
                  Snap receipt
                  <span className="text-xs font-normal text-muted">Photo or PDF, up to 10 MB</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStep({ kind: 'manual' })}
                  className="flex min-h-28 flex-col items-center justify-center gap-2 rounded-card border border-border bg-surface p-4 font-semibold hover:bg-surface2"
                >
                  <Keyboard className="size-7" aria-hidden />
                  Type it in
                  <span className="text-xs font-normal text-muted">Amount, category, done</span>
                </button>
              </div>
              {step.error && (
                <p role="alert" className="text-sm font-semibold text-over">
                  {step.error}
                </p>
              )}
            </div>
          )}

          {step.kind === 'scanning' && (
            <div className="flex flex-col items-center gap-3 py-10" role="status" aria-live="polite">
              <Loader2 className="size-8 animate-spin text-muted" aria-hidden />
              <p className="text-sm text-muted">Reading your receipt…</p>
            </div>
          )}

          {step.kind === 'review' && (
            <ExpenseForm
              categories={categories}
              goals={goalOptions}
              preview={step.preview}
              initial={{
                amount: step.parsed.total,
                merchant: step.parsed.merchant,
                date: step.parsed.date,
                categoryId: categoryIdFor(step.parsed),
              }}
              submitLabel="Confirm"
              onSubmit={(v) => save(v, step.receiptId)}
            />
          )}

          {step.kind === 'manual' && (
            <ExpenseForm
              categories={categories}
              goals={goalOptions}
              preview={step.preview}
              notice={step.notice}
              autoFocusAmount={!step.preview}
              initial={
                step.parsed
                  ? { amount: step.parsed.total || undefined, merchant: step.parsed.merchant, date: step.parsed.date, categoryId: categoryIdFor(step.parsed) }
                  : undefined
              }
              submitLabel="Save"
              onSubmit={(v) => save(v, step.receiptId)}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </ResponsiveSheet>
  );
}
