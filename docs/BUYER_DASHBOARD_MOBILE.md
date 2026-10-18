# Buyer workspace on mobile

At 800px and below, the buyer workspace uses a compact 64px brand header, a neutral page background, and consistent dashboard navigation across its routes. Public marketplace search and the promotional strip are hidden inside this workspace. The global menu and brand link still provide marketplace access. Supplier and administrator layouts retain their existing navigation.

Overview, Orders, Cart and Messages have readable 12px labels, icon-over-label presentation, stronger contrast and comfortable touch targets. Menu opens a grouped native-dialog bottom sheet with account identity, Buying, Saved & sourcing, Messages & account, supplier registration, Help and sign-out. The original shortcut row stays in place and the background does not expand or shift. Escape, the close control and backdrop dismiss it and restore focus; navigation also closes it. The sheet locks background scrolling, cycles keyboard focus, scrolls its own body on short screens, and closes when resizing back to desktop. The unread badge stays in its own corner rather than displacing the Messages label.

The overview leads with a short bilingual heading and Orders/Cart actions. Four linked summary cards follow, with actual database-backed counts, localized numerals, decorative icons, loading skeletons, error/retry behavior and their existing authorized destinations. At 390×844px, both primary actions and all four summaries fit above the bottom of the viewport in English and Bangla. The sourcing invitation and privacy note use readable text and contrast. No dashboard counts or claims are invented.

Mobile account forms keep 16px inputs and at least 44px controls; file inputs and quotation cards stay within narrow layouts. The floating chat launcher stays hidden in the buyer workspace because Messages is directly available in navigation. Receipt printing excludes mobile navigation and actions.

Implementation: `src/pages/dashboard.tsx`, `src/pages/buyer-dashboard.css`, `src/components/buyer-workspace-menu.tsx` and its stylesheet; centralized copy in `src/lib/copy.ts`. Order-specific duplicate workspace navigation styles were removed from `src/pages/buyer-orders-phone.css` so every buyer route uses the same mobile navigation. No database or authentication changes are required.

Validation:

- `tests/e2e/buyer-dashboard-mobile.spec.ts`: 320/390/768/1440px in English/Bangla, compact header, primary-action order, summary visibility, menu links, keyboard dismissal/focus, Cart access, account forms, supplier navigation, loading skeletons, real count-shaped responses, query retry and Orders navigation.
- Buyer order and long-card/filter suites check the shared navigation change against existing order layouts and supplier/admin boundaries.
- Customer chat and receipt tests cover messaging and print isolation.

Browser fixtures are synthetic and isolated. Any live checks use the saved test buyer for read-only access; no real orders, profiles or messages are edited.

Release verification: the dashboard/order/filter layout run passed nine browser cases with three duplicate matrix checks skipped. Customer-chat and receipt regressions passed; the summary loading/recovery test passed on both browser projects after its synthetic HEAD response was configured with Supabase-style exposed count headers and a non-retryable SDK error. Type checking, lint and 51 unit tests passed. Eight live read-only checks covered the overview in both rendered languages at 320/390/768px plus settings/orders entry pages: no overflow or JavaScript errors. At 390px the summaries ended at 768px in both languages. Evidence: `artifacts/user-dashboard-mobile-live-check.json`, `artifacts/user-dashboard-mobile-live-en.png` and `artifacts/user-dashboard-mobile-live-bn.png`.

Menu acceptance: `tests/e2e/workspace-menu.spec.ts` checks 320×568, 390×844 and 768×900px in both languages, link coverage, focus cycling/restoration, Escape, backdrop dismissal, settings navigation, desktop resize, and local sign-out/scroll cleanup with both successful and failing remote logout responses. Browser sign-out tests use synthetic sessions and intercepted Auth endpoints; no live account is signed out. Native dialog content is explicitly excluded from print output.

Menu release checks: 19 browser regressions passed with three duplicated viewport/PDF cases skipped. The six live read-only menu checks passed in English/Bangla at 320×568, 390×844 and 768×900px: sheet bounds, no horizontal overflow, background scroll lock and restoration, and no JavaScript errors. Live checks never clicked sign-out. Evidence: `artifacts/workspace-menu-live-check.json`, `artifacts/workspace-menu-live-en.png`, `artifacts/workspace-menu-live-bn.png`. Type checking, lint and 51 unit tests passed.
