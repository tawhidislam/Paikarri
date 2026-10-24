# Supplier mobile API

The supplier API is deployed on the linked Supabase Cloud project at `https://zhllnfciehxmjahljrhb.supabase.co/functions/v1/supplier-api/v1`. Its 63 operations cover the existing supplier workspace. Supabase Auth remains responsible for registration, confirmation, sign-in, refresh, recovery and sign-out. Native push and offline write queues are deferred.

- [OpenAPI 3.1 specification](api/supplier.openapi.json)
- [Generated TypeScript client](../src/mobile/supplier-client.ts)
- [Conversation reconciliation helper](../src/mobile/chat-sync.ts)
- [Edge entry point](../supabase/functions/supplier-api/index.ts)
- [Database authorization and replay tests](../supabase/tests/supplier_mobile_api.sql)

## Calling the API

All requests require `Authorization: Bearer ACCESS_TOKEN`. Supply the Supabase publishable key as `apikey` when the gateway requires it. The function calls `auth.getUser()` and reads the current database role on every request; a locally decoded JWT or a supplied business ID never establishes ownership. Only `/me` and `/onboarding` also accept buyers. Admin and super-admin workspaces are excluded.

```ts
import { SupplierApiClient } from './mobile/supplier-client';

const api = new SupplierApiClient({
  baseUrl: `${supabaseUrl}/functions/v1/supplier-api/v1`,
  publishableKey,
  getAccessToken: async () => (await supabase.auth.getSession()).data.session?.access_token ?? null,
  refreshAccessToken: async () =>
    (await supabase.auth.refreshSession()).data.session?.access_token ?? null,
});

const page = await api.request('products', { query: { page: 1 } });
const product = await api.request('product', { params: { id: productId } });
```

The client has no React or browser-storage dependency. Configure the native Supabase client with an OS secure-storage adapter. Do not persist verification forms, documents, message attachments or signed URLs in ordinary application storage. Account changes must clear all account-scoped caches and drafts.

Success is `{ data, meta: { request_id, ...pagination } }`. Failures are `{ error: { code, message, fields? }, request_id }`; `X-Request-ID` matches the body. Responses use `Cache-Control: no-store`. Lists use 25 records per page and include `page`, `page_size`, `total` and `has_more` in metadata. The data retains the RPC's `rows` and `total` fields. Chat history uses 50-record before/after cursors instead of page numbers; cursor query values are JSON strings containing `created_at` and `id`.

`401` means refresh/sign-in; `403` means operation access denied; `404` means resource unavailable; `409` means stale version or mismatched replay input; `422` means invalid input/business state; `429` includes `Retry-After: 60`. Unexpected failures are sanitized. HTTP `413` and `415` cover oversized request bodies and non-JSON input. `503 CLEANUP_PENDING` means metadata removal succeeded but private-byte cleanup should be retried.

Values remain numeric BDT amounts with existing precision. Dates and timestamps retain the current contracts: timestamp strings identify UTC instants, date-only deadlines use Bangladesh calendar dates and `Asia/Dhaka`. Reference data publishes categories, canonical units, all district/division pairs, platform settings and compression profiles.

## Writes, conflicts and retries

Every non-GET operation requires an `Idempotency-Key` of 8–200 characters, including PUT/PATCH/DELETE and CSV validation. Generate the key once when the user submits an operation and retain it with that exact payload until it completes or is explicitly abandoned. Stateful command results are stored in a private database table for 24 hours, keyed by actor, command and key; resource ID and canonical JSON payload participate in the fingerprint. Validation previews perform no write and need no replay record. Signed upload credentials are generated after the transactional prepare result, rather than stored in replay records.

```ts
// Keep this key with the pending action; reuse it after a timeout.
const result = await api.request('inventory', {
  params: { id: productId, sku_id: skuId },
  idempotencyKey: pendingActionId,
  body: { expected_version: skuVersion, quantity: 45 },
});
```

The mobile client retries once after an explicit auth refresh. It does not automatically replay network failures, rate limits, business failures or conflicts. A timeout retry must retain its key, version, nonce and payload. A conflict requires refreshing the resource and presenting the user's unsent input before creating a new action/key.

Business and product PATCH operations take `{ expected_updated_at, values }`, where `values` is the complete editable field object. Product updates exclude `stock`; modify existing stock only through the versioned SKU inventory endpoint. Other mutations retain their existing `expected_version` or `expected_revision`. Missing records cannot produce silent successful updates.

Order reads include `allowed_actions`. The same database helper gates supplier commands before calling the existing `order_action` transaction. Suppliers cannot accept buyer terms, verify money, resolve disputes or authorize returns. COD dispatch, bank-payment verification, cancellation requests and explicit return receipt/restocking retain the existing state machine. Suspension is checked per operation rather than disabling all historical access.

Quotations represent the original inquiry/response workflow. `/requests` represents revisioned wholesale, sample and customization requests. Both are available; do not combine their identifiers. Tender `view=mine` lists tenders on which this supplier has bid, including its permitted historical context. Review replies continue to require moderation.

