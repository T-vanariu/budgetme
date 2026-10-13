-- BudgetMe schema. Money is whole toea (bigint, K 1 = 100 toea). Never floats.
create extension if not exists pg_trgm with schema extensions;

-- ---------------------------------------------------------------------------
-- Pay period maths. Must match src/lib/periods.ts exactly.
-- Period 0 starts on the anchor payday; monthly periods clamp to month end
-- (date + interval does the clamping, as addMonths does in TS).
-- ---------------------------------------------------------------------------
create or replace function public.period_start(idx int, anchor date, cycle text)
returns date language sql immutable parallel safe set search_path = '' as $$
  select case cycle
    when 'weekly' then anchor + idx * 7
    when 'fortnightly' then anchor + idx * 14
    else (anchor + make_interval(months => idx))::date
  end
$$;

create or replace function public.period_index(d date, anchor date, cycle text)
returns int language plpgsql immutable parallel safe set search_path = '' as $$
declare
  idx int;
begin
  if cycle = 'weekly' then
    return floor((d - anchor)::numeric / 7)::int;
  elsif cycle = 'fortnightly' then
    return floor((d - anchor)::numeric / 14)::int;
  end if;
  idx := (extract(year from d)::int - extract(year from anchor)::int) * 12
       + (extract(month from d)::int - extract(month from anchor)::int);
  if d < public.period_start(idx, anchor, cycle) then
    idx := idx - 1;
  end if;
  return idx;
end
$$;

create or replace function public.escape_like(s text)
returns text language sql immutable parallel safe set search_path = '' as $$
  select replace(replace(replace(s, '\', '\\'), '%', '\%'), '_', '\_')
$$;

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end
$$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 80),
  currency text not null default 'PGK' check (currency = 'PGK'),
  pay_cycle text not null default 'fortnightly' check (pay_cycle in ('weekly', 'fortnightly', 'monthly')),
  pay_anchor_date date not null default current_date,
  split_need int not null default 50 check (split_need between 0 and 100),
  split_want int not null default 30 check (split_want between 0 and 100),
  split_savings int not null default 20 check (split_savings between 0 and 100),
  side_mode text not null default 'same' check (side_mode in ('same', 'savings', 'custom')),
  side_need int check (side_need between 0 and 100),
  side_want int check (side_want between 0 and 100),
  side_savings int check (side_savings between 0 and 100),
  theme text not null default 'system' check (theme in ('light', 'dark', 'system')),
  wallpaper_preset text not null default 'pastel' check (wallpaper_preset in ('pastel', 'lagoon', 'none', 'harbour', 'bilum', 'dusk')),
  wallpaper_path text,
  wallpaper_dim int not null default 35 check (wallpaper_dim between 0 and 80),
  wallpaper_blur int not null default 0 check (wallpaper_blur between 0 and 20),
  onboarded boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  constraint split_totals_100 check (split_need + split_want + split_savings = 100),
  constraint side_custom_totals_100 check (
    side_mode <> 'custom'
    or (side_need is not null and side_want is not null and side_savings is not null
        and side_need + side_want + side_savings = 100)
  ),
  constraint wallpaper_in_own_folder check (wallpaper_path is null or wallpaper_path like id::text || '/%')
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  bucket text not null check (bucket in ('need', 'want', 'savings')),
  icon text not null default 'circle' check (char_length(icon) <= 40),
  is_default boolean not null default false,
  is_hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  unique (user_id, name),
  unique (id, user_id)
);

create table public.income_sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  kind text not null check (kind in ('salary', 'side_hustle', 'other')),
  expected_amount bigint check (expected_amount is null or expected_amount > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  unique (id, user_id)
);

create table public.income_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  source_id uuid not null,
  amount bigint not null check (amount > 0),
  received_on date not null,
  note text check (char_length(note) <= 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  foreign key (source_id, user_id) references public.income_sources (id, user_id) on delete cascade
);

create table public.receipts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  bucket_id text not null default 'receipts' check (bucket_id in ('receipts', 'documents')),
  storage_path text not null,
  kind text not null default 'receipt' check (kind in ('receipt', 'quotation', 'invoice')),
  status text not null default 'uploaded' check (status in ('uploaded', 'parsing', 'parsed', 'confirmed', 'failed')),
  parsed jsonb,
  error text,
  mime text not null check (mime in ('image/jpeg', 'image/png', 'image/webp', 'application/pdf')),
  bytes int not null check (bytes between 1 and 10485760),
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  unique (id, user_id),
  constraint receipt_in_own_folder check (storage_path like user_id::text || '/%')
);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  amount bigint not null check (amount > 0),
  spent_on date not null,
  merchant text check (char_length(merchant) <= 80),
  category_id uuid not null,
  bucket text not null check (bucket in ('need', 'want', 'savings')),
  note text check (char_length(note) <= 200),
  receipt_id uuid,
  entry_method text not null default 'manual' check (entry_method in ('manual', 'receipt')),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  unique (id, user_id),
  foreign key (category_id, user_id) references public.categories (id, user_id) on delete restrict,
  foreign key (receipt_id, user_id) references public.receipts (id, user_id) on delete set null (receipt_id)
);

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  title text not null check (char_length(title) between 1 and 80),
  kind text not null default 'save_up' check (kind in ('save_up', 'pay_off')),
  target_amount bigint not null check (target_amount > 0),
  starting_balance bigint not null default 0 check (starting_balance >= 0),
  per_pay bigint not null default 0 check (per_pay >= 0),
  target_date date,
  priority int not null default 0,
  document_id uuid,
  status text not null default 'active' check (status in ('active', 'achieved', 'paused')),
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  unique (id, user_id),
  foreign key (document_id, user_id) references public.receipts (id, user_id) on delete set null (document_id)
);

