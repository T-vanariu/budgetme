import { allocate, formatMoney, parseMoney } from './money';

describe('parseMoney', () => {
  it.each([
    ['25', 2500],
    ['25.5', 2550],
    ['25.05', 2505],
    ['1,234.56', 123456],
    ['1,234', 123400],
    ['  12.30 ', 1230],
    ['K 40', 4000],
    ['0.01', 1],
    ['100000', 10_000_000],
    ['100,000.00', 10_000_000],
  ])('accepts %s', (input, toea) => {
    expect(parseMoney(input)).toEqual({ ok: true, toea });
  });

  it.each([
    ['', 'empty'],
    ['   ', 'empty'],
    ['abc', 'format'],
    ['12a', 'format'],
    ['1.234', 'format'],
    ['12,34', 'format'],
    ['1,2345', 'format'],
    ['.5', 'format'],
    ['1e3', 'format'],
    ['0', 'not_positive'],
    ['0.00', 'not_positive'],
    ['-5', 'not_positive'],
    ['−12', 'not_positive'],
    ['100000.01', 'too_large'],
    ['999999999999999', 'too_large'],
  ])('rejects %j as %s', (input, reason) => {
    expect(parseMoney(input)).toEqual({ ok: false, reason });
  });
});

describe('formatMoney', () => {
  it('formats lists with 2 decimals', () => {
    expect(formatMoney(123456)).toBe('K 1,234.56');
    expect(formatMoney(5)).toBe('K 0.05');
    expect(formatMoney(0)).toBe('K 0.00');
  });
  it('rounds headline numbers to whole kina', () => {
    expect(formatMoney(123456, { decimals: 0 })).toBe('K 1,235');
    expect(formatMoney(123449, { decimals: 0 })).toBe('K 1,234');
  });
  it('uses a true minus for negatives', () => {
    expect(formatMoney(-1200, { decimals: 0 })).toBe('−K 12');
  });
});

describe('allocate', () => {
  it('always sums to the amount', () => {
    for (const amount of [0, 1, 99, 100, 101, 333333, 250001]) {
      for (const w of [[50, 30, 20], [33, 33, 34], [0, 0, 100], [70, 20, 10]]) {
        const parts = allocate(amount, w);
        expect(parts.reduce((a, b) => a + b, 0)).toBe(amount);
        parts.forEach((p) => expect(Number.isInteger(p)).toBe(true));
      }
    }
  });
  it('splits exactly when divisible', () => {
    expect(allocate(250000, [50, 30, 20])).toEqual([125000, 75000, 50000]);
  });
});
