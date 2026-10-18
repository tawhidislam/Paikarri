# Cart and checkout review — 18 October 2026

Overall subjective rating: **7/10**. Core buying behavior passed the tested scenarios. Mobile visibility and checkout readability need further work.

| Area                     | Rating | Assessment                                                                                                             |
| ------------------------ | ------ | ---------------------------------------------------------------------------------------------------------------------- |
| Branding and consistency | 8/10   | Cohesive forest green, borders and pricing emphasis                                                                    |
| Cart behavior            | 8/10   | Automatic quantity saving, tier boundaries, variant pricing, stock/MOQ limits and recovery pass the regression cases   |
| Desktop layout           | 7.5/10 | Clear supplier grouping and separate summary; item cards remain tall and lack images                                   |
| Mobile cart              | 6.5/10 | Main controls have comfortable sizes, but the fixed checkout bar obstructs quantity at initial load                    |
| Checkout usability       | 6.5/10 | Clear supplier-confirmed shipping model; small input text, long form, and floating chat interference weaken mobile use |

## Findings in priority order

1. **P2 — Fixed mobile checkout bar covers the first quantity input.** On the live 390×844 English cart, the quantity input spans y=789.2–835.2 while the fixed bar spans y=771–844. The same obstruction occurs at 320px and in Bangla. Scrolling/focusing can reveal the input, so it is recoverable, but a first-time buyer sees prices without a usable quantity field. Collapse the pricing block, bring quantity above it, or redesign the bar/content relationship. Source: `src/pages/cart-mobile.css:329`, `src/pages/cart-mobile.css:473`.
2. **P2 — Mobile checkout input text is 12px.** The recipient textbox computes to 12px at all reviewed widths despite the cart quantity field being 16px. This reduces readability and risks focus zoom on iOS; physical Safari was not tested. Set effective mobile form styles to at least 16px, reduce header clutter, and check the address textarea against the floating chat shortcut. Source: `src/pages/orders.css:73` and the shared field rules in `src/index.css`.
3. **P2 — Failed-save warning remains after Discard changes.** A synthetic 409 save failure followed by Discard changes restores the saved quantity and enables checkout, but leaves the old error alert visible. Reset mutation error state on discard and clarify confirmed-save status. Reproduced in `tests/e2e/cart-review.spec.ts`; evidence: `artifacts/cart-review-20261018/edge-cases.json`. Source: `src/pages/orders.tsx:125`, `src/pages/orders.tsx:338`.
4. **P3 — Product count actually counts SKU lines.** `cart.data.rows.length` is labelled Products. One product with two variants appears as two products. Count distinct product IDs or label the value Items/variants and optionally show total units. Source: `src/pages/orders.tsx:425`.
5. **P3 — Cart cards are too tall and lack item imagery.** The first live item is about 620px tall at 390px and 640px at 320px in English. It has no product thumbnail. Put a small item image beside a compact title/variant summary; show the applied tier prominently and expand the full schedule on request. Avoid repeating every tier for multiple variants of the same product.
6. **P3 — Missing primary page heading.** No `h1` appears in the main cart content; the page title is rendered by a shared `SectionTitle` as `h2`. Add an appropriate primary heading when improving semantic structure. Source: `src/components/shared.tsx:56`.

## What passed

- Fresh cart/order browser regression run: **66 passed, 2 skipped**. The skips are duplicate locale/viewport matrices, not unimplemented behaviors.
- **58 unit tests passed**. Type checking and lint passed. No production build was rerun for this read-only application review.
- Tier selection and exact price boundaries in both directions, combined variant pricing, automatic saves, continued typing during delayed saves, reverting during an in-flight save, failed-save retry, invalid input discard, product removal, variant removal below MOQ, unavailable/suspended checkout protection, and cart-to-checkout flow passed under synthetic browser RPC responses.
- Existing order regressions covered COD/manual bank checkout, supplier confirmation, idempotent retry, cancellation, disputes, returns and refunds. These tests do not make real orders or payments.
- Fresh read-only live cart and checkout navigation: English/Bangla at **320, 390, 768 and 1440 CSS pixels**, height 844px. No horizontal overflow, JavaScript page errors, failed HTTP responses or cart mutation/checkout RPCs were observed.
- Focused quantity inputs were reachable after scroll, used 16px text, and primary quantity controls measured at least 44px in the fixture matrix.
- One additional exploratory browser case confirmed the retained-error finding. Its successful execution records the defect; it is not a claim that the recovery UX is correct.

## Evidence and limits

- Live metrics: `artifacts/cart-review-20261018/live-review.json`.
- Initial viewport and full-page screenshots: `{en,bn}-{320,390,768,1440}-{viewport,full}.png` in that directory.
- Checkout screenshots: `checkout-{en,bn}-{320,390,768,1440}.png`.
- Recovery defect: `edge-cases.json`, `discarded-error.png`.

Application source and hosted records were unchanged by this review. Synthetic tests exercise writes only at mocked browser RPC boundaries. The live audit only read existing data and navigated to checkout; no address was submitted. No fresh database authorization/concurrency run, physical-device keyboard test, production-load test, or full accessibility certification was performed. Previous live-action and rolled-back SQL checks are documented separately in `docs/CART_MOBILE.md` and are not counted as fresh results here.

Recommended next work: fix the mobile overlay and checkout font size first, clear obsolete error notices, then compact item cards with thumbnails and accurate product/variant counts.
