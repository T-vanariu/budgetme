import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/app/auth';
import { todayISO } from '@/lib/dates';
import { getPeriod, listPeriods, periodByIndex } from '@/lib/periods';
import { toea, type PayPeriod, type PeriodSummary, type Profile } from '@/types/domain';
import type { CategoryByPeriodRow, PeriodSummaryRow } from '@/types/db';
import { useProfile } from './profile';

/** One row per pay with data, newest first (v_period_summary). */
export function usePeriodSummary() {
  const { dataReady } = useAuth();
  const { data: profile } = useProfile();
  return useQuery({
    queryKey: ['period-summary', profile?.payAnchorDate, profile?.payCycle],
    enabled: dataReady && Boolean(profile),
    queryFn: async (): Promise<PeriodSummary[]> => {
      const { data, error } = await supabase.from('v_period_summary').select('*').order('period_index', { ascending: false });
      if (error) throw error;
      return (data as PeriodSummaryRow[]).map((r) => ({
        period: periodByIndex(r.period_index, profile!.payAnchorDate, profile!.payCycle),
        income: toea(Number(r.income)),
        salary: toea(Number(r.salary)),
        side: toea(Number(r.side)),
        spentNeed: toea(Number(r.spent_need)),
        spentWant: toea(Number(r.spent_want)),
        spentSavings: toea(Number(r.spent_savings)),
        spent: toea(Number(r.spent)),
        leftOver: toea(Number(r.left_over)),
        expenseCount: r.expense_count,
      }));
    },
  });
}

export function useCategoryByPeriod(minIndex: number | undefined) {
  const { dataReady } = useAuth();
  return useQuery({
    queryKey: ['category-by-period', minIndex],
    enabled: dataReady && minIndex !== undefined,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_category_by_period')
        .select('period_index, category_id, category_name, bucket, total, expense_count')
        .gte('period_index', minIndex!);
      if (error) throw error;
      return (data as CategoryByPeriodRow[]).map((r) => ({ ...r, total: Number(r.total) }));
    },
  });
}

export interface PayContext {
  today: string;
  profile: Profile;
  current: PayPeriod;
  /** Newest first; [0] is the current pay; reaches back to the oldest pay with data. */
  periods: PayPeriod[];
  summary: PeriodSummary[];
  currentSummary: PeriodSummary | undefined;
}

/** Profile + today's pay period + all periods with history. Null while loading. */
export function usePay(): PayContext | null {
  const { data: profile } = useProfile();
  const { data: summary } = usePeriodSummary();
  const today = todayISO();
  return useMemo(() => {
    if (!profile || !summary) return null;
    const current = getPeriod(today, profile.payAnchorDate, profile.payCycle);
    const oldest = Math.min(current.index, ...summary.map((s) => s.period.index));
    const periods = listPeriods(oldest, current.index, profile.payAnchorDate, profile.payCycle);
    periods[0] = current;
    // Future-dated rows (e.g. a pay logged early) should not appear as "this pay".
    const past = summary.filter((s) => s.period.index <= current.index);
    return { today, profile, current, periods, summary: past, currentSummary: past.find((s) => s.period.index === current.index) };
  }, [profile, summary, today]);
}
