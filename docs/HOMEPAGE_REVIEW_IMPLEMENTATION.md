# Homepage review implementation — 18 October 2026

This follows the original design review and the mobile homepage update. React/Vite continues locally against the existing hosted Supabase project. No cloud writes, migrations, deployments, or homepage publication were performed.

| Review priority | Implementation/status |
| --- | --- |
| Product imagery and launch catalog | The default lifestyle hero is replaced by an original 3.2 KB warehouse/carton SVG. Custom published CMS imagery still takes precedence, with an honest illustration fallback. Explicitly seeded demo listings now produce a bilingual fictional-catalog disclosure. Supplier photo editing explains exact-item/angle/variant photography. `npm run check:launch` reads public catalog projections and returns nonzero if explicitly marked demo listings/test suppliers remain public. Exact-item photographs and real inventory still require supplier-provided assets/records; existing demo product images were not replaced or presented as real photography. |
| Earlier mobile discovery | Completed in the preceding mobile update: compact hero/categories and section-heading links. At 390px the English featured section begins around y=796 instead of y=902. |
| Card density and supplier context | Completed in the mobile update: shorter covers, tighter spacing, two-line supplier labels, and 44px supplier links without partially clipped third lines. |
| Bangla copy | Translated full and compact section links; new hero descriptions, demo disclosure, and supplier photography instructions are centralized in the existing translation system. |
| Secondary touch targets | Category labels, footer text/links, supplier links, and hero/section controls improved in the mobile update; phone checks include visible control heights and actual element bounds. |
| Category-to-search race | Reproduced reliably by delaying the lazy category route: a newly typed query was erased on commit. Search now preserves focused, unsubmitted input during ordinary navigation. Back/Forward navigation still restores the URL query. Route synchronization happens before paint. |

## Validation

- Homepage/search browser suite: **58 passed** across desktop and mobile projects.
- CMS/operations browser suite: **10 passed**, including private drafts, preview/publication fixtures and staff/buyer restrictions. Browser-only fixtures did not publish to cloud.
- Focused delayed-navigation/history tests: eight repeated desktop/mobile checks passed after the fix. The deterministic delayed-navigation test failed against the old implementation.
- **51 unit tests**, TypeScript, ESLint, production build, and whitespace checks passed.
- Live guest screenshots: English/Bangla at 320, 360, 390, 430, 768, and 1440px, no horizontal overflow or JavaScript page errors, all four product images loaded. Evidence: `artifacts/home-review-improvements/`.
- The read-only launch check correctly returns nonzero for the current development catalog: **four demo listings and two test suppliers** are public. Only one of those suppliers appears in the verified homepage section.

## Before real launch

Run `npm run check:launch` against the intended hosted project. Use existing authorized supplier/admin workflows to archive demo products and suspend designated test supplier accounts while preserving their order/conversation history. Add real supplier inventory with exact-item photographs and review it through normal moderation. Human review of photo authenticity remains necessary; the command detects explicit demo markers and is not an authenticity service or an automatic deployment hook.

The local testing catalog remains available deliberately. No verification badge, listing approval state, account status, or test credential was changed by this work.
