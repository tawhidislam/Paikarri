# Cloud setup and launch

For the current GitHub-to-Vercel import checklist, use [Vercel publishing](VERCEL_PUBLISH.md). That guide covers the complete source release, required variables and launch status.

## Runtime model

The frontend is a React + Vite single-page application on Vercel. Supabase Cloud handles PostgreSQL, Auth, Storage, Realtime and secured database RPCs. There is no application server secret in the frontend and no local Supabase stack. Since the selected frontend is a SPA, `@supabase/ssr`, Next.js server clients and cookie middleware do not apply. Browser PKCE sessions are persistent; RLS and database functions provide server-side authorization independently of route guards.

## 1. Hosted project and migrations

The workspace was linked to `zhllnfciehxmjahljrhb` after the user identified a new project. Double-check the project before every remote operation.

```sh
supabase login
supabase projects list
supabase link --project-ref YOUR_PROJECT_REF
supabase migration list --linked
supabase db push --linked --dry-run
supabase db push --linked
```

The initial migration is additive and assumes no existing marketplace tables. It creates a private authorization schema, application tables, indexes, ownership helpers, RLS, storage policies, triggers and RPCs. Subsequent migrations add atomic product editing, filtered catalog queries, category audit logging and reference taxonomy. Never repair migration history or reset a remote database casually. Review destructive statements with the owner and obtain confirmation before applying them.

`supabase db query --linked --file FILE.sql` is supported by the installed CLI and executes through the Management API. This avoids Docker and local database services. Older CLI releases can apply the same SQL in Supabase Cloud SQL Editor, but record migrations consistently. `db pull`, `db diff`, and dumps may require container tooling; they are unnecessary for this workflow.

Regenerate types after schema changes:

```sh
npm run db:types
# Regenerates database.types.ts safely; models.ts contains local Row aliases.
```

## 2. Environment

Copy `.env.example` to `.env.local` and set:

- `VITE_SUPABASE_URL`: hosted HTTPS URL.
- `VITE_SUPABASE_PUBLISHABLE_KEY`: publishable API key from the cloud project Connect dialog. Legacy anon keys work, but prefer a publishable key.
- `VITE_SITE_URL`: production HTTPS origin, or `http://localhost:5173` for development.

Only VITE-prefixed variables are bundled. `SUPABASE_SECRET_KEY`, `SUPABASE_ACCESS_TOKEN`, and `SUPABASE_DB_PASSWORD` are optional operator credentials and must **never** have a VITE prefix. The application itself does not need them. Do not put secrets in Vercel client configuration, source files, screenshots or issue reports. Supabase CLI login credentials stay outside the repository.

## 3. Authentication dashboard

Local-development Auth URLs are already configured for this workspace. In Supabase Cloud → Authentication, verify or change the following before production:

1. Enable email/password and email confirmation. Disable anonymous signup unless explicitly needed later.
2. Set Site URL to the production Vercel/custom origin.
3. Allow exact redirect URLs for `https://YOUR_DOMAIN/auth/callback` and `https://YOUR_DOMAIN/auth/reset`. Also allow `http://localhost:5173/auth/callback` and `/auth/reset` on the development origin. Use tightly scoped preview URLs rather than a broad wildcard for production.
4. Configure custom SMTP with a verified sender domain. The default mail service is limited and unsuitable for a marketplace launch. Test signup verification and recovery with an actual inbox.
5. Keep signup, login and email rate limits enabled; configure CAPTCHA for public signup if abuse requires it. The app's database inquiry limits are separate from Auth limits.
6. Keep email templates compatible with PKCE redirects. The default confirmation/recovery links use Supabase's verification endpoint and redirect back with an authorization code; the browser client detects and exchanges it.
7. Use strong password settings and review Auth logs before launch. Confirm email verification, sign-out, refresh and reset flows on the production origin.

Every signup starts as a buyer, regardless of metadata. Suppliers explicitly call `register_supplier()` from their dashboard. Admin roles cannot be self-assigned.

## 4. Platform owner and staff

The linked project's verified account `mdtawhid1318@gmail.com` is promoted to `super_admin` by the guarded migration `20261016000900_bootstrap_platform_owner.sql`. Use its existing password at `/admin/login`. No default password exists. Staff retains the `admin` role; the owner grants/revokes staff access through the dedicated console after verifying the intended buyer account.

The owner bootstrap is project-specific: another hosted project requires an explicitly selected, verified owner and a reviewed bootstrap UUID/email guard. Apply the foundation/console schema first, register/verify that account, and establish its operator-approved administrator role before the guarded owner promotion. Do not run this project's identity bootstrap blindly on another project. Runtime authorization uses database UUID/role records and never email matching or signup metadata.

See [ADMIN_CONSOLE.md](ADMIN_CONSOLE.md) for account controls and the permission matrix. Role/status views refresh every 15 seconds and on focus; database enforcement is immediate. Do not assign roles through user-editable metadata or introduce a public bootstrap endpoint.

## 5. Storage

Migrations create:

| Bucket             | Access                                                                                      | Limits              |
| ------------------ | ------------------------------------------------------------------------------------------- | ------------------- |
| product-images     | Private bucket; approved objects have anonymous RLS SELECT, signed URLs expire in 5 minutes | JPEG/PNG/WebP, 5 MB |
| business-documents | Owner and super-admin reviewer only                                                         | PDF/JPEG/PNG, 10 MB |
| avatars            | Account owner only                                                                          | JPEG/PNG/WebP, 2 MB |

