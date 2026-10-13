import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/app/auth';
import { PAGE_SIZE } from '@/config/limits';
import type { Bucket, PayPeriod } from '@/types/domain';
import type { ExpenseListRow, ExpenseStatsRow } from '@/types/db';

export interface ExpenseFilter {
  from: string;
  to: string;
  bucket: Bucket | null;
  q: string;
}

/** Every query whose numbers depend on expenses. */
const EXPENSE_KEYS = ['expenses', 'expense-stats', 'period-summary', 'category-by-period', 'period-expenses', 'last-expense', 'goals'];
export function invalidateExpenses(qc: ReturnType<typeof useQueryClient>) {
  return qc.invalidateQueries({ predicate: (q) => EXPENSE_KEYS.includes(q.queryKey[0] as string) });
}

/** Keyset-paginated list, 50 rows per page, newest first. */
export function useExpenseList(f: ExpenseFilter) {
  const { dataReady } = useAuth();
  return useInfiniteQuery({
    queryKey: ['expenses', f],
    enabled: dataReady,
    initialPageParam: null as { date: string; id: string } | null,
    queryFn: async ({ pageParam }) => {
      const { data, error } = await supabase.rpc('list_expenses', {
        p_from: f.from,
        p_to: f.to,
        p_bucket: f.bucket,
        p_q: f.q.trim() || null,
        p_before_date: pageParam?.date ?? null,
        p_before_id: pageParam?.id ?? null,
        p_limit: PAGE_SIZE,
      });
      if (error) throw error;
      return (data as ExpenseListRow[]).map((r) => ({ ...r, amount: Number(r.amount) }));
    },
    getNextPageParam: (last) => (last.length < PAGE_SIZE ? null : { date: last[last.length - 1].spent_on, id: last[last.length - 1].id }),
  });
}

/** Totals for exactly the filtered set (all pages), plus per-pay subtotals. */
export function useExpenseStats(f: ExpenseFilter) {
  const { dataReady } = useAuth();
  return useQuery({
    queryKey: ['expense-stats', f],
    enabled: dataReady,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('expense_stats', { p_from: f.from, p_to: f.to, p_bucket: f.bucket, p_q: f.q.trim() || null });
      if (error) throw error;
      const s = data as ExpenseStatsRow;
      return {
        total: Number(s.total),
        count: Number(s.count),
        byPeriod: new Map(s.by_period.map((p) => [p.period_index, { total: Number(p.total), count: p.count }])),
        paysWithEntries: s.by_period.length,
        averagePerPay: s.by_period.length ? Math.round(Number(s.total) / s.by_period.length) : 0,
        topCategory: s.top_category ? { name: s.top_category.name, total: Number(s.top_category.total) } : null,
      };
    },
  });
}

/** All non-deleted expenses in one pay (for the plan, donut and rules). */
export function usePeriodExpenses(period: PayPeriod | undefined) {
  const { dataReady } = useAuth();
  return useQuery({
    queryKey: ['period-expenses', period?.start, period?.end],
    enabled: dataReady && Boolean(period),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expenses')
        .select('id, amount, bucket, merchant, spent_on, category_id, deleted_at')
        .is('deleted_at', null)
        .gte('spent_on', period!.start)
        .lte('spent_on', period!.end);
      if (error) throw error;
      return (data ?? []).map((r) => ({ ...r, amount: Number(r.amount) })) as {
        id: string; amount: number; bucket: Bucket; merchant: string | null; spent_on: string; category_id: string; deleted_at: string | null;
      }[];
    },
  });
}

export function useLastExpenseDate() {
  const { dataReady } = useAuth();
  return useQuery({
    queryKey: ['last-expense'],
    enabled: dataReady,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expenses')
        .select('spent_on')
        .is('deleted_at', null)
        .order('spent_on', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data?.spent_on as string | undefined) ?? null;
    },
  });
}

export interface NewExpense {
  amount: number;
  spent_on: string;
  category_id: string;
  merchant: string | null;
  note?: string | null;
  receipt_id?: string | null;
  entry_method?: 'manual' | 'receipt';
  goal_id?: string | null;
}

export function useAddExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ goal_id, ...e }: NewExpense) => {
      // bucket is overwritten by the expense_copy_bucket trigger from the category.
      const { data, error } = await supabase
        .from('expenses')
        .insert({ ...e, bucket: 'need', entry_method: e.entry_method ?? 'manual' })
        .select('id, bucket')
        .single();
      if (error) throw error;
      if (goal_id) {
        const { error: gErr } = await supabase
          .from('goal_contributions')
          .insert({ goal_id, amount: e.amount, contributed_on: e.spent_on, expense_id: data.id });
        if (gErr) throw gErr;
      }
      if (e.receipt_id) await supabase.from('receipts').update({ status: 'confirmed' }).eq('id', e.receipt_id);
      return data as { id: string; bucket: Bucket };
    },
    onSuccess: () => invalidateExpenses(qc),
  });
}

export function useUpdateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<NewExpense> & { id: string }) => {
      delete patch.goal_id;
      const { error } = await supabase.from('expenses').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => invalidateExpenses(qc),
  });
}

/** Soft delete (sets deleted_at) so Undo can restore the row in place. */
export function useSetExpenseDeleted() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, deleted }: { id: string; deleted: boolean }) => {
      const { error } = await supabase.from('expenses').update({ deleted_at: deleted ? new Date().toISOString() : null }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => invalidateExpenses(qc),
  });
}
