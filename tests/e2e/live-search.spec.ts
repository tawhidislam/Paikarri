import { test, expect, type Page } from '@playwright/test';
import { chatFixture, pid } from '../helpers/chat-fixture';
const product = {
  id: pid,
  name: 'Cotton wholesale shirt',
  name_bn: 'সুতির পাইকারি জামা',
  price: 185,
  unit: 'piece',
  moq: 100,
  stock: 5000,
  supplier_name: 'Textile Works',
  supplier_name_bn: 'কাপড়ের কারখানা',
  image: null,
};
const results = {
  products: [product],
  categories: [
    {
      id: 'ea200000-0000-4000-8000-000000000001',
      name: 'Cotton textiles',
      name_bn: 'সুতির কাপড়',
      slug: 'cotton-textiles',
    },
  ],
};
async function setup(page: Page, { locale = 'en' } = {}) {
  await chatFixture(page, { role: 'buyer', locale });
  const calls: string[] = [];
  await page.route('**/rest/v1/rpc/search_suggestions', async (route) => {
    calls.push(route.request().postDataJSON().keyword);
    await route.fulfill({ json: results });
  });
  await page.goto('/');
  return { input: page.locator('.live-search input'), calls };
}
test('debounces partial queries and opens product by keyboard', async ({ page }) => {
  const { input, calls } = await setup(page);
  await input.fill('c');
  await page.waitForTimeout(350);
  expect(calls).toEqual([]);
  await input.fill('co');
  await input.fill('cot');
  await expect(page.getByRole('option', { name: /Cotton wholesale shirt/ })).toBeVisible();
  expect(calls).toEqual(['cot']);
  await input.press('ArrowDown');
  await expect(input).toHaveAttribute('aria-activedescendant', /option-0$/);
  await expect(page.getByRole('option').first()).toHaveAttribute('aria-selected', 'true');
  await input.press('Enter');
  await expect(page).toHaveURL(`/products/${pid}`);
  await expect(page.getByRole('listbox')).toHaveCount(0);
});
test('category links, full search and URL query state remain functional', async ({ page }) => {
  const { input } = await setup(page);
  await input.fill('cot');
  await page.getByRole('option', { name: /Cotton textiles/ }).click();
  await expect(page).toHaveURL(/category=cotton-textiles/);
  await input.fill('  cotton & silk  ');
  await input.press('Enter');
  await expect(page).toHaveURL(/q=cotton%20%26%20silk/);
  await expect(input).toHaveValue('cotton & silk');
  await input.click();
  await page.getByRole('option', { name: /Search all products/ }).click();
  await expect(page).toHaveURL(/q=cotton%20%26%20silk/);
  await expect(page.getByRole('listbox')).toHaveCount(0);
});
test('clear, Escape, close button, Tab and outside click dismiss safely', async ({ page }) => {
  const { input } = await setup(page);
  await input.fill('cot');
  await expect(page.getByRole('option', { name: /Cotton wholesale/ })).toBeVisible();
  await input.press('Escape');
  await expect(input).toHaveAttribute('aria-expanded', 'false');
  await expect(input).toBeFocused();
  await input.click();
  await page.getByRole('button', { name: 'Close search suggestions', exact: true }).click();
  await expect(input).toHaveAttribute('aria-expanded', 'false');
  await input.click();
  await page.getByRole('button', { name: 'Clear search', exact: true }).click();
  await expect(input).toHaveValue('');
  await expect(page.getByRole('option')).toHaveCount(0);
  await input.press('Tab');
  await expect(page.getByRole('listbox')).toHaveCount(0);
  await input.click();
  await page.getByRole('main').click({ position: { x: 10, y: 10 } });
  await expect(input).toHaveAttribute('aria-expanded', 'false');
});