## Private uploads

1. Compress/re-encode using the profile returned by `/reference`.
2. `prepareUpload` takes purpose (`product`, `store`, `avatar`, `verification`, `chat`), parent ID, MIME and byte count. Verification also needs a slot; chat needs width/height. Paths are generated on the server.
3. Transfer immutable bytes directly to Storage using the returned signed URL/token. Use `storage.from(bucket).uploadToSignedUrl(path, upload_token, bytes, { contentType: mime })` or the equivalent native upload. Never enable overwrite.
4. Call `completeUpload` with the ticket ID and a new operation key. Verification completion also requires the application's displayed `expected_version`. The Edge function downloads and checks bytes and only then calls a service-only attestation RPC. The caller's transactional completion attaches the verified object.
5. Use `readAsset` for a five-minute authorized preview. It accepts existing web assets as well as mobile assets. Supported read purposes are product, store, avatar, verification, legacy verification, chat and request attachment. Its ID is the underlying image/file, business or profile ID, according to purpose.
6. `removeUpload` detaches an owned ticket and removes private bytes; retry the same command if cleanup fails. `removeAsset` supports existing product/store/avatar assets and unsent chat images. Store/avatar removal requires `expected_path`. Verification evidence uses `removeVerificationFile`, retaining application revision rules and historical clones. Suppliers can read buyer sourcing attachments but cannot upload or remove them.

Prepared tickets expire after one hour. Storage tokens can have a longer platform lifetime; completion always checks the ticket deadline. Discarded/expired uploads remain private and unattached. Ten product images are enforced under a product-row lock, including requests from existing web editors. Prepared mobile objects cannot be overwritten or deleted between inspection and association. Unlink triggers preserve existing web removal flows.

Server byte limits: products 5 MB, avatars 2 MB, store pictures 256 KB/WebP/512px, chat 1 MB/WebP/1600px, verification 10 MB. Only trade-licence evidence accepts PDF. Images require recognized containers and bounded dimensions; chat/store reuse the existing strict WebP inspector. Container validation is not malware scanning or a full image decoder.

Run `scripts/cleanup-supplier-uploads.mjs` regularly with operator-only `SUPABASE_URL` and `SUPABASE_SECRET_KEY`. It discards unattached tickets older than 24 hours, removes their bytes, and acknowledges completed cleanup. It also cleans discarded assets previously attached. No valid attached asset is selected. The database independently removes expired replay records hourly when pg_cron is installed and also prunes the actor's expired records during commands.

## Realtime and lifecycle

`SupplierConversationSync` subscribes to the current conversation's messages and read-state changes using the authenticated Supabase Realtime client. Events trigger REST reconciliation rather than trusting event payloads as authoritative. It reconciles after reconnect, drains forward cursor pages, falls back to five-second polling while foregrounded and stops on account change/sign-out. Merge `onMessages` batches by message ID and sort by `(created_at, id)`. Connect `setForeground` to the native app lifecycle and call `stop()` when leaving the thread. Older history uses the REST `before` cursor. Refresh inbox and notification badges while their screens are visible; no native push delivery is included.

## Validation and release

Deployed to the user-designated linked Cloud project `zhllnfciehxmjahljrhb` on 2026-10-24: additive migrations, the `supplier-api` Edge Function, private replay/upload infrastructure and the conflict transport fix. Existing `chat-image` and `request-file-validate` functions remain active. Shared validators, generated contracts/client and dashboard fixes are also present locally; this deployment does not publish the web frontend. Hosted database and live REST results are recorded below.

Local checks:

```sh
npm run typecheck
npm run lint
npm test
npm run api:generate
npm run api:check
npm run api:edge:check
npx tsc -b && npx vite build
npx playwright test tests/e2e/supplier-api-baseline.spec.ts tests/e2e/supplier-management.spec.ts tests/e2e/supplier-product-save.spec.ts --output=/tmp/supplier-api-browser
```

Generation must be rerun after changing shared routes or schemas. The generated client is based on the same route registry as the OpenAPI document; edit its template instead of the generated output. `api:check` detects drift. Deno checks the production Edge entry point separately from the SPA compiler. SQL/PLpgSQL parser checks do not establish database-runtime acceptance.

For deployment to another environment:

