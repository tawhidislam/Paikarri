# Supplier operations

The super admin opens **Supplier management** at `/admin/supplier-management`. Buyer/supplier workspaces remain under `/dashboard`. Staff retain their existing account/onboarding permissions but cannot use these private operational tools.

## Available workflows

- The paginated supplier list searches business name/email, account status, and exact labels (case-insensitive). It reports approved/pending products, unanswered quotations, conversations whose latest message is from the buyer, and active/overdue warnings. Last activity includes business/product updates, supplier messages, and quotation responses; last sign-in is separate.
- Open **Manage supplier** from the existing supplier record, or open a row in Supplier management. Internal labels support ten labels of 2–40 characters. Internal notes are append-only; archive with a reason instead of deleting the history. Avoid placing identity/bank details in notes.
- Issue a notice, warning, or final warning with an explanation, required correction, and due date. Confirm before sending. The supplier gets a generic in-app notification linking to `/dashboard/supplier-actions` and can submit a written correction response. Only the super admin may resolve or dismiss a warning, with a reason. Submitted responses and decisions remain in the action history.
- Warnings become overdue after the deadline day ends in Bangladesh. No automatic suspension, approval changes, or escalation occurs. Account suspension remains a separate explicit control on Account details.
- **Verification renewals** at `/admin/supplier-renewals` lists current approved/expired application pointers due within 7, 30, or 60 days, earliest expiry first, including overdue records and suspended account context. Pending replacement applications remain visible but cannot be sent a reminder. In-app reminders are limited transactionally to one per supplier in 24 hours; there is no outbound email or bulk sender.

## Data and authorization

Migration `20261017001800_supplier_management.sql` creates RLS-protected `supplier_management_records`, `supplier_internal_notes`, `supplier_warnings`, and `supplier_warning_events`. Public RPCs independently check the protected database role/ownership; no frontend role or user-editable metadata is trusted. Anonymous execution is revoked. Authenticated users have no direct write privilege on the new tables.

Only super admins can read labels/notes. Warning data and event bodies are visible only to the super admin and the business owner. A suspended supplier can still read and respond to its own warnings for remediation. Supplier responses are rate limited to ten per minute. Version checks reject stale label edits, responses, and warning decisions. Refresh the page and review current information before retrying a conflict.

Every privileged mutation and supplier response records a transactional audit event. General snapshots contain IDs, status/version/count/due-date data, not note bodies, warning messages, or supplier responses. Event prefixes `supplier_management.*`, `supplier_warning.*`, and `supplier_renewal.*` are hidden from staff through both audit RLS and the administrative audit RPC. Generic notification bodies contain no private operational content.

Lists use server-side filtering/pagination (25 default, maximum 100). Note/warning history in a supplier workspace uses 25 rows per page. English/Bangla interface copy is centralized in `src/lib/copy.ts`. Dates use Bangladesh time.

## Deployment and verification

No local database or Docker is used. Prepare the frontend, run TypeScript/lint/unit/browser checks, and preflight the migration together with `supabase/tests/supplier_management.sql` in a single `BEGIN`/`ROLLBACK` transaction on the linked cloud project. Then:

```sh
supabase db push --linked --dry-run
supabase db push --linked
npm run db:types
supabase db query --linked --file supabase/tests/supplier_management.sql --output json
```

The migration is additive, preserves all existing records, and extends the existing notification kind constraint. It sends no real warnings/reminders by itself. Do not remove warning/note tables to roll back a frontend release; remove navigation temporarily while retaining history and database authorization. No production frontend deployment is included.

Critical checks include direct RPC and table access for each role, private audit visibility, optimistic concurrency, due dates across Bangladesh midnight, warning responses during suspension, closed-warning rejection, renewal windows and reminder limits, and unchanged account state after warning resolution. Synthetic database fixtures are rolled back. Browser fixtures intercept cloud requests and never send real supplier warnings or reminders.
