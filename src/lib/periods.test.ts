import { getPeriod, listPeriods, periodIndex, periodStart } from './periods';

describe('getPeriod fortnightly', () => {
  const anchor = '2026-07-08';
  it('anchor day is index 0, day 1', () => {
    expect(getPeriod('2026-07-08', anchor, 'fortnightly')).toEqual({ index: 0, start: '2026-07-08', end: '2026-07-21', days: 14, dayOf: 1 });
  });
  it('matches the prototype: six fortnights 8 Jul – 29 Sep, "today" 24 Sep', () => {
    const p = getPeriod('2026-09-24', anchor, 'fortnightly');
    expect(p).toMatchObject({ index: 5, start: '2026-09-16', end: '2026-09-29', dayOf: 9 });
  });
  it('handles dates before the anchor', () => {
    expect(getPeriod('2026-07-07', anchor, 'fortnightly')).toMatchObject({ index: -1, start: '2026-06-24', end: '2026-07-07', dayOf: 14 });
  });
  it('crosses a leap day', () => {
    const p = getPeriod('2028-02-29', '2028-02-20', 'fortnightly');
    expect(p).toMatchObject({ start: '2028-02-20', end: '2028-03-04', days: 14, dayOf: 10 });
  });
});

describe('getPeriod weekly', () => {
  it('7-day periods', () => {
    expect(getPeriod('2026-10-12', '2026-10-01', 'weekly')).toMatchObject({ index: 1, start: '2026-10-08', end: '2026-10-14', days: 7 });
  });
});

describe('getPeriod monthly', () => {
  it('clamps a 31st anchor to month end', () => {
    const anchor = '2026-01-31';
    expect(periodStart(1, anchor, 'monthly')).toBe('2026-02-28');
    expect(periodStart(2, anchor, 'monthly')).toBe('2026-03-31');
    expect(getPeriod('2026-02-27', anchor, 'monthly')).toMatchObject({ index: 0, start: '2026-01-31', end: '2026-02-27', days: 28 });
    expect(getPeriod('2026-02-28', anchor, 'monthly')).toMatchObject({ index: 1, start: '2026-02-28', end: '2026-03-30' });
  });
  it('uses Feb 29 in leap years', () => {
    expect(periodStart(1, '2028-01-30', 'monthly')).toBe('2028-02-29');
    expect(getPeriod('2028-02-29', '2028-01-30', 'monthly')).toMatchObject({ index: 1, start: '2028-02-29', end: '2028-03-29' });
  });
  it('rolls over the year', () => {
    expect(getPeriod('2027-01-03', '2026-11-15', 'monthly')).toMatchObject({ index: 1, start: '2026-12-15', end: '2027-01-14' });
  });
  it('handles dates before the anchor', () => {
    expect(periodIndex('2026-01-10', '2026-03-15', 'monthly')).toBe(-3);
  });
});

describe('listPeriods', () => {
  it('returns newest first, contiguous', () => {
    const ps = listPeriods(0, 3, '2026-07-08', 'fortnightly');
    expect(ps.map((p) => p.index)).toEqual([3, 2, 1, 0]);
    for (let i = 0; i < ps.length - 1; i++) expect(ps[i + 1].end < ps[i].start).toBe(true);
  });
});
