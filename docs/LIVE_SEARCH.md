# Live catalog search

The shared marketplace header (including the homepage) now suggests real products and categories as visitors type. It waits 250 ms after input settles and requires two characters. English and Bangla prefixes work, including multiple words; supplier names and category names can also find products. This is prefix/substring search, not typo correction.

Suggestions include up to six products with image, supplier, BDT price, unit and MOQ, plus up to four populated categories. Exact product names rank first, followed by name prefixes, name tokens, and other matches. Enter submits the full search unless a suggestion is selected; arrow keys select, Escape dismisses, and clearing the input resets suggestions. Composition input waits until completion. The existing catalog filters and pagination remain available on the results page.

`src/components/live-search.tsx` owns the accessible combobox, debounce, mobile dropdown and loading/error/empty states. TanStack Query caches matching suggestions for 15 seconds, forwards request cancellation and prevents earlier queries from appearing under newly typed input. Queries are not saved to browser storage. Bangla interface copy lives in `src/lib/search-copy.ts`.

`public.search_suggestions(keyword)` is a read-only, RLS-respecting Cloud RPC. Its response contains only safe catalog presentation fields; it explicitly excludes pending listings and suspended suppliers even for administrators. Category suggestions require an eligible listing. Signed image access retains the existing five-minute maximum. No secret keys or private supplier details are used. Empty/one-character queries return no suggestions; API input over 160 characters is rejected. PostgreSQL normalizes lexemes before adding prefix operators; user text is never interpolated into SQL.

Migrations 29 and 30 are additive and applied through the linked Supabase CLI. Database types were regenerated from Cloud. No Docker or local database is required. For another linked Cloud project, apply pending migrations with `supabase db push --linked`, then run `npm run db:types`.

Validation:

- `npm run typecheck`, `npm run lint`, `npm test`
- `npx playwright test tests/e2e/live-search.spec.ts tests/e2e/homepage.spec.ts tests/e2e/marketplace.spec.ts`
- `supabase db query --linked --file supabase/tests/live_catalog_search.sql` (synthetic fixtures, transaction always rolls back)

The SQL suite covers English/Bangla partial matching, supplier/category matching, input limits, literal wildcard/query syntax, ranking, preserved filters, bounded responses, and catalog visibility for anonymous and administrative callers. Browser checks cover keyboard/touch navigation, debounce, delayed responses, errors/retry, composition input, safe text rendering and a 320px Bangla layout.
