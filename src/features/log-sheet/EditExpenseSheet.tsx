import { useCategories } from '@/data/categories';
import { useUpdateExpense } from '@/data/expenses';
import { toast } from '@/components/ui/sonner';
import type { ExpenseListRow } from '@/types/db';
import { ExpenseForm } from './ExpenseForm';
import { ResponsiveSheet } from './ResponsiveSheet';

/** Edit sheet (gap #2): reuses the manual entry form. */
export function EditExpenseSheet({ row, onClose }: { row: ExpenseListRow | null; onClose: () => void }) {
  const { data: categories = [] } = useCategories();
  const update = useUpdateExpense();
  return (
    <ResponsiveSheet open={Boolean(row)} onOpenChange={(o) => !o && onClose()} title="Edit expense">
      {row && (
        <ExpenseForm
          key={row.id}
          categories={categories}
          initial={{ amount: row.amount, categoryId: row.category_id, merchant: row.merchant, date: row.spent_on }}
          submitLabel="Save changes"
          onSubmit={async (v) => {
            await update.mutateAsync({ id: row.id, amount: v.amount, category_id: v.categoryId, merchant: v.merchant, spent_on: v.date });
            toast.success('Expense updated');
            onClose();
          }}
        />
      )}
    </ResponsiveSheet>
  );
}
