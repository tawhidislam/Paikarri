import { test, expect } from '@playwright/test';
test('homepage, locale switch and responsive layout', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: /Big business starts/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /Explore the marketplace/ })).toBeVisible();
  await page.getByRole('button', { name: 'বাংলা', exact: true }).click();
  await expect(page.getByRole('heading', { name: /বড় ব্যবসার শুরু/ })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});
test('search navigates with encoded query and filters remain in URL', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const search = page.getByRole('combobox', { name: 'What are you sourcing today?' });
  await search.fill('cotton shirt');
  await search.press('Enter');
  await expect(page).toHaveURL(/\/products\?q=cotton/);
  await expect(page.getByRole('heading', { name: 'Results for “cotton shirt”' })).toBeVisible();
  await page.getByRole('combobox', { name: 'Division', exact: true }).selectOption('Dhaka');
  await expect(page).toHaveURL(/division=Dhaka/);
});
test('private dashboards redirect guests', async ({ page }) => {
  await page.goto('/dashboard/moderation', { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(/\/auth\/login\?next=/);
  await expect(page.getByRole('heading', { name: 'Welcome back.' })).toBeVisible();
});
test('registration validates input and links to password reset', async ({ page }) => {
  await page.goto('/auth/register', { waitUntil: 'domcontentloaded' });
  await page.getByLabel('Full name', { exact: true }).fill('Test Buyer');
  await page.getByLabel('Email address', { exact: true }).fill('buyer@example.com');
  await page.getByLabel('Password', { exact: true }).fill('short');
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(page.getByText(/Too small/)).toBeVisible();
  await page.goto('/auth/login', { waitUntil: 'domcontentloaded' });
  await page.getByRole('link', { name: 'Forgot password?' }).click();
  await expect(page.getByRole('heading', { name: 'Forgot your password?' })).toBeVisible();
});
test('public supplier directory and invalid products have clear states', async ({ page }) => {
  await page.goto('/suppliers', { waitUntil: 'domcontentloaded' });
  await expect(
    page.getByRole('heading', { name: 'Find your next business partner.' }),
  ).toBeVisible();
  await page.goto('/products/00000000-0000-4000-8000-000000000000', {
    waitUntil: 'domcontentloaded',
  });
  await expect(page.getByRole('heading', { name: 'Product not found' })).toBeVisible();
});
test('catalog queries the real hosted database successfully', async ({ page }) => {
  const responsePromise = page.waitForResponse(
    (r) => r.url().includes('/rest/v1/rpc/search_products') && r.request().method() === 'POST',
  );
  await page.goto('/products', { waitUntil: 'domcontentloaded' });
  const response = await responsePromise;
  expect(response.status()).toBe(200);
  expect(Array.isArray(await response.json())).toBe(true);
  await expect(
    page.getByRole('combobox', { name: 'Category', exact: true }).getByRole('option'),
  ).toHaveCount(7);
});
