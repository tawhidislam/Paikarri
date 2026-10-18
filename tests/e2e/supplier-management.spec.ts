import { test, expect, type Page } from '@playwright/test';
const uid = 'd1000000-0000-4000-8000-000000000001',
  bid = 'd2000000-0000-4000-8000-000000000001';
const workspace = {
  id: bid,
  owner_id: uid,
  name: 'Synthetic Textile Works',
  email: 'supplier@example.invalid',
  division: 'Dhaka',
  district: 'Dhaka',
  account_status: 'active',
  verified: false,
  profile_complete: true,
  last_sign_in_at: null,
  last_activity: '2026-10-17T03:00:00Z',
  approved_products: 12,
  pending_products: 2,
  unanswered_quotations: 3,
  unanswered_conversations: 4,
  active_warnings: 1,
  overdue_warnings: 1,
  labels: ['Priority'],
  labels_version: 1,
};
const warning = {
  id: 'd4000000-0000-4000-8000-000000000001',
  business_id: bid,
  title: 'Correct product information',
  message: 'Please correct the product specifications.',
  corrective_action: 'Update the specifications on all active products.',
  severity: 'warning',
  due_on: '2026-10-16',
  status: 'open',
  version: 1,
  created_at: '2026-10-17T03:00:00Z',
  overdue: true,
  events: [],
};
async function setup(
  page: Page,
  { role = 'super_admin', locale = 'en', fail = false, empty = false } = {},
) {
  const calls: { name: string; body: Record<string, unknown> }[] = [];
  await page.addInitScript(
    ({ uid, locale }) => {
      const now = Math.floor(Date.now() / 1000);
      localStorage.setItem('paikari-locale', locale);
      localStorage.setItem(
        'sb-zhllnfciehxmjahljrhb-auth-token',
        JSON.stringify({
          access_token: `${btoa('{}')}.${btoa(JSON.stringify({ sub: uid, role: 'authenticated', exp: now + 3600 }))}.test`,
          refresh_token: 'synthetic',
          token_type: 'bearer',
          expires_in: 3600,
          expires_at: now + 3600,
          user: {
            id: uid,
            email: 'synthetic@example.invalid',
            aud: 'authenticated',
            role: 'authenticated',
            app_metadata: { provider: 'email' },
            user_metadata: {},
            created_at: '2026-10-17T00:00:00Z',
          },
        }),
      );
    },
    { uid, locale },
  );
  await page.route('https://zhllnfciehxmjahljrhb.supabase.co/**', async (route) => {
    const name = new URL(route.request().url()).pathname.split('/').pop()!,
      body = route.request().postDataJSON() ?? {};
    calls.push({ name, body });
    let data: unknown;
    if (name === 'user_roles') data = { role };
    else if (name === 'get_account_status') data = { status: 'active', reason: '' };
    else if (name === 'notification_unread_count') data = 0;
    else if (name === 'get_platform_settings')
      data = {
        name_en: 'Paikarii.com',
        name_bn: 'পাইকারি',
        tagline_en: 'Wholesale',
        tagline_bn: 'পাইকারি',
        support_email: 'support@example.invalid',
        support_phone: '01700000000',
        default_locale: locale,
        supplier_registration_open: true,
      };
    else if (name === 'admin_supplier_workspace') data = workspace;
    else if (name === 'admin_supplier_operations_list')
      data = {
        total: empty ? 0 : 30,
        rows: empty
          ? []
          : body.kind === 'suppliers'
            ? [workspace]
            : body.kind === 'warnings'
              ? [warning]
              : body.kind === 'notes'
                ? [
                    {
                      id: 'd5000000-0000-4000-8000-000000000001',
                      business_id: bid,
                      body: 'Synthetic private operational note',
                      author: 'Super admin',
                      created_at: '2026-10-17T03:00:00Z',
                      archived_at: null,
                      archive_reason: '',
                    },
                  ]
                : [
                    {
                      id: bid,
                      name: workspace.name,
                      account_status: 'active',
                      valid_until: '2026-10-20',
                      days_remaining: 3,
                      revision: 1,
                      latest_status: 'approved',
                      last_reminded_at: null,
                    },
                  ],
      };
    else if (name === 'supplier_action_list')
      data = { total: empty ? 0 : 1, rows: empty ? [] : [warning] };
    else if (name === 'admin_supplier_labels' && fail) {
      await route.fulfill({
        status: 409,
        json: { message: 'Supplier labels changed. Reload before saving.', code: '40001' },
      });
      return;
    } else data = null;
    await route.fulfill({ json: data });
  });
  return calls;
}
test('supplier operations list searches, filters and paginates on the server', async ({ page }) => {
  const calls = await setup(page);
  await page.goto('/admin/supplier-management');
  await expect(
    page.getByRole('heading', { name: 'Supplier management', exact: true }),
  ).toBeVisible();
  await page.getByRole('searchbox').fill('Textile');
  await expect
    .poll(
      () => calls.filter((c) => c.name === 'admin_supplier_operations_list').at(-1)?.body.filters,
    )
    .toMatchObject({ q: 'Textile' });
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect
    .poll(() => calls.filter((c) => c.name === 'admin_supplier_operations_list').at(-1)?.body.page)
    .toBe(2);
  await page.getByRole('link', { name: 'Manage supplier', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Activity overview' })).toBeVisible();
});
test('owner records labels, notes, warnings and decisions with confirmation', async ({
  page,
}, info) => {
  const calls = await setup(page);
  await page.goto(`/admin/supplier-management/${bid}`);
  await page
    .getByRole('textbox', { name: 'Labels separated by commas' })
    .fill('Priority, Follow up');
  await page.getByRole('button', { name: 'Save labels', exact: true }).click();
  await expect.poll(() => calls.filter((c) => c.name === 'admin_supplier_labels').length).toBe(1);
  await page
    .getByRole('textbox', { name: 'New internal note' })
    .fill('Synthetic operational follow up');
  await page.getByRole('button', { name: 'Add note', exact: true }).click();
  await expect.poll(() => calls.filter((c) => c.name === 'admin_supplier_note').length).toBe(1);
  await page.getByText('Issue warning', { exact: true }).click();
  await page.getByRole('textbox', { name: 'Warning title' }).fill('Correct listing details');
  await page
    .getByRole('textbox', { name: 'Warning message' })
    .fill('Please correct the listing specifications.');
  await page
    .getByRole('textbox', { name: 'Required corrective action' })
    .fill('Update all listing specifications.');
  await page.getByLabel('Correction deadline', { exact: true }).fill('2099-01-01');
  await page.getByRole('button', { name: 'Send warning', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Confirm', exact: true }).click();
  await expect
    .poll(() => calls.filter((c) => c.name === 'admin_supplier_issue_warning').length)
    .toBe(1);
  await page.getByRole('button', { name: 'Resolve warning', exact: true }).click();
  await page
    .getByRole('dialog')
    .getByRole('textbox', { name: 'Reason' })
    .fill('Reviewed corrected supplier listing');
  await page.getByRole('dialog').getByRole('button', { name: 'Confirm', exact: true }).click();
  await expect
    .poll(() => calls.filter((c) => c.name === 'admin_supplier_warning_decide').length)
    .toBe(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: `artifacts/supplier-management-${info.project.name}.png`,
    fullPage: true,
  });
});
test('renewals use selected window and explicit reminder confirmation', async ({ page }) => {
  const calls = await setup(page);
  await page.goto('/admin/supplier-renewals');
  await page.getByRole('combobox', { name: 'Expiry window' }).selectOption('7');
  await expect
    .poll(
      () => calls.filter((c) => c.name === 'admin_supplier_operations_list').at(-1)?.body.filters,
    )
    .toMatchObject({ days: '7' });
  await page.getByRole('button', { name: 'Send renewal reminder', exact: true }).click();
  expect(calls.some((c) => c.name === 'admin_supplier_renewal_reminder')).toBe(false);
  await page.getByRole('dialog').getByRole('button', { name: 'Confirm', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Renewal reminder sent' })).toBeVisible();
});
test('supplier can respond without access to internal notes or admin APIs', async ({ page }) => {
  const calls = await setup(page, { role: 'supplier' });
  await page.goto('/dashboard/supplier-actions');
  await expect(page.getByRole('heading', { name: warning.title })).toBeVisible();
  await page
    .getByRole('textbox', { name: 'Your correction response' })
    .fill('The specifications have been corrected.');
  await page.getByRole('button', { name: 'Submit response', exact: true }).click();
  await expect
    .poll(() => calls.filter((c) => c.name === 'supplier_warning_respond').length)
    .toBe(1);
  expect(calls.some((c) => c.name.startsWith('admin_supplier_'))).toBe(false);
  await expect(page.getByText('Synthetic private operational note')).toHaveCount(0);
});
test('staff and ordinary users cannot enter any owner-only supplier operations routes', async ({
  page,
}) => {
  for (const role of ['admin', 'supplier', 'buyer']) {
    await page.unrouteAll({ behavior: 'wait' });
    const calls = await setup(page, { role });
    for (const path of [
      '/admin/supplier-management',
      `/admin/supplier-management/${bid}`,
      '/admin/supplier-renewals',
    ]) {
      await page.goto(path);
      await expect(page.getByRole('heading', { name: 'Access restricted' })).toBeVisible();
    }
    expect(calls.some((c) => c.name.startsWith('admin_supplier_'))).toBe(false);
  }
});
test('Bangla workspace remains readable and handles stale label edits', async ({ page }, info) => {
  await setup(page, { locale: 'bn', fail: true });
  await page.goto(`/admin/supplier-management/${bid}`);
  await expect(page.getByRole('heading', { name: 'অভ্যন্তরীণ নোট' })).toBeVisible();
  await page.getByRole('button', { name: 'লেবেল সংরক্ষণ', exact: true }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: `artifacts/supplier-management-bn-${info.project.name}.png`,
    fullPage: true,
  });
});
test('empty queues offer truthful states', async ({ page }) => {
  await setup(page, { empty: true });
  await page.goto('/admin/supplier-renewals');
  await expect(page.getByRole('heading', { name: 'No renewals due' })).toBeVisible();
});
