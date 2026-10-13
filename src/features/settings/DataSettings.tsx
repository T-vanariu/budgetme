import { useState } from 'react';
import { Download, Trash2 } from 'lucide-react';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { useAuth } from '@/app/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/ui/field';
import { toast } from '@/components/ui/sonner';
import { expensesCsv, exportAll, incomeCsv } from '@/data/export';
import { downloadBlob } from '@/lib/files';
import { supabase } from '@/lib/supabase';
import { todayISO } from '@/lib/dates';

export function DataSettings() {
  const { signOut } = useAuth();
  const [busy, setBusy] = useState<'json' | 'csv' | 'delete' | null>(null);
  const [confirm, setConfirm] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const stamp = todayISO();

  const doExport = async (kind: 'json' | 'csv') => {
    setBusy(kind);
    try {
      const data = await exportAll();
      if (kind === 'json') {
        downloadBlob(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), `budgetme-${stamp}.json`);
      } else {
        downloadBlob(new Blob([expensesCsv(data)], { type: 'text/csv' }), `budgetme-expenses-${stamp}.csv`);
        downloadBlob(new Blob([incomeCsv(data)], { type: 'text/csv' }), `budgetme-income-${stamp}.csv`);
      }
    } catch {
      toast.error("Couldn't export. Try again.");
    } finally {
      setBusy(null);
    }
  };

  const doDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (confirm !== 'DELETE') {
      setDeleteError('Type DELETE in capitals to confirm.');
      return;
    }
    setDeleteError(null);
    setBusy('delete');
    const { error } = await supabase.functions.invoke('delete-account', { body: { confirm: 'DELETE' } });
    if (error) {
      const body = error instanceof FunctionsHttpError ? await error.context.json().catch(() => null) : null;
      setDeleteError(body?.error === 'mfa_required' ? 'Sign in again with your 6-digit code, then retry.' : "Couldn't delete your account. Try again.");
      setBusy(null);
      return;
    }
    toast.success('Account deleted');
    await signOut();
  };

  return (
    <div className="grid gap-6">
      <div className="grid gap-2">
        <p className="text-sm">Download everything you've logged. Amounts in the JSON are toea (K 1 = 100 toea); the CSVs use kina.</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => void doExport('json')} disabled={busy !== null}>
            <Download aria-hidden /> {busy === 'json' ? 'Preparing…' : 'Export data (JSON)'}
          </Button>
          <Button variant="outline" onClick={() => void doExport('csv')} disabled={busy !== null}>
            <Download aria-hidden /> {busy === 'csv' ? 'Preparing…' : 'Expenses + income (CSV)'}
          </Button>
        </div>
      </div>
      <form onSubmit={doDelete} noValidate className="grid gap-3 rounded-ctl border border-over/40 p-3">
        <p className="text-sm font-semibold text-over">Delete account</p>
        <p className="text-sm">This removes your account, every entry, goal and uploaded file. It cannot be undone. Export first if you want a copy.</p>
        <Field id="confirm-delete" label="Type DELETE to confirm" error={deleteError}>
          <Input value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="off" />
        </Field>
        <Button type="submit" variant="destructive" disabled={busy !== null}>
          <Trash2 aria-hidden /> {busy === 'delete' ? 'Deleting…' : 'Delete my account'}
        </Button>
      </form>
    </div>
  );
}
