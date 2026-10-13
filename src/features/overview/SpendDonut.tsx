import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { PieChart as PieIcon } from 'lucide-react';
import { EmptyState } from '@/components/EmptyState';
import { BUCKET_VAR } from '@/config/buckets';
import { formatMoney } from '@/lib/money';
import type { Bucket } from '@/types/domain';

export interface DonutSlice { name: string; bucket: Bucket; total: number }

const ORDER: Record<Bucket, number> = { need: 0, want: 1, savings: 2 };

/** Spend by category this pay. Slices take their bucket colour; the legend carries names and amounts. */
export function SpendDonut({ slices }: { slices: DonutSlice[] }) {
  const data = [...slices].filter((s) => s.total > 0).sort((a, b) => ORDER[a.bucket] - ORDER[b.bucket] || b.total - a.total);
  const total = data.reduce((a, s) => a + s.total, 0);
  if (!data.length) return <EmptyState icon={<PieIcon />} message="Nothing spent this pay yet. Log an expense to see where it goes." />;
  return (
    <div className="grid items-center gap-4 md:grid-cols-[180px_1fr]">
      <div className="relative mx-auto h-[180px] w-[180px]" aria-hidden>
        <ResponsiveContainer>
          <PieChart>
            <Pie data={data} dataKey="total" nameKey="name" innerRadius={58} outerRadius={84} paddingAngle={1.5} stroke="var(--surface)" strokeWidth={2} isAnimationActive={false}>
              {data.map((s) => (
                <Cell key={s.name} fill={BUCKET_VAR[s.bucket]} />
              ))}
            </Pie>
            <Tooltip formatter={(v: number) => formatMoney(v)} contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text)' }} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div>
            <p className="num font-display text-lg font-semibold">{formatMoney(total, { decimals: 0 })}</p>
            <p className="text-xs text-muted">spent</p>
          </div>
        </div>
      </div>
      <ul className="grid gap-1.5 text-sm" aria-label="Spend by category this pay">
        {data.slice(0, 8).map((s) => (
          <li key={s.name} className="flex items-center gap-2">
            <span className="size-2.5 shrink-0 rounded-full" style={{ background: BUCKET_VAR[s.bucket] }} aria-hidden />
            <span className="min-w-0 flex-1 truncate">{s.name}</span>
            <span className="num text-muted">{formatMoney(s.total, { decimals: 0 })}</span>
            <span className="num w-10 text-right text-xs text-muted">{Math.round((s.total / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
