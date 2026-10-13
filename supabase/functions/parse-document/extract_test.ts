// Run with: deno test supabase/functions/parse-document/extract_test.ts
import { assertEquals } from 'jsr:@std/assert@1';
import { costMicros, startOfUtcMonth, validateModelOutput } from './extract.ts';

const cats = ['Groceries', 'Eating out'];
const good = {
  docType: 'receipt',
  merchant: 'Papindo Waigani',
  date: '2026-10-11',
  currency: 'PGK',
  total: 123.45,
  lineItems: [{ description: 'Rice 10kg', qty: 1, amount: 89.9 }],
  validUntil: null,
  suggestedCategory: 'Groceries',
  confidence: 0.92,
};

Deno.test('converts kina to toea', () => {
  const r = validateModelOutput(JSON.stringify(good), cats);
  assertEquals(r.ok, true);
  if (r.ok) {
    assertEquals(r.parsed.total, 12345);
    assertEquals(r.parsed.lineItems[0].amount, 8990);
    assertEquals(r.parsed.confidence, 0.92);
  }
});

Deno.test('rejects malformed JSON', () => {
  assertEquals(validateModelOutput('{"total": 12', cats), { ok: false, error: 'invalid_output' });
  assertEquals(validateModelOutput('not json', cats), { ok: false, error: 'invalid_output' });
});

Deno.test('rejects wrong shapes', () => {
  assertEquals(validateModelOutput(JSON.stringify({ ...good, total: 'K 12' }), cats).ok, false);
  assertEquals(validateModelOutput(JSON.stringify({ ...good, total: -5 }), cats).ok, false);
  assertEquals(validateModelOutput(JSON.stringify({ ...good, confidence: 3 }), cats).ok, false);
});

Deno.test('non-PGK documents get zero confidence', () => {
  const r = validateModelOutput(JSON.stringify({ ...good, currency: 'AUD' }), cats);
  assertEquals(r.ok && r.parsed.confidence, 0);
});

Deno.test('unknown category falls back to the first one', () => {
  const r = validateModelOutput(JSON.stringify({ ...good, suggestedCategory: 'Weapons' }), cats);
  assertEquals(r.ok && r.parsed.suggestedCategory, 'Groceries');
});

Deno.test('cost in micros', () => {
  // 2,000 input at $4/MTok + 300 output at $20/MTok = $0.008 + $0.006 = 14,000 micros
  assertEquals(costMicros(2000, 300, 4, 20), 14000);
});

Deno.test('month start is UTC', () => {
  assertEquals(startOfUtcMonth(new Date('2026-10-12T05:00:00+10:00')), '2026-10-01T00:00:00.000Z');
});
