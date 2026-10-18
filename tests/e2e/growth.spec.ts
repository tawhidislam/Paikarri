import { test, expect } from '@playwright/test';
import { orderFixture } from '../helpers/order-fixture';
import { pid } from '../helpers/chat-fixture';
test('product quotation opens an accessible prefilled dialog and closes with Escape', async ({
  page,
}) => {
  await orderFixture(page);
  await page.goto(`/products/${pid}`);
  await page.getByRole('button', { name: 'Request quotation', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('textbox', { name: 'Your requirements' })).not.toBeEmpty();
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
});
test('shipping calculator uses configured real presets and explicit shipment weight', async ({
  page,
}) => {
  await orderFixture(page);
  await page.route('**/rpc/public_shipping_presets', (r) =>
    r.fulfill({
      json: {
        enabled: true,
        inside_dhaka_base: 100,
        outside_dhaka_base: 200,
        per_kg_surcharge: 20,
        free_shipping_threshold: null,
        carrier_preference: 'self',
      },
    }),
  );
  await page.goto(`/products/${pid}`);
  const card = page.locator('.shipping-calculator');
  await card.getByRole('spinbutton', { name: 'Total shipment weight (kg)' }).fill('2.1');
  await expect(card.locator('output')).toContainText('160');
  await card.getByRole('combobox', { name: 'Delivery district' }).selectOption('Gazipur');
  await expect(card.locator('output')).toContainText('260');
});
test('catalog shows disjunctive counts and price range without client-side fake totals', async ({
  page,
}) => {
  await orderFixture(page);
  await page.route('**/rpc/catalog_facets', (r) =>
    r.fulfill({
      json: {
        categories: { apparel: 4 },
        divisions: { Dhaka: 3 },
        districts: { Dhaka: 2 },
        price_max: 1000,
      },
    }),
  );
  await page.goto('/products');
  await expect(
    page.locator('.filter-panel').getByRole('combobox', { name: 'Division' }),
  ).toContainText('Dhaka (3)');
  await expect(page.getByRole('slider', { name: 'Maximum price' })).toBeVisible();
});

test('signed-in search history is synchronized and clearable without recording keystrokes', async ({
  page,
}) => {
  await orderFixture(page);
  let records = 0;
  let clear = 0;
  await page.route('**/rpc/search_history', async (route) => {
    const body = route.request().postDataJSON();
    if (body.operation === 'record') records++;
    if (body.operation === 'clear') clear++;
    await route.fulfill({ json: body.operation === 'clear' ? [] : ['cotton fabric'] });
  });
  await page.goto('/products');
  const input = page.getByRole('combobox', { name: 'Search products, suppliers…' });
  // Header label can be supplied by the active language dictionary.
  const search = (await input.count()) ? input : page.locator('.live-search input');
  await search.focus();
  await expect(page.getByRole('option').filter({ hasText: 'cotton fabric' })).toBeVisible();
  await page.getByRole('button', { name: 'Clear search history' }).click();
  await expect(page.getByRole('option').filter({ hasText: 'cotton fabric' })).toHaveCount(0);
  expect(clear).toBe(1);
  expect(records).toBe(0);
  await search.fill('new cotton');
  await search.press('Enter');
  await expect(page).toHaveURL(/q=new%20cotton/);
  await expect.poll(() => records).toBe(1);
});
const tid = 'fa000000-0000-4000-8000-000000000010';
const tender = {
  id: tid,
  title: 'Synthetic fabric sourcing tender',
  quantity: 100,
  unit: 'piece',
  district: 'Dhaka',
  delivery_date: '2099-01-01',
  expires_at: '2099-01-01T00:00:00Z',
  status: 'open',
  moderation: 'approved',
  version: 1,
  created_at: '2026-10-18T00:00:00Z',
};
test('tender board opens safe details and has no horizontal overflow', async ({ page }) => {
  await orderFixture(page);
  await page.route('**/rpc/tender_list', (r) => r.fulfill({ json: { total: 1, rows: [tender] } }));
  await page.route('**/rpc/tender_detail', (r) =>
    r.fulfill({
      json: {
        ...tender,
        category_id: pid,
        requirements: 'Synthetic sourcing requirements for testing only.',
        is_owner: false,
        moderation_note: '',
        bids: [],
      },
    }),
  );
  await page.goto('/tenders');
  await page
    .getByRole('link')
    .filter({ has: page.getByRole('heading', { name: tender.title }) })
    .click();
  await expect(page.getByRole('heading', { name: tender.title, level: 1 })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Select bid & checkout' })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});
test('staff cannot open financial report or integration routes', async ({ page }) => {
  await orderFixture(page, { role: 'admin' });
  await page.goto('/admin/financial-reports');
  await expect(page.getByRole('button', { name: 'Generate report' })).toHaveCount(0);
  await page.goto('/admin/integrations');
  await expect(page.getByRole('heading', { name: 'External integrations' })).toHaveCount(0);
});

test('buyer organization preserves leading-zero licence information and uses versioned save', async ({
  page,
}) => {
  await orderFixture(page);
  let saved: Record<string, unknown> | undefined;
  await page.route('**/rpc/buyer_organization_get', (r) => r.fulfill({ json: null }));
  await page.route('**/rpc/buyer_organization_save', async (r) => {
    saved = r.request().postDataJSON();
    await r.fulfill({ json: null });
  });
  await page.goto('/dashboard/settings');
  await page
    .getByRole('textbox', { name: 'Organization name', exact: true })
    .fill('Synthetic Retailers');
  await page
    .getByRole('textbox', { name: 'Trade licence number (private)', exact: true })
    .fill('000123');
  await page.getByRole('button', { name: 'Save business profile', exact: true }).click();
  await expect
    .poll(() => saved)
    .toMatchObject({
      expected_version: 0,
      payload: { name: 'Synthetic Retailers', trade_license_number: '000123' },
    });
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain('000123');
});
test('super admin generates a safe financial report and can download CSV', async ({ page }) => {
  await orderFixture(page, { role: 'super_admin' });
  await page.route('**/rpc/admin_financial_report', (r) =>
    r.fulfill({
      json: {
        rows: [
          {
            id: tid,
            number: 101,
            created_at: '2026-10-18T02:00:00Z',
            supplier_name: 'Synthetic Textile Works',
            status: 'completed',
            payment_method: 'cod',
            payment_status: 'paid',
            subtotal: 1000,
            shipping_fee: 100,
            total: 1100,
            confirmed_payments: 1100,
            confirmed_refunds: 0,
          },
        ],
      },
    }),
  );
  await page.goto('/admin/financial-reports');
  await page.getByRole('button', { name: 'Generate report' }).click();
  await expect(page.locator('.financial-report table')).toContainText('Synthetic Textile Works');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download CSV' }).click();
  expect((await download).suggestedFilename()).toMatch(/^financial-.*\.csv$/);
  await expect(page.getByRole('button', { name: 'Print / save PDF' })).toBeVisible();
});

test('product delivery free-threshold tracks the actual selected quantity subtotal', async ({
  page,
}) => {
  await orderFixture(page);
  await page.route('**/rpc/public_shipping_presets', (r) =>
    r.fulfill({
      json: {
        enabled: true,
        inside_dhaka_base: 100,
        outside_dhaka_base: 200,
        per_kg_surcharge: 20,
        free_shipping_threshold: 20000,
        carrier_preference: 'self',
      },
    }),
  );
  await page.goto(`/products/${pid}`);
  const output = page.locator('.shipping-calculator output');
  await expect(output).toContainText('120');
  await page.getByRole('spinbutton', { name: 'Order quantity', exact: true }).fill('200');
  await expect(output).toHaveText(/(?:BDT|৳)\s*0/);
});
test('supplier validates CSV and submits only valid new product rows', async ({ page }) => {
  await orderFixture(page, { role: 'supplier' });
  await page.route('**/rest/v1/categories*', (r) =>
    r.fulfill({
      json: [{ id: pid, name: 'Apparel', name_bn: 'পোশাক', slug: 'apparel', parent_id: null }],
    }),
  );
  await page.route('**/rpc/supplier_performance', (r) =>
    r.fulfill({
      json: {
        inquiries: 0,
        responded: 0,
        responded_within_two_hours: 0,
        orders: 0,
        completed: 0,
        average_delivery_days: null,
      },
    }),
  );
  let imported: Record<string, unknown> | undefined;
  await page.route('**/rpc/supplier_bulk_products', async (r) => {
    imported = r.request().postDataJSON();
    await r.fulfill({ json: [pid] });
  });
  await page.goto('/dashboard/tools');
  await page
    .getByLabel('CSV file', { exact: true })
    .setInputFiles({
      name: 'products.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(
        'name,name_bn,description,category_slug,price,moq,stock,unit,specifications,tiers\nSynthetic imported shirt,,Synthetic import for browser testing,apparel,195,10,100,piece,{},[]',
      ),
    });
  await expect(page.getByRole('table')).toContainText('Ready');
  await page.getByRole('button', { name: 'Import validated products', exact: true }).click();
  await expect
    .poll(() => imported)
    .toMatchObject({
      payload: [{ name: 'Synthetic imported shirt', price: 195, category_id: pid }],
    });
  await expect(page.getByText('Products imported for review', { exact: true })).toBeVisible();
});
