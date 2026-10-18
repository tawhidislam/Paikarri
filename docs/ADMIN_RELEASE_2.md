# Admin operations release 2

Scope: homepage content management, supplier onboarding and in-app notifications. Hosted Supabase only; preserve existing console and marketplace data.

## Implementation plan

1. Add protected homepage draft/published storage with optimistic revision checks, owner-only publishing, gated marketing image storage and public published-content RPC. Add recipient-owned notifications, immutable event generation, safe read-state RPCs, staff onboarding aggregates and audited/rate-limited reminder RPCs.
2. Build an owner-only `/admin/homepage` editor with bilingual copy, safe local links, hero uploads, curated category/product/supplier pickers, section toggles, preview and explicit publish confirmation.
3. Add `/admin/onboarding` for owner/staff with computed profile/document/product milestones, search, stage filters and server pagination. Link remediation and review records and support individual templated reminders.
4. Add `/admin/notifications` delivery records and `/dashboard/notifications` recipient inbox, unread counters, read/unread and mark-all-read. Decision/account alerts are generated transactionally; newly created rows are delivered in-app, with read timestamp as acknowledgement. No email or SMS is sent or implied.
5. Verify migration and negative authorization tests in a rolled-back hosted transaction before applying additive cloud migrations. Regenerate types, run build/lint/unit and desktop/mobile regressions, then document exact controls and limits.

## Permission and data boundaries

- Homepage drafts and marketing uploads: super admin only; staff cannot read drafts or publish. Guests see only published content and currently eligible curated entities. Publishing rejects pending/archived products, suspended suppliers and unverified featured suppliers.
- Onboarding and delivery logs: administrators only. Staff may issue individual predefined onboarding reminders. Limit to five reminders per minute per administrator and one reminder per supplier/template per 24 hours; record sends in the audit log. No arbitrary recipient/message endpoint.
- Notifications: users can read only their own inbox and alter only their own read state through RPCs. Notification content, actor, target and links are immutable to clients. Decision alerts include applicable review notes/account-visible reasons but never document paths, private chats, Auth records or internal reports.
- Automatic events: product moderation, verification review, account status changes, staff access changes and new quotations/responses. Existing conversations remain participant-only. No historical notification backfill or external messaging happens during migration.
- Existing homepage copy is the fallback until the owner publishes. Draft edits never affect the public homepage. Published marketing signed URLs last five minutes. Upload limits are JPEG/PNG/WebP, 5 MB.

Deferred: outbound email/SMS, general bulk broadcasts, advanced staff scopes, support tickets, ordering/payments, asset cleanup automation and homepage layout reordering.

## Using this release

- **Homepage:** open `/admin/homepage` as the super admin. Edit both languages, upload a hero image if needed, choose featured records and section visibility, then **Save draft**. Preview it and use **Publish homepage → Confirm** when ready. Publishing always uses the saved revision; a stale tab must reload. **Use published content** loads the current published version into the editor for another save/publish cycle. Empty selections use the automatic sections. Products or suppliers that lose eligibility are removed from public curated selections at read time.
- **Onboarding:** open `/admin/onboarding` as an administrator. The three milestones are a business profile with description/address/phone, an approved verification document and at least one approved listing. Account suspension takes precedence in the stage label. The tracker links the relevant records and offers only applicable individual reminder templates. Sending requires confirmation; delivery and its audit record commit together.
- **Delivery:** `/admin/notifications` searches in-app notification records by recipient, event and read/delivered state. This is a delivery log, not an arbitrary broadcast composer. The bell opens the signed-in administrator's own inbox at `/admin/inbox`.
- **Recipient inbox:** buyers and suppliers use `/dashboard/notifications` or the header bell. Filter unread items, open the related workspace, mark individual items read/unread, or mark all read. Unread counters and inbox rows poll every 15 seconds. No email or SMS provider is called.

Homepage snapshots in audit history contain draft text and therefore remain **super-admin-only**, including direct table reads and the audit RPC. Staff retains access to other operational audit history. Existing snapshots are preserved without rewriting historical content.

Marketing uploads accept JPEG/PNG/WebP up to 5 MB, use UUID paths, and remain private until published. Superseded signed URLs can survive for five minutes. Unattached uploads are not automatically deleted; a future owner-only cleanup job can remove abandoned assets. No existing homepage revision is published by migration, and notifications are not backfilled.

## Verification and cloud workflow

The versioned migrations are `20261017001200_content_onboarding_notifications.sql` and `20261017001300_private_homepage_audit.sql`. The first introduces the feature tables, RLS, storage bucket and policies, safe RPCs, automatic-event triggers and onboarding aggregate view. The second protects draft-bearing audit records through both RLS and the server-authorized audit list. All CLI operations target the existing hosted project. Run linked CLI commands sequentially because the CLI shares a temporary login role.

```sh
supabase db push --linked --dry-run
supabase db push --linked
npm run db:types
supabase db query --linked --file supabase/tests/operations.sql
supabase db query --linked --file supabase/tests/authorization.sql
supabase db query --linked --file supabase/tests/admin_console.sql
npm run build
npm run lint
npm run test
npm run test:e2e
```

SQL fixtures and content publications occur only in rolled-back test transactions. Browser operations tests intercept API responses in isolated sessions; real hosted public-catalog checks remain in the regression suite. Actual owner-password login, inbox email delivery and full Storage file transfer still require designated live acceptance. This release implements in-app delivery only and never resets a real user's credentials to automate acceptance.
