import { expect, test } from '@playwright/test';

test('homepage has primary sections and no horizontal overflow', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: /Computational Statistics/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'The CSML team' })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflow).toBe(false);
});

test('a person profile is a real route', async ({ page }) => {
  await page.goto('/people/massimiliano-pontil/');
  await expect(page.getByRole('heading', { level: 1, name: 'Massimiliano Pontil' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'LinkedIn' })).toBeVisible();
  await expect(page.getByText(/^Source:/)).toHaveCount(0);
  await expect(page.getByText('Publication identity has not yet been linked')).toBeVisible();

  const widths = await page.locator('.page-shell, .profile').evaluateAll(([shell, profile]) => ({
    shell: shell.getBoundingClientRect().width,
    profile: profile.getBoundingClientRect().width,
  }));
  expect(widths.profile).toBeCloseTo(widths.shell, 0);
});

test('professional networks use accessible app icons', async ({ page }) => {
  await page.goto('/people/daniel-ordonez/');
  await expect(page.getByRole('link', { name: 'GitHub' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Google Scholar' })).toBeVisible();
});
