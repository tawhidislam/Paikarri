import { test, expect } from '@playwright/test';
import { orderFixture, oid } from '../helpers/order-fixture';

test('phone order shortcuts are fully visible and filters can be cleared with focus restored', async ({
  page,
}) => {
  const calls = await orderFixture(page);
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto('/dashboard/orders');
  const tabs = page.locator('.bo-tabs');
  expect(await tabs.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
  for (const button of await tabs.getByRole('button').all()) {
    const box = (await button.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(320);
    expect(box.height).toBeGreaterThanOrEqual(44);
  }
  await page.locator('.bo-filter-toggle').click();
  await page.locator('#bo-status-filter').selectOption('pending_confirmation');
  await page.locator('#bo-size-filter').selectOption('50');
  await page.getByRole('searchbox', { name: 'Search orders' }).fill('Synthetic');
  await page.locator('.bo-search-submit').click();
  await expect
    .poll(() => calls.filter((c) => c.name === 'order_list').at(-1)?.body)
    .toMatchObject({ state: 'pending_confirmation', page_size: 50, search: 'Synthetic' });
  const applied = page.getByLabel('Applied order filters');
  await expect(applied).toContainText('Awaiting supplier');
  await expect(applied).toContainText('Synthetic');
  await page.locator('.bo-filter-toggle').click();
  await applied.getByRole('button', { name: 'Clear filters' }).click();
  // Reset can reuse the fresh, unfiltered TanStack Query cache.
  await expect(page).toHaveURL('/dashboard/orders');
  await expect(tabs.getByRole('button', { name: 'All orders', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(applied).toHaveCount(0);
  await expect(page.getByRole('searchbox', { name: 'Search orders' })).toBeFocused();
  await expect(page.getByRole('searchbox', { name: 'Search orders' })).toHaveValue('');
  await page.locator('.bo-filter-toggle').click();
  await expect(page.locator('#bo-status-filter')).toHaveValue('');
  await expect(page.locator('#bo-size-filter')).toHaveValue('25');
});

test('phone order cards handle long supplier names, large totals, and empty results in both languages', async ({
  page,
}, info) => {
  test.skip(info.project.name === 'mobile', 'Explicit phone matrix runs once');
  for (const locale of ['en', 'bn']) {
    await orderFixture(page, { locale });
    let empty = false;
    await page.route('**/rest/v1/rpc/order_list', (route) =>
      route.fulfill({
        json: {
          total: empty ? 0 : 3,
          counts: { open: empty ? 0 : 3, disputed: 0, refund_pending: 0 },
          rows: empty
            ? []
            : [1, 2, 3].map((n) => ({
                id: n === 1 ? oid : `71000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
                number: 100 + n,
                supplier_name:
                  locale === 'en'
                    ? 'Synthetic Bangladesh Wholesale Manufacturing and Distribution Company Limited'
                    : 'পরীক্ষামূলক বাংলাদেশ পাইকারি পণ্য উৎপাদন ও পরিবেশক প্রতিষ্ঠান লিমিটেড',
                buyer_name: 'Synthetic buyer',
                status: n === 3 ? 'pending_confirmation' : 'awaiting_acceptance',
                payment_status: n === 2 ? 'refund_pending' : 'unpaid',
                payment_method: 'bank_transfer',
                total: 987654321.25,
                created_at: '2026-10-17T03:00:00Z',
                updated_at: '2026-10-17T03:00:00Z',
                cancellation_requested: false,
              })),
        },
      }),
    );
    for (const width of [320, 390]) {
      await page.setViewportSize({ width, height: 844 });
      await page.goto('/dashboard/orders');
      await expect(page.locator('.bo-order-card')).toHaveCount(3);
      await expect(
        page.getByRole('link', {
          name: locale === 'bn' ? 'অর্ডার দেখুন' : 'View order',
          exact: true,
        }),
      ).toBeVisible();
      for (const card of await page.locator('.bo-order-card').all()) {
        const action = (await card.locator('.bo-view-order').boundingBox())!;
        const total = (await card.locator('.bo-card-total').boundingBox())!;
        expect(action.y).toBeGreaterThanOrEqual(total.y + total.height);
        expect(action.height).toBeGreaterThanOrEqual(48);
        expect(action.width).toBeGreaterThan(240);
        expect(
          (await card.locator('.bo-order-number').boundingBox())!.height,
        ).toBeGreaterThanOrEqual(44);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      expect(
        await page.locator('.bo-tabs').evaluate((el) => el.scrollWidth <= el.clientWidth),
      ).toBe(true);
      if (width === 390)
        await page.screenshot({
          path: `artifacts/my-orders-long-cards-${locale}.png`,
          fullPage: true,
        });
    }
    empty = true;
    await page.reload();
    await expect(page.locator('.bo-order-card')).toHaveCount(0);
    await expect(page.locator('.bo-list > .empty-state')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
});
