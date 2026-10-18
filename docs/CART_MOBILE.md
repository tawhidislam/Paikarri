# Responsive cart

Updated 18 October 2026. Route: `/cart`.

The cart uses supplier-grouped cards with readable product titles, SKU descriptions, unit prices, MOQ and item subtotals. Quantity controls provide 46px minus/plus targets, a 16px numeric input, automatic quantity saving, an optional immediate Update action, and a separate Remove action. Invalid whole quantities cannot be saved; the database continues to validate stock, prices and combined variant MOQ.

On screens up to 600px, a fixed safe-area-aware bar shows the current saved subtotal and checkout action. The public search header is hidden to prioritize cart content. The redundant floating chat shortcut is hidden on this route to avoid covering checkout; Messages remains in the header. Footer padding leaves final links reachable. Tablet layouts use a single column through 900px; desktop retains a separate summary column.

The checkout action is blocked while cart mutations and their quote refresh are pending, when an item is unavailable, or when the account is suspended. Valid quantity edits preview item and cart prices immediately and save after a 700ms pause. Checkout waits for the confirmed quote. Update or Enter can save immediately; Escape or Discard changes restores the saved quantity. SKU updates preserve other selections in the same product. Failed saves retain the edited quantity and show the existing error notice.

Quantity-price schedules now load through the authorized `product_options` RPC, sharing the existing per-product query cache. Each cart SKU displays its own schedule, starting at product MOQ. Tier buttons apply the selected quantity and save it. Price previews use the combined draft quantity of the product’s variants; confirmed prices still come from the server quote. The next genuinely lower-price threshold shows how many more units are needed. Loading, retry, missing-SKU and stale-price states avoid fabricated prices. Saved cart quotes remain authoritative for totals and checkout.

Unsaved quantity edits also block checkout. Failed saves pause automatic retry until the quantity changes or the buyer explicitly retries. Inputs retain focus and can accept a newer quantity while a previous save is in flight; writes are serialized and the latest draft is then saved. Updating one variant preserves another variant's unsaved draft when its unit price changes. If removing a variant would leave less than product MOQ, the cart offers an explicit, cancellable action to remove all variants of that product. Stale schedules provide a Refresh prices action without requiring an arbitrary quantity change.

Styles are scoped to `.cart-page` and `.checkout-page` in `src/pages/cart-mobile.css`. The checkout form now uses readable mobile fields and a compact header; existing order-detail layouts are unchanged. No database migration is required.

## Verification

- New cart browser suite: 9 passed, 1 duplicate mobile matrix skipped. English/Bangla at 320, 390, 600, 768 and 1440px; no horizontal overflow or chat/checkout overlap.
- Existing order and product-to-order browser suites: 38 passed. Includes cart removal, tier-price refresh, SKU selection, COD/manual bank checkout, idempotent retry, supplier confirmation, cancellation, disputes and refunds.
- Unit suite: 54 passed. Type checking, lint, production build and diff whitespace checks passed.
- Read-only hosted cart check: one existing item loaded at 320, 390, 768 and 1440px in both languages, with no horizontal overflow, page errors or failed HTTP responses. No cart mutation or checkout RPC was called. Evidence: `artifacts/cart-live/metrics.json` and screenshots.
- Tests use synthetic browser responses; no cloud carts, orders or payments are created by these suites.

Screenshots: `artifacts/cart-{en,bn}-{390,1440}.png`. Physical-device keyboard testing remains outside this browser-based validation.

## Quantity-pricing integration checks

`supabase/tests/cart_pricing.sql` exercises hosted tier boundaries at 8, 23, 24, 79 and 80 units; distinct SKU prices at a combined threshold; MOQ/stock rejection; exact checkout totals; price tampering rejection; inventory reservation; idempotent checkout; whole-product variant removal; and buyer/supplier/staff/guest access boundaries. It uses synthetic users and products inside an explicit transaction ending in ROLLBACK. No real orders or persistent test records are created.

`tests/e2e/cart-pricing.spec.ts` checks displayed tiers, active prices, transitions in both directions, checkout payloads, mixed-SKU draft preservation, failed price retrieval, stale-price refresh, deliberate variant removal, and Bangla responsive layouts. Screenshot evidence: `artifacts/cart-pricing-{desktop,mobile}.png` and `artifacts/cart-pricing-bn-390.png`.

