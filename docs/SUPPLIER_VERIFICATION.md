# Complete supplier verification

The local React/Vite application uses the linked hosted Supabase project. Suppliers use `/dashboard/verification`; super admins review `/admin/verifications/:id`. Staff have only the safe paginated queue and onboarding progress. Review uses the existing Supabase account; there is no separate verification password.

## Application rules

1. Owner identity: legal name, birth date, residence, issuing country, text document number, and document type. NID requires front/back and can have no printed expiry; passports require the identity page; driving licences require front/back. Passports/licences need issue and expiry dates.
2. Trade licence: licence number, business/proprietor names, authority, address, issue/expiry dates, and one to five images or PDFs.
3. Bank: bank/branch, account title and text account number, current/savings type, business/owner ownership, optional nine-digit routing number, and chequebook account-information page or unsigned cheque leaf.

All steps must pass server validation and the accuracy/authorization declaration before submission. Images accept JPEG/PNG/WebP; only trade licences accept PDFs. Each file is limited to 10 MiB. No sensitive draft fields are written to browser storage. Authentication session storage remains Supabase-managed.

This is manual document review. It does not perform government identity checks, bank ownership API checks, or payment processing. Reviewers must inspect evidence and confirm that the account title belongs to the licensed business or verified owner.

## Revisions and privacy

`verification_applications` owns normalized identity, trade-licence, bank, evidence, and append-only review records. RPCs enforce ownership, status, expected `lock_version`, and business-level locks. Direct client writes are not granted. Submitted evidence is immutable. Corrections and renewal clone a new revision, retaining historical evidence and feedback. Changing ID type removes that draft's old identity evidence references, requiring new evidence. Historical objects remain private.

Only the supplier and `super_admin` can read full records or create signed document previews. Staff, buyers, guests and unrelated suppliers cannot read sensitive tables, legacy documents, storage objects or verification audit history. Safe progress RPCs omit ID/account numbers, document paths and private feedback. General audit events contain only application IDs and before/after statuses. Notifications use generic text and link to the private workspace.

`business-documents` remains private. Uploads require an owned draft and a unique path: `user/application/slot/random-uuid.ext`. Overwrites are denied. Signed previews last five minutes and refresh while open. Detaching a draft's file does not delete evidence retained by a submitted revision. If storage cleanup fails after detachment, the detached object remains private; it cannot contribute to approval.

## Approval, expiry and suspension

Approval requires all three sections approved, complete/unexpired information, and explicit bank-holder confirmation. Corrections require per-section explanatory feedback; rejection/revocation requires a reason. Reviews and safe audits commit in one database transaction. Stale versions fail instead of approving a changed submission.

Saving a renewal draft preserves an eligible previous approval. Submitting replacement information pauses the badge. Business identity changes invalidate approval and request a new application; existing listing re-review rules remain in effect. Approval does not reactivate suspended accounts. Public catalog/CMS projections use current application eligibility and active account status.

Expiry remains valid through the expiry date in **Asia/Dhaka**, then becomes ineligible immediately in public catalog functions, independently of the scheduler. `paikari-verification-lifecycle` runs every minute, reconciles stored expired state, writes review/audit records and sends generic renewal/expiry notices. Renewal warnings start seven days before expiry and are deduplicated per revision/event. A scheduler interruption therefore cannot extend public badge validity.

## Cloud rollout and operation

Migrations:

- `20261017001400_complete_supplier_verification.sql`: additive schema, RLS, RPCs, legacy restrictions, catalog/onboarding integration.
- `20261017001500_supplier_verification_cron.sql`: enables hosted `pg_cron` and schedules the lifecycle function. It does not drop other jobs or extensions.
- `20261017001600_verification_pointer_guard.sql`: protects the current approval reference from supplier writes and limits renewal notices to the current revision.

Use the linked cloud project, never `supabase start`:

```sh
supabase db push --linked --dry-run
supabase db push --linked
npm run db:types
```

Alternatively run each migration, in order, in Supabase Dashboard SQL Editor and keep migration history synchronized before later CLI pushes. The Dashboard Integrations → Cron page shows the job and executions. Verify:

```sql
select jobid, jobname, schedule, active from cron.job
where jobname = 'paikari-verification-lifecycle';
select status, return_message, start_time from cron.job_run_details
where jobid in (select jobid from cron.job where jobname='paikari-verification-lifecycle')
order by start_time desc limit 10;
```

If a run fails, fix its reported cause and execute `select private.reconcile_supplier_verifications();` as the database operator. Reconciliation is idempotent. Re-enable/reschedule this named job if accidentally disabled; do not drop the Cron extension. Never manually set `businesses.verified=true` as a substitute for application review. Retain submitted evidence and immutable decisions; any future retention/deletion migration needs separate review and confirmation.

## Validation

- `npm test`: identity/date/decision validation and existing unit suites.
- `npm run lint`, `npm run build`.
- `npx playwright test`: desktop/mobile, English/Bangla, draft resume, required fields, immutable submitted UI, staff route restrictions, super-admin review, and marketplace/auth/CMS regressions.
- Run `supabase/tests/complete_verification.sql`, `authorization.sql`, `admin_console.sql`, and `operations.sql` via the linked CLI `db query --file …` or SQL Editor. Every suite rolls back synthetic users, metadata and decisions. No fictitious verified supplier is published.

The optional `ALLOW_VERIFICATION_STORAGE_SMOKE=1 node scripts/verification-storage-smoke.mjs` integration check uses the existing synthetic supplier credentials from the gitignored `.env.test-supplier`. It uploads a one-pixel image, tests signing and overwrite denial, removes the image, and retains an empty draft. It never submits or approves an application. Do not run it against a supplier containing real verification data.

Private verification data should never be included in screenshots, test logs, analytics or ordinary support exports. Synthetic evidence is sufficient for testing.
