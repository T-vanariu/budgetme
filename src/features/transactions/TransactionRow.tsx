import { Camera, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BUCKET_VAR } from '@/config/buckets';
import { formatDay } from '@/lib/dates';
import { formatMoney } from '@/lib/money';
import { BUCKET_LABEL } from '@/types/domain';
import type { ExpenseListRow } from '@/types/db';

export function TransactionRow({ row, onEdit, onDelete }: { row: ExpenseListRow; onEdit: () => void; onDelete: () => void }) {
  const title = row.merchant || row.category_name;
  return (
    <li className="flex items-center gap-3 py-2.5">
      <span className="w-12 shrink-0 text-xs text-muted">{formatDay(row.spent_on)}</span>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 truncate font-semibold">
          {title}
          {row.entry_method === 'receipt' && <Camera className="size-3.5 shrink-0 text-muted" aria-label="from receipt" />}
        </p>
        <p className="flex items-center gap-1.5 truncate text-xs text-muted">
          <span className="size-2 shrink-0 rounded-full" style={{ background: BUCKET_VAR[row.bucket] }} aria-hidden />
          {row.merchant ? `${row.category_name} · ` : ''}
          {BUCKET_LABEL[row.bucket]}
        </p>
      </div>
      <span className="num shrink-0 font-semibold">{formatMoney(row.amount)}</span>
      <div className="flex shrink-0">
        <Button variant="ghost" size="icon" aria-label={`Edit ${title} ${formatMoney(row.amount)}`} onClick={onEdit}>
          <Pencil />
        </Button>
        <Button variant="ghost" size="icon" aria-label={`Delete ${title} ${formatMoney(row.amount)}`} onClick={onDelete}>
          <Trash2 />
        </Button>
      </div>
    </li>
  );
}
