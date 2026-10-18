# Homepage mobile layout

Updated 18 October 2026. Local React/Vite application with the existing Supabase Cloud catalog; no database migration or catalog writes.

## Layout

- Compact mobile hero with wrapping, 44px actions and no decorative hero image on phones.
- Six categories in a compact three-column grid, with 12px labels. Category links remain ordinary keyboard-accessible navigation.
- Short translated “View all” links stay beside section headings. Their full accessible labels identify the destination; desktop retains the full visible copy.
- Two product columns from 360px, one below 360px. Phone cards use shorter image proportions, tighter spacing, and two-line supplier names with 44px link targets. Shared desktop and marketplace card styles remain intact.
- Supplier information, sourcing guide, invitation, and footer remain stacked and readable on mobile. Policy/footer controls have 44px minimum heights, and footer labels are larger.
- Existing public catalog filtering, CMS selections, signed-image handling, favorites, search, and supplier-registration availability are preserved.

## Verification

`npx playwright test tests/e2e/homepage.spec.ts tests/e2e/live-search.spec.ts`: **52 passed**.

The suite checks English/Bangla layouts through desktop and mobile browser projects, zero/one/many products, loading/retry/fallback states, favorites, category navigation, paused registration, CMS imagery, and live search. Added six-category checks cover guests and signed-in buyers at 320, 360, 390, and 430px, including actual element bounds, touch-target heights, text sizes, discovery position, and translated labels. Hidden elements are excluded from touch-target measurements.

Typecheck, lint, production build, and all 51 unit tests passed. Live-catalog screenshots and measurements are in `artifacts/home-mobile-upgrade/`, covering both languages at 320, 360, 390, 430, 768, and 1440px. All twelve live combinations had no horizontal overflow or JavaScript page errors, with all four product images loaded. At 390px, the featured-products section moved from approximately y=902 to y=796 in English and y=811 in Bangla.

Final visual review caught and corrected a partial third line in long supplier names: the two-line text clamp now sits inside the 44px link target. The new test checks that name text does not exceed two line heights.

Photographs and fictional demo-business records were not modified. Exact-item photography remains a catalog-content improvement from the preceding design review.
