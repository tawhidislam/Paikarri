# Paikarii.com architecture

React + Vite SPA with React Router and TanStack Query. Supabase CLI manages cloud migrations and functions. Supabase Cloud is the only persistent backend. Browser clients use the publishable key and authenticated JWT with PKCE, preserving RLS. SQL RPCs authorize privileged operations in the database. Secret keys are reserved for explicit operator scripts, never app requests.

## Structure

- src/pages: catalog, suppliers, auth callbacks, protected dashboard routes
- src/components: shared accessible components and interactive forms
- src/lib: validation, localization, location data, Supabase client and typed data access
- supabase/migrations: ordered schema, constraints, RLS, storage and transactional RPCs
- supabase/tests: remote SQL authorization tests, rollback after execution
- tests: automated unit and browser smoke tests

## Data model

Auth users have one private profile. Roles (buyer, supplier, admin, super_admin) live in a separate table with no user writes. A supplier owns one business. Safe public business data is separate from verification documents and private contact/profile details. Products belong to businesses and categories; images and quantity tiers are children. Favorites and saved suppliers belong to buyers. Quotations connect buyers to products and businesses; responses belong to the receiving supplier. Conversations have fixed buyer/supplier participants and append-only messages. Moderator feedback is stored separately in product_moderation_notes, readable only by the listing owner and admins. Reports are private to authors and admins. Account status and public platform settings are separate protected records. Transactional triggers capture privileged before/after changes, and moderation RPCs retain decision notes. The dedicated /admin shell is separate from buyer/supplier workspaces.

## Authorization

RLS is enabled on every table. Security-definer helpers have fixed search_path and limited grants. Admin status is read from user_roles; super_admin alone controls staff, accounts, categories and settings. Suspension is enforced in RLS, storage policies and write triggers, while participant-only historical context preserves existing follow-up. Supplier content edits reset approval; published images use an approval-gated storage SELECT policy. Product image bucket is private despite the public browsing requirement: approved images are anonymously retrievable through the RLS-protected storage API and short-lived signed URLs. A public bucket would bypass RLS for public object URLs and leak unapproved assets. Business documents are always private. Forms validate with Zod; database constraints, RLS and RPCs repeat authorization and structural validation. Database locks serialize inquiry limits across Vercel instances.

## Phases and checks

1. Foundation: dependencies, PKCE session lifecycle, auth, database types and SQL. Check typecheck and schema authorization tests.
2. Public marketplace: responsive home, search/filter/pagination, product and business pages. Check browser routes and empty/error states.
3. Supplier: business profile, product CRUD, images/tiers and verification. Check ownership and moderation transitions.
4. Buyer: favorites, saved suppliers, quotations and realtime messaging. Check participant isolation and rate limits.
5. Admin: users, verification, listings, categories, reports and audit. Check non-admin denial.
6. Production: lint/build/unit/browser checks, cloud integration checklist, Vercel instructions.

Wholesale ordering is a separate module: database cart, atomic supplier-split checkout, stock reservations, confirmation/fulfilment, manual COD/bank verification, disputes, returns and refund records. Online payment collection, integrated logistics, subscriptions, ads and recommendations remain separate future modules. See [WHOLESALE_ORDERS.md](WHOLESALE_ORDERS.md).

## External prerequisites

A Supabase Cloud project and credentials are required for live acceptance. No local Supabase, Docker or PostgreSQL will be started. Versioned migration files are included for review; apply only to the intended linked hosted project. Never run destructive remote SQL without explicit confirmation. Vercel deployment requires an account/project and environment settings.

## Revised stack

User chose React + Vite instead of Next.js. NEXT_PUBLIC_* variables are replaced by VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY. @supabase/ssr is unnecessary for a browser SPA. Private dashboards use client route guards for navigation and database RLS/RPC checks for actual authorization. SEO is limited to static metadata plus per-route head updates; full crawler-rendered product metadata would require prerendering/SSR in a later deployment layer.

See [ADMIN_CONSOLE.md](ADMIN_CONSOLE.md) for the full permission matrix, management RPCs, owner bootstrap, suspension behavior and operations guide.

## Content and notification operations

`homepage_content` stores owner-only draft/published JSON with optimistic revision checks. A narrow public RPC exposes only the published copy and currently eligible curated identifiers. Marketing assets use a private bucket and a published-path predicate. Homepage audit snapshots are owner-only through RLS and the definer audit RPC.

`notifications` is recipient-readable and client-immutable. Guarded RPCs update only read state, while transactional triggers generate review, account/access and quotation alerts. The private supplier onboarding view projects explicit Auth email fields and aggregated milestones into an admin-authorized, paginated RPC. Individual reminder templates enforce per-operator rate limits and per-recipient/template deduplication under a recipient role-row lock. No outbound email/SMS transport or bulk broadcasts are included.

The complete supplier-verification module uses normalized `verification_applications`, `verification_identity`, `verification_trade_license`, `verification_bank`, `verification_files`, and immutable `verification_reviews`. Supplier-owned draft RPCs and super-admin-only review RPCs enforce revision checks and transactional business locks. Staff receive safe progress only. Catalog/CMS eligibility checks the current approved application, Bangladesh expiry date and active account. Hosted Cron reconciles persisted expiry state every minute; see [verification architecture and operation](SUPPLIER_VERIFICATION.md).

Super-admin conversation oversight uses separate database-authorized monitoring RPCs; participant conversation/message RLS remains unchanged. An audited opening returns a review reference required by cursor-paginated history and visible-page polling. Message content is absent from list previews and audit snapshots; staff cannot access monitoring or its audit events. See [Conversation monitoring](CONVERSATION_MONITORING.md).

Supplier operations use super-admin-only aggregate/workspace RPCs and separate supplier-owned warning response RPCs. Notes and labels are private, warning events append-only, stale writes version-checked, and generic notifications contain no operational bodies. Overdue deadlines do not change account status. See [Supplier operations](SUPPLIER_MANAGEMENT.md).

Participant chat uses database-authorized `chat_*` RPCs, sender-scoped retry IDs, server-generated product snapshots, and a private read-cursor table. Table RLS remains participant-only; super-admin product-context review continues through separately audited monitoring RPCs. The marketplace pop-up and full inbox share one panel and in-memory per-account drafts. Read-state/message Realtime events trigger scoped queries, with visible-page polling as fallback. See [Customer chat](CUSTOMER_CHAT.md).

Order UI lives in `src/pages/orders.tsx` with reusable purchase/cart entry points in `src/components/order-purchase.tsx`. `src/lib/order-schema.ts` validates interfaces; `src/lib/orders.ts` uses generated Supabase RPC types. Migration 21 owns the transactional order state machine and RLS.
