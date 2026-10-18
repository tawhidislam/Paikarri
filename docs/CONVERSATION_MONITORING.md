# Super admin conversation monitoring

The local React/Vite application provides `/admin/conversations` and `/admin/conversations/:id`. The super admin can search and inspect all supplier–customer conversations, including suspended suppliers and empty threads. Staff and ordinary accounts have no monitoring access. Existing participant inboxes continue operating normally.

## Access and audit model

- Existing `conversations` and `messages` RLS policies remain participant-only. Administrators receive no general table-read or message-write policy.
- `admin_monitor_list(filters, page, page_size)` returns participant summaries, counts and activity times without message bodies. Search covers supplier/customer names and emails. Supplier/customer text filters, supplier business/customer IDs, and Bangladesh-time activity dates are supported. Default page size is 25, maximum 100, ordered by last activity then conversation ID descending.
- `admin_monitor_open(target)` checks the protected database `super_admin` role, fetches explicit participant fields, records `conversation_monitor.opened`, and returns the latest 50 messages and an `access_id` referencing that event. All operations commit in one transaction. Missing/unauthorized openings expose no message content and create no successful-opening event.
- `admin_monitor_messages(target, access_id, before_cursor, after_cursor, page_size)` checks the super-admin role and requires an opening event owned by that actor for that conversation. Unopened threads cannot be read through the pagination API. Cursors contain `(created_at, id)`; before and after cannot be combined. Pages are chronological, with default 50 and maximum 100 rows, boundary cursors and `has_more`.
- Access events contain only actor, action, conversation ID and timestamp; `details` is empty. Message content and contact details are not copied into audit snapshots. Monitoring events are excluded from staff audit RLS and generic audit RPC results.
- The frontend starts one audited request per page opening and disables automatic retries/focus/reconnect refetch for that request. Opening another conversation or revisiting the page creates a new event. Pagination and polling reference the existing event without creating more opening records. Network uncertainty may require an explicit retry; no false guarantee of exactly-once delivery is made.

Monitoring has no composer, impersonation, message edits/deletion, exports, or intervention controls. Server authorization remains authoritative regardless of hidden navigation or route guards. Do not add a service key to the frontend to bypass these restrictions.

## History and updates

The latest 50 messages appear initially. “Load older messages” continues to the beginning, preserving scroll position. New-message checks run every 15 seconds only while the document is visible, and on returning to the page. Newer pages are drained until caught up, merged by message ID, and ordered by timestamp/ID. Browsing older history does not force-scroll to the bottom. Poll failures keep loaded messages visible with an error notice; subsequent polls retry.

Participant details include supplier business name, customer name/account reference, email and account status. No Auth secrets, password hashes, tokens or verification documents are returned. The list contains no content previews. UI timestamps use Asia/Dhaka. Both interfaces and the privacy disclosure support English/Bangla. Participant inbox notices now disclose super-admin oversight rather than promising participant-exclusive access.

## Cloud rollout and recovery

Apply additive migration `20261017001700_conversation_monitoring.sql` to the existing linked hosted project:

```sh
supabase db push --linked --dry-run
supabase db push --linked
npm run db:types
```

No local Supabase, Docker, destructive SQL, message retention changes or production frontend deployment are required. The migration adds a message cursor index, three RPCs and an additional private-audit exclusion. Existing rows and messaging permissions are preserved.

If monitoring fails, inspect the RPC error and role first. Do not loosen participant RLS as a workaround. A missing opening reference requires reopening the audited review. Check successful access in the super-admin audit page using action `conversation_monitor.opened` and the conversation target. Temporarily removing monitoring navigation is a reversible frontend mitigation; do not delete messages or audit history to disable the feature.

## Validation

- `supabase/tests/conversation_monitoring.sql` uses synthetic users and 120 messages sharing one timestamp, tests complete keyset pagination, role denials, suspended suppliers, empty threads, audited-opening prerequisites, audit counts, content-free list/audit responses and Bangladesh midnight boundaries. Every fixture and audit event rolls back.
- Existing `authorization.sql`, `admin_console.sql`, `operations.sql` and `complete_verification.sql` cover unchanged participant and administrative permissions.
- `tests/e2e/conversation-monitor.spec.ts` exercises route restrictions, metadata-only lists, filters, pagination, audited opening, older history, multiple polling pages, missing threads and bilingual responsive layouts. Inbox regressions preserve sending and failed-send drafts; intercepted test requests never send real messages.
- Unit tests cover chronological cursor-page merging, duplicate suppression, timestamp offsets, and safe list projections.
