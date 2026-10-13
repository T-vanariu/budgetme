import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatDay } from '@/lib/dates';
import { formatMoney, toKina } from '@/lib/money';
import type { PeriodSummary } from '@/types/domain';

/** Salary vs side hustle per pay, oldest to newest. */
export function IncomeHistoryChart({ rows }: { rows: PeriodSummary[] }) {
  const data = [...rows].reverse().map((r) => ({
    label: formatDay(r.period.start),
    Salary: toKina(r.salary),
    'Side hustle': toKina(r.side),
    Other: toKina(r.income - r.salary - r.side),
  }));
  const hasOther = data.some((d) => d.Other > 0);
  const kina = (v: number) => formatMoney(Math.round(v * 100), { decimals: 0 });
  return (
    <>
      <div className="h-[220px]" aria-hidden>
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: 'var(--muted)', fontSize: 12 }} />
            <YAxis tickLine={false} axisLine={false} width={56} tick={{ fill: 'var(--muted)', fontSize: 12 }} tickFormatter={kina} />
            <Tooltip
              formatter={(v: number) => kina(v)}
              cursor={{ fill: 'var(--surface2)' }}
              contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text)' }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="Salary" stackId="i" fill="var(--needs)" isAnimationActive={false} />
            <Bar dataKey="Side hustle" stackId="i" fill="var(--wants)" radius={hasOther ? undefined : [4, 4, 0, 0]} isAnimationActive={false} />
            {hasOther && <Bar dataKey="Other" stackId="i" fill="var(--muted)" radius={[4, 4, 0, 0]} isAnimationActive={false} />}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <table className="sr-only">
        <caption>Income per pay</caption>
        <thead>
          <tr><th>Pay starting</th><th>Salary</th><th>Side hustle</th><th>Total</th></tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.period.index}>
              <td>{formatDay(r.period.start)}</td>
              <td>{formatMoney(r.salary)}</td>
              <td>{formatMoney(r.side)}</td>
              <td>{formatMoney(r.income)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
