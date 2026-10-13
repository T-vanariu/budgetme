-- Views read by charts, history and insights. security_invoker so RLS on the base tables applies,
-- including the restrictive MFA policy. No storage paths are exposed here.

create view public.v_pay_periods with (security_invoker = true, security_barrier = true) as
select
  p.id as user_id,
  g.idx as period_index,
  public.period_start(g.idx, p.pay_anchor_date, p.pay_cycle) as period_start,
  public.period_start(g.idx + 1, p.pay_anchor_date, p.pay_cycle) - 1 as period_end
from public.profiles p
cross join lateral (
  select
    public.period_index(current_date, p.pay_anchor_date, p.pay_cycle) as hi,
    least(
      public.period_index(current_date, p.pay_anchor_date, p.pay_cycle),
      (select public.period_index(min(e.spent_on), p.pay_anchor_date, p.pay_cycle)
         from public.expenses e where e.user_id = p.id and e.deleted_at is null),
      (select public.period_index(min(i.received_on), p.pay_anchor_date, p.pay_cycle)
         from public.income_entries i where i.user_id = p.id)
    ) as lo
) b
cross join lateral generate_series(b.lo, b.hi) as g(idx);

create view public.v_period_summary with (security_invoker = true, security_barrier = true) as
with ex as (
  select
    e.user_id,
    public.period_index(e.spent_on, p.pay_anchor_date, p.pay_cycle) as period_index,
    sum(e.amount) filter (where e.bucket = 'need') as spent_need,
    sum(e.amount) filter (where e.bucket = 'want') as spent_want,
    sum(e.amount) filter (where e.bucket = 'savings') as spent_savings,
    count(*) as expense_count
  from public.expenses e
  join public.profiles p on p.id = e.user_id
  where e.deleted_at is null
  group by 1, 2
),
inc as (
  select
    i.user_id,
    public.period_index(i.received_on, p.pay_anchor_date, p.pay_cycle) as period_index,
    sum(i.amount) as income,
    sum(i.amount) filter (where s.kind = 'salary') as salary,
    sum(i.amount) filter (where s.kind = 'side_hustle') as side,
    count(*) as income_count
  from public.income_entries i
  join public.income_sources s on s.id = i.source_id
  join public.profiles p on p.id = i.user_id
  group by 1, 2
),
keys as (
  select user_id, period_index from ex
  union
  select user_id, period_index from inc
)
select
  k.user_id,
  k.period_index,
  public.period_start(k.period_index, p.pay_anchor_date, p.pay_cycle) as period_start,
  public.period_start(k.period_index + 1, p.pay_anchor_date, p.pay_cycle) - 1 as period_end,
  coalesce(inc.income, 0)::bigint as income,
  coalesce(inc.salary, 0)::bigint as salary,
  coalesce(inc.side, 0)::bigint as side,
  coalesce(ex.spent_need, 0)::bigint as spent_need,
  coalesce(ex.spent_want, 0)::bigint as spent_want,
  coalesce(ex.spent_savings, 0)::bigint as spent_savings,
  (coalesce(ex.spent_need, 0) + coalesce(ex.spent_want, 0) + coalesce(ex.spent_savings, 0))::bigint as spent,
  (coalesce(inc.income, 0) - coalesce(ex.spent_need, 0) - coalesce(ex.spent_want, 0) - coalesce(ex.spent_savings, 0))::bigint as left_over,
  coalesce(ex.expense_count, 0)::int as expense_count,
  coalesce(inc.income_count, 0)::int as income_count
from keys k
join public.profiles p on p.id = k.user_id
left join ex on ex.user_id = k.user_id and ex.period_index = k.period_index
left join inc on inc.user_id = k.user_id and inc.period_index = k.period_index;

create view public.v_category_by_period with (security_invoker = true, security_barrier = true) as
select
  e.user_id,
  public.period_index(e.spent_on, p.pay_anchor_date, p.pay_cycle) as period_index,
  e.category_id,
  c.name as category_name,
  c.bucket,
  sum(e.amount)::bigint as total,
  count(*)::int as expense_count
from public.expenses e
join public.categories c on c.id = e.category_id
join public.profiles p on p.id = e.user_id
where e.deleted_at is null
group by 1, 2, 3, 4, 5;

create view public.v_goal_status with (security_invoker = true, security_barrier = true) as
select
  g.id,
  g.user_id,
  g.title,
  g.kind,
  g.target_amount,
  g.starting_balance,
  g.per_pay,
  g.target_date,
  g.priority,
  g.status,
  g.document_id,
  (g.starting_balance + coalesce(sum(gc.amount), 0))::bigint as saved,
  count(gc.id)::int as contribution_count
