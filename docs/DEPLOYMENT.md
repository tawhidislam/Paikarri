# Cloud setup and launch

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

## 4. Bootstrap an admin

Create and verify the intended account through the application, then find the Auth user ID in the Supabase dashboard. As a trusted project operator, run in SQL Editor:

```sql
-- Replace the UUID only after verifying the intended account.
update public.user_roles set role = 'admin' where user_id = 'YOUR_VERIFIED_USER_UUID';
```

Do not use `raw_user_meta_data` for authorization. Sign out and back in, or reload the dashboard so the role query refreshes. There is deliberately no unauthenticated bootstrap endpoint or automatic first-user admin assignment.

## 5. Storage

Migrations create:

| Bucket             | Access                                                                                      | Limits              |
| ------------------ | ------------------------------------------------------------------------------------------- | ------------------- |
| product-images     | Private bucket; approved objects have anonymous RLS SELECT, signed URLs expire in 5 minutes | JPEG/PNG/WebP, 5 MB |
| business-documents | Owner and admin reviewer only                                                               | PDF/JPEG/PNG, 10 MB |
| avatars            | Account owner only                                                                          | JPEG/PNG/WebP, 2 MB |

A public Supabase bucket bypasses object RLS for public URLs, so making `product-images` public would expose pending assets. Keep the bucket private. Approved images are still guest-viewable through signed URLs. Previously issued signed URLs can remain valid until their five-minute expiry after unpublishing; use shorter TTLs or an authenticated image proxy if immediate revocation becomes a requirement. Documents and avatars also use short-lived signed retrieval.

Uploads use UUID filenames under the authenticated user's path, never a user-supplied filename. Bucket MIME/size restrictions are repeated in client validation. There is no overwrite permission for reviewed product objects. For malware scanning of documents or strict binary content inspection, add a quarantined upload/scanning pipeline before enabling broader document formats.

## 6. Realtime

The messages table is added to `supabase_realtime` by migration. Confirm it is enabled in the dashboard publication settings. RLS restricts rows to conversation participants. The browser subscribes to the selected thread and invalidates its query on insert; it also polls periodically as a connection fallback. The UI loads the latest 200 messages per thread. Add older-message pagination before high-volume operation.

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

Select Vite, build `npm run build`, output `dist`. `vercel.json` includes SPA rewrites and response security headers. Configure environment variables separately for preview/production, preferably using a separate staging Supabase project for preview. No secret/service-role key is required in Vercel for this release. Set the production origin in both Vercel environment and Supabase Auth before final verification.

The build writes `robots.txt` and `sitemap.xml` from public approved products. Rebuild after catalog changes to refresh the sitemap. Static page metadata and client JSON-LD are included. SPA pages do not provide full server-rendered product metadata to non-JavaScript crawlers; add a prerender service if that is a launch requirement.

## 8. Acceptance and operations

Run the checks in README and the SQL authorization test file. It runs inside a transaction and rolls back all fixtures. Do not run tests that rely on existing real user data. Confirm at least two independent suppliers and a buyer cannot cross-access private resources through direct REST calls.

Before public launch:

- Set a production domain, Auth redirects, SMTP and a verified admin.
- Complete an actual email signup/confirmation/recovery journey.
- Finalize the operator identity, support contact, legal terms, privacy basis and retention schedule. Policy pages are explicitly marked launch drafts.
- Replace or approve editorial stock photography as appropriate for the brand.
- Review Bangla copy with a native business user; localize legal/support pages for the launch audience.
- Review Supabase security/performance advisors, backup/PITR plan and monitoring appropriate to the selected plan.
- Configure provider spending and abuse limits, and document incident/support ownership.
- Remove/archive any explicitly fictional development seed listings before launch.

This release intentionally has no checkout, payments, logistics, paid subscriptions or advertisements.
