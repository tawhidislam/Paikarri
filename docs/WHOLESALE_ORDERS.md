# Wholesale orders (local React/Vite + hosted Supabase)

The order module uses the existing hosted project. There is no online payment collection, escrow, gateway credential, courier API, local database, or Docker dependency. COD and bank transfers happen externally. The application records verified transactions; an operator clicking a button never initiates a transfer.

## Routes and operation

- Product detail → quantity → **Add to cart**. Quantity must meet MOQ and available stock.
- `/cart`: database-backed buyer cart, quantity updates, actual eligible price tiers, unavailable-item handling and supplier grouping.
- `/checkout`: Bangladesh delivery address, COD/bank choice, notes and explicit consent. A confirmed-email, active buyer is required. One atomic checkout creates one order per supplier (up to 10 suppliers / 50 distinct products).
- `/dashboard/orders` and `/dashboard/orders/:id`: buyer/supplier search, filters, paginated lists, full order records, actions and history.
- `/admin/orders` and `/admin/orders/:id`: super-admin-only order oversight, payment/refund verification, dispute decisions and return authorization. Staff have no order API/table access.

The public catalog remains browsable without signing in. Buyers need to sign in before adding to a persistent cart. Suppliers reply/manage orders from their workspace. Suppliers cannot buy through a supplier account.

## Lifecycle

1. Checkout computes prices on the server and compares the buyer's last reviewed item/quantity/price snapshot. A changed price, MOQ, stock, listing approval, or supplier suspension blocks checkout with no partial orders.
2. Stock is reserved immediately by reducing `products.stock`, now **available unreserved units**, under deterministic product-row locks. The supplier confirms availability, delivery charge and notes.
3. The buyer explicitly accepts the immutable product subtotal plus supplier-confirmed delivery charge. Fulfilment then starts; before acceptance a buyer can cancel immediately.
4. A bank-payment reference is **reported**, not paid. The super admin independently checks evidence with the receiving supplier/bank and records a full-amount verified reference. COD may ship unpaid. Bank-transfer orders cannot ship before verified payment.
5. The supplier enters the carrier and consignment reference after handover. Tracking is manually recorded, not a claim of live carrier integration. The buyer confirms actual receipt.
6. During preparation a buyer can request cancellation; this pauses dispatch until the supplier cancels or declines with a reason. A buyer can escalate to a dispute. Supplier cancellation before shipment releases stock once and creates `refund_pending` for verified payments.
7. Buyers may dispute processing/shipped orders, or completed orders within 30 days. Fulfilment pauses. Super admin can resume, cancel, or close an eligible shipped order as delivered, with a required recorded decision.
8. For shipped goods the super admin may authorize a **full-order return**. Participants agree the return address in order notes. Buyer records return carrier/reference. Supplier confirms receipt after inspection and explicitly selects whether **all units** should return to available stock (default off). Resolution waits for an authorized return to be received. A shipped refund without a return does not automatically restock goods.
9. Refund decisions produce `refund_pending`; only after the external full refund is completed does the super admin record its reference as `refunded`. If a payment arrives after cancellation, the super admin can record it, immediately creating `refund_pending`.

Each action has a required expected version; concurrent or stale decisions fail. Status changes, history, notifications and administrative audit snapshots commit together. Product names, units and prices are immutable snapshots, surviving listing changes/deletion. There is no order deletion API. Print output is an order record, not a tax/VAT invoice or proof of payment.

SKU variants, samples and negotiated quotation-to-order prices are supported by the [product buying upgrade](PRODUCT_BUYING_UPGRADE.md). Orders retain immutable variant selections and purchase kind. Partial shipments, partial returns/refunds, coupons, tax calculation, platform commission, automatic refunds, online payment collection and integrated courier tracking remain future modules. All currently supported payments/refunds are full-order amounts.

## Stock, expiry and suspension