Earlier quantity-pricing browser run, before automatic saving: 58 passed, 2 duplicate viewport-matrix cases skipped. All 54 unit tests, type checking, lint and production build passed. The hosted SQL integration checks above passed and rolled back successfully.

A read-only existing buyer check confirmed the real cart's 8-unit BDT 1,950 price matches its SKU schedule (1/8 units: BDT 1,950; 24: BDT 1,853; 80: BDT 1,755). Eight viewport/language combinations had no overflow, page errors or failed HTTP responses. No cart mutation or order checkout was called. Evidence: `artifacts/cart-pricing-live/metrics.json` and matching screenshots. Browser automation and transactional SQL tests establish these tested flows; physical-device and production load testing were not performed.

## Mobile quantity and price synchronization correction

A subsequent live action audit found that tier cards were static and quantity edits required a separate Update click. The implementation now previews valid SKU prices and item/cart totals together and automatically saves after a 700ms pause. Tier cards are real buttons that apply and save their quantities. The first visible tier begins at product MOQ. Quantity bounds account for other selected variants, per-SKU stock, and the maximum combined quantity.

Each edit carries a local revision; a completed save acknowledges only that revision. A newer input survives the server quote refresh, including when the buyer returns to the pre-save quantity. The same DOM input remains mounted so a successful save does not drop keyboard focus. Failed automatic saves pause retry and expose Update and Discard changes. Invalid edits are not sent.

The initial live-action evidence is `artifacts/cart-functional-audit/live-before.json`. It confirmed manual saves, removal and checkout navigation, and reproduced the no-op tier tap. The dedicated test buyer's original cart was restored. No real orders or payment operations were performed.

Final correction verification: 66 browser checks passed with 2 duplicate layout matrices skipped; 58 unit tests passed. Type checking, lint, production build and diff whitespace checks passed. The browser suite includes delayed-save typing, reverting to the original quantity during an in-flight save, price-tier buttons, automatic saving without Update, failure retry, invalid-input discard, mixed variants, removal, and product-to-checkout navigation.

Actual hosted buyer actions passed at 320, 390 and 1440px: automatic 24/80/8-unit saves (BDT 1,853/1,755/1,950), focus retention, tier selection, crossing back to 23 units (BDT 1,950), invalid-edit discard, checkout navigation/form entry, removal, and adding the product again. Every browser cart-write response succeeded, no JavaScript errors or item alerts occurred, and the original cart was restored. Evidence: `artifacts/cart-functional-audit/live-after.json` and `live-after-{320,390,1440}.png`. Live checkout stopped before order submission; order placement is covered by fixture and rolled-back SQL checks.

## Review fixes

The findings in `docs/audits/CART_REVIEW_20261018.md` have been addressed in the local frontend:

- Quantity controls precede the price schedule on phones; the schedule uses three compact columns. The fixed checkout bar is opaque and remains separate from initial quantity controls.
- Cart item thumbnails use a batched, RLS-protected `product_images` read for eligible cart products, prefer the selected SKU image when available, and reuse the existing five-minute signed-image component and fallback. Hidden/unavailable listings do not request new image paths.
- Checkout fields use 16px text and 48px minimum height on mobile/tablet. Its redundant floating chat shortcut and public search header are hidden on those widths; header Messages access remains.
- Discard changes resets the failed mutation notice. Product counts use distinct product IDs. Cart and checkout use a primary h1 through an optional shared title heading prop.

No migration, cloud content change or deployment is required. Original review evidence remains unchanged; follow-up live evidence is saved separately under `artifacts/cart-fixes-20261018/`.

Validation for these fixes: **73 browser checks passed, 3 duplicate viewport matrices skipped; 58 unit tests passed**. Type checking, lint, production build and whitespace checks passed. New tests specifically assert unobstructed initial mobile quantity inputs, 16px checkout fields, one primary heading, distinct-product counting, image fallback and discarded-error cleanup.

The read-only live check covered English/Bangla at 320, 390, 768 and 1440px. Mobile quantity inputs no longer overlap the fixed bar: at 390px the input ends near y=498 and the bar starts at y=771. The live item shrank from about 620px to 484px at 390px. Mobile/tablet checkout input text is 16px. There was no horizontal overflow, page error, failed response, cart write or order submission. `artifacts/cart-fixes-20261018/live-review.json` records the measurements. Physical iOS/Android keyboard testing remains unperformed.
