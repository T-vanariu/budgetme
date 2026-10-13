import { test } from 'node:test';
import assert from 'node:assert/strict';
import { z } from 'zod';
import pg from 'pg';
import { getGoalsStatus, getPeriodSummary, getRecentExpenses, schemas, simulateGoal, type Query } from './tools.js';

const plan = {
  pay_cycle: 'fortnightly', pay_anchor_date: '2026-10-07',
  split_need: 50, split_want: 30, split_savings: 20,
  side_mode: 'savings', side_need: null, side_want: null, side_savings: null,
};

/** Fake query: answers by matching the view name, records SQL for assertions. */
function fake(tables: Record<string, Record<string, unknown>[]>) {
  const calls: { sql: string; params: unknown[] }[] = [];
  const q: Query = async (sql, params = []) => {
    calls.push({ sql, params });
    for (const [name, rows] of Object.entries(tables)) if (sql.includes(name) && !(name === 'v_goal_status' && sql.includes('sum(per_pay)'))) return rows;
    if (sql.includes('sum(per_pay)')) return [{ per_pay: 30000 }];
    return [];
  };
  return { q, calls };
}

test('tool inputs out of range are rejected', () => {
  assert.equal(z.object(schemas.get_period_summary).safeParse({ periods: 13 }).success, false);
  assert.equal(z.object(schemas.get_period_summary).safeParse({ periods: 0 }).success, false);
  assert.equal(z.object(schemas.get_category_trends).safeParse({ months: 1.5 }).success, false);
  assert.equal(z.object(schemas.get_recent_expenses).safeParse({ limit: 51 }).success, false);
  assert.equal(z.object(schemas.simulate_goal).safeParse({ target_amount: -1, target_date: '2027-01-01' }).success, false);
  assert.equal(z.object(schemas.simulate_goal).safeParse({ target_amount: 100, target_date: 'soon' }).success, false);
  assert.equal(z.object(schemas.get_recent_expenses).safeParse({ limit: 10, category: 'Groceries' }).success, true);
});

test('period summary returns kina, planned per bucket and no ids', async () => {
  const { q, calls } = fake({
    v_plan: [plan],
    v_period_summary: [{
      period_index: 0, period_start: '2026-10-07', period_end: '2026-10-20', income: 280000, salary: 250000, side: 30000,
      spent_need: 50000, spent_want: 10000, spent_savings: 40000, expense_count: 7,
    }],
  });
  const r = await getPeriodSummary(q, { periods: 3 });
  assert.deepEqual(r.periods[0].planned, { needs: 1250, wants: 750, savings_debt: 800 });
  assert.deepEqual(r.periods[0].left, { needs: 750, wants: 650, savings_debt: 400 });
  assert.equal(r.periods[0].income, 2800);
  assert.ok(!JSON.stringify(r).includes('"id"'));
  assert.deepEqual(calls.at(-1)!.params, [3]); // parameterised, not interpolated
});

test('recent expenses are parameterised and carry no notes', async () => {
  const { q, calls } = fake({ v_expenses_recent: [{ spent_on: '2026-10-10', merchant: 'Papindo', category: 'Groceries', bucket: 'need', amount: 12345 }] });
  const r = await getRecentExpenses(q, { limit: 5, category: "x'; drop table" });
  assert.deepEqual(r.expenses[0], { date: '2026-10-10', merchant: 'Papindo', category: 'Groceries', bucket: 'need', amount: 123.45 });
  assert.deepEqual(calls[0].params, [5, "x'; drop table"]);
  assert.ok(!calls[0].sql.includes('drop table'));
});

test('goal status computes required per pay and pace', async () => {
  const { q } = fake({
    v_goal_status: [{ title: 'Laptop', kind: 'save_up', status: 'active', target_amount: 600000, saved: 0, per_pay: 100000, target_date: '2026-12-29', pay_anchor_date: '2026-10-07', pay_cycle: 'fortnightly' }],
  });
  const r = await getGoalsStatus(q, '2026-10-12');
  assert.equal(r.goals[0].pays_left, 6);
  assert.equal(r.goals[0].required_per_pay, 1000);
  assert.equal(r.goals[0].on_track, true);
});

test('simulate_goal reports feasibility from free savings', async () => {
  const { q } = fake({ v_plan: [plan], v_period_summary: [{ salary: 250000, side: 30000 }] });
  const r = await simulateGoal(q, { target_amount: 1200, target_date: '2026-12-29' }, '2026-10-12');
  // savings plan = 20% of 2,500 + all 300 side = 800; committed 300; free 500; needs 200 x 6 pays
  assert.equal(r.pays_left, 6);
  assert.equal(r.required_per_pay, 200);
  assert.equal(r.free_savings_per_pay, 500);
  assert.equal(r.feasible, true);
});

// Runs only when ADVISOR_DB_URL points at a database with the migrations applied.
const dbUrl = process.env.ADVISOR_DB_URL;
test('read-only role cannot write or read base tables', { skip: !dbUrl && 'set ADVISOR_DB_URL to run' }, async () => {
  const client = new pg.Client({ connectionString: dbUrl });
  await client.connect();
  try {
    await assert.rejects(client.query('select count(*) from public.expenses'), /permission denied/);
    await assert.rejects(client.query('select * from advisor.settings'), /permission denied/);
    await assert.rejects(client.query("insert into public.goals (title, target_amount) values ('x', 1)"), /permission denied|read-only/);
    await assert.rejects(client.query('create table advisor.evil (id int)'), /permission denied|read-only/);
    await client.query('select count(*) from advisor.v_period_summary'); // allowed
  } finally {
    await client.end();
  }
});
