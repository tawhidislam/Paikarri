# Paikarii.com homepage review and improvement plan

Reviewed locally on 2026-10-17, using the live Supabase Cloud catalog. This is a review and proposed implementation plan; marketplace code, CMS publication, and cloud records were unchanged.

## Overall rating: 7.5/10

Paikarii.com has a recognizable green/orange identity, consistent components, a clearer sourcing message, and readable mobile cards. The next release should help buyers reach suitable inventory faster and understand the supplier/quotation process more clearly.

| Area                            | Rating | Assessment                                                                                                                                                        |
| ------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Branding and visual consistency | 8.5/10 | Cohesive palette, typography, cards, spacing, and supplier invitation.                                                                                            |
| Header, search, navigation      | 7/10   | Search and category navigation function; fixed quick-search suggestions expose a real relevance issue.                                                            |
| Hero and information hierarchy  | 7.5/10 | Clear sourcing copy; products remain below the first screen on desktop and phones.                                                                                |
| Products and suppliers          | 7.5/10 | Readable prices/MOQ and factual tier indicator; cards could make quotation access and price breaks clearer. A single supplier leaves a sparse desktop row.        |
| Mobile usability                | 8/10   | Good primary controls and responsive grids; several secondary links have small touch areas.                                                                       |
| Bangla experience               | 7/10   | Main content and product names localize; two section links remain English and some supplier content falls back to English.                                        |
| Trust and supporting content    | 6.5/10 | Verification is visible; the trust page describes the previous single-document process, and support/legal pages still contain launch-draft/operator instructions. |

These are product/UX judgments, not Lighthouse scores or a formal accessibility certification. Current inventory is four approved demo listings across two suppliers, with one verified test supplier displayed. Demo category photographs do not establish the quality of eventual real product photography.

## What was checked

- Live homepage at 320, 390, 768, and 1440px in English and Bangla: eight combinations. No horizontal overflow or JavaScript exceptions were observed. No broken images were observed after scrolling the page.
- Header search, division filtering, product detail navigation, product-to-supplier links, guest favorite/sign-in gate, category picker and Escape/focus behavior, mobile sign-in navigation, footer information destinations, and persisted language/document language.
- Four visible approved products; pending products remain absent. New arrivals correctly collapses because all four current listings are already featured, avoiding duplicates.
- Fourteen targeted desktop/mobile browser tests passed for hidden curated records, loading skeletons, catalog outage/retry, unavailable images, guest/buyer favorites, keyboard/mobile navigation, and paused supplier registration. Those edge cases used browser-only fixtures; cloud data was unchanged.
- Code review of homepage catalog queries, card presentation, translations, verification explanation, and HTML metadata.

## Main findings

### 1. Quick searches can fail to find available inventory

The visible **T-shirts** shortcut returns zero results, although searching **T-shirt** finds an existing product. **Cotton** returns two products. Bangla **কটন** returns two and **টি-শার্ট** returns one. Jute bags and Rice currently return zero because the current approved demo catalog has neither.

Fix the singular/plural shortcut mapping first. Then make suggested terms depend on approved, visible inventory, with canonical query values shared across English/Bangla display labels. Empty categories can remain browsable, but should show honest availability counts and useful alternatives.

### 2. Inventory is still relatively far down the page

| Width  | Category image starts, English | First product starts, English |
| ------ | ------------------------------ | ----------------------------- |
| 320px  | 715px                          | 1,384px                       |
| 390px  | 674px                          | 1,202px                       |
| 768px  | 808px                          | 1,193px                       |
| 1440px | 786px                          | 1,157px                       |

At 390×844, the first category row is visible within the initial screen, which is good. Reaching actual products requires further scrolling. At 1440px, a 414px hero plus navigation/category sections pushes the product grid to around 1,157px.

Use a shorter hero, tighter section spacing, and a compact mobile category row. Keep the primary search prominent and preserve readable text. Recommended targets: first product begins within roughly 1,000px on a 390px phone and 950px on a 1440px desktop, while the first category row remains visible in the initial 390×844 viewport.

### 3. Product cards need a clearer sourcing action

Cards already show product name, price, MOQ, supplier link, location, verification, and whether real tiers exist. Product titles are 14px on phones and 15px at larger widths; supporting information is 12px. Preserve those sizes.

Add an obvious **View prices / Request quotation** entry linked to the existing product-detail/quotation flow, retaining guest sign-in and buyer authorization. Show a compact preview of actual quantity-price breaks instead of only the generic availability sentence. Do not display a lower tier price without its qualifying quantity. Keep buyer favorites distinct from the primary sourcing action.

