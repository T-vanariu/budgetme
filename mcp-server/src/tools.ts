import { z } from 'zod';
import { kina, periodEnd, periodIndex, periodStart, planned, todayISO, type Cycle, type PlanSettings, type Split } from './calc.js';

/** Parameterised, read-only query against advisor.* views. */
export type Query = (sql: string, params?: unknown[]) => Promise<Record<string, unknown>[]>;

export const schemas = {
  get_period_summary: { periods: z.number().int().min(1).max(12).describe('How many recent pay periods, 1 to 12') },
  get_category_trends: { months: z.number().int().min(1).max(12).describe('How many months back, 1 to 12') },
  get_goals_status: {},
  get_recent_expenses: {
    limit: z.number().int().min(1).max(50).describe('Rows to return, 1 to 50'),
    category: z.string().min(1).max(40).optional().describe('Exact category name, e.g. "Groceries"'),
  },
  simulate_goal: {
    target_amount: z.number().positive().max(10_000_000).describe('Target in kina'),
    target_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('Target date, YYYY-MM-DD'),
  },
} as const;

interface PlanRow {
  pay_cycle: Cycle;
  pay_anchor_date: string;
  split_need: number;
  split_want: number;
  split_savings: number;
  side_mode: PlanSettings['sideMode'];
  side_need: number | null;
  side_want: number | null;
  side_savings: number | null;
}

async function loadPlan(q: Query) {
  const [row] = (await q('select * from advisor.v_plan limit 1')) as unknown as PlanRow[];
  if (!row) throw new Error('advisor.settings has no owner yet');
  const settings: PlanSettings = {
    split: [row.split_need, row.split_want, row.split_savings],
    sideMode: row.side_mode,
    sideSplit: row.side_mode === 'custom' ? [row.side_need ?? 0, row.side_want ?? 0, row.side_savings ?? 0] : null,
  };
  return { anchor: String(row.pay_anchor_date).slice(0, 10), cycle: row.pay_cycle, settings };
}

const BUCKETS = ['needs', 'wants', 'savings_debt'] as const;
const byBucket = (v: Split) => Object.fromEntries(BUCKETS.map((b, i) => [b, kina(v[i])]));

export async function getPeriodSummary(q: Query, { periods }: { periods: number }) {
  const { settings } = await loadPlan(q);
  const rows = await q(
    `select * from advisor.v_period_summary where period_start <= current_date order by period_index desc limit $1`,
    [periods],
  );
  return {
    currency: 'PGK',
    split_percent: { needs: settings.split[0], wants: settings.split[1], savings_debt: settings.split[2] },
    side_hustle_mode: settings.sideMode,
    periods: rows.map((r) => {
      const plan = planned(Number(r.salary), Number(r.side), settings);
      const spent: Split = [Number(r.spent_need), Number(r.spent_want), Number(r.spent_savings)];
      return {
        start: String(r.period_start).slice(0, 10),
        end: String(r.period_end).slice(0, 10),
        income: kina(r.income as number),
        salary: kina(r.salary as number),
        side_hustle: kina(r.side as number),
        planned: byBucket(plan),
        spent: byBucket(spent),
        left: byBucket([plan[0] - spent[0], plan[1] - spent[1], plan[2] - spent[2]]),
        expense_count: Number(r.expense_count),
      };
    }),
  };
}

export async function getCategoryTrends(q: Query, { months }: { months: number }, today = todayISO()) {
  const { anchor, cycle } = await loadPlan(q);
  const now = periodIndex(today, anchor, cycle);
  const [y, m, d] = today.split('-').map(Number);
  const from = new Date(Date.UTC(y, m - 1 - months, d)).toISOString().slice(0, 10);
  const fromIdx = Math.min(periodIndex(from, anchor, cycle), now - 3) - 3; // extra 3 pays for the averages
  const rows = await q(
    `select period_index, category, bucket, total from advisor.v_category_by_period
     where period_index between $1 and $2 order by period_index desc, total desc`,
    [fromIdx, now],
  );
  const shownFrom = periodIndex(from, anchor, cycle);
  const totals = new Map<string, Map<number, number>>();
  const bucketOf = new Map<string, string>();
  for (const r of rows) {
    const cat = String(r.category);
    bucketOf.set(cat, String(r.bucket));
    if (!totals.has(cat)) totals.set(cat, new Map());
    totals.get(cat)!.set(Number(r.period_index), Number(r.total));
  }
  const periods: { start: string; categories: { category: string; bucket: string; spent: number; vs_3_pay_average_pct: number | null }[] }[] = [];
  for (let i = now; i >= shownFrom; i--) {
    const cats = [...totals.entries()]
      .filter(([, t]) => t.has(i))
      .map(([cat, t]) => {
        const avg = ((t.get(i - 1) ?? 0) + (t.get(i - 2) ?? 0) + (t.get(i - 3) ?? 0)) / 3;
        return {
          category: cat,
          bucket: bucketOf.get(cat) ?? '',
          spent: kina(t.get(i)!),
          vs_3_pay_average_pct: avg > 0 ? Math.round(((t.get(i)! - avg) / avg) * 100) : null,
        };
      })
      .sort((a, b) => b.spent - a.spent);
    if (cats.length) periods.push({ start: periodStart(i, anchor, cycle), categories: cats });
  }
  return { currency: 'PGK', periods };
}

