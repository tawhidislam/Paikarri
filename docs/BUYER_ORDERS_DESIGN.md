# Buyer orders

`/dashboard/orders` keeps its desktop green/ivory header, real account statistics, server-backed status shortcuts, search, pagination and order cards. Supplier and platform order views retain their operational table.

## Phone layout

Below 800px, buyers get a separate compact presentation in `src/pages/buyer-orders-phone.css`:

- A 64px brand header without the public marketplace search or promotional strip. Existing brand, language, account menu and inbox controls remain available. The sourcing marketplace remains accessible through Browse links and the header menu.
- A lightweight workspace menu with four shortcuts, a simple localized My orders heading, and a three-column statistics strip.
- Four fully visible status shortcuts (All orders, To review, Shipped, Completed) replace the clipped horizontal strip on phones. Every remaining status is available through the labeled Filters button in the heading. The filter disclosure contains status and page-size selects; the search field keeps a single submit button. Applied status, search and page-size labels offer Clear filters with focus restored to search. URL state and server queries remain authoritative; clearing can reuse the normal fresh query cache.
- Compact white cards on a pale neutral background. Each shows reference/date and status, supplier/payment method, total/payment state, a full-width next action below the amount, and a short status-specific explanation. Reference links have 44px touch targets. Prices no longer share their row with an action button, so long amounts and Bangla labels remain readable. No invented product thumbnails or performance claims are used.
- Readable text, wrapping supplier names and statuses, 44px controls, 16px inputs, focus outlines, and real loading/empty/retry states. Navigation and the cards stay within the viewport at 320px.

The first order card appears within 550px of the page top at the tested 390px phone viewport in both languages. Desktop presentation is isolated from these screen-only rules. Detail-specific mobile rules are in `src/pages/buyer-order-detail-phone.css`. Central bilingual copy lives in `src/lib/buyer-orders-copy.ts`.

## Details and confirmation

Order details include a compact reference/date header, accessible icon print control, status banner, authorized order items and totals, delivery information, payment records and event history. On mobile, the five-stage progress timeline sits behind an accessible disclosure showing the current stage count. Desktop retains the expanded timeline. On phones, the next-step panel shows the current amount and an explicit notice when delivery charges remain unconfirmed. The main action spans the panel; secondary actions share a row and wrap their labels. Items and delivery/history follow, and the payment record comes last. Loading and failure states retain the compact header to avoid a layout jump. Buyer confirmation dialogs use a scrollable bottom sheet with a sticky action footer and safe-area spacing. Existing authorization, payment, cancellation, dispute and return behavior is unchanged. Receipt printing uses its own A4 layout.

## Validation

`tests/e2e/buyer-orders-mobile.spec.ts` checks 320/390/768px in English/Bangla, collapsed and expanded filters, actual RPC search/page-size arguments through isolated synthetic responses, font/control sizes, card placement, no overflow, detail section order, bottom-sheet bounds and Escape dismissal. Existing buyer orders, orders, receipt and continuous checkout suites cover navigation, search, acceptance, cancellation, disputes, returns, external-payment verification, refunds, error/retry states and printing.

Tests do not publish fictitious orders. No database migration, real order mutation or production deployment is needed for this presentation change.

Release checks: 48 browser tests passed (four duplicate viewport/desktop-PDF checks skipped), and the final 550px layout-bound matrix passed again. Type checking, lint and 51 unit tests passed. Read-only cloud checks at 320/390/768px returned first-card top positions of 513/496/496px, without horizontal overflow or JavaScript errors. No real order state was changed. Evidence: `artifacts/buyer-orders-phone-live-check.json` and `artifacts/buyer-orders-phone-live.png`.

`tests/e2e/buyer-order-detail-mobile.spec.ts` checks all seven order states at 320/390px in English and Bangla (28 combinations), timeline keyboard expansion/current-step semantics, 44px controls, initial primary-action placement, and stable loading/error layouts.

Mobile detail validation: 48 browser regressions passed with four duplicated viewport/PDF cases skipped. The final detail matrix and loading/error tests passed after adding explicit retained-expiry fixtures: buyers see confirmation deadlines only during confirmation/acceptance. A transient browser `ERR_NETWORK_CHANGED` while loading local dependencies was identified in the trace; the clean rerun passed. Live read-only detail checks at 320/390/768px found no overflow or JavaScript errors, and the total remained visible. Evidence: `artifacts/buyer-detail-mobile-live-check.json`; viewport-only preview: `artifacts/buyer-detail-mobile-live.png`. No order mutations were submitted during live checks.

`tests/e2e/my-orders-mobile.spec.ts` covers unclipped status controls, full status selection, query/cache-aware reset and focus restoration, empty results, three cards with long supplier names and large totals, English/Bangla, and 320/390px widths. The existing mobile matrix adds 768px coverage. The focused regression run passed 11 browser cases, with three duplicate phone-matrix cases skipped; checkout-to-order navigation and supplier/administrator layout boundaries also passed.

Live checks for these list fixes verified the rendered HTML language and all six English/Bangla × 320/390/768px combinations using the saved buyer account: no page overflow, clipped shortcut row, or JavaScript errors. See `artifacts/my-orders-fixed-live-check.json` and `artifacts/my-orders-fixed-live-en.png` / `artifacts/my-orders-fixed-live-bn.png`. Only read-only order requests were made. Type checking, lint and 51 unit tests passed.
