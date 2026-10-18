# Paikarii.com platform console

Open http://localhost:5173/admin/login and sign in with your existing account. The designated project owner is `mdtawhid1318@gmail.com` (verified Auth UUID `577ea4d7-d6b4-4e9d-b84b-64b6cd083c02`). There is no default password and no password was changed by this rollout. A signed-in administrator opening `/dashboard` is redirected to `/admin`; old moderation URLs also redirect.

## Roles

| Capability                                                 | Super admin                   | Staff admin                   | Buyer / supplier              |
| ---------------------------------------------------------- | ----------------------------- | ----------------------------- | ----------------------------- |
| Console, safe account details, aggregate statistics, audit | Yes                           | Yes                           | No                            |
| Review products, private verification documents, reports   | Yes                           | Yes                           | No                            |
| Create/edit/delete categories                              | Yes                           | Read only                     | No                            |
| Suspend/reactivate buyers and suppliers                    | Yes                           | No                            | No                            |
| Grant/revoke staff access                                  | Yes                           | No                            | No                            |
| Change public platform settings                            | Yes                           | No                            | No                            |
| Read private conversations                                 | Only as an actual participant | Only as an actual participant | Only as an actual participant |

Authorization reads protected database roles, never signup metadata. Administrative email and last-sign-in fields come from explicit projections in database-authorized RPCs; the browser never receives an Auth admin key, password hash, refresh token belonging to another user, or the full Auth user row.

## Daily operations

- **Overview:** actual accounts, businesses, products, quotations and review queues. Daily registrations, suppliers, products and quotations have 7/30/90-day ranges, using `Asia/Dhaka`. No revenue metrics exist.
- **Suppliers:** filter by name/email, division, verification and account state. Open a business record for contacts, inquiry counts, products, private documents and business/account audit links.
- **Buyers & accounts:** inspect registration, confirmed email, role, last sign-in and account-visible status reason. Owners can suspend/reactivate with a reason and a confirmation dialog.
- **Products:** filter/search, review every linked image, specifications and quantity tiers, then provide a review note and approve/reject/archive.
- **Verifications:** access documents through short-lived signed URLs. Review notes, latest decisions and previous audit snapshots remain available.
- **Reports:** inspect the reported listing using its administration link; resolve/dismiss with a required reason.
- **Categories:** owner manages a maximum two-level category tree. Staff sees the paginated read-only list. Used categories cannot be deleted while foreign keys reference them.
- **Staff access:** search existing active, email-confirmed buyers (at least three characters), then grant access with a reason. Revoking staff restores buyer status. Suppliers cannot be converted to staff. Ordinary controls cannot change the owner or suspend administrators.
- **Settings:** bilingual name/tagline, support contact fields, default language and new-supplier registration switch. Saved language preference overrides the platform default. Existing suppliers continue using their accounts when registration is paused.
- **Audit:** filter actor email, action, target UUID and inclusive Bangladesh dates. Expand before/after JSON snapshots. Related moderation events also retain reviewer notes.

Management lists filter in PostgreSQL and return 25 rows by default, with 50/100 options and a hard maximum of 100. Pagination/filter state lives in the URL. Private reference selectors and existing messaging history use their separate existing limits.

## Suspension

Suspending a supplier hides otherwise public businesses/products and prevents newly issued public image access. Listing statuses remain intact. Product/tier/image writes and product image uploads/deletes are blocked in database triggers/policies, including direct API attempts. Reactivation restores only listings still approved. Normal business identity changes continue requiring a fresh review.

Suspended buyers cannot start quotations, conversations or reports. Both suspended account types retain existing conversations and quotation follow-up. Supplier profile correction and private verification-document submission remain available. Historical supplier/product labels use a participant-scoped RPC; public catalog RLS and private message policies are not widened.

Role/status queries refresh on window focus and every 15 seconds; access changes invalidate cached views. Database authorization takes effect immediately. Already-issued product image URLs can survive until their existing maximum five-minute expiration.

## Migrations and verification

- `20261016000800_admin_console.sql`: protected settings/status tables, owner/staff helpers, suspension enforcement, safe paginated RPCs, transactional audit snapshots and participant context.
- `20261017001000_suspended_business_remediation.sql`: permits trusted identity-review trigger updates while direct suspended-supplier product writes remain blocked.
- `20261017001100_public_catalog_scope.sql`: public storefront/detail/search queries use explicit eligibility even for administrators, whose moderation access remains separate.
- `20261016000900_bootstrap_platform_owner.sql`: explicitly guarded, audited promotion of this project's existing verified administrator. It fails if the expected UUID/email/confirmation/prior admin role do not match. It is not an email-based runtime authorization rule. When adapting the repository to another cloud project, review this project-specific bootstrap and establish the intended verified owner before applying it; do not copy its account identity blindly.

Run against the intended linked cloud project only:

```sh
supabase migration list --linked
supabase db query --linked --file supabase/tests/authorization.sql
supabase db query --linked --file supabase/tests/admin_console.sql
npm run db:types
npm run lint
npm run build
npm run test
npm run test:e2e
```

SQL suites use transaction-scoped fictional fixtures and roll them back. Browser admin tests use isolated intercepted API fixtures to exercise role-specific UI, confirmations, image rendering, pagination and locale behavior without touching real accounts. Public catalog browser tests call the actual hosted API. These checks do not claim real inbox delivery or a completed owner-password browser login; those require the account holder's existing credentials. Never reset the owner's password merely to automate testing.

## Later additions

Start with homepage content management, then supplier onboarding and response-time reporting. Ordering and payment integration remain deferred until operational acceptance of the marketplace.

## Operations release 2

The console now includes [homepage editing, supplier onboarding and notifications](ADMIN_RELEASE_2.md). Homepage editing/publishing and its draft-bearing audit snapshots are owner-only. Staff can use onboarding and delivery logs, with deduplicated, rate-limited individual in-app reminders. Recipient inboxes remain private to their owners.
