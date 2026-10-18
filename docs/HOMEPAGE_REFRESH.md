# Homepage refresh

Paikarii.com uses a balanced wholesale marketplace layout: a compact sourcing hero, live categories, featured products, verified suppliers, nonduplicating arrivals, a sourcing guide, and a supplier invitation. Mobile layouts prioritize search and categories over decorative photography.

## Content and data

- `/admin/homepage` continues to control bilingual copy, section visibility, images and curated ordering. Publishing remains explicit and owner-only. The existing `show_deals` field now controls the sourcing guide; its stored schema is unchanged.
- Automatic categories come from the database, not a static taxonomy. Unknown industries use a neutral illustration. Selected categories, products and suppliers retain CMS order.
- Homepage products use `public_products`; suppliers use `public_businesses`, restricted to verified records and a maximum of three. These public projections apply even when an administrator browses the marketplace.
- Up to eight featured products and four separate arrivals are fetched. Arrivals exclude featured IDs and disappear when no additional eligible products exist. Unavailable curated IDs are omitted.
- Product hydration batches image metadata and price tiers. Cards show the actual base price; a quantity-pricing indicator requires real tier records. No discounts, popularity scores or supplier performance claims are invented.
- Unit formatting lives in `src/lib/units.ts`. Interface and location translations remain in the central copy dictionary; supplier-authored descriptions retain their submitted language.
- Supplier links reflect paused registration. Existing suppliers retain workspace access; the buyer-to-supplier action also reflects the setting. The database remains the authorization boundary.

## Images and accessibility

- Bundled photography has 320, 640 and 800px WebP variants with original JPEG fallbacks. Original sources and credits are retained. Custom CMS images continue using Supabase Storage and their supplied bilingual descriptions.
- Signed URLs retain a five-minute lifetime and renew every four minutes while the page is active and on focus. Failed images render a labelled fallback. Signing or downloading a custom hero shows a stable placeholder.
- Category navigation supports keyboard activation, Escape, outside dismissal, focus return and subcategories. Mobile navigation includes Sign in and Join free.
- Shared product cards use readable titles and metadata, 44px save controls, explicit supplier verification labels and linked supplier names. Product grids use one column below 360px and two on ordinary phones.

## Verification

```sh
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e
```

Run browser suites serially, or supply a distinct Playwright `--output` directory to each independent invocation. The browser tests use intercepted responses for authenticated and populated scenarios; real public-catalog checks remain in `marketplace.spec.ts`. Fixture records are never seeded into the cloud project.

Review screenshots in `artifacts/`: `homepage-improved-*` show the real public marketplace; `homepage-populated-*` show browser-only fixture inventory. The live catalog may remain empty until genuine supplier listings are approved.

No migration, cloud data mutation, live content publication or deployment is required for this refresh. Existing authorization SQL and storage policies are unchanged.
