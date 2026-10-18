import { test, expect } from '@playwright/test';
import { chatFixture, pid, bid } from '../helpers/chat-fixture';

test('chair tiers start at MOQ, select quantities, respect stock and synchronize mobile totals', async ({
  page,
}) => {
  await chatFixture(page, { role: 'buyer' });
  await page.route('**/rest/v1/rpc/public_products*', (route) =>
    route.fulfill({
      json: [
        {
          id: pid,
          business_id: bid,
          category_id: '66000000-0000-4000-8000-000000000001',
          name: 'Synthetic fabric dining chair',
          name_bn: 'পরীক্ষামূলক খাবার টেবিলের চেয়ার',
          description: 'Synthetic browser quantity regression only.',
          price: 1950,
          moq: 8,
          stock: 120,
          unit: 'piece',
          specifications: {},
          status: 'approved',
          created_at: '2026-10-17T00:00:00Z',
          updated_at: '2026-10-17T00:00:00Z',
        },
      ],
    }),
  );
  await page.route('**/rest/v1/rpc/product_options', (route) =>
    route.fulfill({
      json: {
        sourcing: {
          product_id: pid,
          preparation_min: 1,
          preparation_max: 7,
          dispatch_location: 'Dhaka',
          packaging: '',
          delivery_notes: '',
          samples_enabled: false,
          sample_limit: 1,
          customization_enabled: false,
          customization_moq: 8,
          estimates_updated_at: null,
          version: 1,
        },
        attributes: [],
        skus: [
          {
            id: pid,
            code: 'STANDARD',
            stock: 120,
            active: true,
            image_id: null,
            version: 1,
            options: {},
            prices: [
              { min_quantity: 1, price: 1950 },
              { min_quantity: 8, price: 1950 },
              { min_quantity: 24, price: 1853 },
              { min_quantity: 80, price: 1755 },
              { min_quantity: 160, price: 1700 },
            ],
          },
        ],
      },
    }),
  );
  await page.goto(`/products/${pid}`);
  const input = page.getByRole('spinbutton', { name: 'Order quantity', exact: true });
  const tiers = page.locator('.pd-tier-list');
  await expect(input).toHaveValue('8');
  await expect(tiers.getByRole('button', { name: 'Order 1 piece', exact: true })).toHaveCount(0);
  await tiers.getByRole('button', { name: 'Order 24 pieces', exact: true }).click();
  await expect(input).toHaveValue('24');
  await expect(page.locator('.pd-buy-total')).toContainText('44,472');
  await expect(tiers.getByRole('button', { name: 'Order 24 pieces', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await tiers.getByRole('button', { name: 'Order 80 pieces', exact: true }).click();
  await expect(input).toHaveValue('80');
  await expect(page.locator('.pd-buy-total')).toContainText('140,400');
  await expect(page.locator('.pd-mobile-buy')).toContainText('140,400');
  await expect(tiers.getByRole('button', { name: 'Order 160 pieces', exact: true })).toBeDisabled();
  await tiers.getByRole('button', { name: 'Order 8 pieces', exact: true }).focus();
  await tiers.getByRole('button', { name: 'Order 8 pieces', exact: true }).press('Enter');
  const plus = page.getByRole('button', { name: 'Increase quantity: Standard', exact: true });
  const minus = page.getByRole('button', { name: 'Decrease quantity: Standard', exact: true });
  await expect(minus).toBeDisabled();
  await plus.click();
  await expect(input).toHaveValue('9');
  await minus.click();
  await expect(input).toHaveValue('8');
  await input.fill('0');
  await expect(page.locator('.pd-main-buy')).toBeDisabled();
  await expect(
    page.getByRole('status').filter({ hasText: 'Quantity must meet the minimum order.' }),
  ).toBeVisible();
  await input.fill('');
  await tiers.getByRole('button', { name: 'Order 24 pieces', exact: true }).click();
  await expect(input).toHaveValue('24');
  await input.fill('120');
  await expect(plus).toBeDisabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
