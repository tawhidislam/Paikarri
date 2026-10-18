# Product page and order-flow test result

17 October 2026. Local React/Vite app with the existing Supabase Cloud project. No real orders, payments, messages or shipping actions were created.

**Verdict: the tested main flows pass, but not every edge case works.** Mixed-variant removal can trap a cart below the MOQ boundary, and the previously reproduced non-finite-price validation defect remains unresolved.

## Checks performed

- Product, order and marketplace browser suites: **65 passed, 1 skipped**. The skip is the duplicate mobile-project viewport matrix; the matrix runs in desktop Chromium at 320/390/768/1440px in English/Bangla.
- Added `tests/e2e/product-order-journey.spec.ts`: a stateful browser-boundary test carries a SKU from product → cart, updates its quantity twice, checks out with COD, verifies SKU/version/quantity/price payloads, opens the resulting single-order detail, and verifies the cart is empty. It passed on both desktop and mobile (2 additional tests; 67 browser tests passed in total). This uses synthetic browser responses; it is not a real Cloud order.
- Hosted `supabase/tests/product_buying_upgrade.sql`: **passed**. Synthetic fixtures and all order changes roll back. Covers mixed-SKU tiers/MOQ, stock reservation, stale checkout input, idempotency, supplier confirmation, buyer acceptance, COD/manual-bank restrictions, shipping, cancellation, disputes, inspected returns, refunds, expiry, inventory restoration, private files, offers, reviews and account isolation.
- **49 unit tests passed; TypeScript and lint passed.**
- Four current public products' real Cloud image URLs signed successfully and returned HTTP 200 with WebP content. Signed URLs were not recorded. Evidence: `artifacts/order-product-live-images.json`.

## Working paths verified

| Area | Result |
|---|---|
| Product gallery, zoom, keyboard dismissal/focus, variants and quantity pricing | Passed existing browser checks |
| Product → SKU cart → quantity updates → COD checkout | Continuous desktop/mobile test added |
| Bank-transfer checkout, multi-supplier split and delivery details | Passed browser and Cloud transaction checks |
| Supplier delivery fee confirmation → buyer final-total acceptance | Passed |
| COD shipping; bank transfer blocked until authorized verification | Passed |
| Cancellation, disputes, returns, external refunds and expiry | Passed |
| Stock reservation, stale input and duplicate retry prevention | Passed sequential transaction checks |
| Negotiated sample offer → separate checkout, frozen prices | Passed |
| Unauthorized buyer/supplier/staff access | Denied in Cloud checks |
| Desktop/mobile English/Bangla layouts | Passed viewport matrix |

On mobile, the header cart icon is hidden by the existing responsive CSS. Buyers can reach Cart from the mobile menu or the dashboard navigation. Desktop shows the header shopping-bag icon.

## Confirmed cart edge case

The cart's **Remove** button calls `cart_skus_set` with the remaining SKU lines. The RPC rejects every nonempty selection below product MOQ.

Reproduced with synthetic Cloud data: product MOQ 5, red quantity 3, blue quantity 2. Removing blue sends only red quantity 3 and returns **“Combined quantity must meet product MOQ.”** Removing red similarly leaves only two units. Neither line can be removed directly from that starting cart. The transaction was rolled back.

Evidence: `src/pages/orders.tsx:78` and `supabase/migrations/20261017002200_product_buying_upgrade.sql:93` (cart quantity validation). Empty selections are allowed by the RPC, but the UI does not expose whole-product removal for a mixed-SKU group. Recommended correction: permit sub-MOQ editable cart drafts while blocking checkout, or provide a clearly labeled whole-product removal action.

## Previously confirmed issues still open

- Direct supplier RPC accepts `"NaN"` as a SKU price; frontend Zod alone is insufficient.
- Generated SKU defaults use the first SKU's schedule instead of the product schedule.
- The next-lower-price message checks any selected SKU, not the weighted mix.
- Fullscreen thumbnails and some Bangla interface copy remain incomplete.

See `PRODUCT_BUYING_PLAN_AUDIT.md` for the feature-by-feature evidence. This test request did not change those features or apply migrations.

## Limits

Browser tests use isolated backend responses. Cloud SQL tests execute real database authorization and transactions with rolled-back synthetic fixtures. These two layers do not establish a single real Auth → browser → Storage/Edge → live order chain. Independent simultaneous purchases and a complete deployed attachment-validation integration test remain outstanding. No claim of full production acceptance is made.
