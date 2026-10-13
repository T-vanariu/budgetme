import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from '@/lib/supabase';
import { PASSWORD_MIN } from '@/config/limits';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/ui/field';
import { AuthLayout, authError, authInput } from './AuthLayout';
import { PasswordStrength } from './PasswordStrength';
import { registerSchema, type RegisterValues } from './schemas';

export function RegisterForm() {
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);
  const { register, handleSubmit, formState, watch } = useForm<RegisterValues>({ resolver: zodResolver(registerSchema) });

  const onSubmit = handleSubmit(async ({ displayName, email, password }) => {
    setFormError(null);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName }, emailRedirectTo: `${window.location.origin}/mfa/setup` },
    });
    if (error) {
      setFormError(error.code === 'weak_password' ? 'Choose a stronger password.' : "We couldn't create that account. Try again.");
      return;
    }
    if (data.session) navigate('/mfa/setup', { replace: true });
    else navigate('/register/check-email', { replace: true, state: { email } });
  });

  return (
    <AuthLayout title="Create account" subtitle="It takes about a minute.">
      <form onSubmit={onSubmit} noValidate className={`grid gap-4 ${authError}`}>
        <Field id="displayName" label="Display name" error={formState.errors.displayName?.message}>
          <Input autoComplete="nickname" className={authInput} {...register('displayName')} />
        </Field>
        <Field id="email" label="Email" error={formState.errors.email?.message}>
          <Input type="email" autoComplete="email" inputMode="email" className={authInput} {...register('email')} />
        </Field>
        <Field id="password" label="Password" error={formState.errors.password?.message} hint={`At least ${PASSWORD_MIN} characters. A short sentence works well.`}>
          <Input type="password" autoComplete="new-password" className={authInput} {...register('password')} />
        </Field>
        <PasswordStrength password={watch('password') ?? ''} />
        <Field id="confirm" label="Confirm password" error={formState.errors.confirm?.message}>
          <Input type="password" autoComplete="new-password" className={authInput} {...register('confirm')} />
        </Field>
        {formError && (
          <p role="alert" className="rounded-ctl bg-[#3a1714] px-3 py-2 text-sm font-semibold text-[#F0766A]">
            {formError}
          </p>
        )}
        <Button type="submit" variant="auth" size="lg" disabled={formState.isSubmitting}>
          {formState.isSubmitting ? 'Creating…' : 'Create account'}
        </Button>
        <p className="text-center text-sm text-[#A3A6AD]">
          Have an account?{' '}
          <Link to="/sign-in" className="font-semibold text-[var(--auth-text)] underline underline-offset-4">
            Sign in
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
