import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ReceiptText, Search } from 'lucide-react';
import { PageHeader } from '@/app/AppShell';
import { FullPageSpinner } from '@/app/guards';
import { useLogSheet } from '@/app/log-context';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { EmptyState } from '@/components/EmptyState';
import { toast } from '@/components/ui/sonner';
import { useExpenseList, useExpenseStats, useSetExpenseDeleted, type ExpenseFilter } from '@/data/expenses';
import { usePay } from '@/data/summary';
import { groupByPeriod, rangeToDates } from '@/lib/history';
import { formatMoney } from '@/lib/money';
import { periodLabel } from '@/lib/periods';
import { UNDO_WINDOW_MS } from '@/config/limits';
import { BUCKET_LABEL, type Bucket } from '@/types/domain';
import type { ExpenseListRow } from '@/types/db';
import { EditExpenseSheet } from '../log-sheet/EditExpenseSheet';
import { RangeChips, rangeDescription, useRangeParam } from './RangeChips';
import { SummaryTiles } from './SummaryTiles';
import { TransactionRow } from './TransactionRow';

const BUCKET_OPTIONS: { id: 'all' | Bucket; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'need', label: 'Needs' },
  { id: 'want', label: 'Wants' },
  { id: 'savings', label: 'Savings + debt' },
];

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export default function TransactionsPage() {
  const pay = usePay();
  const { openLog } = useLogSheet();
  const [range, setRange] = useRangeParam('this_pay');
  const [params, setParams] = useSearchParams();
  const bucket = (['need', 'want', 'savings'].includes(params.get('bucket') ?? '') ? params.get('bucket') : null) as Bucket | null;
  const [q, setQ] = useState(params.get('q') ?? '');
  const debouncedQ = useDebounced(q, 250);
  const [editing, setEditing] = useState<ExpenseListRow | null>(null);
  const setDeleted = useSetExpenseDeleted();

  useEffect(() => {
    setParams(
      (p) => {
        const next = new URLSearchParams(p);
        if (debouncedQ.trim()) next.set('q', debouncedQ.trim());
        else next.delete('q');
        return next;
      },
      { replace: true },
    );
  }, [debouncedQ, setParams]);

  const filter: ExpenseFilter | null = useMemo(() => {
    if (!pay) return null;
    return { ...rangeToDates(range, pay.periods), bucket, q: debouncedQ };
  }, [pay, range, bucket, debouncedQ]);

  const list = useExpenseList(filter ?? { from: '1900-01-01', to: '1900-01-01', bucket: null, q: '' });
  const stats = useExpenseStats(filter ?? { from: '1900-01-01', to: '1900-01-01', bucket: null, q: '' });

  if (!pay || !filter) return <FullPageSpinner />;

  const rows = list.data?.pages.flat() ?? [];
  const groups = groupByPeriod(rows, pay.periods, (r) => r.spent_on);
  const s = stats.data;

  const remove = async (row: ExpenseListRow) => {
    try {
      await setDeleted.mutateAsync({ id: row.id, deleted: true });
      toast.success(`Deleted ${formatMoney(row.amount)} · ${row.merchant || row.category_name}`, {
        duration: UNDO_WINDOW_MS,
        undo: () => {
          setDeleted.mutate({ id: row.id, deleted: false }, { onSuccess: () => toast.success('Restored') });
        },
      });
    } catch {
      toast.error("Couldn't delete. Try again.");
    }
  };

  const setBucket = (b: string) =>
    setParams(
      (p) => {
        const next = new URLSearchParams(p);
        if (b && b !== 'all') next.set('bucket', b);
        else next.delete('bucket');
        return next;
      },
      { replace: true },
    );

  const emptyMessage = (() => {
    const where = rangeDescription(range, pay.periods);
    const what = bucket ? `${BUCKET_LABEL[bucket]} expenses` : 'expenses';
    if (debouncedQ.trim()) return `No ${what} matching "${debouncedQ.trim()}" in ${where}.`;
    return `No ${what} in ${where}.`;
  })();

  return (
    <>
      <PageHeader title="Transactions" subtitle="Every expense, grouped by pay" />
      <div className="grid gap-[10px] md:gap-4">
        <Card className="grid gap-3">
          <RangeChips range={range} onChange={setRange} periods={pay.periods} />
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <ToggleGroup type="single" aria-label="Bucket" value={bucket ?? 'all'} onValueChange={(v) => setBucket(v || 'all')}>
              {BUCKET_OPTIONS.map((b) => (
                <ToggleGroupItem key={b.id} value={b.id}>
                  {b.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            <div className="relative md:ml-auto md:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
              <Input type="search" aria-label="Search merchant or category" placeholder="Search merchant or category" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
            </div>
          </div>
        </Card>

        <SummaryTiles
          tiles={[
            { label: 'Total', value: s ? formatMoney(s.total, { decimals: 0 }) : '…' },
            { label: 'Average per pay', value: s ? formatMoney(s.averagePerPay, { decimals: 0 }) : '…', hint: s ? `over ${s.paysWithEntries} pay${s.paysWithEntries === 1 ? '' : 's'}` : undefined },
            { label: 'Entries', value: s ? String(s.count) : '…' },
            { label: 'Biggest category', value: s?.topCategory?.name ?? '—', hint: s?.topCategory ? formatMoney(s.topCategory.total, { decimals: 0 }) : undefined },
          ]}
        />

        <Card>
          {list.isLoading ? (
            <p className="py-6 text-center text-sm text-muted" role="status">Loading…</p>
          ) : list.isError ? (
            <p role="alert" className="py-6 text-center text-sm text-over">Couldn't load transactions. Pull to refresh or try again.</p>
          ) : groups.length === 0 ? (
            <EmptyState icon={<ReceiptText />} message={emptyMessage} action={!debouncedQ && !bucket ? <Button size="sm" onClick={() => openLog()}>Log an expense</Button> : undefined} />
          ) : (
            <div className="grid gap-4">
              {groups.map((g) => {
                const sub = s?.byPeriod.get(g.period.index);
                return (
                  <section key={g.period.index} aria-label={`Pay ${periodLabel(g.period)}`}>
                    <header className="flex items-baseline justify-between border-b border-border pb-1.5">
                      <h3 className="text-sm font-semibold">
                        {periodLabel(g.period)}
                        {g.period.index === pay.current.index && <span className="ml-2 text-xs font-normal text-muted">this pay</span>}
                      </h3>
                      <span className="num text-sm text-muted">
                        {sub ? `${sub.count} · ${formatMoney(sub.total)}` : ''}
                      </span>
                    </header>
                    <ul className="divide-y divide-border">
                      {g.rows.map((r) => (
                        <TransactionRow key={r.id} row={r} onEdit={() => setEditing(r)} onDelete={() => void remove(r)} />
                      ))}
                    </ul>
                  </section>
                );
              })}
              {list.hasNextPage && (
                <Button variant="outline" onClick={() => void list.fetchNextPage()} disabled={list.isFetchingNextPage}>
                  {list.isFetchingNextPage ? 'Loading…' : `Show more (${rows.length} of ${s?.count ?? '…'})`}
                </Button>
              )}
            </div>
          )}
        </Card>
      </div>
      <EditExpenseSheet row={editing} onClose={() => setEditing(null)} />
    </>
  );
}
