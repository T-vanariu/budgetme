/** Shown when VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are missing. */
export function SetupNeeded() {
  return (
    <main className="mx-auto grid min-h-screen max-w-lg place-items-center p-4">
      <div className="card">
        <h1 className="text-2xl font-bold">BudgetMe needs Supabase</h1>
        <p className="mt-2 text-sm text-muted">
          Copy <code className="font-mono">.env.example</code> to <code className="font-mono">.env.local</code> and set{' '}
          <code className="font-mono">VITE_SUPABASE_URL</code> and <code className="font-mono">VITE_SUPABASE_ANON_KEY</code>. For a local
          stack run <code className="font-mono">supabase start</code> and use the values it prints. Then restart{' '}
          <code className="font-mono">npm run dev</code>.
        </p>
      </div>
    </main>
  );
}
