vi.mock('@/lib/supabase', () => ({ supabase: {} }));
import { toCsv } from './export';

describe('toCsv', () => {
  it('quotes cells and neutralises spreadsheet formulas', () => {
    expect(toCsv(['a', 'b'], [['=SUM(A1)', 'he said "hi"'], [null, 5]])).toBe('"a","b"\r\n"\'=SUM(A1)","he said ""hi"""\r\n"","5"');
  });
});
