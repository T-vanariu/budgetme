import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/ui/field';
import { authError, authInput } from './AuthLayout';
import { totpSchema } from './schemas';

/** 6-digit TOTP entry with inline validation. `onVerify` returns an error message or null. */
export function CodeInput({ onVerify, submitLabel = 'Verify' }: { onVerify: (code: string) => Promise<string | null>; submitLabel?: string }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = totpSchema.safeParse({ code });
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    setBusy(true);
    setError(await onVerify(parsed.data.code));
    setBusy(false);
  };

  return (
    <form onSubmit={submit} noValidate className={`grid gap-4 ${authError}`}>
      <Field id="totp" label="6-digit code" error={error}>
        <Input
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          className={`${authInput} font-mono text-lg tracking-[0.4em]`}
        />
      </Field>
      <Button type="submit" variant="auth" size="lg" disabled={busy}>
        {busy ? 'Checking…' : submitLabel}
      </Button>
    </form>
  );
}
