-- Row level security. Enforcement lives here, not in the UI.
-- 1. Every table: the owner can do everything to their own rows.
-- 2. Every table: a RESTRICTIVE policy requires aal2 once the user has a verified MFA factor.
-- No policies for anon, so anon sees nothing.

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

-- True when the session is aal2, or when the user has no verified factor yet.
-- Security definer so it can read auth.mfa_factors; search_path pinned.
create or replace function private.mfa_ok()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(auth.jwt() ->> 'aal', '') = 'aal2'
      or not exists (
        select 1 from auth.mfa_factors f
        where f.user_id = auth.uid() and f.status = 'verified'
      )
$$;
revoke all on function private.mfa_ok() from public;
grant execute on function private.mfa_ok() to authenticated;

alter table public.profiles enable row level security;
create policy "owner can do everything" on public.profiles
  for all to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));
create policy "mfa when enrolled" on public.profiles
  as restrictive for all to authenticated
  using ((select private.mfa_ok()));

do $$
declare t text;
begin
  foreach t in array array['categories', 'income_sources', 'income_entries', 'receipts',
                           'expenses', 'goals', 'goal_contributions']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format($p$create policy "owner can do everything" on public.%I
      for all to authenticated
      using (user_id = (select auth.uid()))
      with check (user_id = (select auth.uid()))$p$, t);
    execute format($p$create policy "mfa when enrolled" on public.%I
      as restrictive for all to authenticated
      using ((select private.mfa_ok()))$p$, t);
  end loop;
end
$$;

-- ai_usage: users may read their own rows; only the Edge Function (service role) writes.
alter table public.ai_usage enable row level security;
create policy "owner can read" on public.ai_usage
  for select to authenticated
  using (user_id = (select auth.uid()));
create policy "mfa when enrolled" on public.ai_usage
  as restrictive for all to authenticated
  using ((select private.mfa_ok()));

-- Belt and braces: anon gets no table privileges at all.
revoke all on all tables in schema public from anon;
revoke all on public.ai_usage from authenticated;
grant select on public.ai_usage to authenticated;
