import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/app/auth';
import { toea, type Goal } from '@/types/domain';
import type { GoalStatusRow } from '@/types/db';

export type GoalWithSaved = Goal & { saved: number; contributionCount: number };

const invalidate = (qc: ReturnType<typeof useQueryClient>) => qc.invalidateQueries({ queryKey: ['goals'] });

export function useGoals() {
  const { dataReady } = useAuth();
  return useQuery({
    queryKey: ['goals'],
    enabled: dataReady,
    queryFn: async (): Promise<GoalWithSaved[]> => {
      const { data, error } = await supabase.from('v_goal_status').select('*').order('priority').order('title');
      if (error) throw error;
      return (data as GoalStatusRow[]).map((r) => ({
        id: r.id,
        title: r.title,
        kind: r.kind,
        targetAmount: toea(Number(r.target_amount)),
        startingBalance: toea(Number(r.starting_balance)),
        perPay: toea(Number(r.per_pay)),
        targetDate: r.target_date,
        priority: r.priority,
        documentId: r.document_id,
        status: r.status,
        saved: Number(r.saved),
        contributionCount: r.contribution_count,
      }));
    },
  });
}

export interface GoalInput {
  title: string;
  kind: 'save_up' | 'pay_off';
  target_amount: number;
  starting_balance: number;
  per_pay: number;
  target_date: string | null;
  document_id: string | null;
}

export function useAddGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (g: GoalInput) => {
      const { error } = await supabase.from('goals').insert(g);
      if (error) throw error;
    },
    onSuccess: () => invalidate(qc),
  });
}

export function useUpdateGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<GoalInput> & { id: string; status?: Goal['status'] }) => {
      const { error } = await supabase.from('goals').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => invalidate(qc),
  });
}

export function useDeleteGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('goals').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => invalidate(qc),
  });
}

export function useAddContribution() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (c: { goal_id: string; amount: number; contributed_on: string }) => {
      const { error } = await supabase.from('goal_contributions').insert(c);
      if (error) throw error;
    },
    onSuccess: () => invalidate(qc),
  });
}
