# Buyer messaging redesign

Implemented 18 October 2026 at `/dashboard/messages`.

The buyer inbox now has clearer conversation cards, supplier names, unread filtering, search, and a supplier-discovery link. Desktop uses a split list/conversation layout. Phones use a focused full-screen conversation with a Back control that restores list focus. The focused layout also covers short landscape screens.

Buyer styles are scoped in `src/pages/buyer-messages.css`. The supplier workspace and floating product chat retain their existing layouts. No database migration or authorization change is required.

The composer grows with its text, preserves separate in-memory conversation drafts, and retains text after failed sends. Mobile Enter inserts a newline; the Send button submits. Desktop Enter and Shift+Enter retain their existing behavior. Buyer quick replies append rather than replace a draft. A Latest messages control lets readers return to the bottom without forcing them away from older history.

VisualViewport resize handling keeps the composer within keyboard-sized viewports. Optional notices and quick replies collapse while the keyboard is open. Browser tests emulate viewport resizing; physical iOS and Android keyboards were not tested.

The conversation-access disclosure continues to explain participant and platform super-admin access. Existing message permissions, pagination, realtime handling, and sending APIs remain unchanged.

## Validation

- Browser regression suite: 46 passed, 2 intentionally skipped duplicate mobile cases. Covers buyer messages, supplier messages, floating product chat, buyer dashboard, and workspace navigation.
- Unit tests: 54 passed. Type checking, lint, production build, and diff whitespace checks passed.
- English/Bangla layouts: 320, 390, 768, and 1440 CSS pixels, plus 844×390 landscape.
- Buyer fixtures cover filtering, draft recovery, failed sends, quick replies, mobile newlines, keyboard-sized viewports, unavailable threads, empty inboxes, and older-history navigation.
- Live existing test-buyer inbox: eight language/width combinations, no horizontal overflow, page errors, failed HTTP responses, or message mutations. No live conversation was opened and no real messages were sent.

Live evidence: `artifacts/buyer-inbox-live/metrics.json` and matching screenshots. Populated synthetic conversation screenshots: `artifacts/buyer-conversation-{en,bn}-390.png`. Fixture tests do not modify cloud data.
