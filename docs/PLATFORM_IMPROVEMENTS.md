# Platform improvement release — 18 October 2026

This release keeps React/Vite locally connected to hosted Supabase. COD and manually confirmed bank payment remain the only checkout methods. No frontend deployment or courier/payment-provider activation is included.

The supplied review describes a BRAC escrow arrangement, guaranteed protection, 100% test coverage and other capabilities that have not been established. They must not be treated as operational facts. Unconfigured escrow account details and guarantees have been removed from the checkout, order and dispute UI. Existing order decisions, evidence and manual payment records are preserved.

## Available features

| Area | Entry point and behavior |
| --- | --- |
| Quick RFQ and samples | Product request buttons open an accessible prefilled dialog. Buyers review/save/submit requests through the existing versioned workflow. Samples retain supplier-configured limits and require a supplier-approved price; no invented fixed sample fee is collected. |
| Shipping | Suppliers configure rates under `/dashboard/business`. Product pages and checkout show estimates using total shipment weight and district. Packing/freight and final delivery fees still require supplier confirmation and buyer acceptance. No estimate silently advances an order to processing. |
| Catalog facets | Category/division/district counts respect the other active filters. A maximum-price slider uses the current catalog ceiling. Counts and listings use approved, active public catalog interfaces. |
| Search history | Up to ten submitted searches per signed-in account, synchronized privately. Keystrokes are not stored; guests have no cloud search history. Clear history from the empty search dropdown. |
| Buyer organization | `/dashboard/settings`: organization name, business type, private licence number/address. Relevant suppliers can see only organization name/type in sourcing details. This is self-reported business information, not a verification badge. |
| Recently viewed/specifications | Product pages retain product IDs only, re-check public eligibility, show recent products and link to the existing four-product comparison page. Download safe public specifications as JSON. |
| Supplier CSV tools | `/dashboard/tools`: UTF-8 template and category reference, row validation, transactional imports of 1–100 new standard products, and product/tier CSV export. Images and variant matrices use the existing editor. Imports do not bypass moderation or update existing listings. |
| Operational metrics | Own inquiries, replies, two-hour replies, order/completion counts and average creation-to-completion days. No invented performance badges or ratings. |
| Open sourcing tenders | `/tenders`: buyers submit moderated public requirements; currently verified suppliers submit sealed SKU bids matching category/unit. Buyers select a bid and continue through existing negotiated COD/manual-bank checkout. Stock is reserved at checkout, not bid time. |
| Tender moderation | `/admin/tenders`: staff/super admin approve/reject with feedback and an audit record. Staff cannot see sealed bid content. |
| Financial reporting | Super admin `/admin/financial-reports`: date-bounded safe order/payment/refund projections, CSV and browser Print/Save PDF. Maximum 366 days and 5,000 orders; narrow the range if exceeded. No addresses, bank references or simulated escrow balance. Each report generation is audited. |
| In-app notices | New submitted sourcing requests notify suppliers. An hourly hosted job sends one notice per current offer when it expires within 24 hours. Existing order notices continue. No external SMS/email/push is sent. |
| Public-page SEO | Vercel `/products/:id` and `/suppliers/:id` rewrites render safe anonymous catalog HTML, metadata and JSON-LD without waiting for client JavaScript. The React app takes over for interactions. Hidden records return 404/noindex; backend failures return 503. Eligibility is never cached. Local Vite remains CSR. |
| Integration preparation | Super admin `/admin/integrations` documents unconfigured capabilities. Server-only courier, payment and notification contracts plus `provider-gateway` explicitly return `NOT_CONFIGURED`; adding a secret cannot silently activate them. |

## Cloud migrations and authorization

- `20261018003300_marketplace_growth.sql`: facets, buyer organizations, shipping presets, CSV creation, own supplier statistics, private search history.
- `20261018003400_open_tenders_and_reports.sql`: tender/bid tables, sealed RPC projections, moderation/award, safe financial report, in-app sourcing/expiry notices.
- All new public tables enable RLS. Sensitive tender/history access is RPC-only; no general client grants. Role checks use database roles, not editable Auth metadata.
- Optimistic versions prevent stale writes. Tender award locks the tender/bid and returns the existing offer on retry. Existing checkout performs authoritative SKU locks, inventory reservation, immutable prices and checkout nonce validation.
- SQL tests use synthetic records inside explicit transactions ending in `ROLLBACK`. No public fictional tenders, commercial orders or real test messages are retained.

Use the already linked hosted project only:

```sh
supabase db push --linked --dry-run
supabase db push --linked
npm run db:types
supabase db query --linked --file supabase/tests/marketplace_growth.sql --output json
supabase db query --linked --file supabase/tests/open_tenders.sql --output json
```

