import { Trash2, Wallet } from 'lucide-react';
import { PageHeader } from '@/app/AppShell';
import { FullPageSpinner } from '@/app/guards';
import { Card, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/EmptyState';
import { toast } from '@/components/ui/sonner';
import { useAddIncome, useDeleteIncome, useIncomeList, useIncomeSources } from '@/data/income';
import { usePay } from '@/data/summary';
import { UNDO_WINDOW_MS } from '@/config/limits';
import { formatDay } from '@/lib/dates';
import { groupByPeriod, rangeToDates } from '@/lib/history';
import { formatMoney } from '@/lib/money';
import { periodLabel } from '@/lib/periods';
import { RangeChips, rangeDescription, useRangeParam } from '../transactions/RangeChips';
import { SummaryTiles } from '../transactions/SummaryTiles';
import { IncomeForm } from './IncomeForm';
import { IncomeHistoryChart } from './IncomeHistoryChart';
import { PayCycleCard } from './PayCycleCard';
import { SideAllocationCard } from './SideAllocationCard';

export default function IncomePage() {
  const pay = usePay();
  const { data: sources } = useIncomeSources();
  const [range, setRange] = useRangeParam('last_3');
  const dates = pay ? rangeToDates(range, pay.periods) : { from: '1900-01-01', to: '1900-01-01' };
  const list = useIncomeList(dates.from, dates.to);
  const del = useDeleteIncome();
  const add = useAddIncome();

  if (!pay || !sources) return <FullPageSpinner />;

  // Ranges are whole pays, so per-pay totals come straight from v_period_summary.
  const inRange = pay.summary.filter((s) => s.period.start >= dates.from && s.period.end <= dates.to && s.income > 0);
  const total = inRange.reduce((a, s) => a + s.income, 0);
  const side = inRange.reduce((a, s) => a + s.side, 0);
  const rows = list.data?.pages.flat() ?? [];
  const groups = groupByPeriod(rows, pay.periods, (r) => r.received_on);
  const salarySource = sources.find((s) => s.kind === 'salary');

  const remove = async (id: string) => {
    try {
      const removed = await del.mutateAsync(id);
      toast.success(`Deleted ${formatMoney(removed.amount)} income`, {
        duration: UNDO_WINDOW_MS,
        undo: () => add.mutate(removed, { onSuccess: () => toast.success('Restored') }),
      });
    } catch {
      toast.error("Couldn't delete. Try again.");
    }
  };

  return (
    <>
      <PageHeader title="Income" subtitle="Salary, side hustle and how they're split" />
      <div className="grid gap-[10px] md:gap-4 xl:grid-cols-12">
        <Card className="xl:col-span-7">
          <CardHeader title="Log income" subtitle={`This pay: ${periodLabel(pay.current)}`} />
          <IncomeForm sources={sources} today={pay.today} />
        </Card>
        <Card className="xl:col-span-5">
          <CardHeader title="Side-hustle allocation" subtitle="Where side income goes" />
          <SideAllocationCard current={pay.profile.side} salarySplit={pay.profile.split} />
        </Card>
        <Card className="xl:col-span-12">
          <CardHeader title="Pay cycle" subtitle="When you get paid" />
          <PayCycleCard profile={pay.profile} salary={salarySource} />
        </Card>

        <section className="grid gap-[10px] md:gap-4 xl:col-span-12" aria-labelledby="income-history">
          <h2 id="income-history" className="text-xl font-semibold">Income history</h2>
          <Card>
            <RangeChips range={range} onChange={setRange} periods={pay.periods} />
          </Card>
          <SummaryTiles
            tiles={[
              { label: 'Total', value: formatMoney(total, { decimals: 0 }) },
              { label: 'Average per pay', value: formatMoney(inRange.length ? Math.round(total / inRange.length) : 0, { decimals: 0 }) },
              { label: 'Side-hustle share', value: total ? `${Math.round((side / total) * 100)}%` : '—', hint: formatMoney(side, { decimals: 0 }) },
              { label: 'Pay periods', value: String(inRange.length) },
            ]}
          />
          {inRange.length > 0 && (
            <Card>
              <CardHeader title="Salary vs side hustle" subtitle="Per pay" />
              <IncomeHistoryChart rows={inRange} />
            </Card>
          )}
          <Card>
            {list.isLoading ? (
              <p className="py-6 text-center text-sm text-muted" role="status">Loading…</p>
            ) : groups.length === 0 ? (
              <EmptyState icon={<Wallet />} message={`No income logged in ${rangeDescription(range, pay.periods)}.`} />
            ) : (
              <div className="grid gap-4">
                {groups.map((g) => {
                  const sum = pay.summary.find((s) => s.period.index === g.period.index);
                  return (
                    <section key={g.period.index} aria-label={`Pay ${periodLabel(g.period)}`}>
                      <header className="flex items-baseline justify-between border-b border-border pb-1.5">
                        <h3 className="text-sm font-semibold">{periodLabel(g.period)}</h3>
                        <span className="num text-sm text-muted">{sum ? formatMoney(sum.income) : ''}</span>
                      </header>
                      <ul className="divide-y divide-border">
                        {g.rows.map((r) => (
                          <li key={r.id} className="flex items-center gap-3 py-2.5">
                            <span className="w-12 shrink-0 text-xs text-muted">{formatDay(r.received_on)}</span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-semibold">{r.source_name}</p>
                              {r.note && <p className="truncate text-xs text-muted">{r.note}</p>}
                            </div>
                            <Badge tone={r.kind === 'salary' ? 'info' : 'wants'}>{r.kind === 'salary' ? 'Salary' : r.kind === 'side_hustle' ? 'Side' : 'Other'}</Badge>
                            <span className="num shrink-0 font-semibold">{formatMoney(r.amount)}</span>
                            <Button variant="ghost" size="icon" aria-label={`Delete ${r.source_name} ${formatMoney(r.amount)}`} onClick={() => void remove(r.id)}>
                              <Trash2 />
                            </Button>
                          </li>
                        ))}
                      </ul>
                    </section>
                  );
                })}
                {list.hasNextPage && (
                  <Button variant="outline" onClick={() => void list.fetchNextPage()} disabled={list.isFetchingNextPage}>
                    {list.isFetchingNextPage ? 'Loading…' : 'Show more'}
                  </Button>
                )}
              </div>
            )}
          </Card>
        </section>
      </div>
    </>
  );
}