- Suppliers enter **currently available unreserved stock**, not monthly production capacity. To accept an order for made-to-order supply, explicitly list the capacity that can actually be committed. Editing stock replaces available units; reserve quantities remain allocated to existing orders.
- Pre-shipment cancellation/expiry restores only the order's units; shipment/completion never consumes them a second time. A returned order is restocked only after explicit supplier inspection confirmation.
- Pending supplier confirmation and buyer acceptance each have a 48-hour deadline. `paikari-order-expiry` runs every five minutes, releasing abandoned reservations and notifying participants. A delayed job does not allow accepting an already expired request.
- Suspension blocks new cart additions/checkouts and hides the supplier catalog. Existing order follow-up, cancellation, verified refunds and returns remain available. Trusted order routines may restore stock while the ordinary suspended-listing restriction still blocks supplier edits/uploads.

## Schema and authorization

Migration `20261017002100_wholesale_orders.sql` adds `cart_items`, `checkout_batches`, `orders`, `order_items`, `order_events`, `order_shipments`, `order_payments`, `order_disputes`, and `order_returns`.

Every table has RLS. Authenticated clients receive SELECT only, governed by buyer ownership or order-participant/super-admin policies. All writes use explicitly granted security-definer RPCs with pinned empty search paths, server role/ownership checks, constraints, version checks, limits and transactions. Anonymous callers cannot execute these RPCs. Safe listing responses omit delivery addresses/payment references; authorized detail responses contain them. General audit snapshots contain state/payment state/fee/version, never addresses or bank references.

RPCs: `cart_set`, `cart_quote`, `order_checkout`, `order_list`, `order_detail`, `order_action`. There are no client-provided prices in trusted writes. Checkout nonces are buyer-scoped and require an identical original request on retry, even after the cart is cleared. Monetary calculations use PostgreSQL numeric; client summaries use minor units. Stale checkout errors offer an explicit cart refresh without clearing in-memory delivery details; checkout retries retain the original nonce when their input is unchanged. Lists default to 25, maximum 100; search/filter happen server-side. Screens poll every 15 seconds only while visible and pause detail polling while an action dialog is open.

Reference: [Supabase database functions](https://supabase.com/docs/guides/database/functions), [PostgreSQL row locking](https://www.postgresql.org/docs/current/sql-select.html#SQL-FOR-UPDATE-SHARE).

## Cloud rollout / recovery

1. Validate frontend role compatibility and run `npm run typecheck`, `npm run lint`, `npm test`, and `npx playwright test tests/e2e/orders.spec.ts`.
2. Inspect `supabase migration list --linked` and `supabase db push --linked --dry-run`. Apply only additive reviewed migration 21 with `supabase db push --linked`. No `supabase start` or destructive reset.
3. Alternatively paste migration 21 into the hosted SQL Editor in a transaction. It requires the existing `pg_cron` extension from supplier verification migration 15. Do not run it twice or apply it to another project's unrelated schema.
4. Regenerate types: `npm run db:types`.
5. Run `supabase db query --linked --file supabase/tests/wholesale_orders.sql --output json`. All fixtures and mutations roll back. Repeat existing security suites, including suspension and chat.
6. Verify `cron.job` has `paikari-order-expiry`, and review `cron.job_run_details` for errors. If interrupted, `select private.expire_orders();` from the SQL Editor safely reconciles only expired pending requests. Never restore stock manually for an order that may already have released its reservation.
7. No new env variables, storage buckets, SMTP or service-role browser keys are needed. No production frontend deployment is included.

For incidents, retain order/payment/event/audit records. Disable checkout in the frontend or temporarily revoke authenticated execution of `order_checkout` while investigating; preserve order follow-up. Reconcile external money with the bank/supplier before updating payment/refund status. Fix forward with reviewed migrations; do not drop order tables or reset the hosted database.

## Validation

`tests/orders.test.ts` checks address/phone/quantity-price inputs, currency totals and action requirements. `tests/e2e/orders.spec.ts` uses browser-only synthetic responses for checkout, supplier fulfilment, buyer acceptance/dispute, super-admin payment/returns/refund controls, stale decisions, privacy of browser storage, server filter parameters, errors and responsive Bangla UI. `supabase/tests/wholesale_orders.sql` exercises actual hosted RLS/RPC authorization, multi-supplier atomic checkout, tier prices, idempotency, frozen prices, version conflicts, bank/COD flows, cancellation, return inspection, refunds, suspension and reservation expiry using rolled-back synthetic records.
