# Contributing to BudgetMe

Thanks for helping. A few rules keep people's money data safe.

## Ground rules

- **Money is whole toea** (`bigint`, K 1 = 100 toea) everywhere. Never add floats. Format only at the edge with `formatMoney`.
- **Security lives in the database.** Every new table gets the two RLS policies in `supabase/migrations/20261012000003_rls.sql` (owner + restrictive MFA). Every new view is `security_invoker = true`.
- **No secrets in the browser.** Only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` may be `VITE_*`. CI runs `npm run check:secrets` and gitleaks.
- **Fake data only** in `supabase/seed.sql`, tests and screenshots.
- Colour never carries meaning alone: pair bucket colours with their names and say "over budget" in words.

## Setup

See the README. Before opening a PR:

```bash
npm run typecheck && npm test && npm run build && npm run check:secrets
supabase test db                                  # RLS + MFA tests
deno test supabase/functions/parse-document/      # Edge Function tests
(cd mcp-server && npm test)
```

## Pre-commit secret scanning

Install [gitleaks](https://github.com/gitleaks/gitleaks) and add `.git/hooks/pre-commit`:

```sh
#!/bin/sh
gitleaks protect --staged --redact -c .gitleaks.toml
```
