# Admin-managed Terms & Conditions

Public page: `/info/terms`. Super-admin editor: `/admin/terms` (also linked in the admin sidebar). Footer and registration links use the public page.

The shared editor also supports a separately stored [Refund Policy](REFUND_POLICY.md). Terms and refund drafts/publications remain independent.

## Editing and publishing

1. Sign in with the existing platform super-admin account.
2. Open **Terms & Conditions**. Edit the English/Bangla title, introduction, effective date, and sections. Add, remove, or reorder up to 30 sections.
3. Use **Preview terms** to inspect either language privately.
4. **Save draft**. Saving does not alter the public version.
5. **Publish terms**, then confirm. Both languages, an effective date, and at least one complete section are required. Publication is immediate; the effective-date field is a displayed date, not a scheduling control.

The public document includes a table of contents, section links, effective date, and published revision. It uses the reader's language preference. Paragraph line breaks are retained; content is rendered as escaped plain text, never executable HTML.

Until the first publication, the existing launch-draft terms are shown in the redesigned public document. The migration does not publish that draft. If the API fails after configuration, the page shows error/retry controls rather than silently substituting old terms.

## Authorization and history

- Only the protected database `super_admin` role can load, save, or publish drafts. Staff, buyers, suppliers, and anonymous users are denied by RPC checks independently of navigation.
- RLS protects both content tables. Application clients have no direct mutation grants, including the super admin: writes must pass through audited RPCs.
- The current published document is exposed through `get_terms_content()`. Private draft/history tables are never publicly readable.
- Saved and published revisions have immutable application-level history with actor/time and before/after content. The editor displays the latest 20 revisions. General admin audit events include revision metadata, not private draft bodies.
- Save/publish use an expected revision and row lock. If another tab changed the content, reload and reconcile the edits before trying again.

## Hosted Supabase rollout

Applied additive migration: `supabase/migrations/20261018003100_managed_terms.sql`. Cloud types were regenerated into `src/lib/database.types.ts`.

For another linked cloud environment:

```sh
supabase db push --linked --dry-run
supabase db push --linked
npm run db:types
supabase db query --linked --file supabase/tests/terms_content.sql
```

The SQL test uses synthetic identities and rolls back all changes. It covers role isolation, direct-table write denial, draft privacy, stale revisions, invalid dates/content, publication, later private replacements, and transactional history/audit records. No local database or Docker is needed.

## Frontend checks

```sh
npm run typecheck
npm run lint
npm test
npx playwright test tests/e2e/terms.spec.ts tests/e2e/homepage.spec.ts tests/e2e/live-search.spec.ts tests/e2e/operations.spec.ts
npm run build
```

Terms browser tests use synthetic browser responses and do not publish cloud content. They cover editing/reordering, bilingual preview, draft/save/publication separation, conflicts, role guards, escaped markup, unavailable content, and phone/tablet/desktop layouts. Editor screenshots: `artifacts/terms-editor-en.png` and `artifacts/terms-editor-bn.png`.

Validated on 18 October 2026: **84 browser checks, 54 unit tests, typecheck, lint, build, and the rolled-back cloud authorization suite passed**. Live anonymous API access returned no published terms and denied `admin_terms_state` with `42501`. Eight live English/Bangla viewport checks at 320, 390, 768, and 1440px had no overflow, browser errors, or HTTP failures; footer navigation and table-of-contents links worked. Public screenshots/metrics: `artifacts/terms-public/`. No actual terms were published during implementation.
