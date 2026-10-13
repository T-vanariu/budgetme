import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

type Aal = 'aal1' | 'aal2' | null;

interface AuthState {
  session: Session | null;
  user: User | null;
  loading: boolean;
  currentLevel: Aal;
  nextLevel: Aal;
  /** True when MFA is enrolled but this session has not reached aal2. */
  needsMfa: boolean;
  /** Session exists and has the assurance level RLS requires; safe to load data. */
  dataReady: boolean;
  hasVerifiedFactor: boolean;
  refreshAal: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [levels, setLevels] = useState<{ current: Aal; next: Aal }>({ current: null, next: null });

  const refreshAal = useCallback(async () => {
    const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    setLevels({ current: (data?.currentLevel as Aal) ?? null, next: (data?.nextLevel as Aal) ?? null });
  }, []);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      if (data.session) await refreshAal();
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (event === 'SIGNED_OUT') {
        qc.clear();
        setLevels({ current: null, next: null });
      } else if (s) {
        // Defer: calling supabase inside this callback can deadlock the auth lock.
        setTimeout(() => void refreshAal(), 0);
      }
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [qc, refreshAal]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    // Drops cached rows and any signed URLs held in the query cache.
    qc.clear();
  }, [qc]);

  const value = useMemo<AuthState>(() => {
    const needsMfa = levels.next === 'aal2' && levels.current !== 'aal2';
    const hasVerifiedFactor = levels.next === 'aal2';
    return {
      session,
      user: session?.user ?? null,
      loading: loading || (Boolean(session) && levels.current === null),
      currentLevel: levels.current,
      nextLevel: levels.next,
      needsMfa,
      hasVerifiedFactor,
      dataReady: Boolean(session) && !needsMfa && levels.current !== null,
      refreshAal,
      signOut,
    };
  }, [session, loading, levels, refreshAal, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