A public Supabase bucket bypasses object RLS for public URLs, so making `product-images` public would expose pending assets. Keep the bucket private. Approved images are still guest-viewable through signed URLs. Previously issued signed URLs can remain valid until their five-minute expiry after unpublishing; use shorter TTLs or an authenticated image proxy if immediate revocation becomes a requirement. Documents and avatars also use short-lived signed retrieval.

Uploads use UUID filenames under the authenticated user's path, never a user-supplied filename. Bucket MIME/size restrictions are repeated in client validation. There is no overwrite permission for reviewed product objects. For malware scanning of documents or strict binary content inspection, add a quarantined upload/scanning pipeline before enabling broader document formats.

## 6. Realtime

The messages table is added to `supabase_realtime` by migration. Confirm it is enabled in the dashboard publication settings. RLS restricts rows to conversation participants. The browser subscribes to the selected thread and invalidates its query on insert; it also polls periodically as a connection fallback. The UI loads the latest 50 messages, uses cursor pagination for older history, and polls as a Realtime fallback.

## 7. Vercel

Import this repository into Vercel or deploy using an authenticated Vercel CLI:

```sh
npx vercel login
npx vercel link
npx vercel env add VITE_SUPABASE_URL
npx vercel env add VITE_SUPABASE_PUBLISHABLE_KEY
npx vercel env add VITE_SITE_URL
npx vercel --prod
```

Select Vite, Node 22.x, install `npm ci`, build `npm run build`, output `dist`. `vercel.json` includes SPA rewrites and response security headers. Configure environment variables separately for preview/production, preferably using a separate staging Supabase project for preview. No secret/service-role key is required in Vercel for this release. Set the production origin in both Vercel environment and Supabase Auth before final verification.

The build writes `robots.txt` and `sitemap.xml` from public approved products. Rebuild after catalog changes to refresh the sitemap. Product/supplier detail pages receive anonymous server-rendered metadata/content from the bundled Vercel catalog function, with JSON-LD and no-store eligibility checks. Other routes render through the SPA.

## 8. Acceptance and operations

Run the checks in README and the SQL authorization test file. It runs inside a transaction and rolls back all fixtures. Do not run tests that rely on existing real user data. Confirm at least two independent suppliers and a buyer cannot cross-access private resources through direct REST calls.

Before public launch:

- Set a production domain, Auth redirects, SMTP and the verified platform owner.
- Complete an actual email signup/confirmation/recovery journey.
- Finalize the operator identity, support contact, legal terms, privacy basis and retention schedule. Policy pages are explicitly marked launch drafts.
- Replace or approve editorial stock photography as appropriate for the brand.
- Review Bangla copy with a native business user; localize legal/support pages for the launch audience.
- Review Supabase security/performance advisors, backup/PITR plan and monitoring appropriate to the selected plan.
- Configure provider spending and abuse limits, and document incident/support ownership.
- Remove/archive any explicitly fictional development seed listings before launch.

Order requests and fulfilment are available with COD/manual bank verification. Online payment collection, integrated courier APIs, paid subscriptions and advertisements remain unconfigured.

## Homepage and notification operations

Apply migrations 12/13 to add the private `marketing-assets` bucket (JPEG/PNG/WebP, 5 MB), owner-only homepage drafts/publication, private recipient notifications, onboarding aggregates and reminder limits. Marketing images are publicly signable only while referenced by published content; no public bucket flag is enabled. Homepage audit snapshots remain super-admin-only. No SMTP changes are needed for this in-app notification release. See [ADMIN_RELEASE_2.md](ADMIN_RELEASE_2.md) for the exact routes, policies and verification workflow.

Supplier verification requires migrations 14–16, including hosted `pg_cron`. After applying them, regenerate types with `npm run db:types` and check the named Cron job and its run history as described in [Supplier verification](SUPPLIER_VERIFICATION.md). Existing linked-cloud operation continues without Docker or local PostgreSQL. No frontend production deployment was performed for this release.

Supplier management requires migration 18 and regenerated database types. It adds private operational records, supplier-owned corrective responses, audited super-admin controls, and renewal reminders without additional Cron or SMTP setup. See [Supplier operations](SUPPLIER_MANAGEMENT.md). Warning deadlines do not automatically suspend accounts. This release was applied to the linked cloud backend for local use; no production frontend deployment was performed.

Customer chat requires migration 20 and regenerated database types. The migration adds private participant read states to the existing Realtime publication and safe product-context/idempotent messaging RPCs. No new bucket, SMTP service, service-role browser key, local database, or Docker setup is required. See [Customer chat](CUSTOMER_CHAT.md). Existing incoming history is initially unread until its participant opens/marks the conversation read.

Wholesale ordering requires migration 21, regenerated database types and the existing hosted Cron extension. Verify the five-minute `paikari-order-expiry` job. COD/bank payments and refunds are external; no gateway keys are needed. See [Wholesale orders](WHOLESALE_ORDERS.md) for rollout, stock semantics, authorization, expiry, returns and recovery.

Private compressed chat images require migration 35 and the `chat-image` Edge Function. See [Chat images](CHAT_IMAGES.md). Optional abandoned-upload cleanup remains a server maintenance task.