The current demo pairs reuse category photos. Keep demo labels for testing; use supplier-provided item-specific photographs before real launch. Real production imagery should distinguish products at a glance.

### 4. Sparse inventory needs adaptive presentation

Only one verified supplier appears in a three-column desktop grid. Use a compact horizontal supplier layout when one business is available, two balanced cards for two, and the normal grid at three or more. Include available company category/location and description without inventing ratings, response times, or business scale.

Keep the existing no-duplicate arrivals behavior. Do not repeat products to make the page look populated. Consider category availability counts and a useful “Explore all suppliers” route when inventory is limited.

### 5. Finish bilingual, trust, and support content

- Both homepage **View all products** links remain English in Bangla mode. Use the central translation system consistently.
- The new homeware demo business has no Bangla business name; its English fallback is a data-completeness issue, distinct from missing interface translations.
- `/info/trust` currently says a reviewer approves “a submitted business document.” Update it to explain the current owner identity, trade-licence and bank-evidence application, super-admin review, corrections, expiry, and badge eligibility. Do not imply government/bank API validation or transaction guarantees.
- Publish actual marketplace support contact details in platform settings before public launch. Replace public support instructions aimed at the operator (such as checking Supabase logs) with useful customer guidance. Finalize the operator's draft policy content before launch.
- The hero's lifestyle category photograph gives limited manufacturer/wholesale context. Use appropriately licensed Bangladesh sourcing/business imagery or neutral category illustration wording. Any origin/trust claims should be supported by the actual content.

### 6. Secondary accessibility and metadata polish remains

Primary search, favorite, and main CTA controls are comfortably sized. Quick-search links are about 28px high; several section/footer links are about 32px. Increase frequently used mobile link targets toward 44px without shrinking text or creating overlaps. Preserve visible keyboard focus and category-menu dismissal behavior.

The homepage has a description and localized document language, but no canonical link, Open Graph title, or homepage structured-data block was found. Its description stays English in Bangla mode. Plan locale-aware metadata, sharing previews, and suitable Organization/WebSite data using real operator information. Evaluate prerendering for public React/Vite pages and crawlable language URLs when a production domain is available; a frontend framework rewrite is unnecessary for this plan.

## Prioritized implementation plan

### Phase 1 — Search and content correctness

1. Fix the T-shirts/T-shirt mismatch and test representative English/Bangla aliases.
2. Replace empty fixed quick searches with useful, approved-inventory-backed suggestions.
3. Translate the two section links and complete available bilingual company content.
4. Update the verification explanation and customer-facing support copy.

Acceptance: the visible apparel suggestion returns available apparel, locale changes retain equivalent query meaning, hidden/suspended inventory never enters suggestions, and no English section-link labels remain in Bangla mode.

### Phase 2 — Faster sourcing layout

1. Shorten the desktop/mobile hero and tighten excess spacing while retaining green branding.
2. Use compact, accessible mobile category navigation with honest availability context.
3. Add clear quotation/detail entry points and factual price-tier previews to shared product cards.
4. Adapt supplier layout to one, two, or many records; retain distinct arrivals only when records exist.

Acceptance: meet the product-position targets above, keep categories visible on the initial phone screen, preserve 14px/12px card readability, and verify zero/one/many inventory states without duplication or fabricated statistics.

### Phase 3 — Credibility, accessibility, and discoverability

1. Add actual support details and finalize launch content through existing owner-controlled settings/CMS workflows.
2. Improve real product/supplier photography and contextual verification explanations.
3. Enlarge secondary touch areas and check keyboard/focus/contrast manually.
4. Add locale-aware metadata, social previews, and public-page SEO strategy for the eventual production domain.

Acceptance: all home-to-search/product/supplier/sign-in paths remain functional in both languages at 320/390/768/1440px; loading/error/image-failure states remain useful; favorites and supplier registration permissions still hold. Measure field performance after deployment rather than assigning an invented Lighthouse or Core Web Vitals score from this local review.

## Evidence

- [Desktop screenshot](../artifacts/homepage-review-1440-en.png)
- [Mobile screenshot](../artifacts/homepage-review-390-en.png)
- [Bangla initial viewport, confirmed](../artifacts/homepage-review-bangla-first-screen-confirmed.png)
- [Measured layouts](../artifacts/homepage-review-metrics.json)
- [Live browsing flow record](../artifacts/homepage-review-flows.json)
