# Product details and wholesale buying

React + Vite remains local. All persistence, authorization, storage and inventory transactions run in the existing hosted Supabase project. No local database, Docker, payment gateway or frontend production deployment is required.

## Buyer flows

- Product galleries support fullscreen viewing, zoom, arrow keys and Escape; the close action restores focus. Product images retain the existing five-minute signed URL behavior.
- Select quantities per SKU. Combined quantity determines MOQ and the shared pricing threshold; each SKU supplies its own price and available stock. The mobile bar uses the same state.
- Comparison at `/compare` stores at most four UUIDs in browser storage. Every revisit reloads eligible public products. Unavailable IDs can be removed without exposing hidden listing details.
- Standard checkout uses the cart. Sample, customization and negotiated wholesale offers use an independent checkout. No payment is collected by the site.
- Requests are available at `/dashboard/requests`. Save the draft, add customization files, and submit. Editing a submitted request creates a new revision. Earlier revisions and offers remain available.
- Suppliers must approve samples through an offer; normal MOQ cannot be bypassed by changing cart quantities. Accepted offer prices are frozen. Suppliers still confirm delivery fees and buyers accept the final total.
- Reviews require a completed order containing the product. Reviews, edits and supplier replies await moderation. Sample reviews are labeled and excluded from the wholesale/custom average. Disputing or cancelling the qualifying order dynamically removes eligibility.

## Supplier flows

Create and save the main product before configuring **Variants, pricing & sourcing** beneath its images. Enter attributes as `Color: Red, Blue`, one attribute per line. Generate at most three attributes and 100 combinations. Existing identities are reused; removed combinations are archived. Adjust codes for new SKUs, stock, image association and every shared price threshold before saving for review.

Public option, price and sourcing edits return the listing to pending. **Update stock only** preserves the listing's approval and checks the current SKU version. SKU stock represents unreserved units. The displayed product stock is the sum of active SKU stock. Existing stock is read-only in the basic product form, preventing an old form from restoring stock reserved by a newer order.

Preparation and packaging fields are estimates. Existing products show “Confirm with supplier” until a supplier saves sourcing information. Samples are off by default, with a configurable 1–10 unit limit when enabled. Customization MOQ cannot be below normal MOQ.

Open **Sourcing requests** to issue an offer for every requested SKU and quantity. Include setup and customization charges in unit prices. Offers expire within 90 days. Only the latest offer for the current submitted revision can be accepted, once. Receipt of a request or offer creates an in-app notification without private requirements or file paths.

Open **Customer reviews** to submit replies for moderation.

## Administration and privacy

- `/admin/reviews` is available to staff and super admin. The safe queue exposes review/reply content, reports and an eligibility result. It never returns order addresses, bank references or request attachments. Decisions require a reason and current version, and create audit records transactionally.
- `/admin/requests` is super-admin-only. Staff cannot read requests, offers or files through tables, RPCs or storage. Opening a super-admin request view is audited; file retrieval also requires its own audit opening.
- `request-attachments` is a private bucket. Each draft permits five JPEG/PNG/WebP/PDF files, at most 10 MB each after image compression. Files have random non-overwritable paths.
- The `request-file-validate` Edge Function verifies the Auth access token through `auth.getUser()`, ownership, actual byte length and file signature before a service-only RPC finalizes a file. Submission rejects unfinished validation. The service key is supplied by the Edge runtime, never the frontend.
- File removal locks the request against simultaneous submission. Submitted metadata cannot be removed or replaced by supplier/buyer APIs. Five-minute image previews and PDF download links require authorized retrieval.
- Signature validation is not antivirus scanning. PDFs are offered as downloads. Removed draft metadata leaves an inaccessible storage object; storage retention/cleanup can be scheduled separately after a retention policy is chosen. Do not delete submitted evidence manually.

## Schema and compatibility

Migrations `20261017002200` through `20261017002600` add normalized attributes, values, SKU selections/prices, sourcing settings, SKU cart lines, versioned requests/offers/files, reviews/replies/reports/decisions and immutable order selections.

The standard-SKU backfill copies **current available stock**. Existing orders and prices are untouched. Existing carts are copied to SKU cart lines without changing quantities; legacy cart calls work for standard products. Legacy quotation responses remain historical and cannot be checked out; issue a structured offer through a new sourcing request.

Inventory writes lock product and SKU rows deterministically. Checkout validates prices, SKU versions, eligibility and stock. Cancel/expiry/inspected-return restoration marks each order line released, preventing duplicate restoration. Archived SKU identities remain available to historical orders.

Apply only to the existing linked cloud project:

```sh
supabase db push --linked --dry-run
supabase db push --linked
supabase functions deploy request-file-validate --project-ref <linked-project-ref> --use-api
npm run db:types
```

The function uses `verify_jwt = false` at the gateway because it performs explicit token verification itself; this supports hosted project signing keys. Its finalize RPC is granted only to `service_role`. Do not add service credentials to Vite variables.

## Verification

```sh
npm run typecheck
npm run lint
npm test
npx playwright test tests/e2e/product-buying.spec.ts
supabase db query --linked --file supabase/tests/product_buying_upgrade.sql --output json
```

The SQL suite wraps synthetic users, stock, orders, reviews and private file records in one transaction and rolls back. It includes the legacy order security/lifecycle suite, mixed-SKU tiers, exact-once release, sample offers, idempotent acceptance, review eligibility, staff denial and private-file freeze/audit rules. Browser fixtures are isolated responses; no fictitious published reviews or real orders are created.
