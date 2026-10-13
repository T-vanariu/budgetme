import { BUCKETS, toea, type BucketPlan, type Expense, type SideAllocation, type Split, type Toea } from '@/types/domain';
import { allocate } from './money';

export function splitTotal(s: readonly number[]): number {
  return s.reduce((a, b) => a + b, 0);
}
export function isValidSplit(s: readonly number[]): boolean {
  return s.length === 3 && s.every((n) => Number.isInteger(n) && n >= 0 && n <= 100) && splitTotal(s) === 100;
}

/** The split applied to side-hustle income. An invalid custom split falls back to the salary split. */
export function sideSplit(split: Split, side: SideAllocation): Split {
  if (side.mode === 'savings') return [0, 0, 100];
  if (side.mode === 'custom' && isValidSplit(side.split)) return side.split;
  return split;
}

export interface PlanInput {
  salary: Toea;
  side: Toea;
  split: Split;
  sideAllocation: SideAllocation;
  expenses: Pick<Expense, 'amount' | 'bucket' | 'deletedAt'>[];
}

/** planned = salary × split + side × sideSplit, to the toea (largest-remainder rounding per source). */
export function planPeriod({ salary, side, split, sideAllocation, expenses }: PlanInput): BucketPlan[] {
  const fromSalary = allocate(salary, split);
  const fromSide = allocate(side, sideSplit(split, sideAllocation));
  return BUCKETS.map((bucket, i) => {
    const spent = expenses
      .filter((e) => e.bucket === bucket && !e.deletedAt)
      .reduce((a, e) => a + e.amount, 0);
    const planned = fromSalary[i] + fromSide[i];
    const usedPct = planned > 0 ? Math.round((spent / planned) * 100) : spent > 0 ? 100 : 0;
    return {
      bucket,
      plannedFromSalary: toea(fromSalary[i]),
      plannedFromSide: toea(fromSide[i]),
      planned: toea(planned),
      spent: toea(spent),
      left: toea(planned - spent),
      usedPct,
    };
  });
}

export const SPLIT_PRESETS: { label: string; split: Split }[] = [
  { label: '50/30/20', split: [50, 30, 20] },
  { label: '60/20/20', split: [60, 20, 20] },
  { label: '70/20/10', split: [70, 20, 10] },
];
