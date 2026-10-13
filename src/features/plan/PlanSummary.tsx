import { BUCKET_VAR } from '@/config/buckets';
import { formatMoney } from '@/lib/money';
import { cn } from '@/lib/utils';
import { BUCKET_LABEL, type BucketPlan } from '@/types/domain';

/** This pay's plan by source: salary and side-hustle contributions per bucket. */
export function PlanSummary({ plans, salaryIsExpected }: { plans: BucketPlan[]; salaryIsExpected: boolean }) {
  const sum = (k: keyof Pick<BucketPlan, 'plannedFromSalary' | 'plannedFromSide' | 'planned' | 'spent' | 'left'>) => plans.reduce((a, p) => a + p[k], 0);
  return (
    <div className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
      <table className="num w-full min-w-[480px] text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
            <th scope="col" className="py-2 pr-3 font-semibold">Bucket</th>
            <th scope="col" className="py-2 pr-3 text-right font-semibold">Salary{salaryIsExpected ? ' (expected)' : ''}</th>
            <th scope="col" className="py-2 pr-3 text-right font-semibold">Side hustle</th>
            <th scope="col" className="py-2 pr-3 text-right font-semibold">Planned</th>
            <th scope="col" className="py-2 pr-3 text-right font-semibold">Spent</th>
            <th scope="col" className="py-2 text-right font-semibold">Left</th>
          </tr>
        </thead>
        <tbody>
          {plans.map((p) => (
            <tr key={p.bucket} className="border-b border-border">
              <th scope="row" className="py-2 pr-3 text-left font-semibold">
                <span className="flex items-center gap-2">
                  <span className="size-2.5 rounded-full" style={{ background: BUCKET_VAR[p.bucket] }} aria-hidden />
                  {BUCKET_LABEL[p.bucket]}
                </span>
              </th>
              <td className="py-2 pr-3 text-right">{formatMoney(p.plannedFromSalary)}</td>
              <td className="py-2 pr-3 text-right">{formatMoney(p.plannedFromSide)}</td>
              <td className="py-2 pr-3 text-right font-semibold">{formatMoney(p.planned)}</td>
              <td className="py-2 pr-3 text-right">{formatMoney(p.spent)}</td>
              <td className={cn('py-2 text-right font-semibold', p.left < 0 && 'text-over')}>
                {formatMoney(p.left)}
                {p.left < 0 && <span className="block text-xs font-normal">over budget</span>}
              </td>
            </tr>
          ))}
          <tr className="font-semibold">
            <th scope="row" className="py-2 pr-3 text-left">Total</th>
            <td className="py-2 pr-3 text-right">{formatMoney(sum('plannedFromSalary'))}</td>
            <td className="py-2 pr-3 text-right">{formatMoney(sum('plannedFromSide'))}</td>
            <td className="py-2 pr-3 text-right">{formatMoney(sum('planned'))}</td>
            <td className="py-2 pr-3 text-right">{formatMoney(sum('spent'))}</td>
            <td className={cn('py-2 text-right', sum('left') < 0 && 'text-over')}>{formatMoney(sum('left'))}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
