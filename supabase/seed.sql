-- Local demo account with FAKE data only. Never seed real people or real money here.
-- Sign in at http://localhost:5173 with demo@budgetme.local / demo-password-123
-- (local only; `supabase db reset` re-creates it).

do $$
declare
  uid uuid := '00000000-0000-4000-8000-000000000001';
  anchor date;
  salary_id uuid;
  side_id uuid;
  cat record;
  p int;
  d date;
begin
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) values (
    '00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated',
    'demo@budgetme.local', extensions.crypt('demo-password-123', extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}', '{"display_name":"Demo"}', now(), now(),
    '', '', '', ''
  );

  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), uid, uid::text,
          jsonb_build_object('sub', uid::text, 'email', 'demo@budgetme.local', 'email_verified', true),
          'email', now(), now(), now());

  -- Anchor the fortnight so today falls on day 3 of the current pay.
  anchor := current_date - 2;
  update public.profiles set pay_anchor_date = anchor, onboarded = true where id = uid;

  select id into salary_id from public.income_sources where user_id = uid and kind = 'salary';
  select id into side_id from public.income_sources where user_id = uid and kind = 'side_hustle';
  update public.income_sources set expected_amount = 250000 where id = salary_id;

  -- Six pays: five past plus the current one (index -5 .. 0).
  for p in -5..0 loop
    d := public.period_start(p, anchor, 'fortnightly');
    insert into public.income_entries (user_id, source_id, amount, received_on) values (uid, salary_id, 250000, d);
    if p % 2 = 0 then
      insert into public.income_entries (user_id, source_id, amount, received_on, note)
      values (uid, side_id, 30000 + (p + 5) * 2500, d + 5, 'Buai stall');
    end if;

    for cat in select id, name from public.categories where user_id = uid loop
      if cat.name = 'Rent' then
        insert into public.expenses (user_id, amount, spent_on, merchant, category_id, bucket)
        values (uid, 60000, d, 'Landlord', cat.id, 'need');
      elsif cat.name = 'Groceries' then
        insert into public.expenses (user_id, amount, spent_on, merchant, category_id, bucket)
        values (uid, 18000 + (p + 5) * 900, least(d + 1, current_date), 'Papindo', cat.id, 'need'),
               (uid, 9500, least(d + 8, current_date), 'Stop N Shop', cat.id, 'need');
      elsif cat.name = 'Transport' then
        insert into public.expenses (user_id, amount, spent_on, merchant, category_id, bucket)
        values (uid, 4000, least(d + 2, current_date), 'PMV fares', cat.id, 'need');
      elsif cat.name = 'Phone & data' then
        insert into public.expenses (user_id, amount, spent_on, merchant, category_id, bucket)
        values (uid, 5000, least(d + 3, current_date), 'Digicel', cat.id, 'need');
      elsif cat.name = 'Eating out' then
        insert into public.expenses (user_id, amount, spent_on, merchant, category_id, bucket)
        values (uid, 3500, least(d + 4, current_date), 'Kai bar', cat.id, 'want'),
               (uid, 4200, least(d + 9, current_date), 'Lamana cafe', cat.id, 'want'),
               (uid, 2800, least(d + 11, current_date), 'Kai bar', cat.id, 'want');
      elsif cat.name = 'Entertainment' and p in (-4, -1) then
        insert into public.expenses (user_id, amount, spent_on, merchant, category_id, bucket)
        values (uid, 9000, least(d + 6, current_date), 'Cinema', cat.id, 'want');
      elsif cat.name = 'Savings' and p < 0 then
        insert into public.expenses (user_id, amount, spent_on, merchant, category_id, bucket)
        values (uid, 40000, d + 1, 'Kina Bank saver', cat.id, 'savings');
      end if;
    end loop;
  end loop;

  insert into public.goals (user_id, title, kind, target_amount, starting_balance, per_pay, target_date)
  values (uid, 'Laptop for school', 'save_up', 450000, 50000, 40000, anchor + 140),
         (uid, 'Pay off store credit', 'pay_off', 120000, 30000, 15000, anchor + 84);
end
$$;
