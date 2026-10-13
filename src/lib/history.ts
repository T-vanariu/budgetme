import type { HistoryRange, PayPeriod } from '@/types/domain';

/**
 * Date bounds for a history range. `periods` is newest first, `periods[0]` is the current pay,
 * and the list reaches back to the oldest pay with data.
 */
export function rangeToDates(range: HistoryRange, periods: PayPeriod[]): { from: string; to: string } {
  if (periods.length === 0) throw new Error('rangeToDates needs at least the current period');
  const cur = periods[0];
  if (typeof range === 'object') {
    const p = periods.find((x) => x.index === range.period) ?? cur;
    return { from: p.start, to: p.end };
  }
  switch (range) {
    case 'this_pay':
      return { from: cur.start, to: cur.end };
    case 'last_pay': {
      const p = periods[1] ?? cur;
      return { from: p.start, to: p.end };
    }
    case 'last_3':
      return { from: periods[Math.min(2, periods.length - 1)].start, to: cur.end };
    case 'all':
      return { from: periods[periods.length - 1].start, to: cur.end };
  }
}

export function rangeKey(r: HistoryRange): string {
  return typeof r === 'object' ? `p${r.period}` : r;
}

export function findPeriod(date: string, periods: PayPeriod[]): PayPeriod | undefined {
  return periods.find((p) => p.start <= date && date <= p.end);
}

/** Group rows into pay periods, newest first, dropping empty periods. Rows outside every period are dropped. */
export function groupByPeriod<T>(rows: T[], periods: PayPeriod[], getDate: (r: T) => string): { period: PayPeriod; rows: T[] }[] {
  const map = new Map<number, T[]>();
  for (const r of rows) {
    const p = findPeriod(getDate(r), periods);
    if (!p) continue;
    const list = map.get(p.index) ?? [];
    list.push(r);
    map.set(p.index, list);
  }
  return periods.filter((p) => map.has(p.index)).map((p) => ({ period: p, rows: map.get(p.index)! }));
}

export interface HistorySummary {
  total: number;
  /** Divides by pays that have entries, not by calendar pays. */
  averagePerPay: number;
  count: number;
  paysWithEntries: number;
  topCategory: { name: string; total: number } | null;
}

export function summarise<T>(
  rows: T[],
  periods: PayPeriod[],
  get: { amount: (r: T) => number; date: (r: T) => string; category?: (r: T) => string },
): HistorySummary {
  const total = rows.reduce((a, r) => a + get.amount(r), 0);
  const pays = new Set<number>();
  const cats = new Map<string, number>();
  for (const r of rows) {
    const p = findPeriod(get.date(r), periods);
    if (p) pays.add(p.index);
    if (get.category) cats.set(get.category(r), (cats.get(get.category(r)) ?? 0) + get.amount(r));
  }
  let topCategory: HistorySummary['topCategory'] = null;
  for (const [name, t] of cats) if (!topCategory || t > topCategory.total) topCategory = { name, total: t };
  return {
    total,
    count: rows.length,
    paysWithEntries: pays.size,
    averagePerPay: pays.size ? Math.round(total / pays.size) : 0,
    topCategory,
  };
}
