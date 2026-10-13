import { passwordScore, registerSchema, signInSchema, totpSchema } from './schemas';

const messages = (r: { success: boolean; error?: { issues: { path: (string | number)[]; message: string }[] } }) =>
  Object.fromEntries((r.error?.issues ?? []).map((i) => [i.path.join('.'), i.message]));

describe('registerSchema', () => {
  it('reports every field', () => {
    const r = registerSchema.safeParse({ displayName: '', email: 'nope', password: 'short', confirm: '' });
    expect(messages(r)).toEqual({
      displayName: 'Enter your name.',
      email: 'Enter a valid email address.',
      password: 'Use at least 12 characters.',
      confirm: 'Type your password again.',
    });
  });
  it('requires matching passwords', () => {
    const r = registerSchema.safeParse({ displayName: 'Temmah', email: 'a@b.pg', password: 'a long kina sentence', confirm: 'a long kina sentenc' });
    expect(messages(r)).toEqual({ confirm: "Passwords don't match." });
  });
  it('accepts a good registration', () => {
    expect(registerSchema.safeParse({ displayName: 'T', email: 'a@b.pg', password: 'a long kina sentence', confirm: 'a long kina sentence' }).success).toBe(true);
  });
});

describe('signInSchema', () => {
  it('validates email format and empty password', () => {
    expect(messages(signInSchema.safeParse({ email: 'x', password: '' }))).toEqual({
      email: 'Enter a valid email address.',
      password: 'Enter your password.',
    });
  });
});

describe('totpSchema', () => {
  it.each(['12345', '1234567', 'abcdef', ''])('rejects %j', (code) => {
    expect(totpSchema.safeParse({ code }).success).toBe(false);
  });
  it('accepts 6 digits', () => {
    expect(totpSchema.safeParse({ code: '000000' }).success).toBe(true);
  });
});

describe('passwordScore', () => {
  it('grows with length and variety, and punishes obvious passwords', () => {
    expect(passwordScore('')).toBe(0);
    expect(passwordScore('short')).toBe(0);
    expect(passwordScore('twelvechars!')).toBeGreaterThanOrEqual(1);
    expect(passwordScore('Kina-Lagoon-2026-sunrise')).toBe(4);
    expect(passwordScore('password123456')).toBeLessThanOrEqual(1);
  });
});
