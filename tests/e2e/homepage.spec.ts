import { test, expect, type Page } from '@playwright/test';
import { defaultHomepage, type HomepageConfig } from '../../src/lib/operations-schema';
import type { Business, Category, Product } from '../../src/lib/models';

// These public responses exist only in the browser. Nothing is seeded into Supabase.
const categoryId = 'd1000000-0000-4000-8000-000000000001';
const businessId = 'd2000000-0000-4000-8000-000000000001';
const userId = 'd3000000-0000-4000-8000-000000000001';
const categories: Category[] = [
  {
    id: categoryId,
    name: 'Industrial supplies',
    name_bn: 'শিল্প সরঞ্জাম',
    slug: 'industrial-supplies',
    parent_id: null,
    icon: 'package',
  },
  {
    id: 'd1000000-0000-4000-8000-000000000002',
    name: 'Fresh produce',
    name_bn: 'তাজা কৃষিপণ্য',
    slug: 'fresh-produce',
    parent_id: null,
    icon: 'basket',
  },
];
const business: Business = {
  profile_image_path: null,
  id: businessId,
  owner_id: userId,
  name: 'Meghna Packaging',
  name_bn: 'মেঘনা প্যাকেজিং',
  description: 'Bulk cartons and packaging for Bangladesh businesses.',
  address: 'Example industrial area',
  contact_phone: '+8801700000000',
  district: 'Dhaka',
  division: 'Dhaka',
  verification_application_id: null,
  verified: true,
  website: '',
  created_at: '2026-10-01T00:00:00Z',
  updated_at: '2026-10-01T00:00:00Z',
};
const secondBusiness: Business = {
  ...business,
  id: 'd2000000-0000-4000-8000-000000000002',
  name: 'Padma Packaging',
  name_bn: 'পদ্মা প্যাকেজিং',
  description: 'Bulk paper packaging from Narayanganj.',
};
const products: Product[] = Array.from({ length: 12 }, (_, index) => ({
  id: `d4000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
  business_id: businessId,
  category_id: categoryId,
  name: `Wholesale carton ${index + 1}`,
  name_bn: `পাইকারি বাক্স ${new Intl.NumberFormat('bn-BD').format(index + 1)}`,
  description: 'Recyclable wholesale packaging for bulk sourcing.',
  moderation_note: '',
  moq: 20,
  price: 100 + index,
  stock: 10000,
  unit: index === 1 ? 'kg' : 'box',
  specifications: { Material: 'Paper' },
  status: 'approved',
  search_vector: null,
  created_at: `2026-10-${String(17 - index).padStart(2, '0')}T00:00:00Z`,
  updated_at: '2026-10-17T00:00:00Z',
}));

type FixtureOptions = {
  count?: number;
  categoryRows?: Category[];
  demoCatalog?: boolean;
  config?: Partial<HomepageConfig>;
  paused?: boolean;
  role?: 'buyer' | 'supplier' | 'super_admin';
  brokenImage?: boolean;
  failProducts?: boolean;
  holdProducts?: boolean;
  heroImageFailure?: 'signing' | 'download';
  holdHeroSigning?: boolean;
  holdHeroDownload?: boolean;
};
async function homepageFixture(page: Page, options: FixtureOptions = {}) {
  let failProducts = options.failProducts ?? false;
  let releaseProducts = () => {};
  const productsReady = new Promise<void>((resolve) => {
    releaseProducts = resolve;
  });
  let releaseHeroSigning = () => {};
  let releaseHeroDownload = () => {};
  const heroSigningReady = new Promise<void>((resolve) => {
    releaseHeroSigning = resolve;
  });
  const heroDownloadReady = new Promise<void>((resolve) => {
    releaseHeroDownload = resolve;
  });
  const favoriteIds = new Set<string>();
  const calls: { name: string; method: string; query: string }[] = [];
  const rows = products.slice(0, options.count ?? products.length).map((product) =>
    options.demoCatalog
      ? {
          ...product,
          name: `[DEMO] ${product.name}`,
          specifications: { Material: 'Paper', Dataset: 'paikari-demo-20261017' },
        }
      : product,
  );
  await page.addInitScript(
    ({ userId, role }) => {
      localStorage.setItem('paikari-locale', 'en');
      if (!role) return;
      const now = Math.floor(Date.now() / 1000);
      const token = `${btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))}.${btoa(JSON.stringify({ sub: userId, role: 'authenticated', exp: now + 3600 }))}.fixture`;
      localStorage.setItem(
        'sb-zhllnfciehxmjahljrhb-auth-token',
        JSON.stringify({
          access_token: token,
          refresh_token: 'browser-only-fixture',
          token_type: 'bearer',
          expires_in: 3600,
          expires_at: now + 3600,
          user: {
            id: userId,
            email: 'homepage-test@example.invalid',
            aud: 'authenticated',
            role: 'authenticated',
            app_metadata: { provider: 'email' },
            user_metadata: {},
            created_at: '2026-10-01T00:00:00Z',
          },
        }),
      );
    },
    { userId, role: options.role },
  );
  await page.route(/https:\/\/[^/]+\.supabase\.co\//, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const name = url.pathname.split('/').pop()!;
    const method = request.method();
    calls.push({ name, method, query: url.search });
    let data: unknown = [];
    if (method === 'POST' && url.pathname.includes('/storage/v1/object/sign/')) {
      if (url.pathname.includes('/marketing-assets/')) {
        if (options.holdHeroSigning) await heroSigningReady;
        if (options.heroImageFailure === 'signing')
          return route.fulfill({
            status: 503,
            contentType: 'application/json',
            body: JSON.stringify({ message: 'Hero signing unavailable', statusCode: '503' }),
          });
        data = { signedURL: '/object/sign/marketing-assets/browser-only-hero.svg?token=fixture' };
      } else {
        data = { signedURL: '/object/sign/product-images/browser-only-broken.png?token=fixture' };
      }
    } else if (method === 'GET' && name === 'browser-only-hero.svg') {
      if (options.holdHeroDownload) await heroDownloadReady;
      if (options.heroImageFailure === 'download')
        return route.fulfill({ status: 404, body: 'Hero image unavailable' });
      return route.fulfill({
        status: 200,
        contentType: 'image/svg+xml',
        body: '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="800" height="600" fill="#14533f"/><path d="M100 400L400 120L700 400" fill="#e7eddc"/></svg>',
      });
    } else if (url.pathname.includes('/storage/')) {
      return route.fulfill({ status: 404, body: 'Image unavailable' });
    } else if (name === 'get_platform_settings') {
      data = {
        name_en: 'Paikarii.com',
        name_bn: 'পাইকারি',
        tagline_en: 'Bangladesh, in business.',
        tagline_bn: 'বাংলাদেশের ব্যবসার সঙ্গী।',
        support_email: 'support@example.invalid',
        support_phone: '+8801700000000',
        default_locale: 'en',
        supplier_registration_open: !options.paused,
      };
    } else if (name === 'get_homepage_content') {
      data = { ...defaultHomepage, ...options.config };
    } else if (name === 'categories') {
      data = options.categoryRows ?? categories;
    } else if (name === 'user_roles') {
      data = { role: options.role };
    } else if (name === 'get_account_status') {
      data = { status: 'active', reason: '' };
    } else if (name === 'notification_unread_count') {
      data = 0;
    } else if (name === 'public_products' || name === 'search_products') {
      if (options.holdProducts) await productsReady;
      if (failProducts)
        return route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Temporary catalog outage', code: '503' }),
        });
      const idFilter = url.searchParams.get('id') ?? '';
      let selected = rows;
      if (idFilter.startsWith('not.in.'))
        selected = selected.filter((product) => !idFilter.includes(product.id));
      else if (idFilter.startsWith('in.'))
        selected = selected.filter((product) => idFilter.includes(product.id));
      data = selected.slice(0, Number(url.searchParams.get('limit') ?? 12));
    } else if (name === 'businesses' && url.searchParams.has('owner_id')) {
      data = options.role === 'supplier' ? business : null;
    } else if (name === 'public_businesses' || name === 'businesses') {
      const ids = url.searchParams.get('id');
      data = rows.length
        ? [business, secondBusiness].filter((b) => !ids || ids.includes(b.id))
        : [];
    } else if (name === 'product_images') {
      data = options.brokenImage
        ? [
            {
              id: 'd5000000-0000-4000-8000-000000000001',
              product_id: products[0].id,
              path: `${userId}/broken.png`,
              position: 0,
            },
          ]
        : [];
    } else if (name === 'product_price_tiers') {
      data = [{ product_id: products[0].id, min_quantity: 100, price: 80 }];
    } else if (name === 'favorites') {
      const id = (url.searchParams.get('product_id') ?? '').replace('eq.', '');
      if (method === 'POST') {
        const body = request.postDataJSON() as { product_id: string };
        favoriteIds.add(body.product_id);
        data = null;
      } else if (method === 'DELETE') {
        favoriteIds.delete(id);
        data = null;
      } else {
        data = favoriteIds.has(id) ? { product_id: id } : null;
      }
    }
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'content-range': `0-${Math.max(0, rows.length - 1)}/${rows.length}` },
      body: JSON.stringify(data),
    });
  });
  return {
    calls,
    releaseProducts,
    releaseHeroSigning,
    releaseHeroDownload,
    recoverProducts: () => {
      failProducts = false;
    },
  };
}

const productLinks = async (page: Page, section: string) =>
  page
    .getByTestId(section)
    .locator('.product-card h3')
    .evaluateAll((headings) =>
      headings.map((heading) => heading.closest('a')!.getAttribute('href')),
    );

test('homepage preserves curation, separates arrivals, and shows factual wholesale cards', async ({
  page,
}) => {
  const selected = [products[3], products[0]];
  const fixture = await homepageFixture(page, {
    config: {
      product_ids: selected.map((product) => product.id),
      category_ids: [categories[1].id, categoryId],
      supplier_ids: [secondBusiness.id, businessId],
    },
  });
  await page.goto('/');
  const featured = page.getByTestId('home-featured');
  await expect(featured.locator('.product-card h3')).toHaveText(
    selected.map((product) => product.name),
  );
  await expect(page.getByTestId('home-arrivals').locator('.product-card')).toHaveCount(4);
  const arrivals = await productLinks(page, 'home-arrivals');
  expect(arrivals.every((href) => !selected.some((product) => href?.endsWith(product.id)))).toBe(
    true,
  );
  await expect(page.getByTestId('home-categories').locator('.home-category h3')).toHaveText([
    'Fresh produce',
    'Industrial supplies',
  ]);
  await expect(page.getByTestId('home-suppliers').getByRole('heading', { level: 3 })).toHaveText([
    secondBusiness.name,
    business.name,
  ]);
  await expect(featured.getByText('Quantity pricing available', { exact: true })).toHaveCount(1);
  await expect(featured.getByText('Verified supplier', { exact: true })).toHaveCount(2);
  await expect(featured.getByText('20 boxes', { exact: true })).toHaveCount(2);
  await expect(featured.getByRole('link', { name: 'Meghna Packaging', exact: true })).toHaveCount(
    2,
  );
  await expect(
    page.getByTestId('home-suppliers').getByText(business.description, { exact: true }),
  ).toBeVisible();
  expect(
    fixture.calls.some((call) => call.name === 'public_products' && call.query.includes('limit=')),
  ).toBe(true);
  expect(
    fixture.calls.some(
      (call) => call.name === 'public_businesses' && call.query.includes('limit='),
    ),
  ).toBe(true);
  await page.getByRole('button', { name: 'বাংলা', exact: true }).click();
  await expect(
    featured.getByRole('heading', { name: selected[0].name_bn, exact: true }),
  ).toBeVisible();
  await expect(featured.getByRole('link', { name: business.name_bn, exact: true })).toHaveCount(2);
  await expect(page.locator('html')).toHaveAttribute('lang', 'bn');
});

test('curated records unavailable to public projections stay absent even for an administrator', async ({
  page,
}) => {
  const unavailableProduct = 'd4000000-0000-4000-8000-000000000099';
  const unavailableSupplier = 'd2000000-0000-4000-8000-000000000099';
  const fixture = await homepageFixture(page, {
    role: 'super_admin',
    config: {
      product_ids: [unavailableProduct, products[0].id],
      supplier_ids: [unavailableSupplier],
    },
  });
  await page.goto('/');
  await expect(page.getByTestId('home-featured').locator('.product-card h3')).toHaveText([
    products[0].name,
  ]);
  await expect(
    page
      .getByTestId('home-suppliers')
      .getByRole('heading', { name: 'Meet our supplier community', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByTestId('home-featured').locator(`a[href="/products/${unavailableProduct}"]`),
  ).toHaveCount(0);
  expect(fixture.calls.some((call) => call.name === 'public_products')).toBe(true);
  expect(fixture.calls.some((call) => call.name === 'public_businesses')).toBe(true);
  expect(fixture.calls.some((call) => ['products', 'businesses'].includes(call.name))).toBe(false);
});

for (const count of [0, 1]) {
  test(`${count} approved product(s) produce a useful homepage without repeated arrivals`, async ({
    page,
  }) => {
    await homepageFixture(page, { count });
    await page.goto('/');
    const featured = page.getByTestId('home-featured');
    if (count) await expect(featured.locator('.product-card')).toHaveCount(1);
    else {
      await expect(
        featured.getByRole('heading', { name: 'New products are on the way', exact: true }),
      ).toBeVisible();
      await expect(
        featured.getByRole('link', { name: 'Explore suppliers', exact: true }),
      ).toHaveAttribute('href', '/suppliers');
    }
    await expect(page.getByTestId('home-arrivals')).toHaveCount(0);
    await expect(
      page.getByRole('heading', { name: 'How wholesale sourcing works', exact: true }),
    ).toBeVisible();
  });
}

test('loading products reserve card space without claiming the catalog is empty', async ({
  page,
}) => {
  const fixture = await homepageFixture(page, { holdProducts: true });
  await page.goto('/');
  const featured = page.getByTestId('home-featured');
  await expect(
    featured.getByRole('status', { name: 'Loading marketplace content', exact: true }),
  ).toBeVisible();
  await expect(featured.getByText('New products are on the way', { exact: true })).toHaveCount(0);
  fixture.releaseProducts();
  await expect(featured.locator('.product-card')).toHaveCount(8);
});

test('a catalog outage shows a retry state rather than an empty marketplace', async ({ page }) => {
  const fixture = await homepageFixture(page, { failProducts: true });
  await page.goto('/');
  const featured = page.getByTestId('home-featured');
  await expect(featured.getByText('We couldn’t load products', { exact: true })).toBeVisible();
  await expect(featured.getByText('New products are on the way', { exact: true })).toHaveCount(0);
  fixture.recoverProducts();
  await featured.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(featured.locator('.product-card')).toHaveCount(8);
  await expect(page.getByTestId('home-arrivals').locator('.product-card')).toHaveCount(4);
});

test('unavailable signed images retain a readable product and guest favorites lead to sign in', async ({
  page,
}) => {
  await homepageFixture(page, { count: 1, brokenImage: true });
  await page.goto('/');
  const card = page.getByTestId('home-featured').locator('.product-card').first();
  await expect(card.getByText('Image unavailable', { exact: true })).toBeVisible();
  await expect(card.getByRole('heading', { name: products[0].name, exact: true })).toBeVisible();
  await card.getByRole('button', { name: 'Save product', exact: true }).click();
  await expect(page).toHaveURL(/\/auth\/login/);
  await expect(page.getByRole('heading', { name: 'Welcome back.', exact: true })).toBeVisible();
});

test('buyer favorites still toggle from the shared homepage product card', async ({ page }) => {
  await homepageFixture(page, { count: 1, role: 'buyer' });
  await page.goto('/');
  const save = page
    .getByTestId('home-featured')
    .getByRole('button', { name: 'Save product', exact: true });
  await expect(save).toBeEnabled();
  await save.click();
  await expect(save).toHaveAttribute('aria-pressed', 'true');
  await save.click();
  await expect(save).toHaveAttribute('aria-pressed', 'false');
});

test('layouts remain usable in both languages across narrow mobile, phone, tablet, and desktop', async ({
  page,
}) => {
  test.setTimeout(90000);
  await homepageFixture(page);
  await page.goto('/');
  await expect(page.getByTestId('home-featured').locator('.product-card')).toHaveCount(8);
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    for (const locale of ['en', 'bn']) {
      if ((await page.locator('html').getAttribute('lang')) !== locale)
        await page
          .getByRole('button', { name: locale === 'bn' ? 'বাংলা' : 'English', exact: true })
          .click();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        `${width}px ${locale} overflow`,
      ).toBe(true);
      const cards = page.getByTestId('home-featured').locator('.product-card');
      const first = await cards.nth(0).boundingBox();
      const second = await cards.nth(1).boundingBox();
      expect(first).not.toBeNull();
      expect(second).not.toBeNull();
      if (width < 360) expect(second!.y).toBeGreaterThan(first!.y + first!.height / 2);
      else if (width <= 390) expect(Math.abs(second!.y - first!.y)).toBeLessThan(2);
      if (width === 390) {
        await page.evaluate(() => window.scrollTo(0, 0));
        await expect(
          page.getByTestId('home-categories').locator('.home-category').first(),
        ).toBeInViewport();
        await page.evaluate(async () => {
          await document.fonts.ready;
        });
        const category = await page
          .getByTestId('home-categories')
          .locator('.home-category')
          .first()
          .boundingBox();
        expect(
          category!.y + category!.height,
          `first category row at 390px ${locale}`,
        ).toBeLessThanOrEqual(844);
      }
      if (
        test.info().project.name === 'desktop' &&
        locale === 'en' &&
        [390, 1440].includes(width)
      ) {
        await page.evaluate(async () => {
          await document.fonts.ready;
          window.scrollTo(0, 0);
        });
        await page.screenshot({
          path: `artifacts/homepage-populated-${width === 1440 ? 'desktop' : 'mobile'}.png`,
          fullPage: true,
        });
      }
    }
  }
});

test('category disclosure supports keyboard dismissal, real category links, and mobile sign in', async ({
  page,
}) => {
  await homepageFixture(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const navigation = page.getByRole('navigation', { name: 'Main navigation', exact: true });
  await page.getByRole('button', { name: 'Toggle navigation', exact: true }).click();
  await expect(navigation.getByRole('link', { name: 'Sign in', exact: true })).toHaveAttribute(
    'href',
    '/auth/login',
  );
  await expect(
    navigation.getByRole('link', { name: 'Wholesale prices', exact: true }),
  ).toHaveAttribute('href', '/products?sort=price-asc');
  const trigger = page.getByRole('button', { name: 'All categories', exact: true });
  await trigger.focus();
  await trigger.press('Enter');
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await expect(
    navigation.getByRole('link', { name: categories[0].name, exact: true }),
  ).toBeVisible();
  await trigger.press('Escape');
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await expect(trigger).toBeFocused();
  await expect(
    page.getByRole('button', { name: 'Toggle navigation', exact: true }),
  ).toHaveAttribute('aria-expanded', 'true');
  await trigger.click();
  await navigation.getByRole('link', { name: categories[0].name, exact: true }).click();
  await expect(page).toHaveURL(/\/products\?category=industrial-supplies/);
  await expect(
    page.getByRole('button', { name: 'Toggle navigation', exact: true }),
  ).toHaveAttribute('aria-expanded', 'false');
  await page
    .getByRole('combobox', { name: 'What are you sourcing today?', exact: true })
    .fill('  bulk cartons  ');
  await page
    .getByRole('combobox', { name: 'What are you sourcing today?', exact: true })
    .press('Enter');
  await expect(page).toHaveURL(/\/products\?q=bulk%20cartons/);
});

test('typing during a delayed category navigation survives the route commit', async ({ page }) => {
  await homepageFixture(page);
  let release!: () => void;
  const ready = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/src/pages/marketplace.tsx*', async (route) => {
    await ready;
    await route.continue();
  });
  await page.goto('/');
  await expect(page.getByTestId('home-categories').locator('.home-category')).toHaveCount(2);
  const loading = page.waitForRequest('**/src/pages/marketplace.tsx*');
  await page.getByTestId('home-categories').locator('.home-category').first().click();
  await loading;
  const input = page.getByRole('combobox', { name: 'What are you sourcing today?', exact: true });
  await input.fill('bulk cartons');
  release();
  await expect(page.locator('.filter-panel')).toBeVisible();
  await expect(input).toHaveValue('bulk cartons');
  await input.press('Enter');
  await expect(page).toHaveURL(/\/products\?q=bulk%20cartons/);
});

test('fictional demo catalog has a bilingual disclosure without changing catalog eligibility', async ({
  page,
}) => {
  await homepageFixture(page, { demoCatalog: true });
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto('/');
  await expect(page.getByTestId('home-featured').locator('.product-card')).toHaveCount(8);
  await expect(
    page.getByRole('complementary', { name: 'Demo catalog', exact: true }),
  ).toContainText('not real commercial offers');
  await page.getByRole('button', { name: 'বাংলা', exact: true }).click();
  await expect(
    page.getByRole('complementary', { name: 'ডেমো পণ্যের তালিকা', exact: true }),
  ).toContainText('বাস্তব বাণিজ্যিক প্রস্তাব নয়');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('paused applications suppress guest supplier invitations', async ({ page }) => {
  await homepageFixture(page, { paused: true, count: 0 });
  await page.goto('/');
  await expect(
    page.getByRole('main').getByText('Supplier applications paused', { exact: true }).first(),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Start selling on Paikarii.com', exact: true }),
  ).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Become a supplier', exact: true })).toHaveCount(0);
});

test('existing suppliers keep a workspace link while applications are paused', async ({ page }) => {
  await homepageFixture(page, { paused: true, count: 0, role: 'supplier' });
  await page.goto('/');
  const workspace = page.getByRole('link', { name: 'Supplier workspace', exact: true });
  await expect(workspace.first()).toHaveAttribute('href', '/dashboard/business');
  await expect(page.getByText('Supplier applications paused', { exact: true })).toHaveCount(0);
});

const customHeroConfig = {
  hero_image: `${userId}/homepage/cms-hero.png`,
  hero_alt_en: 'Bulk jute rolls at a fictional factory',
  hero_alt_bn: 'একটি কাল্পনিক কারখানায় পাইকারি পাটের রোল',
};
const fallbackHeroAlt = 'Illustration of a wholesale warehouse, cartons, and a delivery trolley';

test('CMS hero image keeps its loading placeholder through signing and image download', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const fixture = await homepageFixture(page, {
    config: customHeroConfig,
    holdHeroSigning: true,
    holdHeroDownload: true,
  });
  await page.goto('/');
  const hero = page.locator('.home-main-photo');
  const loading = hero.getByRole('status', { name: 'Loading image', exact: true });
  await expect(loading).toBeVisible();
  await expect(hero.getByRole('img')).toHaveCount(0);
  fixture.releaseHeroSigning();
  const image = hero.getByRole('img', { name: customHeroConfig.hero_alt_en, exact: true });
  await expect(image).toHaveAttribute(
    'src',
    /\/storage\/v1\/object\/sign\/marketing-assets\/browser-only-hero\.svg\?token=fixture/,
  );
  await expect
    .poll(() =>
      fixture.calls.some((call) => call.name === 'browser-only-hero.svg' && call.method === 'GET'),
    )
    .toBe(true);
  await expect(loading).toBeVisible();
  await expect(image).toHaveClass(/home-photo-pending/);
  fixture.releaseHeroDownload();
  await expect(loading).toHaveCount(0);
  await expect(image).not.toHaveClass(/home-photo-pending/);
  await expect
    .poll(() =>
      image.evaluate(
        (element) =>
          (element as HTMLImageElement).complete && (element as HTMLImageElement).naturalWidth > 0,
      ),
    )
    .toBe(true);
});

for (const failure of ['signing', 'download'] as const) {
  test(`CMS hero ${failure} failure displays the sourcing illustration with honest fallback text`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    const fixture = await homepageFixture(page, {
      config: customHeroConfig,
      heroImageFailure: failure,
    });
    await page.goto('/');
    if (failure === 'signing') {
      // Both attempts must happen before accepting a fallback; the initial default image is transient.
      await expect
        .poll(
          () =>
            fixture.calls.filter((call) => call.name === 'cms-hero.png' && call.method === 'POST')
              .length,
        )
        .toBeGreaterThanOrEqual(2);
    } else {
      await expect
        .poll(() =>
          fixture.calls.some(
            (call) => call.name === 'browser-only-hero.svg' && call.method === 'GET',
          ),
        )
        .toBe(true);
    }
    const hero = page.locator('.home-main-photo');
    await expect(hero.getByRole('status', { name: 'Loading image', exact: true })).toHaveCount(0);
    await expect(
      hero.getByRole('img', { name: customHeroConfig.hero_alt_en, exact: true }),
    ).toHaveCount(0);
    const fallback = hero.getByRole('img', { name: fallbackHeroAlt, exact: true });
    await expect(fallback).toHaveAttribute('src', '/images/wholesale-sourcing.svg');
    await expect
      .poll(() =>
        fallback.evaluate(
          (element) =>
            (element as HTMLImageElement).complete &&
            (element as HTMLImageElement).naturalWidth > 0,
        ),
      )
      .toBe(true);
  });
}

test('paused buyer cannot start supplier registration from the direct business dashboard URL', async ({
  page,
}) => {
  const fixture = await homepageFixture(page, { role: 'buyer', paused: true });
  await page.goto('/dashboard/business');
  await expect(
    page.getByRole('heading', { name: 'Bring your business to Paikarii.com.', exact: true }),
  ).toBeVisible();
  await expect(page.locator('.onboarding-panel').getByRole('status')).toContainText(
    'Supplier applications paused',
  );
  await expect(page.getByRole('button', { name: 'Become a supplier', exact: true })).toBeDisabled();
  expect(fixture.calls.some((call) => call.name === 'register_supplier')).toBe(false);
});

for (const role of [undefined, 'buyer'] as const) {
  test(`six-category mobile homepage keeps sourcing readable and controls comfortably tappable (${role ?? 'guest'})`, async ({
    page,
  }) => {
    const names = [
      'Apparel & Textiles',
      'Electronics',
      'Food & Agriculture',
      'Home & Living',
      'Jute & Handicrafts',
      'Packaging & Supplies',
    ];
    await homepageFixture(page, {
      role,
      categoryRows: names.map((name, i) => ({
        ...categories[0],
        id: `d1000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`,
        name,
        name_bn: [
          'পোশাক ও বস্ত্র',
          'ইলেকট্রনিক্স',
          'খাদ্য ও কৃষি',
          'ঘর ও জীবনযাপন',
          'পাট ও হস্তশিল্প',
          'প্যাকেজিং সরঞ্জাম',
        ][i],
        slug: `category-${i}`,
      })),
    });
    await page.goto('/');
    await expect(page.getByTestId('home-featured').locator('.product-card')).toHaveCount(8);
    for (const width of [320, 360, 390, 430]) {
      await page.setViewportSize({ width, height: 844 });
      for (const locale of ['en', 'bn']) {
        if ((await page.locator('html').getAttribute('lang')) !== locale)
          await page
            .getByRole('button', { name: locale === 'bn' ? 'বাংলা' : 'English', exact: true })
            .click();
        await page.evaluate(async () => {
          await document.fonts.ready;
          window.scrollTo(0, 0);
        });
        await expect(page.getByTestId('home-categories').locator('.home-category')).toHaveCount(6);
        const measurements = await page.evaluate(() => {
          const controls = [
            ...document.querySelectorAll(
              '.home-category, .home-hero-actions > a, .home-section-heading > a, .marketplace-home .save-product, .marketplace-home .product-compare-button, .marketplace-home .market-chat-button, .marketplace-home .product-supplier-name > a, .homepage-footer .footer-bottom a, .homepage-footer .footer-grid > div > a:not(.brand)',
            ),
          ];
          return {
            overflow: document.documentElement.scrollWidth > innerWidth,
            clippedElements: [
              ...document.querySelectorAll(
                '.homepage-header .brand, .homepage-header .language, .homepage-header .mobile-menu, .homepage-header .header-search, .home-category, .marketplace-home .product-card, .home-hero-actions > a, .home-section-heading > a',
              ),
            ]
              .filter((el) => {
                const box = el.getBoundingClientRect();
                return (
                  el.getClientRects().length > 0 && (box.left < -1 || box.right > innerWidth + 1)
                );
              })
              .map((el) => el.className),
            featuredTop: document
              .querySelector('[data-testid="home-featured"]')!
              .getBoundingClientRect().top,
            smallControls: controls
              .filter(
                (el) => el.getClientRects().length > 0 && el.getBoundingClientRect().height < 43.5,
              )
              .map((el) => el.textContent),
            categoryFont: [...document.querySelectorAll('.home-category h3')].map((el) =>
              parseFloat(getComputedStyle(el).fontSize),
            ),
            partiallyClippedNames: [
              ...document.querySelectorAll('.marketplace-home .product-supplier-label'),
            ].filter((el) => {
              const line = parseFloat(getComputedStyle(el).lineHeight);
              return el.getBoundingClientRect().height > 2 * line + 1;
            }).length,
          };
        });
        expect(measurements.overflow, `${width}px ${locale} overflow`).toBe(false);
        expect(measurements.clippedElements, `${width}px ${locale} clipped content`).toEqual([]);
        expect(measurements.smallControls, `${width}px ${locale} touch targets`).toEqual([]);
        expect(Math.min(...measurements.categoryFont)).toBeGreaterThanOrEqual(12);
        expect(measurements.partiallyClippedNames).toBe(0);
        expect(measurements.featuredTop, `${width}px ${locale} inventory discovery`).toBeLessThan(
          width < 360 ? 900 : 844,
        );
        if (locale === 'bn') {
          await expect(
            page
              .getByTestId('home-categories')
              .getByRole('link', { name: 'সব পণ্য দেখুন', exact: true }),
          ).toBeVisible();
          await expect(
            page.getByTestId('home-categories').locator('.home-section-link-short'),
          ).toHaveText('সব দেখুন');
        }
      }
    }
  });
}
