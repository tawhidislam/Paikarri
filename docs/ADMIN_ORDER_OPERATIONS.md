# Super admin order operations

## Routes and experience

- `/admin/orders`: dedicated operations hub, defaulting to all orders. Clickable global metrics and operational queues cover open orders, attention required, reported bank payments, disputes, pending refunds, fulfilment, shipped orders, and completed orders.
- `/admin/orders/:id`: dedicated command view with payment/refund checkpoints, dispute review, buyer and supplier links, safe contact shortcuts, item and logistics details, payment records, filterable event history, and the existing printable receipt.
- Existing route protection restricts the console to the protected `super_admin` role. Staff do not receive platform-wide order access. Buyer and supplier order views retain their existing layouts and controls.

Lists use server-side search, exact counts, deterministic ordering, and pagination (25 rows by default; maximum 100). Search accepts displayed order numbers and participant names. Attention-required counts use the distinct union of disputed orders, reported payments, and pending refunds; overlapping cases are not counted twice. Metric totals describe the whole authorized order set, rather than the current search result.

The list and counts use bounded, explicit PostgREST selections protected by the existing `orders` RLS. The existing `order_list` RPC does not support combined operational queues, so it is not used for these new admin queries. Detail retrieval and all mutations retain the existing authorized, version-checked interfaces. Cached order lists and metrics refresh after actions.

## Payment scope and compatibility

The console supports the existing COD and manually verified bank-transfer workflows. Payment records and reported transaction references are displayed as external payment evidence. There is no integrated escrow account, bank-slip upload, bank balance, payout eligibility, or automated payment/refund processing in this release. Completed orders are labeled completed without a payout claim.

Verification, return, dispute, and refund dialogs retain their existing accessible labels and version checks. Dispute resolution controls respect the current allowed actions, including restrictions while an authorized return is active. Payment verification never replaces the supplier/buyer delivery-confirmation flow.

Contact shortcuts validate Bangladesh mobile numbers before creating telephone or WhatsApp links. Buyer account details and delivery recipient information are labeled separately. The event view presents recorded history; it does not create new audit events for browsing. Existing privileged mutations retain their transactional server audit behavior.

This change adds no database migration, schema change, RPC signature change, cloud configuration change, or deployment.

## Validation

- 97 unit tests passed across 21 files.
- Focused browser suite: 54 passed, 2 intentionally skipped mobile PDF-generation cases. Desktop PDF-generation checks passed. Coverage includes order queues, overlapping counts, server filtering/pagination, contact and account links, payment/refund actions, active returns, errors/retry, participant ordering, checkout, cancellation, disputes, and receipt printing.
- English and Bangla list/detail layouts checked at 320, 390, 768, and 1440 CSS pixels, including horizontal-overflow assertions and screenshots.
- TypeScript, ESLint, production build, and whitespace checks passed.
- A read-only hosted query confirmed the explicit list selection, embedded payment/shipment counts, and exact-count response work against the linked project; anonymous order-table access was denied. This was not a live test of every authenticated role.

Browser action checks use synthetic intercepted responses. No real order, payment, refund, or participant record was changed during validation. Screenshot artifacts are stored under `artifacts/admin-orders-*` and `artifacts/admin-order-detail-*` locally.
