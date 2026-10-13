import { validateGoal } from './GoalForm';

const today = '2026-10-12';
const base = { title: 'Laptop', target: '4,500', starting: '', perPay: '400', date: '' };

describe('validateGoal', () => {
  it('accepts a goal with blank starting balance as zero', () => {
    expect(validateGoal(base, today)).toEqual({
      ok: true,
      values: { title: 'Laptop', target_amount: 450000, starting_balance: 0, per_pay: 40000, target_date: null },
    });
  });
  it('needs a title and target', () => {
    const r = validateGoal({ ...base, title: ' ', target: '' }, today);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors).toMatchObject({ title: 'Give the goal a name.', target: 'Enter an amount.' });
  });
  it('starting balance must be below target', () => {
    const r = validateGoal({ ...base, starting: '4500' }, today);
    expect(!r.ok && r.errors.starting).toBe('Already saved must be less than the target.');
  });
  it('target date cannot be in the past', () => {
    const r = validateGoal({ ...base, date: '2026-10-11' }, today);
    expect(!r.ok && r.errors.date).toBe('Target date is in the past.');
  });
});
