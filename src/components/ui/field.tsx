import * as React from 'react';
import { cn } from '@/lib/utils';
import { Label } from './label';

/**
 * Label + control + inline error. The control gets `aria-invalid` and `aria-describedby`
 * pointing at the error, which renders with role="alert" (blueprint §2.3).
 */
export function Field({
  id,
  label,
  error,
  hint,
  className,
  children,
}: {
  id: string;
  label: React.ReactNode;
  error?: string | null;
  hint?: React.ReactNode;
  className?: string;
  children: React.ReactElement;
}) {
  const errId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy = [error ? errId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined;
  return (
    <div className={cn('grid gap-1.5', className)}>
      <Label htmlFor={id}>{label}</Label>
      {React.cloneElement(children, { id, 'aria-invalid': error ? true : undefined, 'aria-describedby': describedBy })}
      {hint && !error && <p id={hintId} className="text-xs text-muted">{hint}</p>}
      {error && (
        <p id={errId} role="alert" className="text-xs font-semibold text-over">
          {error}
        </p>
      )}
    </div>
  );
}
