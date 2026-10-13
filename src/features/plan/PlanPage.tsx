import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Plus, Target } from 'lucide-react';
import { PageHeader } from '@/app/AppShell';
import { FullPageSpinner } from '@/app/guards';
import { Card, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/EmptyState';
import { toast } from '@/components/ui/sonner';
import { useCurrentPlan } from '@/data/plan';
import { useAddGoal, useGoals } from '@/data/goals';
import { splitColumns, useUpdateProfile } from '@/data/profile';
import { SplitEditor } from './SplitEditor';
import { PlanSummary } from './PlanSummary';
import { GoalCard } from './GoalCard';
import { GoalForm } from './GoalForm';

export default function PlanPage() {
  const plan = useCurrentPlan();
  const { data: goals } = useGoals();
  const updateProfile = useUpdateProfile();
  const addGoal = useAddGoal();
  const location = useLocation();
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (location.hash === '#goals') document.getElementById('goals')?.scrollIntoView({ behavior: 'smooth' });
  }, [location.hash, plan]);

  if (!plan) return <FullPageSpinner />;
  const ctx = { today: plan.pay.today, anchor: plan.pay.profile.payAnchorDate, cycle: plan.pay.profile.payCycle };

  return (
    <>
      <PageHeader title="Budgets & Goals" subtitle="How each pay is split, and what it's working toward" />
      <div className="grid gap-[10px] md:gap-4 xl:grid-cols-12">
        <Card className="xl:col-span-5">
          <CardHeader title="Your split" subtitle="Needs / Wants / Savings + debt. Must total 100%." />
          <SplitEditor
            current={plan.pay.profile.split}
            onApply={async (s) => {
              try {
                await updateProfile.mutateAsync(splitColumns(s));
                toast.success(`Split set to ${s.join(' / ')}`);
              } catch {
                toast.error("Couldn't save the split. Try again.");
              }
            }}
          />
        </Card>
        <Card className="xl:col-span-7">
          <CardHeader title="This pay's plan" subtitle="Planned per bucket, by income source" />
          <PlanSummary plans={plan.plans} salaryIsExpected={plan.salaryIsExpected} />
        </Card>

        <section id="goals" aria-labelledby="goals-title" className="grid scroll-mt-4 gap-[10px] md:gap-4 xl:col-span-12">
          <div className="flex items-center justify-between">
            <h2 id="goals-title" className="text-xl font-semibold">Goals</h2>
            {!creating && (
              <Button onClick={() => setCreating(true)}>
                <Plus aria-hidden /> New goal
              </Button>
            )}
          </div>
          {creating && (
            <Card>
              <CardHeader title="New goal" />
              <GoalForm
                ctx={ctx}
                onCancel={() => setCreating(false)}
                onSubmit={async (g) => {
                  await addGoal.mutateAsync(g);
                  toast.success(`Goal "${g.title}" created`);
                  setCreating(false);
                }}
              />
            </Card>
          )}
          {goals && goals.length > 0 ? (
            <div className="grid gap-[10px] md:grid-cols-2 md:gap-4 xl:grid-cols-3">
              {goals.map((g) => (
                <GoalCard key={g.id} goal={g} ctx={ctx} />
              ))}
            </div>
          ) : (
            !creating && (
              <Card>
                <EmptyState icon={<Target />} message="No goals yet. Start from a quotation or set a target by hand." action={<Button size="sm" onClick={() => setCreating(true)}>New goal</Button>} />
              </Card>
            )
          )}
        </section>
      </div>
    </>
  );
}
