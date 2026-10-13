import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, ShieldAlert } from 'lucide-react';
import type { Factor } from '@supabase/supabase-js';
import { useAuth } from '@/app/auth';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/sonner';

export function SecuritySettings() {
  const { currentLevel, refreshAal, signOut, user } = useAuth();
  const [factors, setFactors] = useState<Factor[] | null>(null);

  const load = async () => {
    const { data } = await supabase.auth.mfa.listFactors();
    setFactors(data?.totp ?? []);
  };
  useEffect(() => {
    void load();
  }, []);

  const remove = async (f: Factor) => {
    if (currentLevel !== 'aal2') {
      toast.error('Sign in with your code first to remove an authenticator.');
      return;
    }
    if (factors && factors.length === 1 && !window.confirm('This turns off two-step sign-in. Continue?')) return;
    const { error } = await supabase.auth.mfa.unenroll({ factorId: f.id });
    if (error) toast.error("Couldn't remove it. Try again.");
    else {
      toast.success('Authenticator removed');
      await supabase.auth.refreshSession();
      await refreshAal();
      await load();
    }
  };

  const enrolled = (factors?.length ?? 0) > 0;
  return (
    <div className="grid gap-4">
      <p className="text-sm">
        Signed in as <strong>{user?.email}</strong>
      </p>
      <div className="flex items-start gap-3 rounded-ctl bg-surface2 p-3">
        {enrolled ? <ShieldCheck className="size-5 shrink-0 text-save" aria-hidden /> : <ShieldAlert className="size-5 shrink-0 text-over" aria-hidden />}
        <div className="text-sm">
          <p className="font-semibold">{enrolled ? 'Two-step sign-in is on' : 'Two-step sign-in is off'}</p>
          <p className="text-muted">
            {enrolled
              ? 'There are no backup codes. Add a second device (another phone or a password manager) so losing one phone does not lock you out.'
              : 'Add an authenticator app so a stolen password is not enough to open your budget.'}
          </p>
        </div>
      </div>
      {factors && factors.length > 0 && (
        <ul className="divide-y divide-border rounded-ctl border border-border">
          {factors.map((f) => (
            <li key={f.id} className="flex items-center justify-between gap-3 p-3 text-sm">
              <span className="min-w-0 truncate">{f.friendly_name || 'Authenticator'}</span>
              <Button variant="ghost" size="sm" onClick={() => void remove(f)}>
                Remove
              </Button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline">
          <Link to="/mfa/setup?from=settings">{enrolled ? 'Add a second device' : 'Turn on two-step sign-in'}</Link>
        </Button>
        <Button variant="ghost" onClick={() => void signOut()}>
          Sign out
        </Button>
      </div>
    </div>
  );
}
