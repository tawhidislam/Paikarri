# Homepage redesign — 2026-10-17

The homepage now uses a forest-green and warm-neutral composition, with a compact lead-in to real inventory. The work is local React/Vite UI work against the existing Supabase Cloud project; no database migration, CMS publication, seed changes or deployment is included.

## What changed

- Homepage-specific header/search styling and a framed green hero with stronger type, editorial photographs and clear sourcing actions. The tablet hero has its own layout; phone layouts prioritize copy and category access.
- Compact category tiles from real database categories, preserving CMS order and destination links. Duplicate category chips and static keyword suggestions were removed.
- Clearer product sections with consistent spacing and the existing minimal product cards, quantity information, favorites and chat controls.
- A supplier feature that pairs verification context with real eligible suppliers. A single supplier fills the designed feature area instead of occupying one cell of an otherwise empty three-column row. The owner identity, trade-licence and bank labels describe the existing manual verification process.
- A connected three-step sourcing guide reflecting current ordering: discover products, review suppliers, and agree delivery/order terms.
- A warm supplier invitation and a green footer with a clear supplier-discovery link, existing support contacts and policies.
- Central English/Bangla copy, localized guide numbering, stronger supporting-text contrast, visible keyboard focus and reduced-motion support.

## Data and existing behavior

Public catalog projections, bounded queries, CMS product/category/supplier selection, approved-listing and active-supplier enforcement, and distinct arrival selection are unchanged. Loading, retry, empty and image-failure states remain separate. CMS hero images retain their private publication eligibility, signed-URL refresh and loading/fallback handling. Supplier invitations still respect paused registration and existing supplier access.

The homepage header/footer styling is route-scoped. The shared supplier card retains its directory/saved-supplier functionality. Product cards, authentication, chat, cart and order APIs are unchanged.

## Checks

- 32 homepage browser checks plus 10 CMS/operations checks passed across desktop/mobile.
- After spacing/readability refinements, all 54 homepage/marketplace/chat browser checks passed, including search, category navigation, favorites, login redirects, image failure, real hosted catalog reads and English/Bangla layouts at 320, 390, 768 and 1440 pixels.
- 42 unit tests, TypeScript, ESLint and the production build passed.
- Live cloud-data screenshots were reviewed at desktop/tablet/phone sizes, including Bangla. No browser errors or page-wide horizontal overflow appeared. Final previews are stored in `artifacts/homepage-redesign-*.png`.
- Browser fixtures are test-only. Public UI continues to use the hosted catalog, not synthetic responses.
