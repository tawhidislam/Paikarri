# Product moderation layout

The `/admin/products` queue uses compact product summaries. The first listing opens automatically; other listings expand individually with **Review listing**. Every summary keeps supplier, status and starting price visible.

Expanded reviews group stock/MOQ/date, all uploaded images, description, specifications, price tiers, and existing variant/sourcing information. Specifications render as label/value rows. Image buttons open a full-size private signed-image preview with previous/next controls, Escape dismissal and native focus restoration.

A separate decision panel contains the review note and approval/rejection/archive actions. Desktop uses adjacent information/decision columns where space permits; smaller screens stack the sections, wrap supplier names and provide at least 44px action controls. Search, status filters and page sizes continue using the existing authorized server API.

Every moderation action still requires a note and confirmation. Server authorization and auditing are unchanged. The page now provides a saved-decision status and explicit empty-image/empty-price states, plus retry for list errors. Interface copy is available in English and Bangla.

Validation uses synthetic browser responses only; no live listing decisions are made. `tests/e2e/admin.spec.ts` covers 320/390/768/1440px layouts, both languages, expanded/collapsed records, image previews/focus restoration, required notes, decision payloads and status filtering alongside existing admin-access regressions. Screenshots are local under `artifacts/moderation-*.png` and remain excluded from Git.
