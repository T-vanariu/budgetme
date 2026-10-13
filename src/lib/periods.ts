import type { PayCycle, PayPeriod } from '@/types/domain';
import { addDays, addMonths, diffDays, formatDay } from './dates';

const LEN = { weekly: 7, fortnightly: 14 } as const;

/** Start date of period `index`; index 0 starts on the anchor payday. Mirrors SQL `public.period_start`. */
export function periodStart(index: number, anchor: string, cycle: PayCycle): string {
  return cycle === 'monthly' ? addMonths(anchor, index) : addDays(anchor, index * LEN[cycle]);
}

/** Index of the pay period containing `date` (negative before the anchor). Mirrors SQL `public.period_index`. */
export function periodIndex(date: string, anchor: string, cycle: PayCycle): number {
  if (cycle !== 'monthly') return Math.floor(diffDays(date, anchor) / LEN[cycle]);
  const [y, m] = date.split('-').map(Number);
  const [ay, am] = anchor.split('-').map(Number);
  let idx = (y - ay) * 12 + (m - am);
  if (date < periodStart(idx, anchor, cycle)) idx -= 1;
  return idx;
}

/** `date` sets `dayOf`; without it the period is treated as complete. */
export function periodByIndex(index: number, anchor: string, cycle: PayCycle, date?: string): PayPeriod {
  const start = periodStart(index, anchor, cycle);
  const end = addDays(periodStart(index + 1, anchor, cycle), -1);
  const days = diffDays(end, start) + 1;
  const dayOf = date ? Math.min(days, Math.max(1, diffDays(date, start) + 1)) : days;
  return { index, start, end, days, dayOf };
}

export function getPeriod(date: string, anchor: string, cycle: PayCycle): PayPeriod {
  return periodByIndex(periodIndex(date, anchor, cycle), anchor, cycle, date);
}

/** Periods from `fromIndex` to `toIndex` inclusive, newest first. */
export function listPeriods(fromIndex: number, toIndex: number, anchor: string, cycle: PayCycle): PayPeriod[] {
  const out: PayPeriod[] = [];
  for (let i = toIndex; i >= fromIndex; i--) out.push(periodByIndex(i, anchor, cycle));
  return out;
}

export function periodLabel(p: PayPeriod): string {
  return `${formatDay(p.start)} – ${formatDay(p.end)}`;
}

/** Share of the period elapsed, 0–100. */
export function elapsedPct(p: PayPeriod): number {
  return Math.round((p.dayOf / p.days) * 100);
}

export const CYCLE_LABEL: Record<PayCycle, string> = { weekly: 'Weekly', fortnightly: 'Fortnightly', monthly: 'Monthly' };
