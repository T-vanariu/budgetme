import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/app/auth';
import { useUpdateProfile } from '@/data/profile';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/sonner';
import { AuthLayout } from './AuthLayout';
import { CodeInput } from './CodeInput';

interface Enrolment { factorId: string; qr: string; secret: string }

export function MfaEnroll() {
  const navigate = useNavigate();
  const fromSettings = useSearchParams()[0].get('from') === 'settings';
  const { refreshAal, needsMfa } = useAuth();
  const updateProfile = useUpdateProfile();
  const [enrolment, setEnrolment] = useState<Enrolment | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (needsMfa) {
      navigate('/mfa', { replace: true });
      return;
    }
    if (started.current) return;
    started.current = true;
    (async () => {
      // Clear abandoned, unverified factors so a fresh QR can be issued.
      const { data: list } = await supabase.auth.mfa.listFactors();
      for (const f of list?.all ?? []) {
        if (f.factor_type === 'totp' && f.status === 'unverified') await supabase.auth.mfa.unenroll({ factorId: f.id });
      }
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: `Authenticator ${new Date().toISOString().slice(0, 16)}`,
      });
      if (error || !data) setLoadError("Couldn't start setup. Refresh to try again.");
      else setEnrolment({ factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
    })();
  }, [needsMfa, navigate]);

  const finish = async (message: string) => {
    await updateProfile.mutateAsync({ onboarded: true });
    toast.success(message);
    navigate(fromSettings ? '/app/settings' : '/app', { replace: true });
  };

  const verify = async (code: string) => {
    if (!enrolment) return 'Setup is still loading.';
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: enrolment.factorId, code });
    if (error) return "That code didn't work. Check the time on your phone and try the newest code.";
    await refreshAal();
    await finish('Two-step sign-in is on');
    return null;
  };

  return (
    <AuthLayout
      title={fromSettings ? 'Add an authenticator' : 'Protect your account'}
      subtitle="Scan this with an authenticator app (Google Authenticator, Microsoft Authenticator, 1Password…), then enter the 6-digit code."
    >
      {loadError && <p role="alert" className="text-sm font-semibold text-[#F0766A]">{loadError}</p>}
      {!enrolment && !loadError && <Loader2 className="mx-auto size-8 animate-spin" aria-label="Loading" />}
      {enrolment && (
        <div className="grid gap-5">
          <div className="mx-auto rounded-ctl bg-white p-3">
            <img src={enrolment.qr} alt="QR code for your authenticator app" width={184} height={184} />
          </div>
          <details className="text-sm">
            <summary className="cursor-pointer font-semibold">Can't scan? Type this key instead</summary>
            <code className="mt-2 block break-all rounded-ctl bg-[#20232A] p-3 font-mono text-sm">{enrolment.secret}</code>
          </details>
          <CodeInput onVerify={verify} submitLabel="Turn on two-step sign-in" />
        </div>
      )}
      {!fromSettings && (
        <Button variant="ghost" className="mt-4 w-full text-[#A3A6AD] hover:bg-[#20232A]" onClick={() => void finish('You can turn on two-step sign-in in Settings')}>
          Skip for now
        </Button>
      )}
      {fromSettings && (
        <Button variant="ghost" className="mt-4 w-full text-[#A3A6AD] hover:bg-[#20232A]" onClick={() => navigate('/app/settings')}>
          Cancel
        </Button>
      )}
    </AuthLayout>
  );
}
