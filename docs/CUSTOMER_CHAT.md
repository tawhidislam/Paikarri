# Buyer–supplier marketplace chat

Paikarii.com uses its own green-branded text/product messaging workflow, with a floating desktop window and full-screen mobile chat. This release adds no local database, Docker, external chat service, payment system, or production deployment.

## User experience

- **Chat now** on product cards/details and supplier profiles starts or reopens the buyer's unique conversation with that supplier. Guests return from email/password login with supplier/product intent intact. No message is sent automatically. Suppliers respond in their existing inbox; staff/admins do not start participant chats.
- A selected product appears above the composer and can be removed. Sending creates a product card containing a server-generated name, BDT price, MOQ, and unit snapshot. Historical cards remain understandable if a product later becomes unavailable. Their links continue to obey public product visibility. Images/document paths and private supplier fields are not copied into messages.
- Desktop chat can be minimized, closed, or expanded into `/dashboard/messages?thread=…`. Phone chat fills the viewport. A messages launcher and header/sidebar unread badges lead back to the full inbox.
- The inbox searches conversation names/latest messages on the server, supports unread filtering, and loads 25 threads at a time. Buyer names use safe profile display names with an account-reference fallback; no private phone/email is projected.
- Text is limited to 4,000 characters. Enter sends; Shift+Enter adds a line; IME composition does not accidentally send. Quick replies fill an editable draft. Failed sends keep the body/product and retry nonce. Drafts survive minimize/thread navigation in memory and are discarded when the authenticated user changes or the page reloads. Private drafts are not persisted in browser storage.
- Supabase Realtime triggers participant-authorized refreshes; visible chat polling provides a 15-second fallback. “Live updates” describes the connection, not another user's online status. Unread counts/read receipts use actual database read cursors. Opening a visible conversation at the latest messages marks it read; reviewing older messages does not automatically scroll to the bottom.
- Latest 50 messages load initially. Older and newer pages use `(created_at,id)` cursors, including PostgreSQL microseconds, without the previous 200-message cap. Older-history scroll position is preserved when pages are prepended.

## Security and data

Migration `20261017002000_marketplace_chat.sql` adds `product_id`, server-owned `product_snapshot`, and a sender-scoped unique retry nonce to messages. It adds RLS-protected `conversation_read_states`, whose writes occur only through `chat_mark_read` and whose realtime changes are participant-authorized.

Database-authorized RPCs are `chat_start`, `chat_thread`, `chat_list`, `chat_messages`, `chat_send`, `chat_mark_read`, and `chat_unread_total`. Anonymous execution is revoked. Every participant operation checks the protected database role and conversation participation; messages/conversation table read policies remain participant-only. A nonce retry returns the same message and rejects a changed conversation/body/product. Existing database message/conversation rate limits still apply. Direct client inserts cannot forge product snapshots or future timestamps.

New conversations require an active buyer and publicly eligible supplier. Suspended participants may continue existing text conversations. Sharing a newly attached product requires an approved listing and active supplier; existing product snapshots remain privately readable. No operation approves a product, removes suspension, or grants business verification.

Super-admin oversight stays separate at `/admin/conversations`. Its audited read-only RPC projection now includes the same safe product snapshot; the ordinary participant endpoints do not grant administrators general chat access. Staff monitoring remains denied, and message bodies/product contents are not copied into access audit events. Read receipts are not exposed in monitoring APIs.

This release supports text and product cards. File attachments, voice/video calls, push/email delivery, typing indicators, and user online-presence claims are not implemented.

## Cloud rollout and recovery

Prepare and test frontend compatibility, preflight the additive SQL and `supabase/tests/marketplace_chat.sql` inside a rolled-back hosted transaction, then apply with the linked Supabase CLI and regenerate types:

```sh
supabase db push --linked --dry-run
supabase db push --linked
npm run db:types
supabase db query --linked --file supabase/tests/marketplace_chat.sql --output json
```

The migration adds the read-state table to the existing Supabase Realtime publication. No additional storage bucket or dashboard secret is needed. Keep Realtime enabled on the hosted project. If WebSockets fail, the UI reports periodic refreshing and continues through authenticated RPC polling.

Retain columns/read-state history when rolling back frontend navigation. Do not remove messages or weaken RLS as a recovery step. Synthetic test fixtures roll back; no real customer messages should be seeded for automated acceptance.

Critical coverage includes guest intent return, buyer/supplier ownership, unrelated/staff/guest denial, immutable product context, nonce conflicts, read-cursor monotonicity, identical timestamp pagination beyond 200 messages, suspension follow-up, safe super-admin monitoring, mobile layouts, and failed-send draft recovery.
