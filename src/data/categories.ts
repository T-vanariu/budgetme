import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/app/auth';
import type { Category } from '@/types/domain';
import type { CategoryRow } from '@/types/db';

const ORDER = { need: 0, want: 1, savings: 2 } as const;

export function useCategories() {
  const { dataReady } = useAuth();
  return useQuery({
    queryKey: ['categories'],
    enabled: dataReady,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<Category[]> => {
      const { data, error } = await supabase.from('categories').select('id, name, bucket, icon, is_default, is_hidden').eq('is_hidden', false);
      if (error) throw error;
      return (data as CategoryRow[])
        .map((r) => ({ id: r.id, name: r.name, bucket: r.bucket, icon: r.icon, isDefault: r.is_default }))
        .sort((a, b) => ORDER[a.bucket] - ORDER[b.bucket] || a.name.localeCompare(b.name));
    },
  });
}
