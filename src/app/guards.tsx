import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useProfile } from '@/data/profile';
import { useAuth } from './auth';

export function FullPageSpinner({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="grid min-h-screen place-items-center" role="status" aria-live="polite">
      <Loader2 className="size-8 animate-spin text-muted" aria-hidden />
      <span className="sr-only">{label}</span>
    </div>
  );
}

/**
 * Route guard for /app. This only improves the experience: the database refuses rows to
 * sessions without the right assurance level whatever the UI does.
 */
export function RequireApp({ children }: { children: ReactNode }) {
  const { session, loading, needsMfa } = useAuth();
  const { data: profile, isLoading, error } = useProfile();
  const location = useLocation();
  if (loading) return <FullPageSpinner />;
  if (!session) return <Navigate to="/sign-in" replace state={{ from: location.pathname }} />;
  if (needsMfa) return <Navigate to="/mfa" replace />;
  if (isLoading) return <FullPageSpinner />;
  if (error || !profile) return <Navigate to="/sign-in" replace />;
  if (!profile.onboarded) return <Navigate to="/mfa/setup" replace />;
  return <>{children}</>;
}

/** Signed-in-only screens outside the app (MFA). */
export function RequireSession({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  if (loading) return <FullPageSpinner />;
  if (!session) return <Navigate to="/sign-in" replace />;
  return <>{children}</>;
}

/** Signed-out screens bounce signed-in users into the app. */
export function RedirectIfSignedIn({ children }: { children: ReactNode }) {
  const { session, loading, needsMfa } = useAuth();
  if (loading) return <FullPageSpinner />;
  if (session) return <Navigate to={needsMfa ? '/mfa' : '/app'} replace />;
  return <>{children}</>;
}
