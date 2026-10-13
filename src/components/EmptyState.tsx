import type { ReactNode } from 'react';

export function EmptyState({ icon, message, action }: { icon?: ReactNode; message: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-ctl border border-dashed border-border px-4 py-8 text-center text-sm text-muted">
      {icon && <div className="text-muted [&_svg]:size-6">{icon}</div>}
      <p className="max-w-xs">{message}</p>
      {action}
    </div>
  );
}
