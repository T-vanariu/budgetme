import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/app/auth';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/sonner';
import { AuthLayout } from './AuthLayout';
import { CodeInput } from './CodeInput';

export function MfaChallenge() {
  const navigate = useNavigate();
  const { needsMfa, refreshAal, signOut } = useAuth();
  const [factorId, setFactorId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.mfa.listFactors().then(({ data }) => setFactorId(data?.totp[0]?.id ?? null));
  }, []);

  if (!needsMfa) return <Navigate to="/app" replace />;

  const verify = async (code: string) => {
    if (!factorId) return 'No authenticator found on this account.';
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
    if (error) return "That code didn't work. Check your app and try the newest code.";
    await refreshAal();
    toast.success('Signed in');
    navigate('/app', { replace: true });
    return null;
  };

  return (
    <AuthLayout title="Two-step sign-in" subtitle="Enter the 6-digit code from your authenticator app.">
      <CodeInput onVerify={verify} />
      <Button variant="ghost" className="mt-4 w-full text-[#A3A6AD] hover:bg-[#20232A]" onClick={() => void signOut()}>
        Use a different account
      </Button>
    </AuthLayout>
  );
}