Do not run `supabase start`, Docker or a local database. Do not roll back by dropping tables containing live data. Correct any discovered regression with a new forward migration. Pause tender navigation/import entry points while correcting a backend failure rather than bypassing policies.

Check hosted Cron job `paikarii-offer-expiry-reminders` and its `cron.job_run_details`. It runs at minute zero hourly and deduplicates notices through a private offer log. No provider credentials are needed for in-app delivery.

## Deferred provider activation

Per the owner's instruction, courier and notification setup will happen later. Merchant/escrow accounts do not exist yet. These capabilities are deliberately disabled, not partially simulated:

- Courier pickup booking, barcode/AWB generation and authenticated tracking webhooks.
- Transactional SMS, email escalation and Web Push subscriptions/delivery.
- bKash/Nagad collection, refunds, escrow custody and supplier disbursements.
- Manufacturing milestone collection and release.

Activation requires the selected provider's current official API, sandbox credentials in **server-only Supabase secrets**, an approved merchant/operating agreement, authenticated webhook verification, transaction/event deduplication, retry/reconciliation storage, and successful sandbox lifecycle tests. Read authoritative amounts, recipient addresses and COD balances from authorized order records; never trust browser totals. Courier delivery webhooks must not automatically record buyer acceptance or release payments. Never log document details, tokens or full bank/payment references. Notification bodies should point users to authorized app pages instead of embedding sensitive dispute evidence.

`supabase/functions/_shared/provider-contracts.ts` specifies adapter boundaries. `provider-gateway` authenticates through Supabase Auth and checks the protected super-admin role before returning unavailable status. It is prepared source, not deployed or an active provider adapter. Build and audit concrete adapters after credentials/provider choices are supplied; deploy only then. No default test bank account or default admin password exists.

Reference: [Supabase function authorization](https://supabase.com/docs/guides/functions/auth), [Supabase getUser verification](https://supabase.com/docs/reference/javascript/auth-getuser).

## Vercel SEO setup (prepared; no deployment performed)

Set `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, and the canonical `VITE_SITE_URL`. The SEO function uses only the public key and anonymous public catalog RPCs. `vercel.json` bundles `dist/index.html` into the function. Configure production Supabase redirect URLs separately before launch. Do not enable HTML caching without a tested suspension/moderation invalidation mechanism.

Reference: [Vercel function file inclusion](https://vercel.com/docs/functions/configuring-functions/advanced-configuration).

## Scope decisions

- CSV creates products, not destructive mass edits, and does not overwrite reserved SKU stock.
- Supplier rates remain estimates because wholesale shipment weights/packing and actual carrier prices require confirmation.
- Samples remain supplier-approved offers rather than guaranteed instantly paid orders.
- Buyer corporate information is private/self-reported; this release does not add corporate document verification.
- Existing product comparison remains limited to four products. Recent products appear in a horizontal product-page strip, avoiding an overlay on mobile checkout controls.
- Coupon/discount campaigns require separate commercial rules and are not invented by this release.
- No claim of complete test coverage, Lighthouse score, payment certification or external-provider readiness is made.

## Validation record

- Migrations 33 and 34 applied to the existing linked hosted project. Post-rollout `marketplace_growth.sql` and `open_tenders.sql` passed, including rolled-back import, sealed bids, offer checkout and exact-once inventory reservation fixtures.
- Cloud database types regenerated; frontend RPC calls now use generated signatures.
- 75 unit tests across 17 files passed, including shipping boundaries, CSV/formula handling, leading-zero identifiers, anonymous HTML safety and disabled provider behavior.
- Main desktop/mobile regression run: 118 passed, 2 intentionally skipped duplicate layout cases. Covered product options/gallery/comparison/reviews, carts, checkout/retries/returns, supplier/admin actions, search and authentication navigation.
- Focused final run: 42 passed, covering new sourcing/organization/import/report interfaces and shared buyer/supplier messaging. Across both runs, 144 distinct browser cases passed and 2 duplicate layout cases were intentionally skipped.
- Anonymous read-only live SEO probe returned 200 with structured data for an eligible product and 404/noindex for an unavailable product. This does not constitute a deployed Vercel test.
- The CLI reported a nonfatal migration-catalog cache warning because Docker is unavailable. Hosted migrations completed and the post-rollout SQL tests passed; no local database was started or Docker installed.
- Final TypeScript, ESLint and production build checks passed. The built HTML template preserves client assets while receiving dynamic catalog metadata/content. The local Vite app is running on port 5173; no production deployment was performed.
