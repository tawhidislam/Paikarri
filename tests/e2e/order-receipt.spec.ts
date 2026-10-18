import { test, expect } from '@playwright/test';
import { orderFixture, oid } from '../helpers/order-fixture';

test('print action produces a branded, isolated A4 receipt in English and Bangla', async ({
  page,
}, info) => {
  test.skip(info.project.name === 'mobile', 'PDF output uses desktop Chromium once');
  for (const locale of ['en', 'bn']) {
    await orderFixture(page, { locale, role: locale === 'bn' ? 'supplier' : 'buyer' });
    await page.route('**/rest/v1/rpc/get_platform_settings', (route) =>
      route.fulfill({
        json: {
          name_en: 'Paikarii.com',
          name_bn: 'Paikarii.com',
          tagline_en: 'Wholesale marketplace',
          tagline_bn: 'পাইকারি বাজার',
          support_email: '',
          support_phone: '',
          default_locale: locale,
          supplier_registration_open: true,
        },
      }),
    );
    await page.goto(`/dashboard/orders/${oid}`);
    const receipt = page.locator('.order-receipt');
    await expect(receipt).toBeHidden();
    await page.evaluate(() => {
      window.print = () => {
        document.documentElement.dataset.printCalled = 'yes';
      };
    });
    await page.locator('.order-print').click();
    await expect(page.locator('html')).toHaveAttribute('data-print-called', 'yes');
    await page.emulateMedia({ media: 'print' });
    await page.evaluate(() => document.fonts.ready);
    await expect(receipt).toBeVisible();
    await expect(page.locator('.site-header')).toBeHidden();
    await expect(page.locator('.order-detail-heading')).toBeHidden();
    await expect(page.locator('.order-actions-panel')).toBeHidden();
    await expect(receipt.locator('.pr-brand')).toBeVisible();
    await expect(receipt.locator('.pr-brand svg')).toHaveCount(1);
    await expect(receipt.locator('tbody tr')).toHaveCount(1);
    await expect(receipt.locator('.pr-document')).toContainText('PK-000101');
    await expect(receipt.locator('.pr-totals')).toContainText(
      locale === 'bn' ? '১৯,০০০' : '19,000',
    );
    await expect(receipt.locator('.pr-status')).toContainText(
      locale === 'bn' ? 'অপরিশোধিত' : 'Unpaid',
    );
    await page.pdf({
      path: `output/pdf/paikarii-order-receipt-${locale}.pdf`,
      preferCSSPageSize: true,
      printBackground: true,
      displayHeaderFooter: false,
    });
    await page.emulateMedia({ media: 'screen' });
  }
});

test('long receipts preserve every item and provisional delivery amounts across pages', async ({
  page,
}, info) => {
  test.skip(info.project.name === 'mobile', 'PDF stress output runs once');
  await orderFixture(page, { status: 'pending_confirmation' });
  const response = page.waitForResponse((r) => r.url().endsWith('/rpc/order_detail'));
  await page.goto(`/dashboard/orders/${oid}`);
  const data = await (await response).json();
  const items = Array.from({ length: 35 }, (_, n) => ({
    ...data.items[0],
    id: crypto.randomUUID(),
    name: `Synthetic item ${n + 1} - wholesale cotton garment with extended specifications`,
    variant_snapshot: { Color: 'Forest green', Size: 'Large' },
    quantity: 100,
  }));
  const subtotal = items.reduce((sum, i) => sum + i.line_total, 0);
  await page.route('**/rest/v1/rpc/order_detail', (route) =>
    route.fulfill({ json: { ...data, items, subtotal, shipping_fee: 0, total: subtotal } }),
  );
  await page.reload();
  await page.locator('.order-print').waitFor();
  await page.emulateMedia({ media: 'print' });
  await page.evaluate(() => document.fonts.ready);
  const receipt = page.locator('.order-receipt');
  await expect(receipt.locator('tbody tr')).toHaveCount(35);
  await expect(receipt.locator('.pr-totals')).toContainText('Supplier to confirm');
  await expect(receipt.locator('.pr-provisional')).toBeVisible();
  await page.pdf({
    path: 'tmp/pdfs/paikarii-order-receipt-long.pdf',
    preferCSSPageSize: true,
    printBackground: true,
    displayHeaderFooter: false,
  });
});

test('platform print hides administration and exposes only the authorized receipt', async ({
  page,
}) => {
  await orderFixture(page, { role: 'super_admin' });
  await page.goto(`/admin/orders/${oid}`);
  await page.locator('.order-print').waitFor();
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('.order-receipt')).toBeVisible();
  await expect(page.locator('.admin-header')).toBeHidden();
  await expect(page.locator('.admin-sidebar')).toBeHidden();
});
