import { adminOrderFixture } from '../helpers/admin-order-fixture';
import { test, expect } from '@playwright/test';
import { orderFixture, oid } from '../helpers/order-fixture';
test('cart updates quantity using refreshed tier prices and removes products', async ({ page }) => {
  const calls = await orderFixture(page);
  await page.goto('/cart');
  await expect(page.getByRole('heading', { name: 'Your wholesale cart' })).toBeVisible();
  await page.getByRole('spinbutton', { name: 'Quantity', exact: true }).fill('500');
  await page.getByRole('button', { name: 'Update', exact: true }).click();
  await expect(page.locator('.order-summary')).toContainText('85,000');
  await expect(page.locator('.cart-checkout-actions a')).toHaveAttribute('aria-disabled', 'false');
  expect(calls.find((c) => c.name === 'cart_set')?.body.quantity).toBe(500);
  await page.getByRole('button', { name: 'Remove', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Your cart is empty' })).toBeVisible();
});
test('checkout retains leading zero phone, splits suppliers and sends expected prices without collecting money', async ({
  page,
}, info) => {
  const calls = await orderFixture(page, { twoSuppliers: true });
  await page.goto('/checkout');
  await page
    .getByRole('textbox', { name: 'Recipient name', exact: true })
    .fill('Synthetic Receiver');
  await page.getByRole('textbox', { name: 'Mobile number', exact: true }).fill('01712345678');
  await page
    .getByRole('textbox', { name: 'Street address and delivery instructions' })
    .fill('10 Synthetic Road Dhaka');
  await page.getByRole('radio', { name: /Bank transfer/ }).check();
  await page.getByRole('checkbox').check();
  await page.screenshot({
    path: `artifacts/order-checkout-${info.project.name}.png`,
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Place order request', exact: true }).click();
  await expect(page).toHaveURL(/dashboard\/orders$/);
  const request = calls.find((c) => c.name === 'order_checkout')!.body;
  expect(request.method).toBe('bank_transfer');
  expect(request.address).toMatchObject({ phone: '01712345678' });
  expect(request.expected).toHaveLength(2);
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain('01712345678');
});
test('buyer explicitly accepts final total and can request cancellation without shipping permissions', async ({
  page,
}) => {
  const calls = await orderFixture(page);
  await page.goto(`/dashboard/orders/${oid}`);
  await expect(page.locator('.order-totals')).toContainText('19,000');
  await expect(page.getByRole('button', { name: 'Dispatch shipment', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Accept final total', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('19,000');
  await dialog.getByRole('button', { name: 'Accept final total', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await page.getByRole('button', { name: 'Request cancellation', exact: true }).click();
  await page
    .getByRole('dialog')
    .getByRole('textbox', { name: 'Reason / decision' })
    .fill('Please cancel this synthetic test order');
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Request cancellation', exact: true })
    .click();
  await expect(page.locator('.order-action-notice').first()).toContainText('Shipment is paused');
  expect(calls.filter((c) => c.name === 'order_action').map((c) => c.body.action)).toEqual([
    'accept',
    'request_cancel',
  ]);
});
test('supplier confirms delivery charges and cannot skip buyer acceptance', async ({ page }) => {
  const calls = await orderFixture(page, { role: 'supplier', status: 'pending_confirmation' });
  await page.goto(`/dashboard/orders/${oid}`);
  await page.getByRole('button', { name: 'Confirm availability & delivery', exact: true }).click();
  await page
    .getByRole('dialog')
    .getByRole('spinbutton', { name: 'Delivery charge (BDT)' })
    .fill('650');
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Confirm availability & delivery', exact: true })
    .click();
  await expect(page.locator('.order-totals')).toContainText('19,150');
  await expect(page.getByRole('button', { name: 'Dispatch shipment', exact: true })).toHaveCount(0);
  expect(calls.find((c) => c.name === 'order_action')?.body.payload).toMatchObject({
    shipping_fee: 650,
  });
});
test('supplier dispatches a COD order with a carrier and tracking reference', async ({
  page,
}, info) => {
  await orderFixture(page, { role: 'supplier', status: 'processing' });
  await page.goto(`/dashboard/orders/${oid}`);
  await page.getByRole('button', { name: 'Dispatch shipment', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog
    .getByRole('textbox', { name: 'Carrier / delivery service' })
    .fill('Synthetic Courier');
  await dialog
    .getByRole('textbox', { name: 'Tracking / consignment number' })
    .fill('SYNTHETIC-123');
  await dialog.getByRole('button', { name: 'Dispatch shipment', exact: true }).click();
  await expect(page.locator('.order-tracking')).toContainText('SYNTHETIC-123');
  await expect(page.locator('.order-detail-heading')).toContainText('Unpaid');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({
    path: `artifacts/order-detail-${info.project.name}.png`,
    fullPage: true,
  });
});
test('unverified bank payment prevents supplier dispatch and bank reports remain unverified', async ({
  page,
}) => {
  await orderFixture(page, {
    role: 'supplier',
    status: 'processing',
    method: 'bank_transfer',
    payment: 'reported',
  });
  await page.goto(`/dashboard/orders/${oid}`);
  await expect(page.getByRole('button', { name: 'Dispatch shipment', exact: true })).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Verify external payment', exact: true }),
  ).toHaveCount(0);
  await expect(page.locator('.order-actions-panel')).toContainText(
    'Shipment becomes available after the super admin verifies receipt',
  );
});
test('super admin verifies external payment with a reference', async ({ page }) => {
  const calls = await orderFixture(page, {
    role: 'super_admin',
    status: 'processing',
    method: 'bank_transfer',
    payment: 'reported',
  });
  await page.goto(`/admin/orders/${oid}`);
  await page.getByRole('button', { name: 'Verify external payment', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('Paikarii.com does not move money');
  await dialog
    .getByRole('textbox', { name: 'Transaction / receipt reference' })
    .fill('SYNTHETIC-RECEIPT');
  await dialog.getByRole('button', { name: 'Verify external payment', exact: true }).click();
  await expect(page.locator('.order-detail-heading')).toContainText('Paid');
  expect(calls.find((c) => c.name === 'order_action')?.body.payload).toMatchObject({
    reference: 'SYNTHETIC-RECEIPT',
  });
});
test('staff and supplier cannot open the platform order console', async ({ page }) => {
  await orderFixture(page, { role: 'admin' });
  await page.goto('/admin/orders');
  await expect(page.getByRole('heading', { name: 'Access restricted' })).toBeVisible();
});
test('stale reviews show a conflict and preserve the unsubmitted action', async ({ page }) => {
  await orderFixture(page, { conflict: true });
  await page.goto(`/dashboard/orders/${oid}`);
  await page.getByRole('button', { name: 'Accept final total', exact: true }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Accept final total', exact: true })
    .click();
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('Order changed');
  await page.getByRole('dialog').getByRole('button', { name: 'Back', exact: true }).click();
  await expect(page.locator('.order-detail-heading')).toContainText('Review delivery terms');
});
test('buyer can open a dispute with an explanation', async ({ page }) => {
  const calls = await orderFixture(page, { status: 'shipped' });
  await page.goto(`/dashboard/orders/${oid}`);
  await page.getByRole('button', { name: 'Open dispute', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog
    .getByRole('textbox', { name: 'Reason / decision' })
    .fill('The received goods have synthetic damage');
  await dialog.getByRole('button', { name: 'Open dispute', exact: true }).click();
  await expect(page.locator('.order-detail-heading')).toContainText('In dispute');
  await expect(page.getByRole('button', { name: 'Confirm received', exact: true })).toHaveCount(0);
  expect(calls.find((c) => c.name === 'order_action')?.body.action).toBe('dispute');
});
test('orders use server search, filtering and pagination limits', async ({ page }) => {
  const { requests } = await adminOrderFixture(page);
  await page.goto('/admin/orders');
  await page.getByRole('searchbox', { name: 'Search orders' }).fill('Synthetic');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await page.getByRole('combobox', { name: 'Status', exact: true }).selectOption('processing');
  await expect
    .poll(() => requests.filter((request) => request.method === 'GET').at(-1))
    .toMatchObject({
      filters: expect.arrayContaining([
        expect.stringContaining('status.eq.processing'),
        expect.stringContaining('Synthetic'),
      ]),
      offset: 0,
      limit: 25,
    });
  await expect(page.getByRole('link', { name: 'PK-000101' })).toBeVisible();
});
test('order errors offer a retry', async ({ page }) => {
  await orderFixture(page, { fail: true });
  await page.goto('/dashboard/orders');
  await expect(page.getByRole('button', { name: 'Try again', exact: true })).toBeVisible({
    timeout: 20000,
  });
});

test('super admin authorizes a full return and resolution waits for receipt', async ({ page }) => {
  const calls = await orderFixture(page, {
    role: 'super_admin',
    status: 'disputed',
    payment: 'paid',
  });
  await page.goto(`/admin/orders/${oid}`);
  await page.getByRole('button', { name: 'Authorize full return', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog
    .getByRole('textbox', { name: 'Reason / decision' })
    .fill('Authorize all synthetic goods for inspection');
  await dialog.getByRole('button', { name: 'Authorize full return', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Return shipment', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Resolve and cancel', exact: true })).toHaveCount(
    0,
  );
  expect(calls.find((c) => c.name === 'order_action')?.body.action).toBe('authorize_return');
});
test('buyer adds return tracking and supplier inspects without automatic restocking', async ({
  page,
}) => {
  const calls = await orderFixture(page, {
    role: 'supplier',
    status: 'disputed',
    returnStatus: 'in_transit',
  });
  await page.goto(`/dashboard/orders/${oid}`);
  await page.getByRole('button', { name: 'Confirm return received', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('checkbox')).not.toBeChecked();
  await dialog
    .getByRole('textbox', { name: 'Reason / decision' })
    .fill('Inspected damaged goods; cannot restock');
  await dialog.getByRole('button', { name: 'Confirm return received', exact: true }).click();
  await expect(page.locator('.order-detail')).toContainText('Returned units not restocked');
  expect(calls.find((c) => c.name === 'order_action')?.body.payload).toMatchObject({
    restock: false,
  });
});
test('super admin records an external refund after a cancellation', async ({ page }) => {
  const calls = await orderFixture(page, {
    role: 'super_admin',
    status: 'cancelled',
    payment: 'refund_pending',
  });
  await page.goto(`/admin/orders/${oid}`);
  await page.getByRole('button', { name: 'Verify completed refund', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog
    .getByRole('textbox', { name: 'Transaction / receipt reference' })
    .fill('SYNTHETIC-REFUND-RECEIPT');
  await dialog.getByRole('button', { name: 'Verify completed refund', exact: true }).click();
  await expect(page.locator('.order-detail-heading')).toContainText('Refunded');
  expect(calls.find((c) => c.name === 'order_action')?.body.action).toBe('confirm_refund');
});
test('Bangla buyer checkout and order details fit narrow mobile through desktop', async ({
  page,
}, info) => {
  await orderFixture(page, { locale: 'bn' });
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/checkout');
    await expect(page.getByRole('heading', { name: 'চেকআউট', exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.goto(`/dashboard/orders/${oid}`);
    await expect(page.getByRole('heading', { name: 'অর্ডারের পণ্য', exact: true })).toBeVisible();
    await expect(page.locator('.order-item-line')).toContainText('পরীক্ষামূলক সুতি শার্ট');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    if (width === 390)
      await page.screenshot({
        path: `artifacts/order-detail-bn-${info.project.name}.png`,
        fullPage: true,
      });
  }
});
test('guest checkout keeps sign-in return intent', async ({ page }) => {
  await orderFixture(page, { role: 'guest' });
  await page.goto('/checkout');
  await expect(page).toHaveURL(/auth\/login\?next=%2Fcheckout/);
});

test('checkout retry preserves delivery details and reuses its idempotency key', async ({
  page,
}) => {
  const calls = await orderFixture(page, { failCheckoutOnce: true });
  await page.goto('/checkout');
  await page
    .getByRole('textbox', { name: 'Recipient name', exact: true })
    .fill('Synthetic Receiver');
  await page.getByRole('textbox', { name: 'Mobile number', exact: true }).fill('01712345678');
  await page
    .getByRole('textbox', { name: 'Street address and delivery instructions' })
    .fill('10 Synthetic Road Dhaka');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Place order request', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Checkout interrupted');
  await expect(page.getByRole('textbox', { name: 'Mobile number', exact: true })).toHaveValue(
    '01712345678',
  );
  await page.getByRole('button', { name: 'Refresh cart', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Place order request', exact: true }),
  ).toBeEnabled();
  await page.getByRole('button', { name: 'Place order request', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/dashboard/orders/${oid}`));
  const requests = calls.filter((c) => c.name === 'order_checkout');
  expect(requests).toHaveLength(2);
  expect(requests[0].body.nonce).toBe(requests[1].body.nonce);
});
