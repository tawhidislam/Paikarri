# Paikari architecture

React + Vite SPA with React Router and TanStack Query. Supabase CLI manages cloud migrations and functions. Supabase Cloud is the only persistent backend. Browser clients use the publishable key and authenticated JWT with PKCE, preserving RLS. SQL RPCs authorize privileged operations in the database. Secret keys are reserved for explicit operator scripts, never app requests.

## Structure

- src/pages: catalog, suppliers, auth callbacks, protected dashboard routes
- src/components: shared accessible components and interactive forms
- src/lib: validation, localization, location data, Supabase client and typed data access
- supabase/migrations: ordered schema, constraints, RLS, storage and transactional RPCs
- supabase/tests: remote SQL authorization tests, rollback after execution
- tests: automated unit and browser smoke tests

## Data model

Auth users have one private profile. Roles (buyer, supplier, admin) live in a separate table with no user writes. A supplier owns one business. Safe public business data is separate from verification documents and private contact/profile details. Products belong to businesses and categories; images and quantity tiers are children. Favorites and saved suppliers belong to buyers. Quotations connect buyers to products and businesses; responses belong to the receiving supplier. Conversations have fixed buyer/supplier participants and append-only messages. Moderator feedback is stored separately in product_moderation_notes, readable only by the listing owner and admins. Reports are private to authors and admins. Audit logs are written by privileged moderation functions.

## Authorization

RLS is enabled on every table. Security-definer helpers have fixed search_path and limited grants. Admin status is read from user_roles. Supplier content edits reset approval; published images use an approval-gated storage SELECT policy. Product image bucket is private despite the public browsing requirement: approved images are anonymously retrievable through the RLS-protected storage API and short-lived signed URLs. A public bucket would bypass RLS for public object URLs and leak unapproved assets. Business documents are always private. Forms validate with Zod; database constraints, RLS and RPCs repeat authorization and structural validation. Database locks serialize inquiry limits across Vercel instances.

## Phases and checks

1. Foundation: dependencies, PKCE session lifecycle, auth, database types and SQL. Check typecheck and schema authorization tests.
2. Public marketplace: responsive home, search/filter/pagination, product and business pages. Check browser routes and empty/error states.
3. Supplier: business profile, product CRUD, images/tiers and verification. Check ownership and moderation transitions.
4. Buyer: favorites, saved suppliers, quotations and realtime messaging. Check participant isolation and rate limits.
5. Admin: users, verification, listings, categories, reports and audit. Check non-admin denial.
6. Production: lint/build/unit/browser checks, cloud integration checklist, Vercel instructions.

No orders, checkout, payments, logistics, subscriptions, ads or recommendations are included. Add these as separate bounded modules after core acceptance.

## External prerequisites

A Supabase Cloud project and credentials are required for live acceptance. No local Supabase, Docker or PostgreSQL will be started. Versioned migration files are included for review; apply only to the intended linked hosted project. Never run destructive remote SQL without explicit confirmation. Vercel deployment requires an account/project and environment settings.

## Revised stack

User chose React + Vite instead of Next.js. NEXT_PUBLIC_* variables are replaced by VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY. @supabase/ssr is unnecessary for a browser SPA. Private dashboards use client route guards for navigation and database RLS/RPC checks for actual authorization. SEO is limited to static metadata plus per-route head updates; full crawler-rendered product metadata would require prerendering/SSR in a later deployment layer.
