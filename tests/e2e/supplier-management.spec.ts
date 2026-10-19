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
  let currentWorkspace = { ...workspace, labels: [...workspace.labels] };
  const notes = [
    {
      id: 'd5000000-0000-4000-8000-000000000001',
      business_id: bid,
      body: 'Synthetic private operational note',
      author: 'Super admin',
      created_at: '2026-10-17T03:00:00Z',
      archived_at: null as string | null,
      archive_reason: '',
    },
  ];
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
    else if (name === 'admin_supplier_workspace') data = currentWorkspace;
    else if (name === 'admin_supplier_detail')
      data = { business: { name_bn: 'সিনথেটিক টেক্সটাইল', contact_phone: '+8801712345678' } };
    else if (name === 'admin_supplier_operations_list')
      data = {
        total: empty ? 0 : 30,
        rows: empty
          ? []
          : body.kind === 'suppliers'
            ? [currentWorkspace]
            : body.kind === 'warnings'
              ? [warning]
              : body.kind === 'notes'
                ? notes
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
    } else if (name === 'admin_supplier_labels') {
      currentWorkspace = {
        ...currentWorkspace,
        labels: body.labels as string[],
        labels_version: currentWorkspace.labels_version + 1,
      };
      data = currentWorkspace;
    } else if (name === 'admin_supplier_note') {
      notes.unshift({
        ...notes[0],
        id: 'd5000000-0000-4000-8000-000000000002',
        body: body.body as string,
      });
      data = notes[0].id;
    } else if (name === 'admin_supplier_archive_note') {
      const note = notes.find((note) => note.id === body.target);
      if (note) {
        note.archived_at = '2026-10-19T00:00:00Z';
        note.archive_reason = body.reason as string;
      }
      data = null;
    } else if (name === 'admin_set_account_status') {
      currentWorkspace = { ...currentWorkspace, account_status: body.new_status as string };
      data = null;
    } else if (name === 'admin_set_supplier_verified') {
      currentWorkspace = {
        ...currentWorkspace,
        verified: body.grant_badge as boolean,
      };
      data = currentWorkspace;
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
  await page.getByText('Edit labels as text', { exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Labels separated by commas' })
    .fill('Priority, Follow up');
  await page.getByRole('button', { name: 'Save labels', exact: true }).click();
  await expect.poll(() => calls.filter((c) => c.name === 'admin_supplier_labels').length).toBe(1);
  await page.getByRole('tab', { name: /^Internal Notes/ }).click();
  await page
    .getByRole('textbox', { name: 'New internal note' })
    .fill('Synthetic operational follow up');
  await page.getByRole('button', { name: 'Add note', exact: true }).click();
  await expect.poll(() => calls.filter((c) => c.name === 'admin_supplier_note').length).toBe(1);
  await page.getByRole('tab', { name: /^Warnings & Sanctions/ }).click();
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
  await page.getByRole('tab', { name: /^অভ্যন্তরীণ নোট/ }).click();
  await expect(page.getByRole('heading', { name: 'অভ্যন্তরীণ নোট' })).toBeVisible();
  await page.getByRole('tab', { name: 'বিবরণ ও লেবেল' }).click();
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

test('command center labels support chips, presets, removal and an explicit save', async ({
  page,
}) => {
  const calls = await setup(page);
  await page.goto(`/admin/supplier-management/${bid}`);
  await page.getByRole('textbox', { name: 'Add tag', exact: true }).fill('Regional');
  await page.getByRole('textbox', { name: 'Add tag', exact: true }).press('Enter');
  await page.getByRole('button', { name: 'VIP Supplier', exact: true }).click();
  await page.getByRole('button', { name: 'Remove label: Priority', exact: true }).click();
  expect(calls.some((call) => call.name === 'admin_supplier_labels')).toBe(false);
  await page.getByRole('button', { name: 'Save labels', exact: true }).click();
  await expect
    .poll(() => calls.find((call) => call.name === 'admin_supplier_labels')?.body)
    .toEqual({ target: bid, expected_version: 1, labels: ['Regional', 'VIP Supplier'] });
  await expect(page.getByRole('status').filter({ hasText: 'Labels saved.' })).toBeVisible();
  await expect(page.locator('.sm-editable-tags')).toContainText('Regional');
});

test('command center contacts and account controls use safe links and confirmed account ID', async ({
  page,
}) => {
  const calls = await setup(page);
  await page.goto(`/admin/supplier-management/${bid}`);
  const storefront = page.getByRole('link', { name: 'View storefront' });
  await expect(storefront).toHaveAttribute('href', `/suppliers/${bid}`);
  await expect(storefront).toHaveAttribute('target', '_blank');
  await expect(page.getByRole('link', { name: 'Email supplier' })).toHaveAttribute(
    'href',
    'mailto:supplier%40example.invalid',
  );
  await expect(page.getByRole('link', { name: 'Call supplier' })).toHaveAttribute(
    'href',
    'tel:+8801712345678',
  );
  await page.getByRole('button', { name: 'Suspend account', exact: true }).click();
  let dialog = page.getByRole('dialog', { name: 'Suspend account' });
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  expect(calls.some((call) => call.name === 'admin_set_account_status')).toBe(false);
  await page.getByRole('button', { name: 'Suspend account', exact: true }).click();
  dialog = page.getByRole('dialog', { name: 'Suspend account' });
  await dialog
    .getByRole('textbox', { name: 'Reason', exact: true })
    .fill('Synthetic account-control check');
  await dialog.getByRole('button', { name: 'Confirm', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Reactivate account', exact: true })).toBeVisible();
  expect(calls.find((call) => call.name === 'admin_set_account_status')?.body).toEqual({
    target: uid,
    new_status: 'suspended',
    reason: 'Synthetic account-control check',
  });
  await page.getByRole('button', { name: 'Reactivate account', exact: true }).click();
  dialog = page.getByRole('dialog', { name: 'Reactivate account' });
  await dialog
    .getByRole('textbox', { name: 'Reason', exact: true })
    .fill('Synthetic remediation complete');
  await dialog.getByRole('button', { name: 'Confirm', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Suspend account', exact: true })).toBeVisible();
});

test('tabs support keyboard navigation, retain note drafts and submit with Ctrl+Enter', async ({
  page,
}) => {
  const calls = await setup(page);
  await page.goto(`/admin/supplier-management/${bid}`);
  await page.getByRole('tab', { name: 'Overview & Labels', exact: true }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#tab-warnings')).toBeFocused();
  await expect(page.locator('#tab-warnings')).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('ArrowRight');
  const note = page.getByRole('textbox', { name: 'New internal note', exact: true });
  await note.fill('Synthetic keyboard note for operations');
  await page.locator('#tab-overview').click();
  await page.locator('#tab-notes').click();
  await expect(note).toHaveValue('Synthetic keyboard note for operations');
  await note.press('Control+Enter');
  await expect(
    page.locator('.sm-note').filter({ hasText: 'Synthetic keyboard note for operations' }),
  ).toBeVisible();
  expect(calls.filter((call) => call.name === 'admin_supplier_note')).toHaveLength(1);
  const saved = page
    .locator('.sm-note')
    .filter({ hasText: 'Synthetic keyboard note for operations' });
  await saved.getByRole('button', { name: 'Archive note', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Archive note' });
  await dialog
    .getByRole('textbox', { name: 'Reason', exact: true })
    .fill('Synthetic follow-up completed');
  await dialog.getByRole('button', { name: 'Confirm', exact: true }).click();
  await expect(saved.locator('.sm-archive-reason')).toContainText('Synthetic follow-up completed');
  await page.getByRole('button', { name: 'Archived notes', exact: true }).click();
  await expect(page.locator('.sm-note')).toHaveCount(1);
});

test('workspace renewal reminder and warning filters use existing scoped APIs', async ({
  page,
}) => {
  const calls = await setup(page);
  await page.goto(`/admin/supplier-management/${bid}?tab=verification`);
  await expect(page.locator('.sm-validity progress')).toHaveAttribute('value', '3');
  await page.getByRole('button', { name: 'Send renewal reminder', exact: true }).click();
  expect(calls.some((call) => call.name === 'admin_supplier_renewal_reminder')).toBe(false);
  await page.getByRole('dialog').getByRole('button', { name: 'Confirm', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Renewal reminder sent' })).toBeVisible();
  await page.locator('#tab-warnings').click();
  await page
    .getByRole('group', { name: 'Warning filters' })
    .getByRole('button', { name: 'resolved', exact: true })
    .click();
  await expect
    .poll(
      () =>
        calls
          .filter(
            (call) =>
              call.name === 'admin_supplier_operations_list' && call.body.kind === 'warnings',
          )
          .at(-1)?.body.filters,
    )
    .toMatchObject({ business_id: bid, status: 'resolved' });
});

test('supplier quick filters retain server pagination and identify page-scoped attention', async ({
  page,
}) => {
  const calls = await setup(page);
  await page.goto('/admin/supplier-management');
  await page
    .getByRole('group', { name: 'Supplier quick filters' })
    .getByRole('button', { name: 'Suspended', exact: true })
    .click();
  await expect
    .poll(
      () =>
        calls.filter((call) => call.name === 'admin_supplier_operations_list').at(-1)?.body.filters,
    )
    .toMatchObject({ status: 'suspended' });
  await page.getByRole('button', { name: 'Needs attention on this page', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('within the current page');
  await page.getByRole('searchbox').fill('supplier@example.invalid');
  await expect
    .poll(
      () =>
        calls.filter((call) => call.name === 'admin_supplier_operations_list').at(-1)?.body.filters,
    )
    .toMatchObject({ q: 'supplier@example.invalid', status: 'suspended' });
});

for (const locale of ['en', 'bn']) {
  test(`command center responsive tabs and warning composer (${locale})`, async ({
    page,
  }, info) => {
    await setup(page, { locale });
    for (const width of info.project.name === 'mobile' ? [320, 375] : [768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`/admin/supplier-management/${bid}`);
      await expect(page.locator('.sm-hero h1')).toContainText(workspace.name);
      await expect(page.locator('.sm-kpi-ribbon > *')).toHaveCount(4);
      await expect(page.locator('#panel-overview')).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await page.screenshot({
        path: `artifacts/supplier-command-${locale}-${width}.png`,
        fullPage: true,
      });
      await page.locator('#tab-warnings').click();
      await page.locator('.sm-warning-composer > button').click();
      await expect(page.locator('.sm-warning-dialog')).toBeVisible();
      await page.screenshot({
        path: `artifacts/supplier-warning-composer-${locale}-${width}.png`,
        fullPage: true,
      });
      await page.keyboard.press('Escape');
      await expect(page.locator('.sm-warning-dialog')).not.toBeVisible();
      await page.locator('#tab-notes').click();
      await expect(page.locator('#panel-notes')).toBeVisible();
      await page.screenshot({
        path: `artifacts/supplier-notes-${locale}-${width}.png`,
        fullPage: true,
      });
      await page.locator('#tab-verification').click();
      await expect(page.locator('#panel-verification')).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
    }
  });
}

test('super admin grants and revokes verified badge with audit reason', async ({ page }) => {
  const calls = await setup(page);
  await page.goto(`/admin/supplier-management/${bid}`);
  await expect(page.locator('.sm-hero h1')).toContainText(workspace.name);

  const grantBtn = page.getByRole('button', { name: 'Grant verified badge' }).first();
  await expect(grantBtn).toBeVisible();

  await grantBtn.click();
  const dialog = page.locator('.sm-badge-dialog');
  await expect(dialog).toBeVisible();

  const submitBtn = dialog.getByRole('button', { name: 'Grant verified badge' });
  await expect(submitBtn).toBeDisabled();

  await dialog.locator('textarea').fill('Verified after on-site audit of the factory premises.');
  await expect(submitBtn).toBeEnabled();

  await submitBtn.click();
  await expect(dialog).not.toBeVisible();

  const rpcCall = calls.find((c) => c.name === 'admin_set_supplier_verified');
  expect(rpcCall).toBeDefined();
  expect(rpcCall?.body.grant_badge).toBe(true);
  expect(rpcCall?.body.reason).toContain('Verified after on-site audit');
});
