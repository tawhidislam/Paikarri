# Supplier command center

`/admin/supplier-management` remains super-admin-only. Supplier records now have initials, verification/account state, location, labels, and direct management links. Search debounces for 300 ms and sends `q` to the existing paginated server API. Active/suspended quick filters use the existing `status` parameter.

The current backend searches business name/email/title, not phone. The UI explicitly prompts for name or email. **Needs attention on this page** filters only the already loaded page by pending products, unanswered inquiries, incomplete profiles, or warnings. Pagination/record totals remain the server totals. A global attention/phone search would require a separately authorized backend change; this redesign changes no RPC signatures, database schema or policies.

The workspace at `/admin/supplier-management/:id` provides a bilingual business header, safe contact links, a public-storefront link, confirmed account suspension/reactivation and four actionable KPI groups. Business contact details come from the existing `admin_supplier_detail` endpoint; sensitive verification evidence is not fetched for the header. Account controls target the owner account ID, not the business ID, and use the existing authorized/audited mutation.

Tabs use `?tab=overview|warnings|notes|verification`, defaulting to overview. Arrow keys/Home/End support keyboard navigation. Switching tabs preserves note drafts. An overdue banner links to warnings. Internal labels use removable chips, presets and Enter-to-add, with an explicit save. The collapsible text editor preserves the `Labels separated by commas` field and optimistic version checking.

Warnings use a modal composer followed by a confirmation step in the same dialog. Existing severity, content, date and version validation remain active. Shared warning cards display severity accents, Bangladesh-date countdowns and an event timeline in both admin and supplier workspaces. Warning filter pills query the server; warnings never suspend accounts automatically.

Internal notes support Ctrl/Cmd+Enter, author initials, timestamps, explicit reasoned archiving and active/archived page filters. Plain text preserves line breaks; arbitrary HTML/Markdown is not executed. Counts come from actual API totals. Renewals use the existing business-scoped 60-day queue: the gauge explicitly represents that window, and no expiry is fabricated if there is no matching renewal record. Reminders retain confirmation, submitted-renewal and 24-hour restrictions.

Browser coverage in `tests/e2e/supplier-management.spec.ts` preserves existing operation labels and assertions while navigating through the new tabs. It covers chips, stale versions, account action payloads/cancel, keyboard shortcuts, archive reasons, server filters, renewal reminders, supplier responses, role restrictions, and 320/375/768/1440px English/Bangla screenshots. Tests use intercepted synthetic responses; no real supplier is suspended, warned, contacted or reminded.

Validation completed: all 28 focused desktop/mobile browser checks, 93 unit tests, typecheck, lint and production build passed. English/Bangla screenshots were inspected; the tested layouts had no horizontal page overflow. No hosted configuration or database data was modified by this redesign.