test('browser history restores the URL query even when an unfinished edit has focus', async ({
  page,
}) => {
  const { input } = await setup(page);
  await input.fill('cotton');
  await input.press('Enter');
  await expect(page).toHaveURL(/q=cotton$/);
  await input.fill('silk');
  await input.press('Enter');
  await expect(page).toHaveURL(/q=silk$/);
  await input.fill('unfinished draft');
  await page.goBack();
  await expect(input).toHaveValue('cotton');
  await page.goForward();
  await expect(input).toHaveValue('silk');
});
test('loading and late responses cannot show suggestions for an earlier query', async ({
  page,
}) => {
  const { input } = await setup(page);
  await page.route('**/rest/v1/rpc/search_suggestions', async (route) => {
    const keyword = route.request().postDataJSON().keyword;
    await new Promise((resolve) => setTimeout(resolve, keyword === 'cot' ? 700 : 30));
    await route
      .fulfill({ json: keyword === 'cot' ? results : { products: [], categories: [] } })
      .catch(() => {});
  });
  const request = page.waitForRequest('**/rest/v1/rpc/search_suggestions');
  await input.fill('cot');
  await request;
  await expect(page.getByRole('status').filter({ hasText: 'Searching products' })).toBeVisible();
  await input.fill('unmatched');
  await expect(
    page.getByText('No matches. Try another name or search all products.'),
  ).toBeVisible();
  await page.waitForTimeout(800);
  await expect(page.getByRole('option', { name: /Cotton wholesale/ })).toHaveCount(0);
  await expect(page.getByRole('option', { name: /Search all products/ })).toContainText(
    'unmatched',
  );
});
test('errors allow retry and normal form search', async ({ page }) => {
  const { input } = await setup(page);
  let fail = true;
  await page.route('**/rest/v1/rpc/search_suggestions', (route) =>
    route.fulfill(
      fail ? { status: 503, json: { message: 'Temporarily unavailable' } } : { json: results },
    ),
  );
  await input.fill('cot');
  await expect(page.getByText('Suggestions are temporarily unavailable.')).toBeVisible();
  fail = false;
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(page.getByRole('option', { name: /Cotton wholesale/ })).toBeVisible();
  await input.press('Enter');
  await expect(page).toHaveURL(/products\?q=cot/);
});
test('IME composing does not issue requests or submit prematurely', async ({ page }) => {
  const { input, calls } = await setup(page);
  await input.dispatchEvent('compositionstart');
  await input.fill('সুতি');
  await page.waitForTimeout(350);
  expect(calls).toEqual([]);
  await input.press('Enter');
  await expect(page).toHaveURL('/');
  await input.dispatchEvent('compositionend');
  await expect(page.getByRole('option', { name: /Cotton wholesale/ })).toBeVisible();
  expect(calls).toEqual(['সুতি']);
});
test('Bangla suggestions fit narrow screens and keep comfortable touch targets', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 844 });
  const { input } = await setup(page, { locale: 'bn' });
  await input.fill('সুতি');
  const option = page.getByRole('option', { name: /সুতির পাইকারি জামা/ });
  await expect(option).toBeVisible();
  await expect(page.getByRole('option', { name: /সুতির কাপড়/ })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const box = await option.boundingBox();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(320);
  expect(box!.height).toBeGreaterThanOrEqual(44);
  await expect(option).toContainText('১০০ টি');
  const clear = await page.getByRole('button', { name: 'অনুসন্ধান মুছুন' }).boundingBox();
  expect(clear!.width).toBeGreaterThanOrEqual(44);
});
test('untrusted suggestion labels and queries render as text', async ({ page }) => {
  const { input } = await setup(page);
  await page.route('**/rest/v1/rpc/search_suggestions', (route) =>
    route.fulfill({
      json: { products: [{ ...product, name: '<img src=x onerror=alert(1)>' }], categories: [] },
    }),
  );
  await input.fill('<img');
  await expect(page.getByRole('option', { name: /onerror=alert/ })).toBeVisible();
  await expect(page.locator('.live-search-product img')).toHaveCount(0);
  await input.press('Enter');
  await expect(page).toHaveURL(/q=%3Cimg/);
});
