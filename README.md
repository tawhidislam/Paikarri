# Paikarii.com — Bangladesh, in business.

A Bangladesh B2B wholesale marketplace built with **React + Vite, TypeScript, Tailwind CSS v4, shadcn-style UI, Supabase Cloud, React Router, TanStack Query, React Hook Form and Zod**. The user selected React + Vite in place of the original Next.js request. Supabase CLI manages the hosted backend. No Docker, local PostgreSQL, or local Supabase stack is used.

## Run

```sh
npm install
cp .env.example .env.local
# Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY from Supabase Cloud.
npm run dev
```

Only `VITE_` variables enter the browser bundle. Never put a secret/service-role key in a `VITE_` variable. `.env.local` is ignored by Git. The connected project URL and public key are already configured for this workspace.

## Cloud backend

```sh
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push --linked --dry-run
supabase db push --linked
supabase db query --linked --file supabase/tests/authorization.sql
```

Read [deployment instructions](docs/DEPLOYMENT.md) and [architecture](docs/ARCHITECTURE.md). The CLI can work directly with the hosted project. Do not use `supabase start`, `supabase db reset`, or any command targeting a local database. Review and confirm destructive remote changes before executing them.

## Features

- Responsive catalog, English/Bangla navigation and homepage, BDT formatting, all 64 districts, PostgreSQL full-text search, URL filters, sorting and pagination.
- Supabase email/password authentication, confirmation callback, password recovery, persistent PKCE sessions and role-based workspaces.
- Supplier business profile, transactional product/tier management, image uploads, private verification documents and inquiry responses.
- Buyer favorites, saved suppliers, quotations and participant-only realtime messaging.
- Dedicated `/admin` console with super-admin/staff permissions, account suspension, private verification review, all-image product moderation, categories, reports, staff access, platform settings and audit history. See [console guide](docs/ADMIN_CONSOLE.md).
- RLS on every application table, private storage policies, upload bounds and database-backed inquiry limits.
- Route-level code splitting, loading/error states, keyboard-accessible controls, JSON-LD product data and build-generated sitemap.

The live catalog reads only Supabase data. An empty database displays a real empty state. The optional seed script creates explicitly fictional businesses and **pending** listings; it never runs during build or migration.

## Checks

```sh
npm run typecheck
npm run lint
npm test
npm run build
npx playwright install chromium --only-shell
npm run test:e2e
supabase db query --linked --file supabase/tests/authorization.sql
```

See [verification report](docs/VERIFICATION.md) for checks actually run and remaining launch requirements. Live account/email acceptance and crawler-rendered product metadata limits are tracked there; do not assume a passing build is production acceptance.

## Example data

For an isolated development cloud project only:

```sh
# Add SUPABASE_SECRET_KEY to .env.local without a VITE_ prefix.
ALLOW_FICTIONAL_SEED=1 npm run seed
```

This creates fictional supplier accounts and pending products, with generated credentials in gitignored `.env.seed-accounts`. Repeated runs create additional fixtures. Admin approval is intentionally separate. Never use fictional suppliers in a production catalog.

## Folder structure

```text
src/
  components/       # Layout, product cards, shared forms, UI primitives
  lib/              # Generated DB types, auth, query layer, validation, locale, locations
  pages/            # Public catalog, auth and protected workspaces
supabase/
  migrations/       # Version-controlled cloud SQL, RLS, storage, RPCs, taxonomy
  tests/            # Transactional hosted authorization assertions (rolled back)
scripts/            # Optional fictional seed and sitemap generation
 tests/             # Input-boundary and browser tests
 docs/              # Architecture, deployment and verification
```

Wholesale cart, checkout requests, supplier fulfilment, COD/manual bank payment records, disputes and full-order returns are implemented. Online payment collection, integrated logistics, subscriptions, advertising and recommendations remain future modules. See [Wholesale orders](docs/WHOLESALE_ORDERS.md).

### Homepage and onboarding operations

The super admin manages bilingual homepage drafts, marketing images, featured selections and explicit publication at `/admin/homepage`. Administrators track supplier milestones at `/admin/onboarding` and review in-app delivery at `/admin/notifications`. Buyer/supplier inboxes are at `/dashboard/notifications`; administrators use `/admin/inbox`. See [release guide](docs/ADMIN_RELEASE_2.md) for permissions, limits, migration and acceptance details.

The refreshed public homepage includes live category navigation, readable bilingual wholesale cards, distinct featured/arrival feeds and resilient images. See the [homepage guide](docs/HOMEPAGE_REFRESH.md) for content behavior and verification.

Three-step supplier verification and super-admin review are documented in [Supplier verification](docs/SUPPLIER_VERIFICATION.md), including private evidence, revisions, expiry/Cron, cloud operation and security tests.

Super-admin-only read-only conversation oversight is available at `/admin/conversations`. See [Conversation monitoring](docs/CONVERSATION_MONITORING.md) for audited access, pagination, privacy notices and cloud operation.

Super-admin supplier activity, private notes/labels, corrective actions, and verification renewals are available under **Supplier management** and **Verification renewals**. See [Supplier operations](docs/SUPPLIER_MANAGEMENT.md) for permissions, supplier responses, and reminder limits.

Buyer–supplier chat now supports product-context messages, floating desktop/mobile chat, unread counts, read receipts, server-side inbox search, complete cursor-paginated history, and retry-safe sending. See [Customer chat](docs/CUSTOMER_CHAT.md) for database authorization, Realtime setup, draft behavior, and release scope.

Product variants, sourcing offers, private customization files, comparison and moderated purchase reviews: [Product buying upgrade](docs/PRODUCT_BUYING_UPGRADE.md).

## Marketplace growth release

See [Platform improvements](docs/PLATFORM_IMPROVEMENTS.md) for tender bidding, quick sourcing requests, shipping estimates, buyer organizations, CSV tools, private search history, financial reports, public catalog HTML, cloud migrations and deferred provider setup. COD/manual bank remain active; no escrow or automated courier/payment provider is configured.
# Paikarri
