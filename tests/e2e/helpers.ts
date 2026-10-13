import { expect, type Page } from '@playwright/test';

export const DEMO = { email: 'demo@budgetme.local', password: 'demo-password-123' };

export async function signIn(page: Page) {
  await page.goto('/sign-in');
  await page.getByLabel('Email').fill(DEMO.email);
  await page.getByLabel('Password').fill(DEMO.password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/app$/);
}

/** The bottom tab bar on mobile, the sidebar / rail elsewhere: all share accessible names. */
export async function goTo(page: Page, name: 'Overview' | 'Transactions' | 'Budgets & Goals' | 'Income' | 'Insights' | 'Settings') {
  const paths = { Overview: '/app', Transactions: '/app/transactions', 'Budgets & Goals': '/app/plan', Income: '/app/income', Insights: '/app/insights', Settings: '/app/settings' };
  await page.goto(paths[name]);
}

export async function noHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
}
