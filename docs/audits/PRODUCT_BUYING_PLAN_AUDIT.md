# Product details and wholesale buying plan audit

Audit date: 17 October 2026. Application: React + Vite at http://localhost:5173, connected to the existing hosted Supabase project. This is an implementation audit, not a feature-completion claim.

**Verdict: all major feature areas have implementations, but the plan is not fully complete.** One backend validation defect was reproduced against rolled-back synthetic data, two pricing details differ from the plan, fullscreen thumbnail navigation is incomplete, and a Bangla interface label is missing. Some acceptance scenarios still need dedicated integration tests.

## Findings, in priority order

### 1. Backend accepts a non-finite SKU price — fix before acceptance

`sku_prices.price` and `sourcing_offer_lines.unit_price` use numeric columns with only a `> 0` constraint. Supplier RPCs cast JSON input to numeric; they do not require a finite value. Browser Zod validation does not protect direct RPC calls.

Reproduced on Cloud: after loading `supabase/tests/product_buying_upgrade.sql` synthetic fixtures inside its transaction, calling `supplier_options_save` with the current version and prices set to the JSON string `"NaN"` succeeded. Reading the resulting SKU returned `"NaN"`. The transaction rolled back; no real product was edited or published. This demonstrates a gap in the requirement for valid positive prices and can break the typed product-options response. The offer-price path has the same constraint/cast pattern; it was inspected but not separately exercised.

Evidence: `supabase/migrations/20261017002200_product_buying_upgrade.sql:6`, `supabase/migrations/20261017002300_sourcing_requests_reviews.sql:6`. Recommended fix: finite bounded money constraints and server validation on catalog, SKU, offer and frozen order money fields, with direct-RPC regressions. Check existing values before adding validated constraints.

### 2. New SKU defaults copy the first SKU, not the product schedule

`src/components/product/supplier-options.tsx:115` initializes generated SKU prices with `value.skus[0]?.prices`. Once SKU-specific prices differ, a new variant inherits whichever SKU sorts first, potentially even an archived SKU returned to its owner. The plan specifies the product schedule as the default. Explicitly load the product base/tier schedule for new combinations; preserve prices of existing combinations.

### 3. The next-lower-price message can mislead mixed-variant buyers

`src/components/order-purchase.tsx:82` chooses the next threshold if **any** selected SKU becomes cheaper. It does not check the weighted price of the full selection. For example, if both SKUs currently cost BDT 10 and the next tier changes red to BDT 9 and blue to BDT 20, an equal red/blue mix becomes more expensive per unit (BDT 14.50 versus BDT 10), but the current condition still labels that tier “Next lower-price threshold.” Compare weighted unit prices for the selected mix, or explicitly identify which SKU becomes cheaper. No numeric savings amount is currently displayed.

### 4. Fullscreen viewer has no thumbnail strip

`src/components/product/gallery.tsx:71` renders thumbnails outside the modal dialog. The modal itself has zoom and previous/next controls, keyboard browsing, image refresh/fallback, and focus restoration, but the outside thumbnails are unavailable while it is open. Add thumbnail navigation inside the fullscreen viewer to fully meet that detail of the plan.

### 5. Bangla interface copy is not complete

The live 320px Bangla smoke check still shows the English **Request quotation** button. `src/components/product/request-composer.tsx` calls `tr('Request quotation')`, but that exact key is absent from both centralized copy maps. Add the translation and audit all sourcing/review labels; the responsive layout test currently checks geometry, not translation completeness. Screenshot: `artifacts/buying-plan-live-bn-320.png`.

## Feature-by-feature status

“Implemented” below means the corresponding code and backend interfaces are present and relevant existing checks passed. It does not imply every acceptance edge case has an independent end-to-end test.

