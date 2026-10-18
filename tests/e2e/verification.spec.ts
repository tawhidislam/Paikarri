import { test, expect, type Page } from '@playwright/test';
const uid = 'b1000000-0000-4000-8000-000000000001';
const aid = 'b3000000-0000-4000-8000-000000000001';
const bid = 'b2000000-0000-4000-8000-000000000001';
const application = {
  id: aid,
  business_id: bid,
  revision: 1,
  lock_version: 1,
  status: 'draft',
  created_at: '2026-10-17T00:00:00Z',
  submitted_at: null,
  reviewed_at: null,
  valid_until: null,
};
const detail = {
  application,
  business: {
    id: bid,
    name: 'Synthetic supplier',
    name_bn: '',
    owner_id: uid,
    verified: false,
    verification_application_id: null as string | null,
    address: 'Synthetic address',
    contact_phone: '01700000000',
  },
  identity: {
    legal_name: '',
    dob: null,
    address: '',
    issuing_country: 'Bangladesh',
    document_type: 'nid',
    document_number: '',
    issued_on: null,
    expires_on: null,
    no_expiry: true,
  },
  trade_license: {
    license_number: '',
    business_name: 'Synthetic supplier',
    owner_name: '',
    issuing_authority: '',
    business_address: '',
    issued_on: null,
    expires_on: null,
  },
  bank: {
    bank_name: '',
    branch_name: '',
    account_title: '',
    account_number: '',
    account_type: 'current',
    holder_type: 'business',
    routing_number: '',
  },
  files: [],
  reviews: [],
};
async function setup(
  page: Page,
  role = 'supplier',
  locale = 'en',
  submitted = false,
  complete = false,
) {
  const current = structuredClone(detail);
  if (submitted) current.application.status = 'submitted';
  if (complete) {
    Object.assign(current.identity, {
      legal_name: 'Synthetic Owner',
      dob: '1990-01-01',
      address: 'Synthetic address',
      document_number: '000123456',
    });
    Object.assign(current.trade_license, {
      license_number: '00012',
      owner_name: 'Synthetic Owner',
      issuing_authority: 'Synthetic authority',
      business_address: 'Synthetic address',
      issued_on: '2025-01-01',
      expires_on: '2030-12-31',
    });
    Object.assign(current.bank, {
      bank_name: 'Synthetic Bank',
      branch_name: 'Synthetic Branch',
      account_title: 'Synthetic Owner',
      account_number: '000987654',
    });
    Object.assign(current, {
      files: ['identity_front', 'identity_back', 'trade_license', 'bank_proof'].map(
        (slot, index) => ({
          id: `file${index}`,
          slot,
          object_path: `${uid}/${aid}/${slot}/synthetic.png`,
          mime_type: 'image/png',
          file_size: 100,
          position: 0,
        }),
      ),
    });
  }

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
  const calls: string[] = [];
  await page.route('https://zhllnfciehxmjahljrhb.supabase.co/**', async (route) => {
    const name = new URL(route.request().url()).pathname.split('/').pop()!;
    calls.push(name);
    const body = route.request().postDataJSON() ?? {};
    if (new URL(route.request().url()).pathname.includes('/storage/v1/object/sign/')) {
      if (route.request().method() === 'POST')
        await route.fulfill({
          json: { signedURL: '/object/sign/business-documents/sample.png?token=synthetic' },
        });
      else
        await route.fulfill({
          contentType: 'image/svg+xml',
          body: '<svg xmlns="http://www.w3.org/2000/svg" width="480" height="300"><rect width="480" height="300" fill="#faf9f3"/><rect x="20" y="20" width="440" height="260" rx="10" fill="none" stroke="#d4dcd0"/><text x="40" y="65" font-family="sans-serif" font-size="22" fill="#455f47">SYNTHETIC TEST DOCUMENT</text><path d="M40 100H430M40 130H300M40 160H400M40 190H330M40 220H380" stroke="#b7c6b2" stroke-width="9"/><text x="40" y="260" font-family="sans-serif" font-size="14" fill="#8b9b86">Not a real identity or bank document</text></svg>',
        });
      return;
    }
    let data: unknown = [];
    if (name === 'user_roles') data = { role };
    else if (name === 'get_account_status') data = { status: 'active', reason: '' };
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
    else if (name === 'notification_unread_count') data = 0;
    else if (name === 'verification_state')
      data = { business: current.business, current, history: [current.application], legacy: [] };
    else if (name === 'verification_get') data = current;
    else if (name === 'verification_submit') {
      current.application.status = 'submitted';
      current.application.lock_version++;
      data = current;
    } else if (name === 'verification_decide') {
      current.application.status = body.payload.decision;
      if (body.payload.decision === 'approved') current.business.verification_application_id = aid;
      current.application.lock_version++;
      data = current;
    } else if (name === 'verification_save_step') {
      Object.assign(current[body.step as 'identity'], body.payload);
      current.application.lock_version++;
      data = current;
    } else if (name === 'verification_list')
      data = {
        total: 1,
        rows: [
          {
            ...current.application,
            name: 'Synthetic supplier',
            identity_complete: false,
            trade_complete: false,
            bank_complete: false,
          },
        ],
      };
    await route.fulfill({ json: data });
  });
  return calls;
}
test('supplier saves draft without sensitive browser persistence and validates required information', async ({
  page,
}) => {
  await setup(page);
  await page.goto('/dashboard/verification');
  await expect(
    page.getByRole('heading', { name: 'Supplier verification', exact: true }),
  ).toBeVisible();
  await page.getByLabel('Legal name', { exact: true }).fill('Synthetic private owner');
  await page.getByLabel('Document number', { exact: true }).fill('0000123456');
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await page.getByRole('button', { name: 'Save and continue' }).click();
  await expect(
    page.getByText('Complete the highlighted information before continuing.'),
  ).toBeVisible();
  const storage = await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }));
  expect(storage).not.toContain('Synthetic private owner');
  expect(storage).not.toContain('0000123456');
  await page.reload();
  await expect(page.getByLabel('Legal name', { exact: true })).toHaveValue(
    'Synthetic private owner',
  );
});
test('passport hides back-side evidence and NID expiry toggle changes required fields', async ({
  page,
}) => {
  await setup(page);
  await page.goto('/dashboard/verification');
  await page
    .getByRole('combobox', { name: 'Identity document type', exact: true })
    .selectOption('passport');
  await expect(page.getByLabel('No expiry printed on NID')).toHaveCount(0);
  await expect(page.getByLabel('Expiry / valid-until date')).toBeVisible();
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Identity back', exact: true })).toHaveCount(0);
});
test('submitted supplier evidence is read-only and history remains available', async ({ page }) => {
  await setup(page, 'supplier', 'en', true);
  await page.goto('/dashboard/verification');
  await expect(
    page.getByText(
      'Your complete application is awaiting super admin review. Submitted evidence is locked.',
    ),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save draft', exact: true })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Submission history' })).toBeVisible();
});
test('staff see progress but cannot open the private review route', async ({ page }) => {
  const calls = await setup(page, 'admin', 'en', true);
  await page.goto('/admin/verifications');
  await expect(page.getByText('Status only', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Review application', exact: true })).toHaveCount(0);
  await page.goto(`/admin/verifications/${aid}`);
  await expect(page.getByText('Access restricted')).toBeVisible();
  expect(calls).not.toContain('verification_get');
});
test('super admin reviews all sections and sees masked private numbers', async ({ page }) => {
  await setup(page, 'super_admin', 'en', true);
  await page.goto(`/admin/verifications/${aid}`);
  await expect(
    page.getByRole('heading', { name: 'Business and account-title comparison' }),
  ).toBeVisible();
  await expect(page.getByLabel('Section decision')).toHaveCount(3);
  await expect(page.getByRole('button', { name: 'Approve supplier', exact: true })).toBeVisible();
});
test('Bangla wizard fits the viewport', async ({ page }) => {
  await setup(page, 'supplier', 'bn');
  await page.goto('/dashboard/verification');
  await expect(page.getByRole('heading', { name: 'মালিকের পরিচয়', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('complete supplier application requires declaration and submits the displayed revision', async ({
  page,
}) => {
  const calls = await setup(page, 'supplier', 'en', false, true);
  await page.goto('/dashboard/verification');
  await page.getByRole('button', { name: '4. Review and submit' }).click();
  const submit = page.getByRole('button', { name: 'Submit complete application', exact: true });
  await expect(submit).toBeDisabled();
  await page
    .getByRole('checkbox', {
      name: 'I am authorized to submit these documents and confirm that the information is accurate.',
    })
    .check();
  await expect(submit).toBeEnabled();
  const request = page.waitForRequest((r) => r.url().endsWith('/rpc/verification_submit'));
  await submit.click();
  expect((await request).postDataJSON()).toMatchObject({
    target: aid,
    expected_version: 1,
    declaration: true,
  });
  await expect(
    page.getByText(
      'Your complete application is awaiting super admin review. Submitted evidence is locked.',
    ),
  ).toBeVisible();
  expect(calls).toContain('verification_submit');
});
test('super admin approval confirms all sections and account holder before mutation', async ({
  page,
}) => {
  await setup(page, 'super_admin', 'en', true, true);
  await page.goto(`/admin/verifications/${aid}`);
  const approve = page.getByRole('button', { name: 'Approve supplier', exact: true });
  await expect(approve).toBeDisabled();
  const decisions = page.getByRole('combobox', { name: 'Section decision', exact: true });
  await expect(decisions).toHaveCount(3);
  for (const select of await decisions.all()) await select.selectOption('approved');
  await expect(approve).toBeDisabled();
  await page
    .getByRole('checkbox', {
      name: 'I checked all evidence and confirm the bank account belongs to the business or verified owner.',
    })
    .check();
  await expect(approve).toBeEnabled();
  const request = page.waitForRequest((r) => r.url().endsWith('/rpc/verification_decide'));
  await page.getByRole('button', { name: 'Approve supplier', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Confirm', exact: true }).click();
  expect((await request).postDataJSON()).toMatchObject({
    target: aid,
    expected_version: 1,
    payload: { decision: 'approved', holder_match_confirmed: true },
  });
  await expect(
    page.getByRole('button', { name: 'Revoke verification', exact: true }),
  ).toBeVisible();
});
test('Bangla super admin review is readable on small screens', async ({ page }, testInfo) => {
  await setup(page, 'super_admin', 'bn', true, true);
  await page.goto(`/admin/verifications/${aid}`);
  await expect(
    page.getByRole('heading', { name: 'ব্যবসা ও ব্যাংক হিসাবের নাম তুলনা' }),
  ).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({
    path: `artifacts/verification-review-${testInfo.project.name}.png`,
    fullPage: true,
  });
});

test('later steps stay visible but disabled until preceding steps are complete', async ({
  page,
}) => {
  await setup(page);
  await page.goto('/dashboard/verification');
  const navigation = page.getByRole('navigation', { name: 'Verification steps' });
  await expect(navigation.getByRole('button')).toHaveCount(4);
  await expect(page.getByRole('button', { name: '1. Owner identity', exact: true })).toBeEnabled();
  for (const name of ['2. Trade licence', '3. Bank account', '4. Review and submit']) {
    await expect(navigation.getByRole('button', { name, exact: true })).toBeVisible();
    await expect(navigation.getByRole('button', { name, exact: true })).toBeDisabled();
  }
  await page.getByRole('button', { name: 'Save and continue', exact: true }).click();
  await expect(navigation.getByRole('button')).toHaveCount(4);
  await expect(page.getByRole('heading', { name: 'Owner identity', exact: true })).toBeVisible();
  // A completed, saved application unlocks all remaining steps, including review.
  await page.unrouteAll({ behavior: 'wait' });
  await setup(page, 'supplier', 'en', false, true);
  await page.reload();
  await expect(navigation.getByRole('button')).toHaveCount(4);
  await expect(page.getByRole('button', { name: '2. Trade licence', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: '2. Trade licence', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Trade licence', exact: true, level: 3 }),
  ).toBeVisible();
});

test('verification queue has clear status filters and a responsive review table', async ({
  page,
}, testInfo) => {
  await setup(page, 'super_admin', 'en', true, true);
  await page.goto('/admin/verifications');
  await expect(
    page.getByRole('heading', { name: 'Supplier verification review', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Awaiting review', exact: true }).click();
  await expect(page).toHaveURL(/status=submitted/);
  await expect(page.getByRole('link', { name: 'Review application', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({
    path: `artifacts/verification-queue-redesign-${testInfo.project.name}.png`,
    fullPage: true,
  });
});
test('private evidence preview opens and dismisses with the keyboard', async ({ page }) => {
  await setup(page, 'super_admin', 'en', true, true);
  await page.goto(`/admin/verifications/${aid}`);
  await page.getByRole('button', { name: 'Preview', exact: true }).first().click();
  const dialog = page.getByRole('dialog', { name: 'Private document preview' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('img')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
});
