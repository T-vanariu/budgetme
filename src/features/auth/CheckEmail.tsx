import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MailCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { AuthLayout } from './AuthLayout';

export function CheckEmail() {
  const email = (useLocation().state as { email?: string } | null)?.email;
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  const resend = async () => {
    if (!email) return;
    setStatus('sending');
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: `${window.location.origin}/mfa/setup` },
    });
    setStatus(error ? 'error' : 'sent');
  };

  return (
    <AuthLayout title="Confirm your email">
      <div className="flex items-start gap-3">
        <MailCheck className="mt-0.5 size-6 shrink-0 text-[var(--auth-btn)]" aria-hidden />
        <p className="text-sm">
          We sent a link to {email ? <strong>{email}</strong> : 'your email'}. Open it on this device to finish setting up BudgetMe.
        </p>
      </div>
      <div className="mt-6 grid gap-3">
        {email && (
          <Button variant="ghost" className="text-[var(--auth-text)] hover:bg-[#20232A]" onClick={resend} disabled={status === 'sending'}>
            {status === 'sending' ? 'Sending…' : 'Resend the link'}
          </Button>
        )}
        <p aria-live="polite" className="text-center text-sm text-[#A3A6AD]">
          {status === 'sent' && 'Sent. It can take a minute to arrive.'}
          {status === 'error' && <span className="text-[#F0766A]">Could not resend yet. Wait a minute and try again.</span>}
        </p>
        <Link to="/sign-in" className="text-center text-sm font-semibold underline underline-offset-4">
          Back to sign in
        </Link>
      </div>
    </AuthLayout>
  );
}