| Plan requirement | Status | Evidence / qualification |
|---|---|---|
| English/Bangla interface | Partial | Responsive layouts pass, but the quotation CTA lacks Bangla copy |
| Product page gallery, buying panel, supplier, specifications, delivery, reviews and recommendations | Implemented | `src/pages/product.tsx` composes each section |
| Fullscreen gallery, zoom, keyboard, focus restoration, signed-image refresh/fallback | Partial detail | `gallery.tsx`, shared `ProductImage`; thumbnails exist outside fullscreen only |
| Shared main/mobile quantities, SKU prices, subtotal and active tier | Implemented, messaging correction needed | `order-purchase.tsx`; mixed-SKU and sticky-state browser tests; next-tier finding above |
| Up to three variant attributes and 100 combinations | Implemented | Supplier editor and `supplier_options_save` enforce bounds |
| SKU-specific stock/prices at shared thresholds; mixed MOQ and independent stock checks | Implemented, finite-money validation incomplete | Normalized tables and authorized cart/checkout RPCs; Cloud fixture tests passed |
| Preparation ranges, dispatch, packaging measurements and delivery estimates | Implemented | Supplier sourcing editor and `product/delivery.tsx`; final delivery charges remain supplier-confirmed |
| Safe supplier profile, verification explanation, location, save supplier and chat | Implemented | Product supplier panel and shared save/chat controls; identity/bank documents are not included |
| Four other supplier products and eight related category products | Implemented | `product/recommendations.tsx` uses public eligibility, stock filters and deduplication |
| Guest comparison, four-ID limit, prices/tiers/MOQ/specs/preparation/verification/location | Implemented | `pages/compare.tsx`, `lib/comparison.ts`; only IDs persist, unavailable products reload through public projection |
| Supplier SKU codes, image associations, price matrix, delivery/sample/customization settings | Implemented, default-price correction needed | `product/supplier-options.tsx`; existing SKU codes/identities remain fixed |
| SKU stock is authoritative; sum of active SKU stock | Implemented | Cloud stock mismatch count is zero; versioned inventory and checkout locks |
| Public changes re-review; stock-only edits preserve approval | Implemented | Supplier options and inventory RPCs; stale scalar form stock regression passed |
| Archive referenced SKUs; preserve order variants and descriptions | Implemented | Immutable SKU identity checks, active flag, frozen order-item snapshots and retained references |
| Sample, customization and structured wholesale requests | Implemented | `product/request-composer.tsx`, `pages/sourcing.tsx`; captures selections, quantities, requirements, timing and district |
| Default-one / maximum-ten samples; authorized sample MOQ bypass | Implemented | Supplier configuration and submission checks; sample offer checkout is independent of ordinary cart MOQ |
| Customization MOQ at least product MOQ | Implemented | Supplier save and request submission enforce it |
| Versioned offers, exact requested quantities, prices, prep, notes and expiry | Implemented | `sourcing_offer_publish`; customization charges are instructed to be included in unit prices |
| Accept offer & checkout; COD/bank; stock and listing eligibility; frozen prices | Implemented | Dedicated negotiated checkout, accepted-offer references and order snapshots; delivery confirmation remains required |
| Single acceptance and retry protection; no mixing with regular cart | Implemented | Request/offer locks, nonce comparison, unique accepted references and separate checkout path |
| Existing quotation history preserved; legacy responses are not directly orderable | Implemented | Legacy tables remain; new structured sourcing offer required |
| Five private JPEG/PNG/WebP/PDF attachments, 10 MB after compression | Implemented | Private bucket, prepare RPC, compression and Edge byte-length/signature validation |
| Unique paths, no overwrite, ownership, five-minute application links | Implemented | Private storage policies; client signs previews for 300 seconds; submitted files frozen |
| Buyer/supplier/super-admin file access; audit super admin; deny staff | Implemented | File access RPC, storage helper and private audit scopes; Cloud authorization tests passed |
| Corrections create immutable revisions; image preview / PDF download | Implemented | Request workspace and revision tables; previous details/files retained |
| One completed-purchase review per buyer/product, 1–5 and written feedback | Implemented | Eligibility RPC and unique constraint; author edits require current version |
| Sample label/count separate from ordinary aggregate | Implemented | Public review projection excludes sample purchases from ordinary rating/count |
| Review/edit/reply moderation and `/admin/reviews` with safe staff content | Implemented | Admin queue contains eligibility/content, not private shipping/payment/file records |
| Withdrawal, reasoned hiding, reports and dispute/cancellation eligibility | Implemented | Moderation decisions/audits and dynamic completed-order eligibility |
| Genuine public ratings, safe names, no seeded reviews | Implemented | Cloud currently has zero review records; only approved eligible content is aggregated |
| RLS and typed interfaces; protected roles independent of UI | Implemented | All 17 new tables have RLS enabled; authorized RPCs and regenerated types |
| Deterministic inventory locks, versions, reservation/release and returns/refunds | Implemented; parallel-load acceptance outstanding | Cloud transactional suite covers lifecycle, stale inputs and exact-once restoration, but does not launch independent simultaneous buyer transactions |
| Current-stock standard-SKU backfill and compatible old carts/calls | Implemented | Migration copies stock/quantities; zero products lack SKU backfills; legacy order suite passed |
| Cloud-only additive rollout, no new gateway, local frontend | Implemented | Migrations 22–30 are present in cloud history; file validator is ACTIVE; no frontend production deployment |

