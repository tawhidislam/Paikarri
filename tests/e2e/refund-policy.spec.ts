import { test, expect } from '@playwright/test';
import { policyFixture } from '../helpers/policy-fixture';

test('owner edits and publishes refunds independently from terms', async ({ page }) => {
  const calls = await policyFixture(page, { kind: 'refund' });
  await page.goto('/admin/refund-policy');
  const title = page.getByLabel('Page title (English)', { exact: true });
  await expect(title).toHaveValue('Refund Policy');
  await title.fill('Refund policy revision for testing');
  await expect(
    page.getByRole('button', { name: 'Publish refund policy', exact: true }),
  ).toBeDisabled();
  await page.getByRole('button', { name: 'Preview refund policy', exact: true }).click();
  await expect(page.locator('.terms-preview h1')).toHaveText('Refund policy revision for testing');
  await page.getByRole('combobox', { name: 'Preview language', exact: true }).selectOption('bn');
  await expect(page.locator('.terms-preview h1')).toHaveText('অর্থ ফেরত নীতিমালা');
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(page.getByText('Draft saved', { exact: true }).first()).toBeVisible();
  await page.goto('/info/refund');
  await expect(page.locator('.terms-intro')).toContainText('has not published');
  await expect(page.locator('.terms-document')).not.toContainText('Private launch draft');
  await page.goto('/admin/terms');
  await expect(title).toHaveValue('Terms & Conditions');
  await page.goto('/admin/refund-policy');
  await expect(title).toHaveValue('Refund policy revision for testing');
  await page.getByRole('button', { name: 'Publish refund policy', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Confirm', exact: true }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await title.fill('Private refund replacement');
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(page.getByText('Draft saved', { exact: true }).first()).toBeVisible();
  await page.goto('/info/refund');
  await expect(page.locator('.terms-document h1')).toHaveText('Refund policy revision for testing');
  await expect(page.locator('.terms-effective time')).toHaveAttribute('datetime', '2026-10-18');
  expect(calls.filter((n) => n === 'admin_publish_refund')).toHaveLength(1);
  expect(calls).not.toContain('admin_publish_terms');
  expect(calls).not.toContain('admin_save_terms');
});

for (const role of ['admin', 'buyer', 'supplier'])
  test(`${role} cannot manage refund policy`, async ({ page }) => {
    const calls = await policyFixture(page, { kind: 'refund', role });
    await page.goto('/admin/refund-policy');
    await expect(
      page.getByRole('heading', { name: 'Access restricted', exact: true }),
    ).toBeVisible();
    await expect(page.getByLabel('Page title (English)', { exact: true })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Refund Policy', exact: true })).toHaveCount(0);
    expect(calls).not.toContain('admin_refund_state');
  });

test('refund editor and published document fit both languages on phones and desktop', async ({
  page,
}) => {
  await policyFixture(page, { kind: 'refund', published: true });
  for (const path of ['/admin/refund-policy', '/info/refund']) {
    await page.goto(path);
    await expect(
      page.locator(path.startsWith('/admin') ? '.terms-editor' : '.terms-document'),
    ).toBeVisible();
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 844 });
      for (const lang of ['en', 'bn']) {
        if ((await page.locator('html').getAttribute('lang')) !== lang)
          await page
            .getByRole('button', { name: lang === 'bn' ? 'বাংলা' : 'English', exact: true })
            .click();
        await page.evaluate(async () => {
          await document.fonts.ready;
          scrollTo(0, 0);
        });
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
          `${path} ${width}px ${lang}`,
        ).toBe(true);
        if (width === 390)
          await page.screenshot({
            path: `artifacts/refund-${path.startsWith('/admin') ? 'editor' : 'public'}-${lang}.png`,
          });
      }
    }
  }
});

test('stale refund edits fail without changing the public document', async ({ page }) => {
  const calls = await policyFixture(page, { kind: 'refund', published: true, conflict: true });
  await page.goto('/admin/refund-policy');
  await page.getByLabel('Page title (English)', { exact: true }).fill('Stale refund revision');
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Refund policy changed');
  expect(calls).not.toContain('admin_publish_refund');
  await page.goto('/info/refund');
  await expect(page.locator('.terms-document h1')).toHaveText('Refund Policy');
});

test('refund API failure provides retry rather than displaying a draft', async ({ page }) => {
  await policyFixture(page, { kind: 'refund', fail: true });
  await page.goto('/info/refund');
  await expect(page.getByRole('alert')).toContainText('Refund policy unavailable');
  await expect(page.locator('.terms-document')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Try again', exact: true })).toBeVisible();
});
