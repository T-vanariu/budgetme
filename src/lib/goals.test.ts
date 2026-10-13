import { toea } from '@/types/domain';
import { projectGoal } from './goals';
import { periodByIndex } from './periods';

const ctx = { today: '2026-10-12', anchor: '2026-10-07', cycle: 'fortnightly' as const }; // today is in period 0
const goal = (targetDate: string | null, perPay = 0, startingBalance = 0) => ({
  targetAmount: toea(600000),
  startingBalance: toea(startingBalance),
  perPay: toea(perPay),
  targetDate,
});

describe('projectGoal required per pay', () => {
  it.each([
    [1, 600000],
    [6, 100000],
    [26, 23077],
  ])('%i remaining pays', (pays, required) => {
    const target = periodByIndex(pays - 1, ctx.anchor, ctx.cycle).end;
    const p = projectGoal(goal(target), [], ctx);
    expect(p.paysLeft).toBe(pays);
    expect(p.requiredPerPay).toBe(required);
  });

  it('counts contributions and starting balance', () => {
    const target = periodByIndex(5, ctx.anchor, ctx.cycle).end;
    const p = projectGoal(goal(target, 0, 100000), [{ amount: toea(200000) }], ctx);
    expect(p.saved).toBe(300000);
    expect(p.remaining).toBe(300000);
    expect(p.requiredPerPay).toBe(50000);
    expect(p.pct).toBe(50);
  });
});

describe('projectGoal ETA and pace', () => {
  it('is on track when per pay reaches the target in time', () => {
    const target = periodByIndex(5, ctx.anchor, ctx.cycle).end;
    const p = projectGoal(goal(target, 100000), [], ctx);
    expect(p.eta).toBe(target);
    expect(p.onTrack).toBe(true);
  });
  it('slips when per pay is too small', () => {
    const target = periodByIndex(5, ctx.anchor, ctx.cycle).end;
    const p = projectGoal(goal(target, 50000), [], ctx);
    expect(p.eta! > target).toBe(true);
    expect(p.onTrack).toBe(false);
  });
  it('has no ETA with nothing planned', () => {
    expect(projectGoal(goal(null), [], ctx)).toMatchObject({ eta: null, onTrack: false, paysLeft: null });
  });
  it('achieved goals are on track', () => {
    expect(projectGoal(goal('2026-01-01', 0, 600000), [], ctx)).toMatchObject({ remaining: 0, onTrack: true, requiredPerPay: 0 });
  });
  it('past target date needs everything now', () => {
    expect(projectGoal(goal('2026-01-01'), [], ctx)).toMatchObject({ paysLeft: 0, requiredPerPay: 600000 });
  });
});
