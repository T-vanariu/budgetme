import { toea, type BucketPlan, type InsightRuleId } from '@/types/domain';
import type { GoalProjection } from './goals';
import { runRules, type RulesInput } from './rules';

const plan = (bucket: BucketPlan['bucket'], planned: number, spent: number): BucketPlan => ({
  bucket,
  plannedFromSalary: toea(planned),
  plannedFromSide: toea(0),
  planned: toea(planned),
  spent: toea(spent),
  left: toea(planned - spent),
  usedPct: Math.round((spent / planned) * 100),
});
const proj = (p: Partial<GoalProjection>): GoalProjection => ({
  saved: 0, remaining: 1000, pct: 0, paysLeft: 3, eta: '2026-12-01', requiredPerPay: 400, onTrack: true, ...p,
});

/** Quiet baseline: day 7 of 14 (50%), everything on pace. */
const quiet: RulesInput = {
  today: '2026-10-12',
  period: { index: 0, start: '2026-10-06', end: '2026-10-19', days: 14, dayOf: 7 },
  plans: [plan('need', 100000, 50000), plan('want', 60000, 30000), plan('savings', 40000, 10000)],
  categories: [{ name: 'Groceries', thisPay: 20000, previous: [20000, 18000, 22000] }],
  historyPays: 3,
  wantsThisPay: [{ amount: 1000, merchant: 'A' }, { amount: 1200, merchant: 'B' }, { amount: 1500, merchant: 'C' }],
  goals: [{ title: 'Laptop', targetDate: '2026-12-31', projection: proj({ eta: '2026-12-01' }) }],
  lastExpenseDate: '2026-10-12',
};

const fired = (input: RulesInput, id: InsightRuleId) => runRules(input).find((r) => r.id === id)!.fired;

describe('runRules', () => {
  it('returns all 7 rules', () => {
    expect(runRules(quiet).map((r) => r.id)).toEqual([
      'needs_pace', 'wants_pace', 'category_spike', 'big_one_off', 'goal_slipping', 'savings_win', 'logging_gap',
    ]);
  });

  it('stays quiet on the baseline', () => {
    expect(runRules(quiet).filter((r) => r.fired)).toEqual([]);
  });

  it('needs pace fires above elapsed + 15', () => {
    expect(fired({ ...quiet, plans: [plan('need', 100000, 66000), quiet.plans[1], quiet.plans[2]] }, 'needs_pace')).toBe(true);
    expect(fired({ ...quiet, plans: [plan('need', 100000, 65000), quiet.plans[1], quiet.plans[2]] }, 'needs_pace')).toBe(false);
  });

  it('wants pace fires above elapsed + 15', () => {
    expect(fired({ ...quiet, plans: [quiet.plans[0], plan('want', 60000, 45000), quiet.plans[2]] }, 'wants_pace')).toBe(true);
  });

  it('category spike fires above 1.3 × 3-pay average and needs 3 pays', () => {
    const hot = { ...quiet, categories: [{ name: 'Groceries', thisPay: 27000, previous: [20000, 18000, 22000] }] };
    expect(fired(hot, 'category_spike')).toBe(true);
    expect(fired({ ...hot, historyPays: 2 }, 'category_spike')).toBe(false);
  });

  it('big one-off fires above 2 × median and needs 3 wants', () => {
    const big = { ...quiet, wantsThisPay: [...quiet.wantsThisPay, { amount: 5000, merchant: 'TV shop' }] };
    expect(fired(big, 'big_one_off')).toBe(true);
    expect(fired({ ...quiet, wantsThisPay: [{ amount: 100, merchant: null }, { amount: 9000, merchant: null }] }, 'big_one_off')).toBe(false);
  });

  it('goal slipping fires when ETA is after target', () => {
    expect(fired({ ...quiet, goals: [{ title: 'Laptop', targetDate: '2026-11-01', projection: proj({ eta: '2026-12-01' }) }] }, 'goal_slipping')).toBe(true);
    expect(fired({ ...quiet, goals: [{ title: 'Laptop', targetDate: '2026-11-01', projection: proj({ eta: null }) }] }, 'goal_slipping')).toBe(true);
  });

  it('savings win fires at 70% of the savings plan', () => {
    expect(fired({ ...quiet, plans: [quiet.plans[0], quiet.plans[1], plan('savings', 40000, 28000)] }, 'savings_win')).toBe(true);
    expect(fired({ ...quiet, plans: [quiet.plans[0], quiet.plans[1], plan('savings', 40000, 27000)] }, 'savings_win')).toBe(false);
  });

  it('logging gap fires after 2 days', () => {
    expect(fired({ ...quiet, lastExpenseDate: '2026-10-10' }, 'logging_gap')).toBe(true);
    expect(fired({ ...quiet, lastExpenseDate: '2026-10-11' }, 'logging_gap')).toBe(false);
  });
});
