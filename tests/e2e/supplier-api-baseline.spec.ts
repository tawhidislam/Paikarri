import { test, expect } from '@playwright/test';
import { chatFixture, uid, bid, pid } from '../helpers/chat-fixture';
test('failed business lookup offers retry without presenting a creation form', async ({ page }) => {
  await chatFixture(page, { role: 'supplier' });
  let fail = true;
  await page.route('**/rest/v1/businesses*', (route) =>
    fail
      ? route.fulfill({ status: 400, json: { message: 'Synthetic profile lookup failure' } })
      : route.fulfill({ json: null }),
  );
  await page.goto('/dashboard/business');
  await expect(page.getByRole('alert')).toContainText('Synthetic profile lookup failure');
  await expect(page.locator('input[name="name"]')).toHaveCount(0);
  fail = false;
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(page.locator('input[name="name"]')).toBeVisible();
});
test('supplier overview counts current verification applications instead of legacy evidence', async ({
  page,
}) => {
  const calls: string[] = [];
  await chatFixture(page, { role: 'supplier' });
  await page.route('**/rest/v1/**', async (route) => {
    const req = route.request(),
      url = new URL(req.url()),
      table = url.pathname.split('/').pop()!;
    calls.push(table);
    if (table === 'businesses')
      return route.fulfill({ json: { id: bid, owner_id: uid, name: 'Synthetic supplier' } });
    if (req.method() === 'HEAD')
      return route.fulfill({
        headers: {
          'access-control-expose-headers': 'content-range',
          'content-range': table === 'verification_applications' ? '*/2' : '*/0',
        },
      });
    return route.fallback();
  });
  await page.goto('/dashboard');
  await expect(page.locator('.dashboard-content')).toContainText(/verification applications/i);
  expect(calls).toContain('verification_applications');
  expect(calls).not.toContain('supplier_verifications');
});
test('supplier catalog pages through more than one thousand records', async ({ page }) => {
  await chatFixture(page, { role: 'supplier' });
  const offsets: number[] = [];
  await page.route('**/rest/v1/businesses*', (route) =>
    route.fulfill({ json: { id: bid, owner_id: uid, name: 'Synthetic supplier' } }),
  );
  await page.route('**/rest/v1/product_moderation_notes*', (route) => route.fulfill({ json: [] }));
  await page.route('**/rest/v1/products*', (route) => {
    const url = new URL(route.request().url()),
      offset = Number(url.searchParams.get('offset') ?? 0);
    offsets.push(offset);
    return route.fulfill({
      headers: {
        'access-control-expose-headers': 'content-range',
        'content-range': `${offset}-${offset + 24}/1026`,
      },
      json: Array.from({ length: Math.min(25, 1026 - offset) }, (_, i) => ({
        id: `${pid.slice(0, -12)}${String(offset + i + 1).padStart(12, '0')}`,
        business_id: bid,
        name: `Synthetic product ${offset + i + 1}`,
        price: 100,
        moq: 10,
        stock: 100,
        unit: 'piece',
        status: 'pending',
        created_at: '2026-10-24T00:00:00Z',
      })),
    });
  });
  await page.goto('/dashboard/products');
  await expect(page.getByText('Synthetic product 1', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.getByText('Synthetic product 26', { exact: true })).toBeVisible();
  expect(offsets).toContain(25);
  await expect(page.getByText('Synthetic product 1', { exact: true })).toHaveCount(0);
  await expect(page.locator('.sm-pagination')).toContainText('1026');
});
test('quotation pagination restricts responses to the displayed requests', async ({ page }) => {
  await chatFixture(page, { role: 'supplier' });
  const responseFilters: string[] = [];
  await page.route('**/rest/v1/rpc/participant_context', (route) =>
    route.fulfill({ json: { businesses: [], products: [{ id: pid, name: 'Synthetic shirt' }] } }),
  );
  await page.route('**/rest/v1/quotation_requests*', (route) => {
    const offset = Number(new URL(route.request().url()).searchParams.get('offset') ?? 0);
    return route.fulfill({
      headers: {
        'access-control-expose-headers': 'content-range',
        'content-range': `${offset}-${offset}/1026`,
      },
      json: [
        {
          id: `e2400000-0000-4000-8000-${String(offset + 1).padStart(12, '0')}`,
          business_id: bid,
          product_id: pid,
          quantity: 10,
          message: `Synthetic inquiry ${offset + 1}`,
          created_at: '2026-10-24T00:00:00Z',
        },
      ],
    });
  });
  await page.route('**/rest/v1/quotation_responses*', (route) => {
    responseFilters.push(new URL(route.request().url()).searchParams.get('request_id') ?? '');
    return route.fulfill({ json: [] });
  });
  await page.goto('/dashboard/quotations');
  await expect(page.getByText('Synthetic inquiry 1', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.getByText('Synthetic inquiry 26', { exact: true })).toBeVisible();
  expect(responseFilters).toContain('in.(e2400000-0000-4000-8000-000000000026)');
});
