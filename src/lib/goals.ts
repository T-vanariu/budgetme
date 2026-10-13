import type { Goal, GoalContribution, PayCycle } from '@/types/domain';
import { periodByIndex, periodIndex } from './periods';

export interface GoalProjection {
  saved: number;
  remaining: number;
  pct: number;
  /** Pay periods from the current one through the one holding the target date, inclusive. Null without a target date. */
  paysLeft: number | null;
  /** End date of the pay in which the goal completes at the planned per-pay amount. Null when it never completes. */
  eta: string | null;
  /** Per-pay amount needed to hit the target date. Null without a target date. */
  requiredPerPay: number | null;
  onTrack: boolean;
}

export interface GoalContext { today: string; anchor: string; cycle: PayCycle; }

export function projectGoal(
  goal: Pick<Goal, 'targetAmount' | 'startingBalance' | 'perPay' | 'targetDate'>,
  contributions: Pick<GoalContribution, 'amount'>[],
  { today, anchor, cycle }: GoalContext,
): GoalProjection {
  const saved = goal.startingBalance + contributions.reduce((a, c) => a + c.amount, 0);
  const remaining = Math.max(0, goal.targetAmount - saved);
  const pct = goal.targetAmount > 0 ? Math.min(100, Math.round((saved / goal.targetAmount) * 100)) : 0;
  const nowIdx = periodIndex(today, anchor, cycle);

  let paysLeft: number | null = null;
  let requiredPerPay: number | null = null;
  if (goal.targetDate) {
    paysLeft = goal.targetDate < today ? 0 : periodIndex(goal.targetDate, anchor, cycle) - nowIdx + 1;
    requiredPerPay = remaining === 0 ? 0 : paysLeft > 0 ? Math.ceil(remaining / paysLeft) : remaining;
  }

  let eta: string | null = null;
  if (remaining === 0) eta = today;
  else if (goal.perPay > 0) {
    const paysNeeded = Math.ceil(remaining / goal.perPay);
    eta = periodByIndex(nowIdx + paysNeeded - 1, anchor, cycle).end;
  }

  const onTrack =
    remaining === 0 || (goal.targetDate ? eta !== null && eta <= goal.targetDate : goal.perPay > 0);

  return { saved, remaining, pct, paysLeft, eta, requiredPerPay, onTrack };
}
