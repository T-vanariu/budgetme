import { useNavigate } from 'react-router-dom';
import { History } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/EmptyState';
import { formatMoney } from '@/lib/money';
import { periodLabel } from '@/lib/periods';
import { cn } from '@/lib/utils';
import type { PeriodSummary } from '@/types/domain';

export function historyTotals(rows: PeriodSummary[]) {
  return rows.reduce(
    (a, r) => ({ income: a.income + r.income, spent: a.spent + r.spent, saved: a.saved + r.spentSavings, leftOver: a.leftOver + r.leftOver }),
    { income: 0, spent: 0, saved: 0, leftOver: 0 },
  );
}

export function HistoryTotals({ rows }: { rows: PeriodSummary[] }) {
  const t = historyTotals(rows);
  return (
    <div className="flex flex-wrap gap-2" aria-label="Totals across all pays">
      <Badge tone="neutral" className="num">Income {formatMoney(t.income, { decimals: 0 })}</Badge>
      <Badge tone="info" className="num">Spent {formatMoney(t.spent, { decimals: 0 })}</Badge>
      <Badge tone="good" className="num">Saved {formatMoney(t.saved, { decimals: 0 })}</Badge>
      <Badge tone={t.leftOver < 0 ? 'warn' : 'neutral'} className="num">Left over {formatMoney(t.leftOver, { decimals: 0 })}</Badge>
    </div>
  );
}

/** One row per pay with data, newest first. View drills into that pay's transactions. */
export function OverallHistoryTable({ rows, currentIndex }: { rows: PeriodSummary[]; currentIndex: number }) {
  const navigate = useNavigate();
  if (!rows.length) return <EmptyState icon={<History />} message="Your pay history appears here once you log income or expenses." />;
  return (
    <div className="grid gap-3">
      <HistoryTotals rows={rows} />
      <div className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
        <table className="num w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
              <th scope="col" className="py-2 pr-3 font-semibold">Pay</th>
              <th scope="col" className="py-2 pr-3 text-right font-semibold">Income</th>
              <th scope="col" className="py-2 pr-3 text-right font-semibold">Spent</th>
              <th scope="col" className="py-2 pr-3 text-right font-semibold">Saved</th>
              <th scope="col" className="py-2 pr-3 text-right font-semibold">Left over</th>
              <th scope="col" className="py-2"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.period.index} className="border-b border-border last:border-0">
                <th scope="row" className="py-2 pr-3 text-left font-semibold">
                  {periodLabel(r.period)}
                  {r.period.index === currentIndex && <Badge tone="info" className="ml-2">This pay</Badge>}
                </th>
                <td className="py-2 pr-3 text-right">{formatMoney(r.income)}</td>
                <td className="py-2 pr-3 text-right">{formatMoney(r.spent)}</td>
                <td className="py-2 pr-3 text-right">{formatMoney(r.spentSavings)}</td>
                <td className={cn('py-2 pr-3 text-right font-semibold', r.leftOver < 0 && 'text-over')}>{formatMoney(r.leftOver)}</td>
                <td className="py-1 text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    aria-label={`View transactions for ${periodLabel(r.period)}`}
                    onClick={() => navigate(`/app/transactions?period=${r.period.index}`)}
                  >
                    View
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