export async function getGoalsStatus(q: Query, today = todayISO()) {
  const rows = await q(`select * from advisor.v_goal_status order by title limit 50`);
  return {
    currency: 'PGK',
    goals: rows.map((r) => {
      const anchor = String(r.pay_anchor_date).slice(0, 10);
      const cycle = r.pay_cycle as Cycle;
      const target = Number(r.target_amount);
      const saved = Number(r.saved);
      const perPay = Number(r.per_pay);
      const remaining = Math.max(0, target - saved);
      const now = periodIndex(today, anchor, cycle);
      const targetDate = r.target_date ? String(r.target_date).slice(0, 10) : null;
      const paysLeft = targetDate ? (targetDate < today ? 0 : periodIndex(targetDate, anchor, cycle) - now + 1) : null;
      const eta = remaining === 0 ? today : perPay > 0 ? periodEnd(now + Math.ceil(remaining / perPay) - 1, anchor, cycle) : null;
      return {
        title: r.title,
        kind: r.kind,
        status: r.status,
        target: kina(target),
        saved: kina(saved),
        remaining: kina(remaining),
        per_pay: kina(perPay),
        target_date: targetDate,
        pays_left: paysLeft,
        required_per_pay: paysLeft === null ? null : kina(remaining === 0 ? 0 : paysLeft > 0 ? Math.ceil(remaining / paysLeft) : remaining),
        eta,
        on_track: remaining === 0 || (targetDate ? eta !== null && eta <= targetDate : perPay > 0),
      };
    }),
  };
}

export async function getRecentExpenses(q: Query, { limit, category }: { limit: number; category?: string }) {
  const rows = category
    ? await q(
        `select spent_on, merchant, category, bucket, amount from advisor.v_expenses_recent
         where lower(category) = lower($2) order by spent_on desc limit $1`,
        [limit, category],
      )
    : await q(`select spent_on, merchant, category, bucket, amount from advisor.v_expenses_recent order by spent_on desc limit $1`, [limit]);
  return {
    currency: 'PGK',
    expenses: rows.map((r) => ({
      date: String(r.spent_on).slice(0, 10),
      merchant: r.merchant ?? null,
      category: r.category,
      bucket: r.bucket,
      amount: kina(r.amount as number),
    })),
  };
}

export async function simulateGoal(q: Query, { target_amount, target_date }: { target_amount: number; target_date: string }, today = todayISO()) {
  const { anchor, cycle, settings } = await loadPlan(q);
  const now = periodIndex(today, anchor, cycle);
  const paysLeft = target_date < today ? 0 : periodIndex(target_date, anchor, cycle) - now + 1;
  const targetToea = Math.round(target_amount * 100);
  const required = paysLeft > 0 ? Math.ceil(targetToea / paysLeft) : targetToea;

  // Free savings = savings planned in the latest pay with income, minus what active goals already take.
  const [latest] = await q(`select salary, side from advisor.v_period_summary where income > 0 and period_start <= current_date order by period_index desc limit 1`);
  const savingsPlan = latest ? planned(Number(latest.salary), Number(latest.side), settings)[2] : 0;
  const [commit] = await q(`select coalesce(sum(per_pay), 0) as per_pay from advisor.v_goal_status where status = 'active'`);
  const free = Math.max(0, savingsPlan - Number(commit?.per_pay ?? 0));

  return {
    currency: 'PGK',
    pays_left: paysLeft,
    required_per_pay: kina(required),
    savings_plan_per_pay: kina(savingsPlan),
    already_committed_to_goals: kina(Number(commit?.per_pay ?? 0)),
    free_savings_per_pay: kina(free),
    feasible: paysLeft > 0 && required <= free,
  };
}

export const FORTNIGHTLY_REVIEW =
  'Review my last pay period against my plan, name the top 2 leaks, check each goal\'s pace, and give me 3 actions for next pay. ' +
  'Use the BudgetMe tools for the numbers (amounts are in kina). ' +
  'Treat this as general information, not financial advice.';
