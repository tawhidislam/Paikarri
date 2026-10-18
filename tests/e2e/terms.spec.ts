import { test, expect } from '@playwright/test';
import { policyFixture as fixture } from '../helpers/policy-fixture';
import { defaultTerms } from '../../src/lib/terms-schema';
test('owner saves privately, previews both languages, publishes and preserves the published version during later edits', async ({
  page,
}) => {
  const calls = await fixture(page);
  await page.goto('/admin/terms');
  const title = page.getByLabel('Page title (English)', { exact: true });
  await title.fill('Updated marketplace terms');
  await expect(page.getByRole('button', { name: 'Publish terms', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Preview terms', exact: true }).click();
  await expect(page.locator('.terms-preview h1')).toHaveText('Updated marketplace terms');
  await page.getByRole('combobox', { name: 'Preview language', exact: true }).selectOption('bn');
  await expect(page.locator('.terms-preview h1')).toHaveText('শর্তাবলি');
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(page.getByText('Draft saved', { exact: true }).first()).toBeVisible();
  await page.goto('/info/terms');
  await expect(page.locator('.terms-document h1')).toHaveText('Terms & Conditions');
  await page.goto('/admin/terms');
  await expect(title).toHaveValue('Updated marketplace terms');
  await page.getByRole('button', { name: 'Publish terms', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Confirm', exact: true }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await title.fill('Private replacement draft');
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(title).toHaveValue('Private replacement draft');
  await expect(page.getByText('Draft saved', { exact: true }).first()).toBeVisible();
  await page.goto('/info/terms');
  await expect(page.locator('.terms-document h1')).toHaveText('Updated marketplace terms');
  await expect(page.locator('.terms-effective time')).toHaveAttribute('dateTime', '2026-10-18');
  expect(calls.filter((x) => x === 'admin_publish_terms')).toHaveLength(1);
});
test('editor supports section controls and rejects incomplete publishing and stale saves', async ({
  page,
}) => {
  const calls = await fixture(page, { conflict: true });
  await page.goto('/admin/terms');
  await page.getByRole('button', { name: 'Add section', exact: true }).click();
  await expect(page.getByLabel('Heading 5 (English)', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Move section up 5', exact: true }).click();
  await expect(page.getByLabel('Heading 4 (English)', { exact: true })).toHaveValue('');
  await page
    .locator('.terms-editor-section')
    .nth(3)
    .getByRole('button', { name: 'Remove section', exact: true })
    .click();
  await expect(page.locator('.terms-editor-section')).toHaveCount(4);
  await page.getByLabel('Page title (English)', { exact: true }).fill('Conflicting draft');
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Terms changed');
  expect(calls).not.toContain('admin_publish_terms');
});
for (const role of ['admin', 'buyer', 'supplier'])
  test(`${role} cannot access the terms editor`, async ({ page }) => {
    const calls = await fixture(page, { role });
    await page.goto('/admin/terms');
    await expect(
      page.getByRole('heading', { name: 'Access restricted', exact: true }),
    ).toBeVisible();
    await expect(page.getByLabel('Page title (English)', { exact: true })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Terms & Conditions', exact: true })).toHaveCount(
      0,
    );
    expect(calls).not.toContain('admin_terms_state');
  });
test('public terms are readable on narrow screens in both languages and render scripts as text', async ({
  page,
}) => {
  await fixture(page, { published: true });
  await page.goto('/info/terms');
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    for (const locale of ['en', 'bn']) {
      if ((await page.locator('html').getAttribute('lang')) !== locale)
        await page
          .getByRole('button', { name: locale === 'bn' ? 'বাংলা' : 'English', exact: true })
          .click();
      await expect(page.locator('.terms-document')).toHaveAttribute('lang', locale);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await expect(page.locator('.terms-contents a')).toHaveCount(4);
    }
  }
  await page.route('**/rest/v1/rpc/get_terms_content', (route) =>
    route.fulfill({
      json: {
        content: {
          ...defaultTerms,
          effective_date: '2026-10-18',
          intro_en: '<img src=x onerror="window.termsInjected=true">',
        },
        version: 1,
        published_at: '2026-10-18T00:00:00Z',
      },
    }),
  );
  await page.evaluate(() => localStorage.setItem('paikari-locale', 'en'));
  await page.reload();
  await expect(page.locator('.terms-intro')).toContainText('<img');
  await expect(page.locator('.terms-intro img')).toHaveCount(0);
});
test('public errors show a retry state instead of substituting an old policy', async ({ page }) => {
  await fixture(page, { fail: true });
  await page.goto('/info/terms');
  await expect(page.getByRole('alert')).toContainText('Terms unavailable');
  await expect(page.locator('.terms-document')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Try again', exact: true })).toBeVisible();
});

test('owner editor and private preview fit phone, tablet and desktop in both languages', async ({
  page,
}) => {
  await fixture(page);
  await page.goto('/admin/terms');
  await expect(page.getByLabel('Page title (English)', { exact: true })).toBeVisible();
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    for (const locale of ['en', 'bn']) {
      if ((await page.locator('html').getAttribute('lang')) !== locale)
        await page
          .getByRole('button', { name: locale === 'bn' ? 'বাংলা' : 'English', exact: true })
          .click();
      await page.evaluate(() => document.fonts.ready);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        `${width}px ${locale}`,
      ).toBe(true);
      if (width === 390) {
        await page.evaluate(() => scrollTo(0, 0));
        await page.screenshot({ path: `artifacts/terms-editor-${locale}.png` });
      }
    }
  }
});