from public.goals g
left join public.goal_contributions gc
  on gc.goal_id = g.id
  and not exists (select 1 from public.expenses e where e.id = gc.expense_id and e.deleted_at is not null)
group by g.id;

create view public.v_expenses_recent with (security_invoker = true, security_barrier = true) as
select e.id, e.user_id, e.spent_on, e.merchant, c.name as category, e.bucket, e.amount, e.entry_method
from public.expenses e
join public.categories c on c.id = e.category_id
where e.deleted_at is null;

-- ---------------------------------------------------------------------------
-- History RPCs (security invoker: RLS applies). Ranges are inclusive dates.
-- ---------------------------------------------------------------------------

-- One page of expenses, newest first, keyset paginated on (spent_on, id).
create or replace function public.list_expenses(
  p_from date,
  p_to date,
  p_bucket text default null,
  p_q text default null,
  p_before_date date default null,
  p_before_id uuid default null,
  p_limit int default 50
)
returns table (
  id uuid, amount bigint, spent_on date, merchant text, note text,
  category_id uuid, category_name text, category_icon text, bucket text,
  receipt_id uuid, entry_method text
)
language sql stable security invoker set search_path = '' as $$
  select e.id, e.amount, e.spent_on, e.merchant, e.note,
         e.category_id, c.name, c.icon, e.bucket,
         e.receipt_id, e.entry_method
  from public.expenses e
  join public.categories c on c.id = e.category_id
  where e.user_id = (select auth.uid())
    and e.deleted_at is null
    and e.spent_on between p_from and p_to
    and (p_bucket is null or e.bucket = p_bucket)
    and (coalesce(p_q, '') = ''
         or e.merchant ilike '%' || public.escape_like(p_q) || '%'
         or c.name ilike '%' || public.escape_like(p_q) || '%')
    and (p_before_date is null or (e.spent_on, e.id) < (p_before_date, p_before_id))
  order by e.spent_on desc, e.id desc
  limit least(greatest(coalesce(p_limit, 50), 1), 100)
$$;

-- Totals for exactly the rows list_expenses would return across all pages.
create or replace function public.expense_stats(
  p_from date,
  p_to date,
  p_bucket text default null,
  p_q text default null
)
returns jsonb
language sql stable security invoker set search_path = '' as $$
  with f as (
    select e.amount, c.name as cat,
           public.period_index(e.spent_on, p.pay_anchor_date, p.pay_cycle) as idx
    from public.expenses e
    join public.categories c on c.id = e.category_id
    join public.profiles p on p.id = e.user_id
    where e.user_id = (select auth.uid())
      and e.deleted_at is null
      and e.spent_on between p_from and p_to
      and (p_bucket is null or e.bucket = p_bucket)
      and (coalesce(p_q, '') = ''
           or e.merchant ilike '%' || public.escape_like(p_q) || '%'
           or c.name ilike '%' || public.escape_like(p_q) || '%')
  ),
  per as (select idx, sum(amount)::bigint as total, count(*)::int as n from f group by idx),
  top as (select cat, sum(amount)::bigint as t from f group by cat order by t desc, cat limit 1)
  select jsonb_build_object(
    'total', coalesce((select sum(amount) from f), 0)::bigint,
    'count', (select count(*) from f),
    'by_period', coalesce((select jsonb_agg(jsonb_build_object('period_index', idx, 'total', total, 'count', n) order by idx desc) from per), '[]'::jsonb),
    'top_category', (select jsonb_build_object('name', cat, 'total', t) from top)
  )
$$;

-- One page of income entries, newest first.
create or replace function public.list_income(
  p_from date,
  p_to date,
  p_before_date date default null,
  p_before_id uuid default null,
  p_limit int default 50
)
returns table (id uuid, amount bigint, received_on date, note text, source_id uuid, source_name text, kind text)
language sql stable security invoker set search_path = '' as $$
  select i.id, i.amount, i.received_on, i.note, i.source_id, s.name, s.kind
  from public.income_entries i
  join public.income_sources s on s.id = i.source_id
  where i.user_id = (select auth.uid())
    and i.received_on between p_from and p_to
    and (p_before_date is null or (i.received_on, i.id) < (p_before_date, p_before_id))
  order by i.received_on desc, i.id desc
  limit least(greatest(coalesce(p_limit, 50), 1), 100)
$$;

revoke all on public.v_pay_periods, public.v_period_summary, public.v_category_by_period,
              public.v_goal_status, public.v_expenses_recent from anon;
revoke execute on function public.list_expenses, public.expense_stats, public.list_income from anon, public;
grant execute on function public.list_expenses, public.expense_stats, public.list_income to authenticated;
