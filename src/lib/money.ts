import { MAX_SINGLE_AMOUNT } from '@/config/limits';
import { toea, type Toea } from '@/types/domain';

export type MoneyError = 'empty' | 'format' | 'not_positive' | 'too_large';
export type ParseMoneyResult = { ok: true; toea: Toea } | { ok: false; reason: MoneyError };

const PLAIN = /^\d+(\.\d{1,2})?$/;
const GROUPED = /^\d{1,3}(,\d{3})+(\.\d{1,2})?$/;
const NEGATIVE = /^[-−]\s*[\d,]+(\.\d{1,2})?$/;

/** Parse user input like `25`, `25.5`, `1,234.56` into whole toea. String maths only, no floats. */
export function parseMoney(input: string, max: Toea = MAX_SINGLE_AMOUNT): ParseMoneyResult {
  let s = input.trim().replace(/^K\s*/i, '');
  if (s === '') return { ok: false, reason: 'empty' };
  if (/^[-−]/.test(s)) return { ok: false, reason: NEGATIVE.test(s) ? 'not_positive' : 'format' };
  if (!PLAIN.test(s) && !GROUPED.test(s)) return { ok: false, reason: 'format' };
  s = s.replace(/,/g, '');
  const [whole, frac = ''] = s.split('.');
  const wholeDigits = whole.replace(/^0+(?=\d)/, '');
  if (wholeDigits.length > 12) return { ok: false, reason: 'too_large' };
  const value = Number(wholeDigits) * 100 + Number(frac.padEnd(2, '0'));
  if (value <= 0) return { ok: false, reason: 'not_positive' };
  if (value > max) return { ok: false, reason: 'too_large' };
  return { ok: true, toea: toea(value) };
}

export const MONEY_ERRORS: Record<MoneyError, string> = {
  empty: 'Enter an amount.',
  format: 'Use numbers only, with up to 2 decimals (for example 1,234.50).',
  not_positive: 'Amount must be more than zero.',
  too_large: `That is more than K ${(MAX_SINGLE_AMOUNT / 100).toLocaleString('en-US')} for one entry.`,
};

function group(n: number): string {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** `K 1,234.56` (decimals 2, default) or `K 1,235` (decimals 0). Negative as `−K 12`. */
export function formatMoney(t: number, opts: { decimals?: 0 | 2 } = {}): string {
  const decimals = opts.decimals ?? 2;
  const neg = t < 0;
  const abs = Math.abs(Math.round(t));
  const body =
    decimals === 0
      ? group(Math.floor((abs + 50) / 100))
      : `${group(Math.floor(abs / 100))}.${String(abs % 100).padStart(2, '0')}`;
  return `${neg ? '−' : ''}K ${body}`;
}

/** toea to kina as a plain number, for charts only (never store or add these). */
export const toKina = (t: number) => t / 100;

/** Kina string with exactly 2 decimals, for pre-filling inputs. */
export const toInput = (t: number) => (t / 100).toFixed(2);

/** Split `amount` into whole parts proportional to `weights` that sum exactly to `amount` (largest remainder). */
export function allocate(amount: number, weights: readonly number[]): number[] {
  const total = weights.reduce((a, b) => a + b, 0);
  if (total <= 0 || amount === 0) return weights.map(() => 0);
  const raw = weights.map((w) => (amount * w) / total);
  const parts = raw.map(Math.floor);
  let rest = amount - parts.reduce((a, b) => a + b, 0);
  const order = raw
    .map((r, i) => ({ i, frac: r - Math.floor(r) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);
  for (const { i } of order) {
    if (rest <= 0) break;
    parts[i] += 1;
    rest -= 1;
  }
  return parts;
}
