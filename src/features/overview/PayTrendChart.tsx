import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { TrendingUp } from 'lucide-react';
import { EmptyState } from '@/components/EmptyState';
import { formatDay } from '@/lib/dates';
import { formatMoney, toKina } from '@/lib/money';
import type { PeriodSummary } from '@/types/domain';

/** Last 6 pays: stacked spend per bucket with a dashed income line. Needs 2+ pays. */
export function PayTrendChart({ rows }: { rows: PeriodSummary[] }) {
  const recent = rows.slice(0, 6).reverse();
  if (recent.length < 2) return <EmptyState icon={<TrendingUp />} message="Your trend appears after two pays of data." />;
  const data = recent.map((r) => ({
    label: formatDay(r.period.start),
    Needs: toKina(r.spentNeed),
    Wants: toKina(r.spentWant),
    'Savings + debt': toKina(r.spentSavings),
    Income: toKina(r.income),
  }));
  const kina = (v: number) => formatMoney(Math.round(v * 100), { decimals: 0 });
  return (
    <>
      <div className="h-[240px]" aria-hidden>
        <ResponsiveContainer>
          <ComposedChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: 'var(--muted)', fontSize: 12 }} />
            <YAxis tickLine={false} axisLine={false} width={56} tick={{ fill: 'var(--muted)', fontSize: 12 }} tickFormatter={kina} />
            <Tooltip
              formatter={(v: number) => kina(v)}
              cursor={{ fill: 'var(--surface2)' }}
              contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text)' }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="Needs" stackId="s" fill="var(--needs)" isAnimationActive={false} />
            <Bar dataKey="Wants" stackId="s" fill="var(--wants)" isAnimationActive={false} />
            <Bar dataKey="Savings + debt" stackId="s" fill="var(--save)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
            <Line dataKey="Income" stroke="var(--text)" strokeDasharray="5 4" strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <table className="sr-only">
        <caption>Spend and income per pay</caption>
        <thead>
          <tr><th>Pay starting</th><th>Needs</th><th>Wants</th><th>Savings + debt</th><th>Income</th></tr>
        </thead>
        <tbody>
          {recent.map((r) => (
            <tr key={r.period.index}>
              <td>{formatDay(r.period.start)}</td>
              <td>{formatMoney(r.spentNeed)}</td>
              <td>{formatMoney(r.spentWant)}</td>
              <td>{formatMoney(r.spentSavings)}</td>
              <td>{formatMoney(r.income)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
