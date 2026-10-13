// Pure maths for the advisor tools. Mirrors src/lib/{money,periods,engine}.ts in the web app.

export type Cycle = 'weekly' | 'fortnightly' | 'monthly';
export type Split = [number, number, number];

const DAY = 86_400_000;
const parse = (d: string) => {
  const [y, m, day] = d.split('-').map(Number);
  return Date.UTC(y, m - 1, day);
};
const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const addDays = (d: string, n: number) => iso(parse(d) + n * DAY);
const diffDays = (a: string, b: string) => Math.round((parse(a) - parse(b)) / DAY);

function addMonths(d: string, n: number): string {
  const [y, m, day] = d.split('-').map(Number);
  const total = y * 12 + (m - 1) + n;
  const ny = Math.floor(total / 12);
  const nm = total - ny * 12;
  const dim = new Date(Date.UTC(ny, nm + 1, 0)).getUTCDate();
  return iso(Date.UTC(ny, nm, Math.min(day, dim)));
}

export function periodStart(i: number, anchor: string, cycle: Cycle): string {
  if (cycle === 'monthly') return addMonths(anchor, i);
  return addDays(anchor, i * (cycle === 'weekly' ? 7 : 14));
}

export function periodIndex(date: string, anchor: string, cycle: Cycle): number {
  if (cycle !== 'monthly') return Math.floor(diffDays(date, anchor) / (cycle === 'weekly' ? 7 : 14));
  const [y, m] = date.split('-').map(Number);
  const [ay, am] = anchor.split('-').map(Number);
  let i = (y - ay) * 12 + (m - am);
  if (date < periodStart(i, anchor, cycle)) i -= 1;
  return i;
}

export const periodEnd = (i: number, anchor: string, cycle: Cycle) => addDays(periodStart(i + 1, anchor, cycle), -1);

export function allocate(amount: number, weights: readonly number[]): number[] {
  const total = weights.reduce((a, b) => a + b, 0);
  if (total <= 0 || amount === 0) return weights.map(() => 0);
  const raw = weights.map((w) => (amount * w) / total);
  const parts = raw.map(Math.floor);
  let rest = amount - parts.reduce((a, b) => a + b, 0);
  const order = raw.map((r, i) => ({ i, f: r - Math.floor(r) })).sort((a, b) => b.f - a.f || a.i - b.i);
  for (const { i } of order) {
    if (rest <= 0) break;
    parts[i] += 1;
    rest -= 1;
  }
  return parts;
}

export interface PlanSettings {
  split: Split;
  sideMode: 'same' | 'savings' | 'custom';
  sideSplit: Split | null;
}

export function sideSplitFor(p: PlanSettings): Split {
  if (p.sideMode === 'savings') return [0, 0, 100];
  if (p.sideMode === 'custom' && p.sideSplit && p.sideSplit.reduce((a, b) => a + b, 0) === 100) return p.sideSplit;
  return p.split;
}

/** Planned toea per bucket [need, want, savings]. */
export function planned(salary: number, side: number, p: PlanSettings): Split {
  const a = allocate(salary, p.split);
  const b = allocate(side, sideSplitFor(p));
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

/** Toea to kina rounded to 2 decimals (responses only). */
export const kina = (t: number | string) => Math.round(Number(t)) / 100;

export const todayISO = () => iso(Date.now());
