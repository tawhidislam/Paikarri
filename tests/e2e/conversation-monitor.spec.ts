import { test, expect, type Page } from '@playwright/test';
const uid = 'c1000000-0000-4000-8000-000000000001',
  supplierId = 'c1000000-0000-4000-8000-000000000003',
  customerId = 'c1000000-0000-4000-8000-000000000004',
  bid = 'c2000000-0000-4000-8000-000000000001',
  cid = 'c4000000-0000-4000-8000-000000000001';
const message = (n: number) => ({
  id: `c5000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
  conversation_id: cid,
  sender_id: n % 2 ? customerId : supplierId,
  body: `Synthetic private message ${n}`,
  created_at: `2026-10-17T03:0${n}:00Z`,
});
const pageOf = (rows: ReturnType<typeof message>[], more = false) => ({
  rows,
  has_more: more,
  oldest: rows.length ? { created_at: rows[0].created_at, id: rows[0].id } : null,
  newest: rows.length
    ? { created_at: rows[rows.length - 1].created_at, id: rows[rows.length - 1].id }
    : null,
});
async function setup(
  page: Page,
  { role = 'super_admin', locale = 'en', empty = false, missing = false } = {},
) {
  const calls: { name: string; body: Record<string, unknown>; method: string }[] = [];
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
            email: 'owner@example.invalid',
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
    const request = route.request(),
      name = new URL(request.url()).pathname.split('/').pop()!,
      body = request.postDataJSON() ?? {};
    calls.push({ name, body, method: request.method() });
    let data: unknown = [];
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
    else if (name === 'admin_monitor_list')
      data = {
        total: empty ? 0 : 60,
        rows: empty
          ? []
          : [
              {
                id: cid,
                business_id: bid,
                supplier_id: supplierId,
                supplier_name: 'Synthetic Textile Works',
                supplier_status: 'suspended',
                customer_id: customerId,
                customer_name: 'Synthetic customer',
                customer_email: 'customer@example.invalid',
                created_at: '2026-10-16T00:00:00Z',
                last_activity: '2026-10-17T03:03:00Z',
                message_count: 3,
              },
            ],
      };
    else if (name === 'admin_monitor_open') {
      if (missing) {
        await route.fulfill({
          status: 404,
          json: { message: 'Conversation unavailable', code: 'P0002' },
        });
        return;
      }
      data = {
        access_id: 'c6000000-0000-4000-8000-000000000001',
        conversation: { id: cid, created_at: '2026-10-16T00:00:00Z' },
        supplier: {
          id: supplierId,
          business_id: bid,
          name: 'Synthetic Textile Works',
          email: 'supplier@example.invalid',
          status: 'suspended',
        },
        customer: {
          id: customerId,
          name: 'Synthetic customer',
          email: 'customer@example.invalid',
          status: 'active',
        },
        messages: pageOf([message(2), message(3)], true),
      };
    } else if (name === 'admin_monitor_messages') {
      if (body.before_cursor) data = pageOf([message(1)]);
      else {
        const after = body.after_cursor as { created_at: string; id: string };
        data =
          after.id === message(3).id
            ? pageOf([message(4)], true)
            : after.id === message(4).id
              ? pageOf([message(5)])
              : pageOf([]);
      }
    }
    await route.fulfill({ json: data });
  });
  return calls;
}
test('owner lists metadata only and applies server filters and pagination', async ({
  page,
}, testInfo) => {
  const calls = await setup(page);
  await page.goto('/admin/conversations');
  await expect(
    page.getByRole('heading', { name: 'Conversation monitoring', exact: true }),
  ).toBeVisible();
  await expect(page.getByText('Synthetic private message', { exact: false })).toHaveCount(0);
  await page.getByLabel('Supplier', { exact: true }).fill('textile');
  await page.getByLabel('Customer', { exact: true }).fill('customer');
  await page.getByLabel('Last activity from', { exact: true }).fill('2026-10-17');
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page).toHaveURL(/page=2/);
  await expect
    .poll(() => calls.filter((c) => c.name === 'admin_monitor_list').at(-1)?.body)
    .toMatchObject({
      filters: { supplier: 'textile', customer: 'customer', from: '2026-10-17' },
      page: 2,
      page_size: 25,
    });
  expect(calls.some((c) => c.name === 'admin_monitor_open')).toBe(false);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: `artifacts/conversation-monitor-list-${testInfo.project.name}.png`,
    fullPage: true,
  });
});
test('audited read-only review loads full history and polls without re-opening', async ({
  page,
}, testInfo) => {
  await page.clock.install();
  const calls = await setup(page);
  await page.goto(`/admin/conversations/${cid}`);
  const log = page.getByRole('log', { name: 'Monitored conversation messages' });
  await expect(log.getByText('Synthetic private message 2', { exact: true })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Message', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Send message', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Load older messages', exact: true }).click();
  await expect(log.getByText('Synthetic private message 1', { exact: true })).toBeVisible();
  await page.clock.runFor(16000);
  await expect(log.getByText('Synthetic private message 5', { exact: true })).toBeAttached();
  expect(calls.filter((c) => c.name === 'admin_monitor_open')).toHaveLength(1);
  expect(calls.filter((c) => c.name === 'admin_monitor_messages')).toHaveLength(3);
  expect(calls.some((c) => c.name === 'messages' && c.method === 'POST')).toBe(false);
  await expect(
    page.getByRole('link', { name: 'View access history', exact: true }),
  ).toHaveAttribute('href', new RegExp(cid));
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: `artifacts/conversation-monitor-detail-${testInfo.project.name}.png`,
    fullPage: true,
  });
});
test('staff and ordinary accounts cannot enter monitoring or issue monitoring calls', async ({
  page,
}) => {
  for (const role of ['admin', 'buyer', 'supplier']) {
    await page.unrouteAll({ behavior: 'wait' });
    const calls = await setup(page, { role });
    await page.goto(`/admin/conversations/${cid}`);
    await expect(page.getByRole('heading', { name: 'Access restricted' })).toBeVisible();
    expect(calls.some((c) => c.name.startsWith('admin_monitor_'))).toBe(false);
    if (role === 'admin')
      await expect(
        page
          .getByRole('navigation', { name: 'Admin navigation' })
          .getByRole('link', { name: 'Conversation monitoring', exact: true }),
      ).toHaveCount(0);
  }
});
test('guests are redirected and unavailable conversations expose no content', async ({ page }) => {
  await page.goto(`/admin/conversations/${cid}`);
  await expect(page).toHaveURL(/admin\/login/);
  const calls = await setup(page, { missing: true });
  await page.goto(`/admin/conversations/${cid}`);
  await expect(page.getByRole('alert')).toContainText('Conversation unavailable');
  expect(calls.filter((c) => c.name === 'admin_monitor_open')).toHaveLength(1);
  expect(calls.some((c) => c.name === 'admin_monitor_messages')).toBe(false);
});
test('Bangla monitoring is responsive and privacy disclosure explains oversight', async ({
  page,
}) => {
  await setup(page, { locale: 'bn' });
  await page.goto(`/admin/conversations/${cid}`);
  await expect(page.getByRole('heading', { name: 'কথোপকথনের ইতিহাস', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.goto('/info/privacy');
  await expect(page.getByRole('heading', { name: 'কথোপকথনের তদারকি', exact: true })).toBeVisible();
});
test('empty monitoring list has a useful state', async ({ page }) => {
  await setup(page, { empty: true });
  await page.goto('/admin/conversations');
  await expect(
    page.getByRole('heading', { name: 'No conversations found', exact: true }),
  ).toBeVisible();
});
