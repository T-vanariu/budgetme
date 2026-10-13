import * as React from 'react';
import { cn } from '@/lib/utils';

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      ref={ref}
      className={cn(
        'flex min-h-touch w-full rounded-ctl border border-border bg-surface2 px-3 py-2 text-base text-text placeholder:text-muted disabled:opacity-60 md:text-sm',
        'aria-[invalid=true]:border-over',
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = 'Input';

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        'flex min-h-touch w-full rounded-ctl border border-border bg-surface2 px-3 py-2 text-base text-text md:text-sm aria-[invalid=true]:border-over',
        className,
      )}
      {...props}
    />
  ),
);
Select.displayName = 'Select';
