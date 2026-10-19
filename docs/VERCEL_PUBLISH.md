# Publish Paikarii.com on Vercel

## Repository and project settings

Import **https://github.com/tawhidislam/Paikarri** into Vercel, select branch `main`, and leave the root directory at the repository root.

| Setting   | Value                                  |
| --------- | -------------------------------------- |
| Framework | Vite                                   |
| Node.js   | 22.x (pinned in package.json / .nvmrc) |
| Install   | npm ci                                 |
| Build     | npm run build                          |
| Output    | dist                                   |

The repository contains the full React/Vite application, SQL migrations, Supabase Edge Functions, tests, and operations documentation. Build/migration commands never seed accounts or products. Local account credentials, environment files, PDFs, screenshots, audit artifacts, caches and temporary output are excluded from Git and Vercel uploads.

## Environment variables

Set these in Vercel Project → Settings → Environment Variables for **Production** and **Preview**, using the intended hosted Supabase project for each:

| Variable                      | Required | Value                                                                   |
| ----------------------------- | -------- | ----------------------------------------------------------------------- |
| VITE_SUPABASE_URL             | Yes      | Supabase Cloud HTTPS project URL                                        |
| VITE_SUPABASE_PUBLISHABLE_KEY | Yes      | Project publishable key (legacy anon key also supported)                |
| VITE_SITE_URL                 | Optional | HTTPS canonical origin, e.g. your owned custom domain; no path or query |

Do not add `SUPABASE_SECRET_KEY`, a service-role key, database password or CLI access token to the frontend deployment. The Vercel catalog function uses only anonymous public catalog interfaces. Secret keys under a VITE-prefixed name are rejected before building.

Leave `VITE_SITE_URL` **unset** for your first import if the deployment domain is not known. Enable Vercel System Environment Variables: production uses `VERCEL_PROJECT_PRODUCTION_URL` (or `VERCEL_URL`); previews use their own `VERCEL_URL`. Set a custom canonical domain in Production only after adding it to Vercel. Never copy localhost into Vercel. Redeploy after changing build environment variables.

Preview robots disallow crawling; the catalog function also returns noindex in previews. Vercel additionally protects preview indexing through its response headers. Prefer a separate staging Supabase project for Preview: preview code uses the credentials you configure and is not automatically isolated from a production database.

## Backend and authentication

The existing linked cloud project already has migrations through **36**, including optimized store pictures, private chat images and the existing hosted Cron jobs. Importing the frontend repository does **not** reapply SQL or deploy Edge Functions. Do not reset the database or rerun project-specific owner bootstraps against a different project.

If using another hosted project, review the identity bootstrap migration and apply migrations through the Supabase CLI/SQL Editor as documented in [Cloud deployment](DEPLOYMENT.md). No Docker or local database is required. Required active Edge Functions:

```sh
supabase functions deploy request-file-validate --use-api
supabase functions deploy chat-image --use-api
```

`provider-gateway` is prepared but disabled; courier/MFS/escrow integrations are not activated by publishing this frontend. COD and manually confirmed bank transfers remain the supported methods.

After Vercel assigns your URL, set Supabase **Authentication → URL Configuration**:

- Site URL: `https://YOUR-ACTUAL-DOMAIN`
- Redirect URLs: `https://YOUR-ACTUAL-DOMAIN/auth/callback` and `https://YOUR-ACTUAL-DOMAIN/auth/reset`
- Add only intended preview redirect origins; retain localhost only if local testing is required.
- Configure production SMTP/sender verification and test signup confirmation/password recovery. A working build does not configure email delivery.

## Routing and SEO

`vercel.json` preserves the SPA deep links for authentication and role-based dashboards. Product/supplier detail URLs use `api/catalog.ts`, which reads bundled `dist/index.html` and injects current anonymous public catalog content and structured data. The React application then renders its interactive UI. Hidden/unavailable listings return 404; backend failures return 503. Catalog HTML is not cached, so stored moderation/suspension eligibility is checked per request.

Public sitemap generation uses `public_products` and `public_businesses`; it does not query raw listing tables or use a secret key. Rebuild when you want the static sitemap refreshed after catalog changes. Dashboard/admin/auth/cart/checkout responses are noindex and no-store.

## Validation and launch

```sh
npm ci
npm run check:deploy
npm run check:launch
```

GitHub Actions runs typecheck, lint, unit tests and build on pushes to main/pull requests using the lockfile and Node 22. The CI build without credentials verifies the setup state and compilation; it is not a live-cloud acceptance test. Vercel builds require the two public cloud variables.

Deployment preparation passed a fresh lockfile install, typecheck, lint, all 92 unit tests, and a production build from a clean source export without local environment files. A separate preview build against the public cloud catalog generated 16 sitemap URLs. The compiled Node ESM catalog handler returned server-rendered HTML with correct preview canonical/noindex behavior, bundled assets, and no-store headers. No hosted Vercel deployment was performed during these checks.

The 19 October 2026 read-only launch check found **4 demo listings and 2 test suppliers** in the current public catalog. This does not prevent testing a Vercel deployment, but a genuine public marketplace launch still requires catalog cleanup through existing admin controls, real product imagery, approved support/policy content, and email acceptance. Preserve order/conversation history when archiving designated test listings or suspending test suppliers. No records were changed by deployment preparation.

After your first deployment, verify home/search, direct product/supplier URLs, image loading, registration/recovery redirects, login/logout, role dashboards, private documents/chat images, cart checkout and browser console/network errors. These hosted-origin checks require a real deployment and are not replaced by local tests.

References: [Vite on Vercel](https://vercel.com/docs/frameworks/frontend/vite), [Node versions](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions), [system environment variables](https://vercel.com/docs/environment-variables/system-environment-variables).
