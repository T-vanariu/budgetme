#!/usr/bin/env node
// BudgetMe advisor: read-only MCP server over stdio for Claude Desktop. No network port.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  FORTNIGHTLY_REVIEW,
  getCategoryTrends,
  getGoalsStatus,
  getPeriodSummary,
  getRecentExpenses,
  schemas,
  simulateGoal,
  type Query,
} from './tools.js';

// Load mcp-server/.env (git-ignored) without extra dependencies.
function loadEnv() {
  const file = join(dirname(fileURLToPath(import.meta.url)), '..', '.env');
  try {
    for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
      if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  } catch {
    /* no .env: rely on the environment */
  }
}
loadEnv();

const url = process.env.ADVISOR_DB_URL;
if (!url) {
  console.error('ADVISOR_DB_URL is not set. See mcp-server/.env.example.');
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString: url,
  max: 2,
  // Belt and braces on top of the role settings: 5 s limit, read-only transactions.
  options: '-c statement_timeout=5000 -c default_transaction_read_only=on',
});

const query: Query = async (sql, params = []) => (await pool.query(sql, params)).rows;

type Handler<A> = (args: A) => Promise<unknown>;
function safe<A>(fn: Handler<A>) {
  return async (args: A) => {
    try {
      const data = await fn(args);
      return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
    } catch (e) {
      // Short message only: never a stack trace or SQL.
      console.error('tool error:', e instanceof Error ? e.message : 'unknown');
      return { isError: true, content: [{ type: 'text' as const, text: 'Could not read your budget right now. Check the advisor database connection.' }] };
    }
  };
}

const server = new McpServer({ name: 'budgetme', version: '0.1.0' });

server.registerTool(
  'get_period_summary',
  { title: 'Pay period summary', description: 'Planned vs spent per bucket (needs, wants, savings + debt) and income for recent pay periods. Amounts in kina.', inputSchema: schemas.get_period_summary },
  safe((a: { periods: number }) => getPeriodSummary(query, a)),
);
server.registerTool(
  'get_category_trends',
  { title: 'Category trends', description: 'Spend per category per pay period, with the change against the previous 3-pay average.', inputSchema: schemas.get_category_trends },
  safe((a: { months: number }) => getCategoryTrends(query, a)),
);
server.registerTool(
  'get_goals_status',
  { title: 'Goals status', description: 'Each goal: saved, remaining, per-pay amount, ETA and whether it is on track.', inputSchema: schemas.get_goals_status },
  safe(() => getGoalsStatus(query)),
);
server.registerTool(
  'get_recent_expenses',
  { title: 'Recent expenses', description: 'Most recent expenses: date, merchant, category, bucket, amount. No notes or receipt images.', inputSchema: schemas.get_recent_expenses },
  safe((a: { limit: number; category?: string }) => getRecentExpenses(query, a)),
);
server.registerTool(
  'simulate_goal',
  { title: 'Simulate a goal', description: 'Pure calculation: pays left, required per pay, free savings per pay and whether a new goal is feasible.', inputSchema: schemas.simulate_goal },
  safe((a: { target_amount: number; target_date: string }) => simulateGoal(query, a)),
);

server.registerPrompt(
  'fortnightly_review',
  { title: 'Fortnightly review', description: 'Review the last pay, top leaks, goal pace and three actions.' },
  () => ({ messages: [{ role: 'user' as const, content: { type: 'text' as const, text: FORTNIGHTLY_REVIEW } }] }),
);

await server.connect(new StdioServerTransport());

const shutdown = async () => {
  await pool.end().catch(() => {});
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