create table public.goal_contributions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  goal_id uuid not null,
  amount bigint not null check (amount > 0),
  contributed_on date not null,
  expense_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  foreign key (goal_id, user_id) references public.goals (id, user_id) on delete cascade,
  foreign key (expense_id, user_id) references public.expenses (id, user_id) on delete set null (expense_id)
);

-- App-wide AI spend ledger. user_id is kept nullable so a deleted account's spend
-- still counts toward the monthly cap.
create table public.ai_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete set null,
  receipt_id uuid references public.receipts on delete set null,
  model text not null,
  input_tokens int not null default 0,
  output_tokens int not null default 0,
  cost_usd_micros bigint not null default 0 check (cost_usd_micros >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
create index expenses_user_spent_idx on public.expenses (user_id, spent_on desc, id desc) where deleted_at is null;
create index expenses_category_idx on public.expenses (category_id);
create index expenses_merchant_trgm on public.expenses using gin (merchant extensions.gin_trgm_ops);
create index income_entries_user_received_idx on public.income_entries (user_id, received_on desc, id desc);
create index income_entries_source_idx on public.income_entries (source_id);
create index goal_contributions_goal_idx on public.goal_contributions (goal_id);
create index goal_contributions_expense_idx on public.goal_contributions (expense_id);
create index receipts_user_idx on public.receipts (user_id, created_at desc);
create index ai_usage_created_idx on public.ai_usage (created_at);
create index ai_usage_user_created_idx on public.ai_usage (user_id, created_at);

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['profiles', 'categories', 'income_sources', 'income_entries', 'receipts',
                           'expenses', 'goals', 'goal_contributions', 'ai_usage']
  loop
    execute format('create trigger set_updated_at before update on public.%I
                    for each row execute function public.set_updated_at()', t);
  end loop;
end
$$;

-- An expense's bucket is copied from its category at insert (and when the category changes on edit).
create or replace function public.expense_copy_bucket()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' or new.category_id is distinct from old.category_id then
    select c.bucket into new.bucket
    from public.categories c
    where c.id = new.category_id and c.user_id = new.user_id;
    if new.bucket is null then
      raise exception 'Unknown category' using errcode = '23503';
    end if;
  end if;
  return new;
end
$$;

create trigger expense_copy_bucket before insert or update of category_id on public.expenses
  for each row execute function public.expense_copy_bucket();
