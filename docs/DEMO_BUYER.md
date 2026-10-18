# Local buyer testing account

The user requested a fictional buyer account for testing the local React/Vite app against the existing hosted Supabase project.

- Email: `test.buyer@paikarii.example`
- Display name: `[TEST] Paikarii Buyer`
- Role: buyer, assigned through the normal Auth signup trigger; no supplier or administrator privileges.
- Email confirmation is enabled for this reserved test address so password login works without sending email.
- Password and account ID are in `.env.demo-buyer`, a gitignored, owner-readable (0600) local JSON file. Keep it private; credentials are not included in application source, documentation or logs.

Sign in at http://localhost:5173/auth/login. The buyer dashboard is at `/dashboard`, and the cart is at `/cart`. No orders, quotations, reviews or messages were seeded for this account. On mobile, Cart is available from the menu and buyer dashboard navigation.
