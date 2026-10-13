import { expect, test } from '@playwright/test';
import { goTo, noHorizontalScroll, signIn } from './helpers';

test.beforeEach(async ({ page }) => signIn(page));

test('overview renders stats, split, history and no horizontal scroll', async ({ page }) => {
  await expect(page.getByText('Income this pay')).toBeVisible();
  await expect(page.getByRole('heading', { name: "This pay's split" })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Overall history' })).toBeVisible();
  await noHorizontalScroll(page);
});

test('manual logging: validation then save', async ({ page }) => {
  await page.getByRole('button', { name: 'Log an expense' }).click();
  await page.getByRole('button', { name: /Type it in/ }).click();
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('Enter an amount.')).toBeVisible();
  await expect(page.getByText('Pick a category.')).toBeVisible();
  await page.getByLabel('Amount (K)').fill('12.50');
  await page.getByRole('radio', { name: 'Eating out' }).click();
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('Logged K 12.50 · Eating out')).toBeVisible();
});

test('upload rejects the wrong file type', async ({ page }) => {
  await page.getByRole('button', { name: 'Log an expense' }).click();
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: /Snap receipt/ }).click();
  await (await chooser).setFiles({ name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('hi') });
  await expect(page.getByText('Choose a photo (JPG, PNG or WebP) or a PDF.')).toBeVisible();
});

test('delete and undo puts the row back', async ({ page }) => {
  await goTo(page, 'Transactions');
  await page.getByRole('radio', { name: 'All history' }).click();
  const first = page.getByRole('button', { name: /^Delete / }).first();
  const label = await first.getAttribute('aria-label');
  await first.click();
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(page.getByText('Restored')).toBeVisible();
  await expect(page.getByRole('button', { name: label! })).toBeVisible();
});

test('history drill-down: View opens exactly that pay, clearing returns to All history', async ({ page }) => {
  const view = page.getByRole('button', { name: /^View transactions for/ }).nth(1);
  await view.click();
  await expect(page).toHaveURL(/period=-?\d+/);
  await expect(page.getByRole('region', { name: /^Pay / })).toHaveCount(1);
  await page.getByRole('button', { name: /Clear pay filter/ }).click();
  await expect(page).toHaveURL(/range=all/);
  await expect(page.getByRole('radio', { name: 'All history' })).toHaveAttribute('aria-checked', 'true');
});

test('range chips, bucket filter and search combine; empty state adapts', async ({ page }) => {
  await goTo(page, 'Transactions');
  await page.getByRole('radio', { name: 'Last 3 pays' }).click();
  await page.getByRole('radio', { name: 'Wants' }).click();
  await page.getByLabel('Search merchant or category').fill('zzz-no-such-merchant');
  await expect(page.getByText('No Wants expenses matching "zzz-no-such-merchant" in the last 3 pays.')).toBeVisible();
});

test('split must total 100 before Apply', async ({ page }) => {
  await goTo(page, 'Budgets & Goals');
  const needs = page.getByRole('slider', { name: 'Needs percent' });
  await needs.focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByText('Total 101%. Remove 1 point.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Apply' }).first()).toBeDisabled();
  await page.getByRole('radio', { name: '60/20/20' }).click();
  await expect(page.getByRole('button', { name: 'Apply' }).first()).toBeEnabled();
});

test('goal form validation', async ({ page }) => {
  await goTo(page, 'Budgets & Goals');
  await page.getByRole('button', { name: 'New goal' }).first().click();
  await page.getByRole('button', { name: 'Create goal' }).click();
  await expect(page.getByText('Give the goal a name.')).toBeVisible();
});

test('side-hustle custom split needs 100', async ({ page }) => {
  await goTo(page, 'Income');
  await page.getByRole('radio', { name: 'Custom' }).click();
  const s = page.getByRole('slider', { name: 'Needs percent' });
  await s.focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByText(/Remove 1 point/)).toBeVisible();
});

test('insights lists all 7 rules', async ({ page }) => {
  await goTo(page, 'Insights');
  for (const name of ['Needs pace', 'Wants pace', 'Category spike', 'Big one-off', 'Goal slipping', 'Savings win', 'Logging gap']) {
    await expect(page.getByText(name, { exact: true })).toBeVisible();
  }
});

test('wallpaper upload rejects a PDF', async ({ page }) => {
  await goTo(page, 'Settings');
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Upload a photo' }).click();
  await (await chooser).setFiles({ name: 'x.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF') });
  await expect(page.getByText('Choose a photo (JPG, PNG or WebP).')).toBeVisible();
});

test('theme persists across reloads', async ({ page }) => {
  await goTo(page, 'Settings');
  await page.getByRole('radio', { name: /Dark/ }).click();
  await page.reload();
  await expect(page.locator('html')).toHaveClass(/dark/);
  await page.getByRole('radio', { name: /Light/ }).click();
});
