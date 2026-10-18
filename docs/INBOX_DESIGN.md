# Buyer and supplier inbox refresh — 19 October 2026

The full-page inbox at `/dashboard/messages` now shares one layout for both roles, styled in `src/pages/inbox-workspace.css`. The previous buyer-only stylesheet is no longer imported. Shared floating chat retains its shell and uses the same compact attachment control.

- Clearer conversation rows, consistent avatars, larger previews, selected/unread states, search and filters.
- Bounded desktop pane height keeps the composer visible at ordinary desktop viewport heights.
- Unified full-screen conversations on phones/tablets, safe-area and visual-keyboard handling, restored list focus on Back.
- Compact message bubbles, quieter timestamps/read receipts and expandable access/quick-reply information.
- Attachment, message and Send controls share one row; compressed image previews remain removable without losing text.
- Quick replies append to current drafts for both roles. On mobile Enter inserts a newline; tap Send to submit. Desktop Enter sends, Shift+Enter adds a newline.
- Supplier conversation headers identify buyer inquiries without showing the supplier's verification badge as if it belonged to the buyer.

Search, pagination, polling, unread/read cursors, text/image retries, in-memory draft recovery and existing authorization remain in place. No cloud database migration or data change is required.

Validation includes desktop and mobile messaging/image regressions plus actual English/Bangla viewport checks at 320, 390, 768 and 1440 CSS pixels, landscape/keyboard resizing, loading/unavailable states, and screenshots in `artifacts/inbox-redesign`.

Validation results: 48 browser checks passed; 2 duplicate viewport-matrix cases were intentionally skipped in the mobile project. Final responsive/Bangla refinements passed another 18 focused checks. Unit suite: 78 passed. Screenshots were inspected for both roles on desktop and phones. Supabase schema/data were unchanged.
