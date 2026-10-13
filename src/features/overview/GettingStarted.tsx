import { Link } from 'react-router-dom';
import { CheckCircle2, Circle } from 'lucide-react';
import { useLogSheet } from '@/app/log-context';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/** 3-step card for new accounts. Disappears once all steps are done. */
export function GettingStarted({ hasSalary, hasExpense, hasGoal }: { hasSalary: boolean; hasExpense: boolean; hasGoal: boolean }) {
  const { openLog } = useLogSheet();
  if (hasSalary && hasExpense && hasGoal) return null;
  const steps = [
    { done: hasSalary, title: 'Add your salary', action: <Button asChild size="sm"><Link to="/app/income">Add salary</Link></Button> },
    { done: hasExpense, title: 'Log your first expense', action: <Button size="sm" onClick={() => openLog()}>Log expense</Button> },
    { done: hasGoal, title: 'Set a goal', action: <Button asChild size="sm"><Link to="/app/plan#goals">New goal</Link></Button> },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  return (
    <section className="card" aria-labelledby="gs-title">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 id="gs-title" className="text-base font-semibold">Getting started</h2>
        <span className="text-sm text-muted">{doneCount} of 3 done</span>
      </div>
      <ol className="grid gap-2 md:grid-cols-3">
        {steps.map((s, i) => (
          <li key={s.title} className={cn('flex items-center gap-3 rounded-ctl border border-border bg-surface2 p-3', s.done && 'opacity-70')}>
            {s.done ? <CheckCircle2 className="size-5 shrink-0 text-save" aria-hidden /> : <Circle className="size-5 shrink-0 text-muted" aria-hidden />}
            <span className="min-w-0 flex-1 text-sm font-semibold">
              {i + 1}. {s.title}
              {s.done && <span className="sr-only"> (done)</span>}
            </span>
            {!s.done && s.action}
          </li>
        ))}
      </ol>
    </section>
  );
}
