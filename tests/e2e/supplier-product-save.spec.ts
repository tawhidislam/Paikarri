import { test, expect, type Page } from '@playwright/test';
import { chatFixture, uid, bid, pid } from '../helpers/chat-fixture';

const category = '66000000-0000-4000-8000-000000000001';
async function editorFixture(page: Page, locale = 'en') {
  await chatFixture(page, { role: 'supplier', locale });
  let revision = 0;
  let fail = false;
  let product = {
    id: pid,
    business_id: bid,
    category_id: category,
    name: 'Synthetic wholesale shirt',
    name_bn: '',
    description: 'Synthetic product for browser testing only.',
    price: 185,
    moq: 10,
    stock: 500,
    unit: 'piece',
    specifications: {},
    status: 'pending',
    created_at: '2026-10-19T00:00:00Z',
    updated_at: '2026-10-19T00:00:00Z',
  };
  await page.route('https://zhllnfciehxmjahljrhb.supabase.co/**', async (route) => {
    const req = route.request();
    const name = new URL(req.url()).pathname.split('/').pop();
    if (name === 'save_product') {
      await new Promise((resolve) => setTimeout(resolve, 400));
      if (fail) return route.fulfill({ status: 400, json: { message: 'Synthetic save failure' } });
      revision++;
      product = {
        ...product,
        ...req.postDataJSON().payload,
        updated_at: `2026-10-19T00:00:0${revision}Z`,
      };
      return route.fulfill({ json: pid });
    }
    if (name === 'businesses')
      return route.fulfill({ json: { id: bid, owner_id: uid, name: 'Synthetic supplier' } });
    if (name === 'categories')
      return route.fulfill({ json: [{ id: category, name: 'Clothing', name_bn: 'পোশাক' }] });
    if (name === 'products') return route.fulfill({ json: product });
    if (name === 'product_price_tiers' || name === 'product_images')
      return route.fulfill({ json: [] });
    return route.fallback();
  });
  return {
    failNextSave: () => {
      fail = true;
    },
  };
}

for (const locale of ['en', 'bn']) {
  test(`adding a product keeps its confirmation after navigation and form refresh (${locale})`, async ({
    page,
  }) => {
    await editorFixture(page, locale);
    await page.goto('/dashboard/products/new');
    const form = page.locator('form').filter({ has: page.locator('input[name="name"]') });
    await form.locator('input[name="name"]').fill('Synthetic wholesale shirt');
    await form.locator('select[name="category_id"]').selectOption(category);
    await form.locator('input[name="price"]').fill('185');
    await form.locator('input[name="moq"]').fill('10');
    await form.locator('input[name="stock"]').fill('500');
    await form
      .locator('textarea[name="description"]')
      .fill('Synthetic product for browser testing only.');
    await form.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(`/dashboard/products/${pid}`);
    const banner = page.locator('.product-save-confirmation');
    await expect(banner.getByRole('status')).toHaveText(
      locale === 'en' ? 'Product added successfully.' : 'পণ্য সফলভাবে যোগ করা হয়েছে।',
    );
    await expect(banner).toBeFocused();
    await expect(banner).toBeInViewport();
    await expect(page.locator('input[name="name"]')).toHaveValue('Synthetic wholesale shirt');
    await expect(page.locator('.image-manager')).toBeVisible();
    await expect(banner).toBeVisible();
    await expect(page.locator('body')).not.toHaveText(/Synthetic save failure/);
  });
}

test('editing keeps confirmation across refreshed form and clears it when a later save fails', async ({
  page,
}) => {
  const fixture = await editorFixture(page);
  await page.goto(`/dashboard/products/${pid}`);
  const name = page.locator('input[name="name"]');
  await name.fill('Updated synthetic wholesale shirt');
  await page.getByRole('button', { name: 'Save & submit for review', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Saving product…', exact: true })).toBeDisabled();
  const banner = page.locator('.product-save-confirmation');
  await expect(banner.getByRole('status')).toHaveText('Product updated successfully.');
  await expect(name).toHaveValue('Updated synthetic wholesale shirt');
  await expect(banner).toBeInViewport();
  fixture.failNextSave();
  await name.fill('Rejected synthetic edit');
  await page.getByRole('button', { name: 'Save & submit for review', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Synthetic save failure');
  await expect(banner).toHaveCount(0);
  await expect(name).toHaveValue('Rejected synthetic edit');
});
