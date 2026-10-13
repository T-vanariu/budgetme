import { Link } from 'react-router-dom';
import { Lightbulb, Target } from 'lucide-react';
import { PageHeader } from '@/app/AppShell';
import { FullPageSpinner } from '@/app/guards';
import { Card, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/EmptyState';
import { useCurrentPlan } from '@/data/plan';
import { useInsights } from '@/data/insights';
import { useGoals } from '@/data/goals';
import { useCategoryByPeriod } from '@/data/summary';
import { useIncomeSources } from '@/data/income';
import { useLastExpenseDate } from '@/data/expenses';
import { rankInsights } from '@/lib/rules';
import { elapsedPct, periodLabel } from '@/lib/periods';
import { formatMoney } from '@/lib/money';
import { StatCard } from './StatCard';
import { BucketBar } from './BucketBar';
import { SpendDonut } from './SpendDonut';
import { PayTrendChart } from './PayTrendChart';
import { GettingStarted } from './GettingStarted';
import { OverallHistoryTable } from './OverallHistoryTable';
import { GoalRing } from '../plan/GoalRing';
import { RuleRow } from '../insights/RuleRow';

export default function OverviewPage() {
  const plan = useCurrentPlan();
  const insights = useInsights();
  const { data: goals } = useGoals();
  const { data: sources } = useIncomeSources();
  const { data: lastExpense } = useLastExpenseDate();
  const { data: byCat } = useCategoryByPeriod(plan?.pay.current.index);

  if (!plan) return <FullPageSpinner />;
  const { pay, plans, totals } = plan;
  const elapsed = elapsedPct(pay.current);
  const hasSalary = pay.summary.some((s) => s.salary > 0) || Boolean(sources?.some((s) => s.kind === 'salary' && s.expectedAmount));
  const activeGoals = (goals ?? []).filter((g) => g.status !== 'paused');
  const slices = (byCat ?? [])
    .filter((r) => r.period_index === pay.current.index)
    .map((r) => ({ name: r.category_name, bucket: r.bucket, total: r.total }));
  const savedThisPay = plans.find((p) => p.bucket === 'savings')?.spent ?? 0;
  const topInsights = insights ? rankInsights(insights).filter((r) => r.fired).slice(0, 3) : [];
  const name = pay.profile.displayName.split(' ')[0];

  return (
    <>
      <PageHeader
        title={name ? `Hi, ${name}` : 'Overview'}
        subtitle={`${periodLabel(pay.current)} · day ${pay.current.dayOf} of ${pay.current.days}`}
      />
      <div className="grid grid-cols-2 gap-[10px] md:gap-4 xl:grid-cols-12">
        <div className="col-span-2 xl:col-span-12">
          <GettingStarted hasSalary={hasSalary} hasExpense={Boolean(lastExpense)} hasGoal={(goals?.length ?? 0) > 0} />
        </div>

        <div className="col-span-1 xl:col-span-3">
          <StatCard
            label="Income this pay"
            value={formatMoney(totals.income || plan.salary, { decimals: 0 })}
            hint={totals.income ? 'logged' : plan.salaryIsExpected ? 'expected salary' : 'nothing logged yet'}
          />
        </div>
        <div className="col-span-1 xl:col-span-3">
          <StatCard label="Spent" value={formatMoney(totals.spent, { decimals: 0 })} hint={`${plan.expenses.length} entries`} />
        </div>
        <div className="col-span-1 xl:col-span-3">
          <StatCard
            label="Left to spend"
            value={formatMoney(totals.left, { decimals: 0 })}
            tone={totals.left < 0 ? 'over' : undefined}
            hint={totals.left < 0 ? 'over budget' : `${pay.current.days - pay.current.dayOf} days to go`}
          />
        </div>
        <div className="col-span-1 xl:col-span-3">
          <StatCard label="Saved this pay" value={formatMoney(savedThisPay, { decimals: 0 })} tone="save" hint="savings + debt moved" />
        </div>

        <Card className="col-span-2 xl:col-span-7">
          <CardHeader
            title="This pay's split"
            subtitle={`${pay.profile.split.join(' / ')} · the tick shows ${elapsed}% of the pay gone`}
            action={<Button asChild variant="outline" size="sm"><Link to="/app/plan">Adjust</Link></Button>}
          />
          {totals.planned > 0 ? (
            <div className="grid gap-4">
              {plans.map((p) => (
                <BucketBar key={p.bucket} plan={p} elapsed={elapsed} />
              ))}
            </div>
          ) : (
            <EmptyState message="Add your salary to see how much each bucket gets." action={<Button asChild size="sm"><Link to="/app/income">Add salary</Link></Button>} />
          )}
        </Card>

        <Card className="col-span-2 xl:col-span-5">
          <CardHeader title="Where it went" subtitle="This pay, by category" />
          <SpendDonut slices={slices} />
        </Card>

        <Card className="col-span-2 xl:col-span-7">
          <CardHeader title="Last 6 pays" subtitle="Spend by bucket against income" />
          <PayTrendChart rows={pay.summary} />
        </Card>

        <Card className="col-span-2 xl:col-span-5">
          <CardHeader title="Goals" action={<Button asChild variant="outline" size="sm"><Link to="/app/plan#goals">All goals</Link></Button>} />
          {activeGoals.length ? (
            <ul className="grid gap-3">
              {activeGoals.slice(0, 3).map((g) => (
                <li key={g.id} className="flex items-center gap-3">
                  <GoalRing pct={Math.round((g.saved / g.targetAmount) * 100)} size={56} />
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{g.title}</p>
                    <p className="num text-sm text-muted">
                      {formatMoney(g.saved, { decimals: 0 })} of {formatMoney(g.targetAmount, { decimals: 0 })}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={<Target />} message="No goals yet. Saving for something? Set a target." action={<Button asChild size="sm"><Link to="/app/plan#goals">New goal</Link></Button>} />
          )}
        </Card>

        <Card className="col-span-2 xl:col-span-12">
          <CardHeader title="Top insights" action={<Button asChild variant="outline" size="sm"><Link to="/app/insights">All insights</Link></Button>} />
          {topInsights.length ? (
            <ul className="divide-y divide-border">
              {topInsights.map((r) => (
                <RuleRow key={r.id} rule={r} />
              ))}
            </ul>
          ) : (
            <EmptyState icon={<Lightbulb />} message="Nothing to flag right now. Insights appear as your pays fill in." />
          )}
        </Card>

        <Card className="col-span-2 xl:col-span-12">
          <CardHeader title="Overall history" subtitle="One row per pay, newest first" />
          <OverallHistoryTable rows={pay.summary} currentIndex={pay.current.index} />
        </Card>
      </div>
    </>
  );
}
