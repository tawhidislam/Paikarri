# Verification record

Date: 2026-10-16 (Asia/Shanghai). Scope: local React + Vite application connected to the hosted Supabase project selected by the user. Production Vercel deployment was deferred at the user's request.

## Executed checks

- Dependency installation and npm audit: no reported vulnerabilities at installation.
- TypeScript typecheck, ESLint and production build passed after application implementation. Database types are generated from the hosted schema; local aliases live separately in `src/lib/models.ts`.
- Seven unit tests passed: auth redirect boundaries, registration password length, MIME/size upload checks, district/division validation, 64-district coverage, invalid prices/duplicate pricing tiers and quotation validation.
- Ten desktop/mobile browser checks passed: home rendering, language switch, horizontal overflow, search navigation, filter URL state, guest dashboard redirection, registration validation, password recovery navigation, supplier directory and missing-product states.
- Two additional desktop/mobile checks passed against the **real hosted catalog API**, asserting a successful search RPC response and the six migrated reference categories. No mock API was used for those checks.
- Hosted transactional SQL assertions passed. They create isolated fixtures and roll back: signup metadata cannot grant admin; profiles are isolated; buyers cannot change listings; suppliers cannot access another supplier's private records, inquiries or messages; participants can exchange messages and quotations; below-MOQ requests fail; supplier edits reset listing approval; moderation creates audit logs; rate limits are database-enforced; failed tier writes roll back product changes; full-text/location filters work; pending image metadata/objects and private documents are hidden from guests; anonymous privileged RPC execution is revoked; reviewer feedback stays private.
- Desktop and mobile screenshots were captured and inspected. A translation-edit regression was repaired, then browser/type/lint checks were rerun. Fonts and editorial images are served locally. These screenshots are review artifacts in `artifacts/`.
- Supabase security advisors were run. Anonymous-executable privileged RPC warnings were fixed with explicit role revocations. Four warnings remain for intentionally authenticated SECURITY DEFINER RPCs: supplier registration and three admin moderation operations. Each uses a fixed search_path and database identity/role checks; negative-role tests verify denial. There are no advisor errors in the returned security report.

## Cloud state

The repository was linked to `zhllnfciehxmjahljrhb`. The project initially had no public marketplace tables. Seven additive migrations were applied through the Supabase CLI: schema/RLS/storage, product transactions, catalog/audit, reference categories, business identity review, explicit RPC grants and private listing feedback. No local database, Supabase stack, Docker service or destructive database reset was used. SQL tests rolled back their fixtures. Optional fictional seed data was not loaded into the live catalog.

The installed CLI reported a non-fatal remote migration-catalog cache certificate warning after successful pushes. Successful migration records, generated types and SQL/REST checks verify the actual schema independently.

Cloud Auth was configured for http://localhost:5173, exact confirmation/recovery redirects, required email confirmation, a 10-character password minimum, 8-digit email OTPs and a one-minute email resend interval. TOTP enrollment/verification settings were preserved as enabled. A follow-up CLI readback reported “Remote Auth config is up to date.” The legacy CLI config push then fails when reading an unrelated Storage property (databasePoolMode); Auth updates occurred before that error. Storage buckets and policies were applied through migrations and tested independently. Do not treat the config-push exit code as a rollback of earlier resource updates.

## Limits and remaining launch acceptance

- No production domain, SMTP provider or first real admin account was supplied. The user chose local operation for now.
- Real inbox delivery, signup confirmation, password-reset completion, live multi-user dashboard/browser sessions and actual document/image transfer need an acceptance run with designated test accounts and email delivery. Database authorization and public browser flows are tested; this report does not claim those full live journeys were completed.
- The UI provides central English/Bangla navigation, marketplace, form and dashboard copy. Supplier-authored content and canonical district names can remain in the language entered. Technical setup and launch-draft policy pages are currently in English.
- A Vite SPA does not emit server-rendered per-product metadata for non-JavaScript crawlers. Static metadata, client product JSON-LD and a build-generated sitemap are included. Rebuild to refresh sitemap URLs.
- Messaging currently shows the latest 200 messages and falls back to polling when Realtime is unavailable. Extend history pagination for high-volume use.
- Production requires finalized operator/support/legal details and a retention policy. Policy pages are explicitly marked as drafts.
- Public product images use a private bucket with anonymous approval-gated access and five-minute signed URLs. Previously issued URLs can remain valid until expiry after unpublishing. Supabase public buckets would bypass object RLS and must not be used here.
- Supabase bucket MIME/size restrictions and client validation are implemented. Malware scanning/quarantine is not included.

See DEPLOYMENT.md for exact setup, admin bootstrap, cloud migration and Vercel instructions.
