import * as React from 'react';
import { cn } from '@/lib/utils';

export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLElement> & { as?: 'div' | 'section' | 'article' }>(
  ({ className, as: Tag = 'section', ...props }, ref) => (
    <Tag ref={ref as React.Ref<HTMLDivElement>} className={cn('card min-w-0', className)} {...props} />
  ),
);
Card.displayName = 'Card';

export function CardHeader({ title, action, subtitle, id }: { title: string; subtitle?: React.ReactNode; action?: React.ReactNode; id?: string }) {
  return (
    <div className="mb-3 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 id={id} className="text-base font-semibold leading-tight">{title}</h2>
        {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
