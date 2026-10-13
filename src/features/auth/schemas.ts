import { z } from 'zod';
import { PASSWORD_MIN } from '@/config/limits';

export const signInSchema = z.object({
  email: z.string().trim().min(1, 'Enter your email.').email('Enter a valid email address.'),
  password: z.string().min(1, 'Enter your password.'),
});
export type SignInValues = z.infer<typeof signInSchema>;

export const registerSchema = z
  .object({
    displayName: z.string().trim().min(1, 'Enter your name.').max(80, 'Keep it under 80 characters.'),
    email: z.string().trim().min(1, 'Enter your email.').email('Enter a valid email address.'),
    password: z.string().min(PASSWORD_MIN, `Use at least ${PASSWORD_MIN} characters.`).max(72, 'Use 72 characters or fewer.'),
    confirm: z.string().min(1, 'Type your password again.'),
  })
  // Skip the mismatch check while confirm is empty so only "Type your password again." shows.
  .refine((v) => v.confirm === '' || v.password === v.confirm, { path: ['confirm'], message: "Passwords don't match." });
export type RegisterValues = z.infer<typeof registerSchema>;

export const totpSchema = z.object({
  code: z.string().trim().regex(/^\d{6}$/, 'Enter the 6-digit code from your authenticator app.'),
});

/** 0–4. Length matters most; character variety adds a little. */
export function passwordScore(pw: string): number {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= PASSWORD_MIN) score++;
  if (pw.length >= 16) score++;
  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(pw)).length;
  if (classes >= 3) score++;
  if (pw.length >= 20 || (classes === 4 && pw.length >= 14)) score++;
  if (/^(.)\1+$/.test(pw) || /password|123456|qwerty|budgetme/i.test(pw)) score = Math.min(score, 1);
  return score;
}
export const SCORE_LABEL = ['Too short', 'Weak', 'Fair', 'Good', 'Strong'];
