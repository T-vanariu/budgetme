import { toea, type Split } from '@/types/domain';
import { isValidSplit, planPeriod } from './engine';

const split: Split = [50, 30, 20];
const expenses = [
  { amount: toea(40000), bucket: 'need' as const, deletedAt: null },
  { amount: toea(15000), bucket: 'want' as const, deletedAt: null },
  { amount: toea(99999), bucket: 'want' as const, deletedAt: '2026-10-01T00:00:00Z' },
];

describe('planPeriod', () => {
  it('same: side income follows the salary split', () => {
    const [n, w, s] = planPeriod({ salary: toea(200000), side: toea(50000), split, sideAllocation: { mode: 'same' }, expenses });
    expect([n.planned, w.planned, s.planned]).toEqual([125000, 75000, 50000]);
    expect([n.plannedFromSide, w.plannedFromSide, s.plannedFromSide]).toEqual([25000, 15000, 10000]);
    expect(n.spent).toBe(40000);
    expect(w.spent).toBe(15000); // soft-deleted row ignored
    expect(n.left).toBe(85000);
    expect(n.usedPct).toBe(32);
  });

  it('savings: all side income goes to savings', () => {
    const [n, w, s] = planPeriod({ salary: toea(200000), side: toea(50000), split, sideAllocation: { mode: 'savings' }, expenses: [] });
    expect([n.planned, w.planned, s.planned]).toEqual([100000, 60000, 90000]);
  });

  it('custom: uses its own split when it totals 100', () => {
    const [n, w, s] = planPeriod({ salary: toea(200000), side: toea(50000), split, sideAllocation: { mode: 'custom', split: [10, 10, 80] }, expenses: [] });
    expect([n.plannedFromSide, w.plannedFromSide, s.plannedFromSide]).toEqual([5000, 5000, 40000]);
    expect([n.planned, w.planned, s.planned]).toEqual([105000, 65000, 80000]);
  });

  it('custom: falls back to the salary split when invalid', () => {
    const [n, w, s] = planPeriod({ salary: toea(0), side: toea(50000), split, sideAllocation: { mode: 'custom', split: [10, 10, 70] }, expenses: [] });
    expect([n.planned, w.planned, s.planned]).toEqual([25000, 15000, 10000]);
  });

  it('is exact to the toea with awkward amounts', () => {
    const plans = planPeriod({ salary: toea(100001), side: toea(333), split: [33, 33, 34], sideAllocation: { mode: 'same' }, expenses: [] });
    expect(plans.reduce((a, p) => a + p.planned, 0)).toBe(100334);
  });

  it('reports overspend as negative left', () => {
    const [n] = planPeriod({ salary: toea(10000), side: toea(0), split, sideAllocation: { mode: 'same' }, expenses });
    expect(n.left).toBe(-35000);
    expect(n.usedPct).toBe(800);
  });
});

describe('isValidSplit', () => {
  it('requires whole numbers totalling 100', () => {
    expect(isValidSplit([50, 30, 20])).toBe(true);
    expect(isValidSplit([50, 30, 21])).toBe(false);
    expect(isValidSplit([50.5, 29.5, 20])).toBe(false);
    expect(isValidSplit([-10, 90, 20])).toBe(false);
  });
});
