import { expect, test } from '@playwright/test';
import { DEMO } from './helpers';

test('welcome shows benefits and both actions', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('link', { name: 'Create account' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Sign in' })).toBeVisible();
  await expect(page.getByText('Demo')).toHaveCount(0); // no prototype banner
});

test('register shows inline errors for every field', async ({ page }) => {
  await page.goto('/register');
  await page.getByLabel('Email').fill('not-an-email');
  await page.getByLabel('Password', { exact: true }).fill('short');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByText('Enter your name.')).toBeVisible();
  await expect(page.getByText('Enter a valid email address.')).toBeVisible();
  await expect(page.getByText('Use at least 12 characters.')).toBeVisible();
  await expect(page.getByLabel('Display name')).toHaveAttribute('aria-invalid', 'true');
});

test('register mismatched passwords', async ({ page }) => {
  await page.goto('/register');
  await page.getByLabel('Display name').fill('Test');
  await page.getByLabel('Email').fill('new@budgetme.local');
  await page.getByLabel('Password', { exact: true }).fill('a long kina sentence');
  await page.getByLabel('Confirm password').fill('a different sentence');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByText("Passwords don't match.")).toBeVisible();
});

test('sign in with a wrong password gives a generic error', async ({ page }) => {
  await page.goto('/sign-in');
  await page.getByLabel('Email').fill(DEMO.email);
  await page.getByLabel('Password').fill('wrong-password-123');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('alert')).toHaveText('Email or password is incorrect.');
});

test('MFA setup rejects incomplete and wrong codes', async ({ page }) => {
  await page.goto('/sign-in');
  await page.getByLabel('Email').fill(DEMO.email);
  await page.getByLabel('Password').fill(DEMO.password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.goto('/mfa/setup?from=settings');
  await expect(page.getByRole('img', { name: /QR code/ })).toBeVisible();
  await page.getByLabel('6-digit code').fill('123');
  await page.getByRole('button', { name: /Turn on/ }).click();
  await expect(page.getByText('Enter the 6-digit code from your authenticator app.')).toBeVisible();
  await page.getByLabel('6-digit code').fill('000000');
  await page.getByRole('button', { name: /Turn on/ }).click();
  await expect(page.getByText(/That code didn't work/)).toBeVisible();
  await expect(page).toHaveURL(/\/mfa\/setup/);
});
