import { useMemo } from 'react';
import { planPeriod } from '@/lib/engine';
import { toea } from '@/types/domain';
import { usePeriodExpenses } from './expenses';
import { useIncomeSources } from './income';
import { usePay } from './summary';

/**
 * This pay's plan. Uses logged salary when there is any, otherwise the salary source's
 * expected amount (flagged so the UI can say "expected").
 */
export function useCurrentPlan() {
  const pay = usePay();
  const { data: sources } = useIncomeSources();
  const { data: expenses } = usePeriodExpenses(pay?.current);
  return useMemo(() => {
    if (!pay || !sources || !expenses) return null;
    const loggedSalary = pay.currentSummary?.salary ?? 0;
    const expected = sources.find((s) => s.kind === 'salary')?.expectedAmount ?? 0;
    const salary = toea(loggedSalary > 0 ? loggedSalary : expected);
    const side = toea(pay.currentSummary?.side ?? 0);
    const plans = planPeriod({
      salary,
      side,
      split: pay.profile.split,
      sideAllocation: pay.profile.side,
      expenses: expenses.map((e) => ({ amount: toea(e.amount), bucket: e.bucket, deletedAt: e.deleted_at })),
    });
    const planned = plans.reduce((a, p) => a + p.planned, 0);
    const spent = plans.reduce((a, p) => a + p.spent, 0);
    return {
      pay,
      plans,
      salary,
      side,
      salaryIsExpected: loggedSalary === 0 && expected > 0,
      expenses,
      totals: { planned, spent, left: planned - spent, income: pay.currentSummary?.income ?? 0 },
    };
  }, [pay, sources, expenses]);
}
