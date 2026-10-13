import { expect, test } from '@playwright/test';

test('homepage has primary sections and no horizontal overflow', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Computational Statistics');
  await expect(page.getByRole('heading', { name: 'The CSML team' })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflow).toBe(false);
});

test('a person profile is a real route', async ({ page }) => {
  await page.goto('/people/massimiliano-pontil/');
  await expect(page.getByRole('heading', { level: 1, name: 'Massimiliano Pontil' })).toBeVisible();
  await expect(page.getByText('Publication identity has not yet been linked')).toBeVisible();
});
