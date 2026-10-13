import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Profile, SideAllocation, Split } from '@/types/domain';
import type { ProfileRow } from '@/types/db';
import { useAuth } from '@/app/auth';

export function toProfile(r: ProfileRow): Profile {
  const side: SideAllocation =
    r.side_mode === 'custom'
      ? { mode: 'custom', split: [r.side_need ?? 0, r.side_want ?? 0, r.side_savings ?? 0] }
      : { mode: r.side_mode };
  return {
    id: r.id,
    displayName: r.display_name,
    currency: 'PGK',
    payCycle: r.pay_cycle,
    payAnchorDate: r.pay_anchor_date,
    split: [r.split_need, r.split_want, r.split_savings],
    side,
    theme: r.theme,
    wallpaper: r.wallpaper_path ? { path: r.wallpaper_path } : { preset: r.wallpaper_preset },
    wallpaperDim: r.wallpaper_dim,
    wallpaperBlur: r.wallpaper_blur,
    onboarded: r.onboarded,
  };
}

export const splitColumns = (s: Split) => ({ split_need: s[0], split_want: s[1], split_savings: s[2] });
export const sideColumns = (side: SideAllocation) =>
  side.mode === 'custom'
    ? { side_mode: 'custom' as const, side_need: side.split[0], side_want: side.split[1], side_savings: side.split[2] }
    : { side_mode: side.mode, side_need: null, side_want: null, side_savings: null };

export function useProfile() {
  const { user, dataReady } = useAuth();
  return useQuery({
    queryKey: ['profile'],
    enabled: Boolean(user) && dataReady,
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').single();
      if (error) throw error;
      return toProfile(data as ProfileRow);
    },
  });
}

/** Partial update of profile columns. Invalidates everything period-based when pay settings change. */
export function useUpdateProfile() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (patch: Partial<Omit<ProfileRow, 'id'>>) => {
      const { data, error } = await supabase.from('profiles').update(patch).eq('id', user!.id).select('*').single();
      if (error) throw error;
      return toProfile(data as ProfileRow);
    },
    onSuccess: (profile, patch) => {
      qc.setQueryData(['profile'], profile);
      if ('pay_cycle' in patch || 'pay_anchor_date' in patch) qc.invalidateQueries({ predicate: (q) => q.queryKey[0] !== 'profile' });
    },
  });
}