1. In a staging checkout, explicitly link the selected project. Review `supabase db push --linked --dry-run`, then apply the migrations. The new migration versions are `20261024000100`, `20261024000200` and `20261024000300`; a fresh project needs all preceding migrations too.
2. Run the existing rollback SQL suites plus `supabase/tests/supplier_mobile_api.sql` with `supabase db query --project-ref STAGING_REF --file ...`. The new suite covers role separation, cross-supplier reads/writes, more than 1,000 records, idempotency, stale edits/inventory, current verification state, order dispatch/payment restrictions and private upload association/removal. The REST acceptance script tests concurrent product retries and competing inventory decisions with independent HTTP requests. Complete concurrent buyer checkout/reservation acceptance separately; one rollback transaction cannot prove cross-session scheduling.
3. Deploy `supplier-api`, `chat-image` and `request-file-validate` using explicit `--project-ref STAGING_REF`. The API's `verify_jwt=false` config is intentional: `auth.getUser()` verifies current tokens inside the function. Do not remove that authentication step.
4. Provision/designate two supplier accounts with business profiles and one buyer in staging. Run `scripts/test-supplier-api.mjs` with `SUPPLIER_API_TEST_PROJECT_REF`, `SUPABASE_PUBLISHABLE_KEY`, `SUPPLIER_API_TEST_SUPPLIER_TOKEN`, `SUPPLIER_API_TEST_OTHER_SUPPLIER_TOKEN`, `SUPPLIER_API_TEST_BUYER_TOKEN` and `ALLOW_SUPPLIER_API_TEST_WRITES=1`. It checks actual REST role/ownership enforcement, retry-safe creation/inventory, stale versions and real signed Storage transfer/inspection. Its synthetic product/image are removed in `finally`; it does not suspend, contact or modify real suppliers.
5. Configure the chosen native app’s confirmation/recovery deep links in the Supabase Auth redirect allowlist. Complete multi-account fulfilment, sourcing offers, renewals, tender bidding, review moderation, auth refresh and reconnect acceptance against staged records. Verify English/Bangla rendering in the native client and secure-storage lifecycle. Retain request IDs for failures; never log tokens, documents or message bodies.
6. Review all acceptance results before deploying the same additive changes to production. Monitor operation/status/latency/error-code logs. To roll back the API, disable its deployment or point mobile clients to the prior release. Keep the additive migrations and existing web RPCs; no destructive down migration is needed.

### Local verification record — 2026-10-24

- 150 unit tests passed, including 45 API/client/input cases and three native chat reconciliation cases. Cloud gateway path handling and HTTP conflict-code mapping have regression coverage.
- TypeScript, lint, Deno Edge type-checking, generated-artifact drift checks and production compilation passed.
- Both initial migrations and the new SQL suite passed standalone SQL/PLpgSQL syntax parsing; all three migrations subsequently passed actual Cloud database preflight and execution. Newly declared composite variables were treated as records by the standalone parser because it has no database catalog.
- All 60 selected desktop/mobile browser cases passed: 44 dashboard/management/product-save cases, 14 fulfilment/SKU/verification/chat cases and two CSV-import cases. The four shared verification cases were also rerun after schema extraction.
- All 19 rollback SQL suites passed on the hosted database, covering authorization, product uploads, chat/images/monitoring, inventory/buying, orders, supplier management, verification, sourcing/reviews/shipping, tenders, settings/content and the new mobile API. Each suite rolled back its fixtures. The mobile suite was updated to read protected SKU data through the authorized RPC and scope assertions to its own synthetic supplier.

### Cloud verification record — 2026-10-24

- All 40 local migrations match hosted migration history, including the three supplier API migrations. The `supplier-api` function is ACTIVE with internal bearer validation; both existing attachment validators remain ACTIVE.
- All 19 rollback SQL suites passed. After the conflict transport migration, the mobile SQL suite passed again with `PT409` assertions.
- Live REST acceptance passed using two temporary supplier accounts and a buyer: guest/invalid-token/wrong-role rejection, account identity, dashboard/reference/listing reads, cross-supplier record/file denial, concurrent product creation with the same key, identical-result replay, changed-input conflicts, stale product/inventory conflicts, and simultaneous competing inventory updates with exactly one successful decision.
- Actual Storage acceptance passed: signed direct upload, missing-file completion rejection, cross-supplier download rejection, immutable prepared bytes, validated image association, authorized preview and attachment/object removal. CSV validation passed. The synthetic product/image and all three temporary accounts were removed.
- The test script enforces a 30-second timeout per REST request and reports stable error codes/request IDs on unexpected responses without printing bodies or credentials.
- Remaining acceptance covers native device secure storage/deep links, real session expiry and refresh, foreground/reconnect behavior in the chosen native app, and independent concurrent checkout/reservation journeys. Full REST end-to-end fulfilment, sourcing, verification renewal, tender and review workflows still need mobile-client acceptance; their underlying authorization/workflows passed hosted SQL suites.
- The existing web frontend has not been republished by this Cloud API deployment. Rollback can disable `supplier-api` while retaining additive migrations and existing web RPCs.

### Cloud conflict transport

The hosted project runs PostgREST 14, which internally retries SQLSTATE `40001`. Raising that code for an ordinary stale version or changed idempotency payload caused live requests to stall and return 500/504 despite passing direct SQL checks. Migration `20261024000300` catches serialization failures at the mobile command boundary and rethrows `PT409`; the Edge handler maps that to `VERSION_CONFLICT` or `IDEMPOTENCY_CONFLICT`. Existing web RPC signatures and their SQL error contracts are preserved. See [Supabase's explanation](https://supabase.com/kb/troubleshooting/high-cpu-and-infinite-transaction-retries-when-using-custom-error-codes-in-rpc-functions).
