-- pgTAP: run with `supabase test db` (local) or psql against the hosted project.
-- Proves: two users cannot see each other's rows; anon sees nothing; an aal1 session
-- sees nothing once MFA is enrolled; advisor_readonly cannot write or read public.*.
begin;
create extension if not exists pgtap with schema extensions;
select plan(16);

-- Two users (the new-user trigger seeds profile, categories and income sources).
insert into auth.users (id, email, aud, role) values
  ('11111111-1111-4111-8111-111111111111', 'a@test.local', 'authenticated', 'authenticated'),
  ('22222222-2222-4222-8222-222222222222', 'b@test.local', 'authenticated', 'authenticated');

insert into public.expenses (user_id, amount, spent_on, category_id, bucket)
select '11111111-1111-4111-8111-111111111111', 1234, current_date, id, 'need'
from public.categories where user_id = '11111111-1111-4111-8111-111111111111' and name = 'Rent';

insert into storage.objects (bucket_id, name, owner_id)
values ('receipts', '11111111-1111-4111-8111-111111111111/r.jpg', '11111111-1111-4111-8111-111111111111');

-- Helper: become a user with a given aal.
create or replace function pg_temp.login(uid uuid, aal text) returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', uid, 'role', 'authenticated', 'aal', aal)::text, true);
end $$;

-- User B (aal1, no MFA) sees only their own data.
select pg_temp.login('22222222-2222-4222-8222-222222222222', 'aal1');
select is((select count(*) from public.expenses)::int, 0, 'B cannot see A''s expenses');
select is((select count(*) from public.profiles)::int, 1, 'B sees only their own profile');
select is((select count(*) from public.categories where user_id = '11111111-1111-4111-8111-111111111111')::int, 0, 'B cannot see A''s categories');
select is((select count(*) from storage.objects where bucket_id = 'receipts')::int, 0, 'B cannot see A''s files');
select is((select count(*) from public.v_period_summary)::int, 0, 'B sees no summary rows of A');

update public.expenses set amount = 1 where user_id = '11111111-1111-4111-8111-111111111111';
reset role;
select is((select amount from public.expenses where user_id = '11111111-1111-4111-8111-111111111111'), 1234::bigint, 'B cannot update A''s expense');

select pg_temp.login('22222222-2222-4222-8222-222222222222', 'aal1');
select throws_ok(
  $$insert into public.expenses (user_id, amount, spent_on, category_id, bucket)
    select '11111111-1111-4111-8111-111111111111', 5, current_date, id, 'need' from public.categories limit 1$$,
  '42501', null, 'B cannot insert rows for A');

-- A (aal1, no MFA yet) sees their row.
select pg_temp.login('11111111-1111-4111-8111-111111111111', 'aal1');
select is((select count(*) from public.expenses)::int, 1, 'A sees own expense before MFA');

-- Enrol a verified factor for A: aal1 now sees nothing, aal2 sees everything.
reset role;
insert into auth.mfa_factors (id, user_id, friendly_name, factor_type, status, created_at, updated_at)
values (gen_random_uuid(), '11111111-1111-4111-8111-111111111111', 'phone', 'totp', 'verified', now(), now());

select pg_temp.login('11111111-1111-4111-8111-111111111111', 'aal1');
select is((select count(*) from public.expenses)::int, 0, 'aal1 sees no expenses once MFA is enrolled');
select is((select count(*) from public.profiles)::int, 0, 'aal1 sees no profile once MFA is enrolled');
select is((select count(*) from storage.objects where bucket_id = 'receipts')::int, 0, 'aal1 sees no files once MFA is enrolled');

select pg_temp.login('11111111-1111-4111-8111-111111111111', 'aal2');
select is((select count(*) from public.expenses)::int, 1, 'aal2 sees own expense');
select is((select count(*) from storage.objects where bucket_id = 'receipts')::int, 1, 'aal2 sees own file');

-- anon sees nothing.
reset role;
set local role anon;
select throws_ok('select count(*) from public.expenses', '42501', null, 'anon has no access to expenses');

-- advisor_readonly cannot read public tables or write anything.
reset role;
set local role advisor_readonly;
select throws_ok('select count(*) from public.expenses', '42501', null, 'advisor cannot read public.expenses');
select throws_ok('select owner_id from advisor.settings', '42501', null, 'advisor cannot read advisor.settings');

reset role;
select * from finish();
rollback;
