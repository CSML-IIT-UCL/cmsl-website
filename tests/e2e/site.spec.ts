import { expect, test } from '@playwright/test';

test('homepage has primary sections and no horizontal overflow', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: /Computational Statistics/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'People', exact: true })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflow).toBe(false);
});

test('applied collaborations strip links out to each lab', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'From theory to practice' })).toBeVisible();
  const firstCard = page.locator('.collab-card-link').first();
  await expect(firstCard).toBeVisible();
  await expect(firstCard).toHaveAttribute('href', /^https:\/\//);
});

test('a person profile is a real route', async ({ page }) => {
  await page.goto('/people/massimiliano-pontil/');
  await expect(page.getByRole('heading', { level: 1, name: 'Massimiliano Pontil' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'LinkedIn' })).toBeVisible();
  await expect(page.getByText(/^Source:/)).toHaveCount(0);
  await expect(page.locator('.profile-publications [data-publication-list] li').first()).toBeVisible();

  const widths = await page.locator('.page-shell, .profile').evaluateAll(([shell, profile]) => ({
    shell: shell.getBoundingClientRect().width,
    profile: profile.getBoundingClientRect().width,
  }));
  expect(widths.profile).toBeCloseTo(widths.shell, 0);
});

test('an unlinked profile explains its missing publication identity', async ({ page }) => {
  await page.goto('/people/andreas-maurer/');
  await expect(page.getByText('Publication identity has not yet been linked')).toBeVisible();
});

test('team publications can be sorted by citations without showing counts', async ({ page }) => {
  await page.goto('/publications/');
  const firstTitle = () => page.locator('[data-publication-list] li a').first().textContent();
  const byDate = await firstTitle();
  await page.getByRole('button', { name: 'Citations' }).click();
  await expect(page.getByRole('button', { name: 'Citations' })).toHaveAttribute('aria-pressed', 'true');
  const counts = await page.locator('[data-publication-list] li').evaluateAll((items) => items.slice(0, 5).map((item) => Number((item as HTMLElement).dataset.citations || -1)));
  expect(counts).toEqual([...counts].sort((a, b) => b - a));
  await expect(page.getByText(/cited by|citations?:/i)).toHaveCount(0);
  await page.getByRole('button', { name: 'Date' }).click();
  expect(await firstTitle()).toBe(byDate);
});

test('professional networks use accessible app icons', async ({ page }) => {
  await page.goto('/people/daniel-ordonez/');
  await expect(page.getByRole('link', { name: 'GitHub' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Google Scholar' })).toBeVisible();
});
