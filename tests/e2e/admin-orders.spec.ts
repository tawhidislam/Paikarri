import { test, expect } from '@playwright/test';
import { adminOrderFixture } from '../helpers/admin-order-fixture';
import { oid } from '../helpers/order-fixture';
import { bid } from '../helpers/chat-fixture';

test('admin queues use exact union counts, server filters and bounded pagination', async ({
  page,
}) => {
  const { requests } = await adminOrderFixture(page);
  await page.goto('/admin/orders');
  const kpis = page.locator('.admin-order-kpi-ribbon');
  await expect(kpis.locator('.ao-kpi-action_required strong')).toHaveText('3');
  await expect(kpis.locator('.ao-kpi-reported strong')).toHaveText('2');
  await kpis.getByRole('button', { name: /Action Required/ }).click();
  await expect(page.locator('.admin-order-table tbody tr')).toHaveCount(3);
  await page
    .getByRole('navigation', { name: 'Order operation queues' })
    .getByRole('button', { name: /Bank Payment Verification/ })
    .click();
  await expect(page.locator('.admin-order-table tbody tr')).toHaveCount(2);
  await page
    .getByRole('navigation', { name: 'Order operation queues' })
    .getByRole('button', { name: /Disputes & Appeals/ })
    .click();
  await expect(page.locator('.admin-order-table tbody tr')).toHaveCount(1);
  await page.getByRole('combobox', { name: 'Rows per page', exact: true }).selectOption('50');
  await expect
    .poll(() => requests.filter((request) => request.method === 'GET').at(-1)?.limit)
    .toBe(50);
  await page.getByRole('combobox', { name: 'Status', exact: true }).selectOption('');
  await page.getByRole('searchbox', { name: 'Search orders', exact: true }).fill('PK-000104');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(page.locator('.admin-order-table tbody tr')).toHaveCount(1);
  await expect(page.getByRole('link', { name: 'PK-000104', exact: true })).toBeVisible();
  expect(
    requests
      .filter((request) => request.method === 'GET')
      .at(-1)
      ?.filters.some((filter) => filter.includes('number.eq.104')),
  ).toBe(true);
});

test('bank verification shortcut opens the supervisor checkpoint and keeps the existing action contract', async ({
  page,
}) => {
  const fixture = await adminOrderFixture(page);
  await page.goto('/admin/orders');
  await page.getByRole('link', { name: 'Verify bank payment', exact: true }).first().click();
  await expect(page).toHaveURL(new RegExp(`/admin/orders/${oid}#payment-verification`));
  const banner = page.locator('#payment-verification');
  await expect(banner).toBeFocused();
  await expect(banner).toContainText('SYNTHETIC-BANK-101');
  await expect(
    page.getByText('Confirm supplier bank instructions before paying.', { exact: false }),
  ).toHaveCount(0);
  await page.getByRole('button', { name: 'Verify external payment', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog
    .getByRole('textbox', { name: 'Transaction / receipt reference', exact: true })
    .fill('SYNTHETIC-VERIFIED-101');
  await dialog.getByRole('button', { name: 'Verify external payment', exact: true }).click();
  await expect(page.locator('.order-detail-heading')).toContainText('Paid');
  await expect(banner).toHaveCount(0);
  expect(fixture.calls.find((call) => call.name === 'order_action')?.body).toMatchObject({
    target: oid,
    expected_version: 2,
    action: 'confirm_payment',
    payload: { reference: 'SYNTHETIC-VERIFIED-101' },
  });
});

test('supervisor detail links exact accounts, supports tracking copy and filters immutable history', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: async (text: string) => {
          document.documentElement.dataset.copied = text;
        },
      },
    });
  });
  await adminOrderFixture(page);
  await page.goto(`/admin/orders/${oid}`);
  await expect(
    page.getByRole('link', { name: 'Supplier Workspace', exact: true }).first(),
  ).toHaveAttribute('href', `/admin/supplier-management/${bid}`);
  await expect(
    page.locator('.ao-cross-links').getByRole('link', { name: 'Buyer Account', exact: true }),
  ).toHaveAttribute('href', /accounts\?id=/);
  await expect(
    page.locator('.ao-cross-links').getByRole('link', { name: 'Audit Trail', exact: true }),
  ).toHaveAttribute('href', `/admin/audit?target=${oid}`);
  await expect(page.locator('.admin-order-participants-grid')).toContainText(
    'Synthetic Store Owner',
  );
  await expect(
    page.locator('.admin-order-participants-grid a[href="tel:+8801812345678"]'),
  ).toBeVisible();
  await expect(
    page.locator('.admin-order-participants-grid a[href="https://wa.me/8801712345678"]'),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Copy tracking reference', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-copied', 'SYNTHETIC-TRACK-101');
  await page
    .getByRole('combobox', { name: 'Filter history by actor', exact: true })
    .selectOption('supplier');
  await expect(page.locator('.ao-history-panel')).toContainText('No events match these filters');
  await page
    .getByRole('combobox', { name: 'Filter history by actor', exact: true })
    .selectOption('buyer');
  await expect(page.locator('.ao-history-panel .order-history li')).toHaveCount(1);
});

test('return-in-transit disables dispute resolutions and refund controls remain explicit', async ({
  page,
}) => {
  await adminOrderFixture(page, {
    status: 'disputed',
    payment: 'paid',
    returnStatus: 'in_transit',
  });
  await page.goto(`/admin/orders/${oid}#dispute-review`);
  await expect(
    page.getByRole('button', { name: 'Record buyer refund decision', exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole('button', { name: 'Resume Fulfillment', exact: true }),
  ).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Resolve and cancel', exact: true })).toHaveCount(
    0,
  );
  await page.unrouteAll({ behavior: 'wait' });
  await adminOrderFixture(page, { status: 'cancelled', payment: 'refund_pending' });
  await page.goto(`/admin/orders/${oid}#refund-verification`);
  await page.reload();
  await expect(page.locator('#refund-verification')).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Verify completed refund', exact: true }),
  ).toBeVisible();
});

test('failed admin queue has retry and truthful empty search state', async ({ page }) => {
  const fixture = await adminOrderFixture(page, { failList: true });
  await page.goto('/admin/orders');
  await expect(page.getByRole('alert')).toContainText('Synthetic queue unavailable', {
    timeout: 20000,
  });
  fixture.recover();
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(page.locator('.admin-order-table tbody tr')).toHaveCount(7);
  await page
    .getByRole('searchbox', { name: 'Search orders', exact: true })
    .fill('No matching synthetic order');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'No orders found', exact: true })).toBeVisible();
});

for (const locale of ['en', 'bn']) {
  test(`order supervisor list and detail remain readable across viewports (${locale})`, async ({
    page,
  }, info) => {
    await adminOrderFixture(page, { locale });
    for (const width of info.project.name === 'mobile' ? [320, 390] : [768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/admin/orders');
      await expect(page.getByRole('link', { name: 'PK-000101', exact: true })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await page.screenshot({
        path: `artifacts/admin-orders-${locale}-${width}.png`,
        fullPage: true,
      });
      await page.goto(`/admin/orders/${oid}`);
      await expect(page.locator('#payment-verification')).toBeVisible();
      await expect(page.locator('.admin-order-participants-grid')).toContainText(
        'Synthetic Store Owner',
      );
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await page.screenshot({
        path: `artifacts/admin-order-detail-${locale}-${width}.png`,
        fullPage: true,
      });
    }
  });
}
