import { supabase } from '@/lib/supabase';

const PAGE = 1000;

async function fetchAll(table: string, select = '*', order = 'created_at'): Promise<Record<string, unknown>[]> {
  const out: Record<string, unknown>[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase.from(table).select(select).order(order).range(from, from + PAGE - 1);
    if (error) throw error;
    out.push(...((data ?? []) as unknown as Record<string, unknown>[]));
    if (!data || data.length < PAGE) return out;
  }
}

/** Everything the user owns, as JSON. Receipt files are listed by path, not embedded. */
export async function exportAll() {
  const [profile, categories, income_sources, income_entries, expenses, goals, goal_contributions, receipts] = await Promise.all([
    fetchAll('profiles', '*', 'id'),
    fetchAll('categories'),
    fetchAll('income_sources'),
    fetchAll('income_entries'),
    fetchAll('expenses'),
    fetchAll('goals'),
    fetchAll('goal_contributions'),
    fetchAll('receipts', 'id, kind, status, mime, bytes, storage_path, parsed, created_at'),
  ]);
  return {
    exported_at: new Date().toISOString(),
    note: 'Amounts are whole toea (K 1 = 100 toea).',
    profile: profile[0] ?? null,
    categories,
    income_sources,
    income_entries,
    expenses: expenses.filter((e) => !e.deleted_at),
    goals,
    goal_contributions,
    receipts,
  };
}

function csvCell(v: unknown): string {
  const s = v === null || v === undefined ? '' : String(v);
  // Neutralise spreadsheet formulas and quote everything.
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function toCsv(headers: string[], rows: unknown[][]): string {
  return [headers, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n');
}

const kina = (t: unknown) => (Number(t) / 100).toFixed(2);

export function expensesCsv(data: Awaited<ReturnType<typeof exportAll>>): string {
  const cats = new Map(data.categories.map((c) => [c.id, c]));
  return toCsv(
    ['date', 'merchant', 'category', 'bucket', 'amount_kina', 'method', 'note'],
    data.expenses
      .sort((a, b) => String(b.spent_on).localeCompare(String(a.spent_on)))
      .map((e) => [e.spent_on, e.merchant, cats.get(e.category_id)?.name, e.bucket, kina(e.amount), e.entry_method, e.note]),
  );
}

export function incomeCsv(data: Awaited<ReturnType<typeof exportAll>>): string {
  const sources = new Map(data.income_sources.map((s) => [s.id, s]));
  return toCsv(
    ['date', 'source', 'kind', 'amount_kina', 'note'],
    data.income_entries
      .sort((a, b) => String(b.received_on).localeCompare(String(a.received_on)))
      .map((i) => [i.received_on, sources.get(i.source_id)?.name, sources.get(i.source_id)?.kind, kina(i.amount), i.note]),
  );
}
