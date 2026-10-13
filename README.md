# BudgetMe

A calm fortnightly budget in kina. Split each pay into **Needs / Wants / Savings + debt**, log spending by hand or from a receipt photo, track goals, and read plain-rule insights. Built with Vite, React 18, TypeScript, Tailwind and Supabase.

> Personal MVP. Amounts are stored as whole **toea** (K 1 = 100 toea); there are no floats anywhere money is stored or added.

## What's in the box

| Path | What |
|---|---|
| `src/` | The web app (routes in `src/app/App.tsx`, screens in `src/features/*`) |
| `src/lib/` | Pure, unit-tested logic: `money`, `periods`, `engine`, `rules`, `goals`, `history` |
| `supabase/migrations/` | Schema, RLS + MFA enforcement, storage, views/RPCs, advisor schema |
| `supabase/functions/parse-document/` | Receipt / quotation reading (vision model, US$ cap, daily limit) |
| `supabase/functions/delete-account/` | Removes a user's files and account |
| `supabase/tests/database/` | pgTAP: two-user isolation, aal1-after-MFA sees nothing, anon sees nothing |
| `mcp-server/` | Read-only MCP server for Claude Desktop (see its README) |
| `tests/e2e/` | Playwright flows at 1440 / 834 / 390 px |

## Run it locally

Prerequisites: Node 20+, Docker Desktop, [Supabase CLI](https://supabase.com/docs/guides/cli), Deno (for function tests).

```bash
npm install
supabase start                 # prints the API URL and anon key
supabase db reset              # applies migrations + seeds the demo account
cp .env.example .env.local     # set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY from `supabase start`
npm run dev                    # http://localhost:5173
```

Demo login (local only, fake data): `demo@budgetme.local` / `demo-password-123`.
Confirmation emails for new accounts land in Inbucket at http://127.0.0.1:54324.

Receipt reading locally:

```bash
cp .env.example supabase/.env.local   # fill AI_API_KEY etc. (never VITE_*)
supabase functions serve --env-file supabase/.env.local
```

Without an AI key, scanning fails gracefully into manual entry with the photo shown.

Regenerate DB types once the stack runs: `supabase gen types typescript --local > src/types/db.generated.ts`.

## Tests

```bash
npm test                                         # unit + component (Vitest)
npm run test:e2e                                 # Playwright; needs `supabase start` + `db reset`
supabase test db                                 # RLS / MFA / advisor role (pgTAP)
deno test supabase/functions/parse-document/     # Edge Function validation + cost maths
cd mcp-server && npm test                        # tool inputs; with ADVISOR_DB_URL also the read-only role
```

## Deploy

1. Create a Supabase project in the closest region (`<<REGION e.g. ap-southeast-2>>`), then `supabase link --project-ref <<REF>>`.
2. `supabase db push`, `supabase functions deploy parse-document delete-account`.
3. `supabase secrets set AI_API_KEY=… AI_MODEL=claude-opus-5-5 AI_MONTHLY_CAP_USD=5 AI_PRICE_INPUT_PER_MTOK=4 AI_PRICE_OUTPUT_PER_MTOK=20 SCAN_DAILY_LIMIT=30 ALLOWED_ORIGINS=https://<<your site>>`
4. Auth settings: site URL and redirect URLs, email confirmation **on**, minimum password length **12**, TOTP **enabled**.
5. In the AI provider console set a hard monthly spend limit of **US$5** (the outer guard; the function enforces the same cap from `ai_usage`).
6. Frontend: Vercel Hobby (`vercel.json`) or Cloudflare Pages (`public/_headers`); set only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Replace `<<PROJECT_REF>>` in the CSP.
7. `npm run build && npm run check:secrets` must pass.
8. Run `supabase test db` against the hosted project too (two-user and aal1 checks).

## Costs

- Supabase free tier covers a personal budget.
- Receipt reading: one vision call per scan. With `claude-opus-5-5` ($4 / $20 per million tokens in/out) a receipt costs roughly US$0.01–0.02. The app stops reading receipts for the rest of the month at the cap; manual entry always works. Set `AI_MODEL` to a cheaper model and update the `AI_PRICE_*` values to match if you prefer.
- Hosting the frontend on Vercel Hobby or Cloudflare Pages is free.

## Security model

- RLS on every table: owner-only, plus a **restrictive** policy that requires `aal2` once a verified TOTP factor exists. The route guard is only UX.
- Private storage buckets with `{user_id}/…` paths; images are re-encoded in the browser (strips EXIF/GPS) and shown via 10-minute signed URLs.
- Service role and AI keys live only in Edge Function secrets. The MCP server uses a separate read-only role.
- No recovery codes exist in Supabase Auth: enrol a second authenticator from Settings › Security.

## Open-source checklist

- [ ] `LICENSE` holder and licence confirmed
- [ ] gitleaks passes on full history (`gitleaks detect -c .gitleaks.toml`)
- [ ] Screenshots use the demo seed only
