import { groupByPeriod, rangeToDates, summarise } from './history';
import { listPeriods } from './periods';

const periods = listPeriods(0, 5, '2026-07-08', 'fortnightly'); // newest first, [0] = 16 – 29 Sep

describe('rangeToDates', () => {
  it('this pay / last pay', () => {
    expect(rangeToDates('this_pay', periods)).toEqual({ from: '2026-09-16', to: '2026-09-29' });
    expect(rangeToDates('last_pay', periods)).toEqual({ from: '2026-09-02', to: '2026-09-15' });
  });
  it('last 3 pays and all history', () => {
    expect(rangeToDates('last_3', periods)).toEqual({ from: '2026-08-19', to: '2026-09-29' });
    expect(rangeToDates('all', periods)).toEqual({ from: '2026-07-08', to: '2026-09-29' });
  });
  it('one specific pay', () => {
    expect(rangeToDates({ period: 2 }, periods)).toEqual({ from: '2026-08-05', to: '2026-08-18' });
  });
});

const rows = [
  { d: '2026-09-25', a: 1000, c: 'Groceries' },
  { d: '2026-09-24', a: 3000, c: 'Rent' },
  { d: '2026-09-10', a: 500, c: 'Groceries' },
  { d: '2026-07-09', a: 1500, c: 'Groceries' },
  { d: '2025-01-01', a: 9999, c: 'Old' },
];

describe('groupByPeriod', () => {
  it('groups newest first and drops empty pays', () => {
    const g = groupByPeriod(rows, periods, (r) => r.d);
    expect(g.map((x) => [x.period.index, x.rows.length])).toEqual([[5, 2], [4, 1], [0, 1]]);
  });
});

describe('summarise', () => {
  it('averages over pays that have entries', () => {
    const inRange = rows.slice(0, 4);
    const s = summarise(inRange, periods, { amount: (r) => r.a, date: (r) => r.d, category: (r) => r.c });
    expect(s).toEqual({ total: 6000, count: 4, paysWithEntries: 3, averagePerPay: 2000, topCategory: { name: 'Groceries', total: 3000 } });
  });
  it('handles no rows', () => {
    expect(summarise([], periods, { amount: () => 0, date: () => '' })).toMatchObject({ total: 0, averagePerPay: 0, topCategory: null });
  });
});
