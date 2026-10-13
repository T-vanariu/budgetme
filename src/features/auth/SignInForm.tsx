import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/ui/field';
import { toast } from '@/components/ui/sonner';
import { AuthLayout, authError, authInput } from './AuthLayout';
import { signInSchema, type SignInValues } from './schemas';

export function SignInForm() {
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);
  const { register, handleSubmit, formState } = useForm<SignInValues>({ resolver: zodResolver(signInSchema) });

  const onSubmit = handleSubmit(async ({ email, password }) => {
    setFormError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      // Never say which field was wrong.
      setFormError(
        error.code === 'email_not_confirmed'
          ? 'Confirm your email first. Check your inbox for the link.'
          : 'Email or password is incorrect.',
      );
      return;
    }
    const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (data?.nextLevel === 'aal2' && data.currentLevel !== 'aal2') navigate('/mfa', { replace: true });
    else {
      toast.success('Signed in');
      navigate('/app', { replace: true });
    }
  });

  return (
    <AuthLayout title="Sign in" subtitle="Welcome back.">
      <form onSubmit={onSubmit} noValidate className={`grid gap-4 ${authError}`}>
        <Field id="email" label="Email" error={formState.errors.email?.message}>
          <Input type="email" autoComplete="email" inputMode="email" className={authInput} {...register('email')} />
        </Field>
        <Field id="password" label="Password" error={formState.errors.password?.message}>
          <Input type="password" autoComplete="current-password" className={authInput} {...register('password')} />
        </Field>
        {formError && (
          <p role="alert" className="rounded-ctl bg-[#3a1714] px-3 py-2 text-sm font-semibold text-[#F0766A]">
            {formError}
          </p>
        )}
        <Button type="submit" variant="auth" size="lg" disabled={formState.isSubmitting}>
          {formState.isSubmitting ? 'Signing in…' : 'Sign in'}
        </Button>
        <p className="text-center text-sm text-[#A3A6AD]">
          New here?{' '}
          <Link to="/register" className="font-semibold text-[var(--auth-text)] underline underline-offset-4">
            Create an account
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
