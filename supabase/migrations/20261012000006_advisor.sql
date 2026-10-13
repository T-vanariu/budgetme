-- Read-only data for the local MCP server (Claude Desktop). See mcp-server/README.md.
--
-- These views run as their owner (NOT security_invoker) so they can read the base tables
-- without a user JWT. The `where user_id = (select owner_id from advisor.settings)` filter
-- inside each view is therefore the ONLY thing scoping the data. Review it carefully.
--
-- The role is created NOLOGIN here so no password ever lands in git. Enable it yourself:
--   alter role advisor_readonly with login password '<<STRONG_RANDOM_PASSWORD>>';
-- and set the owner once:
--   insert into advisor.settings (owner_id) values ('<<your auth.users id>>');

create schema if not exists advisor;
revoke all on schema advisor from public, anon, authenticated;

create table advisor.settings (
  owner_id uuid primary key references auth.users on delete cascade,
  singleton boolean not null default true unique check (singleton)
);
revoke all on advisor.settings from public, anon, authenticated;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'advisor_readonly') then
    create role advisor_readonly nologin;
  end if;
end
$$;
alter role advisor_readonly set statement_timeout = '5s';
alter role advisor_readonly set default_transaction_read_only = on;
alter role advisor_readonly set search_path = advisor;

create view advisor.v_period_summary as
with owner as (select owner_id from advisor.settings),
prof as (select p.* from public.profiles p where p.id = (select owner_id from owner)),
ex as (
  select public.period_index(e.spent_on, pr.pay_anchor_date, pr.pay_cycle) as period_index,
         sum(e.amount) filter (where e.bucket = 'need') as spent_need,
         sum(e.amount) filter (where e.bucket = 'want') as spent_want,
         sum(e.amount) filter (where e.bucket = 'savings') as spent_savings,
         count(*) as expense_count
  from public.expenses e, prof pr
  where e.user_id = pr.id and e.deleted_at is null
  group by 1
),
inc as (
  select public.period_index(i.received_on, pr.pay_anchor_date, pr.pay_cycle) as period_index,
         sum(i.amount) as income,
         sum(i.amount) filter (where s.kind = 'salary') as salary,
         sum(i.amount) filter (where s.kind = 'side_hustle') as side
  from public.income_entries i
  join public.income_sources s on s.id = i.source_id, prof pr
  where i.user_id = pr.id
  group by 1
),
keys as (select period_index from ex union select period_index from inc)
select
  k.period_index,
  public.period_start(k.period_index, pr.pay_anchor_date, pr.pay_cycle) as period_start,
  public.period_start(k.period_index + 1, pr.pay_anchor_date, pr.pay_cycle) - 1 as period_end,
  pr.split_need, pr.split_want, pr.split_savings,
  pr.side_mode, pr.side_need, pr.side_want, pr.side_savings,
  coalesce(inc.income, 0)::bigint as income,
  coalesce(inc.salary, 0)::bigint as salary,
  coalesce(inc.side, 0)::bigint as side,
  coalesce(ex.spent_need, 0)::bigint as spent_need,
  coalesce(ex.spent_want, 0)::bigint as spent_want,
  coalesce(ex.spent_savings, 0)::bigint as spent_savings,
  coalesce(ex.expense_count, 0)::int as expense_count
from keys k
cross join prof pr
left join ex on ex.period_index = k.period_index
left join inc on inc.period_index = k.period_index;

create view advisor.v_category_by_period as
select
  public.period_index(e.spent_on, p.pay_anchor_date, p.pay_cycle) as period_index,
  c.name as category,
  c.bucket,
  sum(e.amount)::bigint as total,
  count(*)::int as expense_count
from public.expenses e
join public.categories c on c.id = e.category_id
join public.profiles p on p.id = e.user_id
where e.user_id = (select owner_id from advisor.settings)
  and e.deleted_at is null
group by 1, 2, 3;

create view advisor.v_goal_status as
select
  g.title,
  g.kind,
  g.status,
  g.target_amount,
  g.per_pay,
  g.target_date,
  (g.starting_balance + coalesce(sum(gc.amount), 0))::bigint as saved,
  p.pay_anchor_date,
  p.pay_cycle
from public.goals g
join public.profiles p on p.id = g.user_id
left join public.goal_contributions gc
  on gc.goal_id = g.id
  and not exists (select 1 from public.expenses e where e.id = gc.expense_id and e.deleted_at is not null)
where g.user_id = (select owner_id from advisor.settings)
group by g.id, p.pay_anchor_date, p.pay_cycle;

-- No ids, notes, receipt paths or images.
create view advisor.v_expenses_recent as
select e.spent_on, e.merchant, c.name as category, e.bucket, e.amount
from public.expenses e
join public.categories c on c.id = e.category_id
where e.user_id = (select owner_id from advisor.settings)
  and e.deleted_at is null;

-- Profile settings needed by simulate_goal (split, pay cycle). No name, email or wallpaper.
create view advisor.v_plan as
select p.pay_cycle, p.pay_anchor_date, p.split_need, p.split_want, p.split_savings,
       p.side_mode, p.side_need, p.side_want, p.side_savings
from public.profiles p
where p.id = (select owner_id from advisor.settings);

revoke all on all tables in schema advisor from public, anon, authenticated;
grant usage on schema advisor to advisor_readonly;
grant select on advisor.v_period_summary, advisor.v_category_by_period,
             advisor.v_goal_status, advisor.v_expenses_recent, advisor.v_plan to advisor_readonly;
-- Deliberately no grants on public.*, storage.*, auth.* or advisor.settings.
