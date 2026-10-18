# Homepage design review — 18 October 2026

Implementation follow-up: [completed code changes, validation, and remaining catalog-content work](../HOMEPAGE_REVIEW_IMPLEMENTATION.md). The ratings and measurements below preserve the original pre-improvement review.

Overall subjective rating: **7.5/10**. Strong visual consistency; product photography, catalog depth, and mobile sourcing density are the main opportunities.

Review scope: local React/Vite homepage connected to the existing hosted public catalog; English and Bangla at 320, 390, 768, and 1440 CSS pixels. No application source, cloud data, or settings were changed.

| Area | Rating | Finding |
| --- | --- | --- |
| Branding | 8.5/10 | Consistent forest green, cream accents, typography, and spacing. |
| Header and search | 8/10 | Prominent search, useful live suggestions, category picker, mobile sign-in access. |
| Hero | 8/10 | Clear wholesale message and compact mobile version; desktop lifestyle imagery is less specific to B2B sourcing. |
| Categories and discovery | 7/10 | Clear six-category navigation; category tiles consume substantial mobile space before inventory. |
| Product cards | 6.5/10 | Clear BDT/MOQ and quantity-pricing cues; repeated generic photos, tall cards, and truncated supplier names weaken sourcing confidence. |
| Supplier/trust content | 7/10 | Verification explanation is useful; current catalog contains explicitly marked fictional test businesses. |
| Mobile and localization | 7/10 | Responsive layouts without overflow; small secondary targets and incomplete Bangla section-link translations remain. |
| Guide and footer | 8/10 | Clear sourcing steps, supplier invitation, and working policy/support destinations. |

## Priorities

1. Replace generic repeated product photos with exact-item images. Dining chair and side table currently share a room photograph; polo and crew-neck shirt share a clothing-rack photograph. Separate test data from the launch catalog. Only four products and one supplier currently appear publicly on the homepage.
2. Surface inventory sooner on phones. At 390px, categories start around y=569, but the featured-products heading starts around y=902. Tighten category tiles and intervening spacing while retaining the clear hero.
3. Improve product-card density and supplier context. Preserve useful BDT/MOQ information, reduce unnecessary card height, expose readable supplier names, and expand supplier-link hit areas (currently about 18px high).
4. Complete Bangla interface translations. “View all products” remains English. Business-name data fallbacks and explicit demo prefixes are separate content issues.
5. Increase small secondary text/touch areas. Some category labels at 320px and footer policy text are 11px; footer policy targets are about 40px high. Aim for comfortable 44px targets and readable supporting text.
6. Investigate the category-to-search timing failure observed once in automation. Do not consider the three passing reruns proof that the race is resolved.

## Validation

- Eight live viewport/language combinations: no horizontal overflow, JavaScript page errors, or HTTP responses >=400 observed during capture.
- Live search for “cot” returned the two matching cotton products; Enter opened `/products?q=cot`.
- Homepage product and supplier destinations loaded successfully.
- About, support, trust, privacy, and terms pages rendered their expected headings.
- Existing homepage/live-search suite: 47 passed, one failed out of 48. Failure: search immediately after category navigation reached `/products` without the query. Three isolated reruns passed. Treat as intermittent and unresolved.
- Fixture tests covered loading, retry/empty states, curation, hidden listings, image fallback, favorites/login, paused supplier registration, keyboard navigation, locale widths, and search behavior. Fixtures did not modify cloud data.
- No Lighthouse, production performance, payment/order, or full accessibility certification was performed in this homepage design review.

## Evidence

- `artifacts/home-review-20261018/live-audit.json`
- `artifacts/home-review-20261018/live-navigation.json`
- Full-page screenshots: `artifacts/home-review-20261018/{en,bn}-{320,390,768,1440}.png`
- Focused desktop/mobile screenshots are stored alongside them.
