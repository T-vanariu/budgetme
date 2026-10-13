import { INSIGHTS } from '@/config/insights';
import type { BucketPlan, InsightRuleResult, PayPeriod } from '@/types/domain';
import { diffDays } from './dates';
import type { GoalProjection } from './goals';
import { formatMoney } from './money';
import { elapsedPct } from './periods';

export interface RulesInput {
  today: string;
  period: PayPeriod;
  plans: BucketPlan[];
  /** Spend per category this pay, plus the same category in each earlier pay (newest first). */
  categories: { name: string; thisPay: number; previous: number[] }[];
  /** Number of earlier pays that have any logged expense. */
  historyPays: number;
  wantsThisPay: { amount: number; merchant: string | null }[];
  goals: { title: string; targetDate: string | null; projection: GoalProjection }[];
  lastExpenseDate: string | null;
}

export function median(xs: number[]): number {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function pace(id: 'needs_pace' | 'wants_pace', plan: BucketPlan | undefined, elapsed: number): InsightRuleResult {
  const label = id === 'needs_pace' ? 'Needs' : 'Wants';
  const base = {
    id,
    name: `${label} pace`,
    condition: `${label} used % > period elapsed % + ${INSIGHTS.paceMarginPts}`,
  };
  if (!plan || plan.planned <= 0) {
    return { ...base, fired: false, severity: 'info', message: `No ${label.toLowerCase()} plan yet. Log your salary first.` };
  }
  const fired = plan.usedPct > elapsed + INSIGHTS.paceMarginPts;
  return {
    ...base,
    fired,
    severity: fired ? 'warn' : 'good',
    message: fired
      ? `${label} is ${plan.usedPct}% used with ${elapsed}% of the pay gone. Slow down to keep ${formatMoney(plan.left, { decimals: 0 })} for the rest of the pay.`
      : `${label} is on pace: ${plan.usedPct}% used, ${elapsed}% of the pay gone.`,
  };
}

/** Deterministic rule-based insights. Every rule returns a result, fired or not. */
export function runRules(input: RulesInput): InsightRuleResult[] {
  const elapsed = elapsedPct(input.period);
  const byBucket = (b: BucketPlan['bucket']) => input.plans.find((p) => p.bucket === b);
  const out: InsightRuleResult[] = [pace('needs_pace', byBucket('need'), elapsed), pace('wants_pace', byBucket('want'), elapsed)];

  // Category spike
  {
    const base = {
      id: 'category_spike' as const,
      name: 'Category spike',
      condition: `Category this pay > ${INSIGHTS.spikeFactor} × average of previous ${INSIGHTS.spikeHistoryPays} pays`,
    };
    if (input.historyPays < INSIGHTS.spikeHistoryPays) {
      out.push({ ...base, fired: false, severity: 'info', message: `Needs ${INSIGHTS.spikeHistoryPays} pays of history (${input.historyPays} so far).` });
    } else {
      const spikes = input.categories
        .map((c) => {
          const prev = c.previous.slice(0, INSIGHTS.spikeHistoryPays);
          while (prev.length < INSIGHTS.spikeHistoryPays) prev.push(0);
          const avg = prev.reduce((a, b) => a + b, 0) / INSIGHTS.spikeHistoryPays;
          return { ...c, avg, ratio: avg > 0 ? c.thisPay / avg : 0 };
        })
        .filter((c) => c.avg > 0 && c.thisPay > INSIGHTS.spikeFactor * c.avg)
        .sort((a, b) => b.ratio - a.ratio);
      const top = spikes[0];
      out.push(
        top
          ? {
              ...base,
              fired: true,
              severity: 'warn',
              message: `${top.name} is ${formatMoney(top.thisPay, { decimals: 0 })} this pay, ${Math.round((top.ratio - 1) * 100)}% above its 3-pay average of ${formatMoney(Math.round(top.avg), { decimals: 0 })}.`,
            }
          : { ...base, fired: false, severity: 'good', message: 'No category is running hot compared with your last 3 pays.' },
      );
    }
  }

  // Big one-off
  {
    const base = {
      id: 'big_one_off' as const,
      name: 'Big one-off',
      condition: `A single Wants expense > ${INSIGHTS.oneOffFactor} × median Wants expense`,
    };
    const w = input.wantsThisPay;
    if (w.length < INSIGHTS.oneOffMinCount) {
      out.push({ ...base, fired: false, severity: 'info', message: `Needs ${INSIGHTS.oneOffMinCount}+ Wants expenses this pay (${w.length} so far).` });
    } else {
      const med = median(w.map((e) => e.amount));
      const big = [...w].sort((a, b) => b.amount - a.amount)[0];
      const fired = big.amount > INSIGHTS.oneOffFactor * med;
      out.push({
        ...base,
        fired,
        severity: fired ? 'warn' : 'good',
        message: fired
          ? `${big.merchant ?? 'One Wants expense'} at ${formatMoney(big.amount, { decimals: 0 })} is more than double your typical Wants spend (${formatMoney(Math.round(med), { decimals: 0 })}).`
          : 'No single Wants expense stands out.',
      });
    }
  }

  // Goal slipping
  {
    const base = { id: 'goal_slipping' as const, name: 'Goal slipping', condition: 'Projected finish date > target date' };
    const slipping = input.goals.filter(
      (g) => g.targetDate && g.projection.remaining > 0 && (g.projection.eta === null || g.projection.eta > g.targetDate),
    );
    const withDates = input.goals.filter((g) => g.targetDate);
    out.push(
      slipping.length
        ? {
            ...base,
            fired: true,
            severity: 'warn',
            message: `${slipping.map((g) => g.title).join(', ')} won't finish by the target date at the current per-pay amount${
              slipping[0].projection.requiredPerPay ? `. ${slipping[0].title} needs ${formatMoney(slipping[0].projection.requiredPerPay, { decimals: 0 })} a pay` : ''
            }.`,
          }
        : {
            ...base,
            fired: false,
            severity: withDates.length ? 'good' : 'info',
            message: withDates.length ? 'Every dated goal is on pace.' : 'No goals with a target date yet.',
          },
    );
  }

  // Savings win
  {
    const base = { id: 'savings_win' as const, name: 'Savings win', condition: `Savings moved ≥ ${INSIGHTS.savingsWinPct}% of the savings plan` };
    const s = byBucket('savings');
    if (!s || s.planned <= 0) out.push({ ...base, fired: false, severity: 'info', message: 'No savings plan yet.' });
    else {
      const fired = s.usedPct >= INSIGHTS.savingsWinPct;
      out.push({
        ...base,
        fired,
        severity: fired ? 'good' : 'info',
        message: fired
          ? `You've moved ${formatMoney(s.spent, { decimals: 0 })} to savings and debt, ${s.usedPct}% of the plan. Nice work.`
          : `${s.usedPct}% of the savings plan moved so far.`,
      });
    }
  }

  // Logging gap
  {
    const base = { id: 'logging_gap' as const, name: 'Logging gap', condition: `${INSIGHTS.loggingGapDays}+ days since the last expense` };
    if (!input.lastExpenseDate) out.push({ ...base, fired: false, severity: 'info', message: 'No expenses logged yet.' });
    else {
      const gap = diffDays(input.today, input.lastExpenseDate);
      const fired = gap >= INSIGHTS.loggingGapDays;
      out.push({
        ...base,
        fired,
        severity: fired ? 'warn' : 'good',
        message: fired ? `${gap} days since your last entry. Anything to catch up on?` : 'You are logging regularly.',
      });
    }
  }

  return out;
}

/** Fired rules first (warn before good), then the rest. */
export function rankInsights(rs: InsightRuleResult[]): InsightRuleResult[] {
  const score = (r: InsightRuleResult) => (r.fired ? (r.severity === 'warn' ? 0 : 1) : 2);
  return [...rs].sort((a, b) => score(a) - score(b));
}