## Validation and practical limits

- TypeScript, ESLint, all 49 unit tests and the production build passed during this audit. The build generated assets only; nothing was deployed.
- The Cloud buying/order synthetic SQL suite passed. Ten additional SQL authorization suites also passed: admin console, authorization, complete verification, conversation monitoring, live search, marketplace chat, operations, product upload, supplier management and wholesale orders. Every fixture transaction rolls back. Results: `artifacts/buying-plan-audit-security.json`.
- All 17 buying-related tables have RLS enabled. `request-attachments` is private, permits only the four planned MIME types and enforces a 10,485,760-byte bucket limit. The validation Edge Function is deployed and ACTIVE.
- A real public Cloud product was also opened without mocks: buying controls loaded at 1440, 768, 390 and 320px in English and at 320px in Bangla, without horizontal overflow or JavaScript page errors. Evidence: `artifacts/buying-plan-live-smoke.json`. This was read-only browsing, not a real order or upload.
- Current stock aggregates are consistent and every current product has SKU records. Cloud request/review record counts are zero. These counts avoid claiming real-world purchases or document processing have already occurred.
- Full browser regression suite: **213 passed, 1 skipped**. The skipped case is the duplicate mobile-project viewport matrix; that matrix passed in desktop Chromium across all four widths and both languages. It covers marketplace/authentication, favorites, CMS, verification, inbox/chat, administration, orders, live search and buying flows; product layouts cover English/Bangla at 320, 390, 768 and 1440px.
- Browser fixtures exercise the UI; SQL fixtures exercise real hosted authorization and transactions. They do not establish a complete real Auth → Storage upload → deployed Edge validator → offer → checkout → review chain. A valid upload plus malformed-byte rejection should be added as a dedicated Cloud integration test using synthetic files.
- True parallel last-unit purchases and simultaneous offer acceptance still require a dedicated integration/load test. Sequential idempotency and stale-version tests, plus inspection of locks, are not equivalent to that test.
- Add targeted acceptance tests for the findings above, hidden-product comparison cache invalidation and signed-image expiry/recovery in the fullscreen viewer. Existing public projections and image refresh logic are present; those specific buying scenarios are not independently covered in the current buying test file.

## Recommended completion order

1. Reject non-finite money in the database and RPCs; add direct-API regression cases.
2. Correct generated SKU defaults and mixed-variant tier messaging.
3. Add fullscreen thumbnails and complete missing Bangla interface copy.
4. Add real storage/Edge integration and parallel purchase/acceptance tests, then rerun the full regression suite.

This audit did not alter production records, deploy frontend assets, or apply database schema changes.

## Subsequent quantity-control correction

After the audit, price-tier labels were made into accessible quantity-selection buttons. Tiers below product MOQ are hidden (the chair now starts at 8 rather than 1), explicit +/− controls respect stock/MOQ, and selected quantities update the main/mobile subtotal together. Mixed-tier selection preserves chosen variants and respects each SKU's stock. The lower-price hint now compares the selected mix in rounded monetary amounts rather than checking whether any one SKU becomes cheaper, addressing finding 3 above. Regression checks: 21 browser tests passed, one duplicate viewport matrix skipped, and 51 unit tests passed. The separate non-finite-money validation and cart-removal findings remain open.
