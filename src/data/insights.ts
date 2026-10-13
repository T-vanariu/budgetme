import { useMemo } from 'react';
import { projectGoal } from '@/lib/goals';
import { runRules } from '@/lib/rules';
import { INSIGHTS } from '@/config/insights';
import { toea } from '@/types/domain';
import { useLastExpenseDate } from './expenses';
import { useGoals } from './goals';
import { useCurrentPlan } from './plan';
import { useCategoryByPeriod } from './summary';

/** All 7 rules computed from live data. Category averages come from v_category_by_period. */
export function useInsights() {
  const plan = useCurrentPlan();
  const cur = plan?.pay.current.index;
  const { data: byCat } = useCategoryByPeriod(cur === undefined ? undefined : cur - INSIGHTS.spikeHistoryPays);
  const { data: goals } = useGoals();
  const { data: lastExpense } = useLastExpenseDate();

  return useMemo(() => {
    if (!plan || !byCat || !goals || lastExpense === undefined) return null;
    const { pay } = plan;
    const idx = pay.current.index;
    const names = new Set(byCat.filter((r) => r.period_index === idx).map((r) => r.category_name));
    const totalFor = (name: string, i: number) => byCat.find((r) => r.category_name === name && r.period_index === i)?.total ?? 0;
    const prevIdx = Array.from({ length: INSIGHTS.spikeHistoryPays }, (_, k) => idx - 1 - k);
    const historyPays = pay.summary.filter((s) => prevIdx.includes(s.period.index) && s.expenseCount > 0).length;

    const ctx = { today: pay.today, anchor: pay.profile.payAnchorDate, cycle: pay.profile.payCycle };
    const activeGoals = goals.filter((g) => g.status === 'active');

    return runRules({
      today: pay.today,
      period: pay.current,
      plans: plan.plans,
      categories: [...names].map((name) => ({ name, thisPay: totalFor(name, idx), previous: prevIdx.map((i) => totalFor(name, i)) })),
      historyPays,
      wantsThisPay: plan.expenses.filter((e) => e.bucket === 'want').map((e) => ({ amount: e.amount, merchant: e.merchant })),
      goals: activeGoals.map((g) => ({
        title: g.title,
        targetDate: g.targetDate,
        // `saved` already includes the starting balance and every contribution.
        projection: projectGoal({ ...g, startingBalance: toea(g.saved) }, [], ctx),
      })),
      lastExpenseDate: lastExpense,
    });
  }, [plan, byCat, goals, lastExpense]);
}
