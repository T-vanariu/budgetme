/** ISO date helpers. All maths in UTC on `YYYY-MM-DD` strings so timezones never shift a day. */
const DAY = 86_400_000;

export function parseISO(d: string): number {
  const [y, m, day] = d.split('-').map(Number);
  return Date.UTC(y, m - 1, day);
}
export function toISO(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}
export function addDays(d: string, n: number): string {
  return toISO(parseISO(d) + n * DAY);
}
/** a − b in whole days. */
export function diffDays(a: string, b: string): number {
  return Math.round((parseISO(a) - parseISO(b)) / DAY);
}
export function daysInMonth(year: number, month0: number): number {
  return new Date(Date.UTC(year, month0 + 1, 0)).getUTCDate();
}
/** Add months, clamping the day to the end of the target month (same rule as Postgres `date + interval`). */
export function addMonths(d: string, n: number): string {
  const [y, m, day] = d.split('-').map(Number);
  const total = y * 12 + (m - 1) + n;
  const ny = Math.floor(total / 12);
  const nm = total - ny * 12;
  return toISO(Date.UTC(ny, nm, Math.min(day, daysInMonth(ny, nm))));
}
/** Today in the user's local timezone. */
export function todayISO(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export function formatDay(d: string): string {
  const [, m, day] = d.split('-').map(Number);
  return `${day} ${MONTHS[m - 1]}`;
}
export function formatDayYear(d: string): string {
  return `${formatDay(d)} ${d.slice(0, 4)}`;
}
export const isISODate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && toISO(parseISO(s)) === s;
