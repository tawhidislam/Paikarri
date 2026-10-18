# Admin-managed Refund Policy

Public page: `/info/refund`, linked from the site footer and sitemap. Super-admin editor: `/admin/refund-policy`, linked as **Refund Policy** in the admin sidebar.

## Operator workflow

1. Sign in as the existing platform super admin.
2. Open **Refund Policy** and complete the English/Bangla title, introduction, effective date, and sections. The initial private template identifies details the operator must decide, including eligibility, request deadlines, return costs, processing times, and support contact details. It does not invent refund windows or payment guarantees.
3. Add, remove, and reorder sections, then preview either language.
4. Save the private draft. Publish the saved revision through **Publish refund policy** and confirm. Both languages, a date, and at least one complete section are required.

Publication is immediate. The effective date is displayed to readers; it does not schedule publication. Later private edits leave the last published policy visible. The initial template is never shown publicly: until first publication, visitors see a not-yet-published notice and a support link.

## Backend and separation

- Additive migration: `supabase/migrations/20261018003200_managed_refund_policy.sql`.
- Protected tables: `refund_content` and `refund_content_history`, with RLS and no application-client direct-write grants.
- Owner-only RPCs: `admin_refund_state`, `admin_save_refund`, and `admin_publish_refund`. Anonymous/staff/buyer/supplier access is denied independently of the UI.
- Public RPC: `get_refund_content`, returning only the current published content, version, and timestamp.
- Saving/publishing use a row lock and expected revision. Successful mutations record immutable application history and transactional `refund_content.saved` / `refund_content.published` audit metadata. Private draft bodies stay out of general administrative audit records.
- Terms and refunds share their validated bilingual content shape and frontend editor/document components. They have separate tables, cache keys, routes, RPCs, revision counters, and histories. Refund changes do not alter Terms data.
- Text is rendered through React as escaped plain text. The current order/payment/refund workflow is unchanged: funds and refunds are handled outside the platform, with external verification recorded in the app.

## Cloud setup and testing

For another linked Supabase Cloud environment:

```sh
supabase db push --linked --dry-run
supabase db push --linked
npm run db:types
supabase db query --linked --file supabase/tests/refund_policy.sql
supabase db query --linked --file supabase/tests/terms_content.sql
```

The SQL suites create synthetic identities and roll back every change. Refund tests cover permissions, private drafts/history, direct-write denial, validation, stale revisions, publication, later replacements, auditing, and unchanged Terms content.

```sh
npm run typecheck
npm run lint
npm test
npx playwright test tests/e2e/refund-policy.spec.ts tests/e2e/terms.spec.ts tests/e2e/homepage.spec.ts tests/e2e/live-search.spec.ts tests/e2e/operations.spec.ts
npm run build
```

Browser tests use synthetic responses only. They cover independent policy publication, bilingual preview, staff/buyer/supplier route guards, conflicts, errors, and responsive editor/document layouts. No refund policy is automatically published during rollout. No Docker, local database, or production frontend deployment is required.

Validated on 18 October 2026: migration applied to the linked cloud project and types regenerated; both rolled-back policy SQL suites passed. **98 browser checks, 54 unit tests, TypeScript, ESLint, build, and whitespace checks passed.** The real public APIs returned no published refund or terms content, and anonymous refund administration was denied with `42501`. Eight live English/Bangla viewport checks (320, 390, 768, 1440px) had no overflow, JavaScript errors, or HTTP failures. The private starter draft was absent from every public view; support links and footer navigation worked. Evidence: `artifacts/refund-live/metrics.json` and adjacent screenshots.
