import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/app/auth';
import { PAGE_SIZE } from '@/config/limits';
import { toea, type IncomeSource } from '@/types/domain';
import type { IncomeListRow, IncomeSourceRow } from '@/types/db';

const INCOME_KEYS = ['income', 'income-sources', 'period-summary'];
const invalidateIncome = (qc: ReturnType<typeof useQueryClient>) =>
  qc.invalidateQueries({ predicate: (q) => INCOME_KEYS.includes(q.queryKey[0] as string) });

export function useIncomeSources() {
  const { dataReady } = useAuth();
  return useQuery({
    queryKey: ['income-sources'],
    enabled: dataReady,
    queryFn: async (): Promise<IncomeSource[]> => {
      const { data, error } = await supabase.from('income_sources').select('id, name, kind, expected_amount, is_active').order('kind');
      if (error) throw error;
      return (data as IncomeSourceRow[]).map((r) => ({
        id: r.id,
        name: r.name,
        kind: r.kind,
        expectedAmount: r.expected_amount === null ? null : toea(Number(r.expected_amount)),
        isActive: r.is_active,
      }));
    },
  });
}

export function useUpdateIncomeSource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, expected_amount }: { id: string; expected_amount: number | null }) => {
      const { error } = await supabase.from('income_sources').update({ expected_amount }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => invalidateIncome(qc),
  });
}

export function useIncomeList(from: string, to: string) {
  const { dataReady } = useAuth();
  return useInfiniteQuery({
    queryKey: ['income', from, to],
    enabled: dataReady,
    initialPageParam: null as { date: string; id: string } | null,
    queryFn: async ({ pageParam }) => {
      const { data, error } = await supabase.rpc('list_income', {
        p_from: from,
        p_to: to,
        p_before_date: pageParam?.date ?? null,
        p_before_id: pageParam?.id ?? null,
        p_limit: PAGE_SIZE,
      });
      if (error) throw error;
      return (data as IncomeListRow[]).map((r) => ({ ...r, amount: Number(r.amount) }));
    },
    getNextPageParam: (last) => (last.length < PAGE_SIZE ? null : { date: last[last.length - 1].received_on, id: last[last.length - 1].id }),
  });
}

export function useAddIncome() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (e: { source_id: string; amount: number; received_on: string; note?: string | null }) => {
      const { error } = await supabase.from('income_entries').insert(e);
      if (error) throw error;
    },
    onSuccess: () => invalidateIncome(qc),
  });
}

export function useDeleteIncome() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.from('income_entries').delete().eq('id', id).select('source_id, amount, received_on, note').single();
      if (error) throw error;
      return data as { source_id: string; amount: number; received_on: string; note: string | null };
    },
    onSuccess: () => invalidateIncome(qc),
  });
}
