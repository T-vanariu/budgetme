# BudgetMe MCP server

A read-only [Model Context Protocol](https://modelcontextprotocol.io) server that lets Claude Desktop answer questions about your BudgetMe data. It runs on your own computer over **stdio only** (no network port) and connects to Postgres as the `advisor_readonly` role, which can only `SELECT` from the `advisor.*` summary views.

## Tools

| Tool | Input | Returns |
|---|---|---|
| `get_period_summary` | `periods` 1–12 | planned vs spent per bucket, income, split |
| `get_category_trends` | `months` 1–12 | spend per category per pay, change vs 3-pay average |
| `get_goals_status` | none | saved, remaining, per pay, ETA, on track |
| `get_recent_expenses` | `limit` 1–50, optional `category` | date, merchant, category, bucket, amount |
| `simulate_goal` | `target_amount` (kina), `target_date` | pays left, required per pay, free savings, feasible |

Prompt: `fortnightly_review`.

Responses carry amounts in kina (2 decimals) and never include IDs, emails, storage paths or notes.

## One-time database setup

The migration creates `advisor_readonly` as `NOLOGIN` so no password is ever committed. In the Supabase SQL editor (or `psql` as `postgres`):

```sql
alter role advisor_readonly with login password '<<STRONG_RANDOM_PASSWORD>>';
insert into advisor.settings (owner_id) values ('<<your auth.users id>>');
```

Your user id is in Supabase › Authentication › Users.

## Run

```bash
cd mcp-server
cp .env.example .env        # set ADVISOR_DB_URL for advisor_readonly
npm install
npm run build
npm test                    # with ADVISOR_DB_URL set, also proves the role is read-only
```

Add to Claude Desktop's `claude_desktop_config.json` (Settings › Developer › Edit config), using the absolute path:

```json
{
  "mcpServers": {
    "budgetme": { "command": "node", "args": ["C:/Users/you/Desktop/budgetme/mcp-server/dist/index.js"] }
  }
}
```

Restart Claude Desktop; the five tools appear under the tools icon.

## Safety

- `advisor_readonly` has `USAGE` on `advisor` and `SELECT` on five views. No grants on `public.*`, `storage.*`, `auth.*` or `advisor.settings`.
- The role defaults to read-only transactions and a 5 s `statement_timeout`; the pool sets both again.
- The views run as their owner, so the `owner_id` filter inside each view is the only thing scoping the data (see `supabase/migrations/20261012000006_advisor.sql`).
- `.env` is git-ignored. Never put `ADVISOR_DB_URL` in the web app.
- Advice is general information, not financial advice.
