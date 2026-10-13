import { Card, CardHeader } from '@/components/ui/card';

const TOOLS = ['get_period_summary', 'get_category_trends', 'get_goals_status', 'get_recent_expenses', 'simulate_goal'];

const CONFIG = `{
  "mcpServers": {
    "budgetme": {
      "command": "node",
      "args": ["/path/to/budgetme/mcp-server/dist/index.js"]
    }
  }
}`;

/** Setup help for the local, read-only MCP server (blueprint §8). */
export function ConnectClaudeCard() {
  return (
    <Card>
      <CardHeader title="Ask Claude Desktop" subtitle="Optional. A read-only server on your own computer." />
      <ol className="grid list-decimal gap-2 pl-5 text-sm">
        <li>
          In <code className="font-mono">mcp-server/</code>, copy <code className="font-mono">.env.example</code> to <code className="font-mono">.env</code> and set{' '}
          <code className="font-mono">ADVISOR_DB_URL</code> for the <code className="font-mono">advisor_readonly</code> role.
        </li>
        <li>
          Run <code className="font-mono">npm install && npm run build</code> there.
        </li>
        <li>
          Add this to Claude Desktop's <code className="font-mono">claude_desktop_config.json</code> and restart it:
          <pre className="mt-2 overflow-x-auto rounded-ctl bg-surface2 p-3 font-mono text-xs">{CONFIG}</pre>
        </li>
        <li>Try the prompt “fortnightly_review”.</li>
      </ol>
      <p className="mt-3 text-sm font-semibold">Tools it can call</p>
      <ul className="mt-1 flex flex-wrap gap-1.5">
        {TOOLS.map((t) => (
          <li key={t} className="rounded-full bg-surface2 px-2.5 py-1 font-mono text-xs">
            {t}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-muted">
        The server can only read summary views: no names, emails, notes, receipt images or IDs, and it cannot change anything. Its answers are general
        information, not financial advice.
      </p>
    </Card>
  );
}
