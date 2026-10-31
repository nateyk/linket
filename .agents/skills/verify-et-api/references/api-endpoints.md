# Verify.et API Contract

Use this reference for auth, endpoint behavior, payload shape, response handling, permissions, and source-of-truth files.

## Base URL, Auth, and Headers

- Production base URL: `https://verify.et`
- API-key auth header: `x-api-key: VERIFY_BANK_ET_...`
- Session-cookie auth may exist for first-party dashboard flows. Third-party and backend integrations should use `x-api-key`.
- API-key permissions:
  - `POST /api/verify`: `verification:write`
  - `GET /api/verify/*`: `verification:read`
  - `POST /api/verify/test-webhook`: `verification:read`
  - Webhook endpoint reads and delivery history: `verification:read`
  - Webhook endpoint create, update, test, redeliver, rotate, and delete: `verification:write`
- Request headers:
  - `x-api-key: <key>`
  - `Idempotency-Key: <stable-attempt-key>` on `POST /api/verify`. Required for a receipt image.
  - `Content-Type: application/json` for JSON bodies only. For a receipt image, send `multipart/form-data` and let the client set the boundary. Do not force JSON Content-Type on an upload.
  - Omit `x-webhook-url` and body `webhookUrl` after an account webhook is active. Setup is in `../patterns/webhooks.md`.
- Response headers worth preserving:
  - `x-request-id`
  - `Retry-After`
  - `X-Verify-Cache: HIT`

## Core Endpoints

### `POST /api/verify`

Submits a verification request.

- Requires `verification:write`.
- Uses credits/quota for finite-plan callers.
- `waitMs` is an optional query parameter capped server-side. It is a best-effort inline wait, not a guarantee.
- `200` means the verification completed inline.
- `202` means the request was accepted and queued. Persist `requestId`. An active account webhook delivers the result. Poll or use SSE only for a progress screen.
- A `multipart/form-data` body with an `image` file uses opt-in image processing. JSON bodies stay text verification. The upload contract is `../patterns/image-processing.md`.
- `409` means the same `Idempotency-Key` was reused with a different payload.
- Cache replay is disabled when an idempotency key or webhook URL is present.

Example:

```bash
curl -X POST "https://verify.et/api/verify?waitMs=5000" \
  -H "x-api-key: VERIFY_BANK_ET_..." \
  -H "Idempotency-Key: checkout_123_attempt_1" \
  -H "Content-Type: application/json" \
  -d '{
    "bank": "cbe",
    "reference": "fHCxyTVljBclm6Yk4C"
  }'
```

### `GET /api/verify/:requestId`

Returns the latest status for a verification request.

- Requires `verification:read`.
- The request is scoped to the same user/API-key context that created or owns the request.
- Terminal processing states are `completed` and `failed`.

Example:

```bash
curl "https://verify.et/api/verify/REQUEST_ID" \
  -H "x-api-key: VERIFY_BANK_ET_..."
```

### `GET /api/verify/:requestId/events`

Streams status updates with Server-Sent Events.

- Requires `verification:read`.
- Send `Accept: text/event-stream`.
- Emits `status` events containing status JSON.
- Emits a final `done` event with reason `terminal` or `timeout`.

### Account webhook endpoints

Register the receiver once per account. Later verifications from that account's API keys are delivered without `webhookUrl`. The setup order, secret storage, and proof that the endpoint is active are in `../patterns/webhooks.md`.

These routes accept a dashboard session or `x-api-key`. Responses use `{ success, message, data }`. List and detail responses do not include the signing secret.

- `GET /api/webhook-endpoints` lists endpoints with 24h success rate and last delivery.
- `POST /api/webhook-endpoints` body `{ url, subscribedEvents? }`. `201` `data` is `{ secret, endpoint }`. Status starts at `pending_verification`, and Verify.et queues `webhook.test`.
- `GET /api/webhook-endpoints/:endpointId` returns endpoint metadata, including `status`.
- `PATCH /api/webhook-endpoints/:endpointId` updates `subscribedEvents` and can move `active` to `paused` or back. A pending endpoint cannot be forced active.
- `POST /api/webhook-endpoints/:endpointId/rotate-secret` returns the new `whsec_` secret once. The previous secret stays valid for 24 hours.
- `POST /api/webhook-endpoints/:endpointId/test` queues another test. `200` means queued, not delivered.
- `DELETE /api/webhook-endpoints/:endpointId` removes the endpoint and its pending deliveries.
- `GET /api/webhook-endpoints/:endpointId/deliveries` lists deliveries. `limit` is 1 to 100. Pass `cursor` for the next page.
- `POST /api/webhook-endpoints/:endpointId/deliveries/:deliveryId/redeliver` queues the same frozen event again.

Create and URL failures return `400` for a rejected URL, `409` when the URL is already registered or the account already has 10 endpoints, `422` for an invalid body, an unknown event, a disabled endpoint, or a pending endpoint forced active, and `429` when a test is already pending.

### Image Processing account

Opt-in receipt uploads. Behavior, credits, and errors are in `../patterns/image-processing.md`.

- `GET /api/image-processing` requires `verification:read`. `data` includes `enabled`, `balance`, lifetime totals, and `canManage`. An API key gets `canManage: false`.
- `PATCH /api/image-processing` body `{ "enabled": true }` or `false`. Billing-owner session only. An API key receives `403`.
- `GET /api/image-processing/usage?limit&offset` requires `verification:read`.
- `GET /api/image-processing/top-ups` and `GET /api/image-processing/top-ups/:topUpId` require `verification:read`.
- `POST /api/image-processing/top-ups` is billing-owner session only. An API key receives `403`.
- `GET /api/image-processing/attempts/:attemptId/review-image` is billing-owner session only.

### `POST /api/verify/test-webhook`

Older inline check for a URL that is not saved as an account endpoint. It uses the platform signing secret and does not activate an account endpoint. Prefer `POST /api/webhook-endpoints/:endpointId/test`. See `../patterns/webhooks.md`.

- Requires `verification:read`.
- Body: `{ "webhookUrl": "https://...", "scenario": "success" | "failed" | "not_found" }`
- Returns `200` when the test delivery completes or downstream HTTP failure details are available.
- Returns `400` for invalid request input.
- Returns `502` for network, TLS, DNS, firewall, or timeout failures.

Example:

```bash
curl -X POST "https://verify.et/api/verify/test-webhook" \
  -H "x-api-key: VERIFY_BANK_ET_..." \
  -H "Content-Type: application/json" \
  -d '{
    "webhookUrl": "https://example.com/webhooks/verify",
    "scenario": "success"
  }'
```

### History and Reporting Endpoints

History endpoints are useful for dashboards, reports, and audit trails:

- `GET /api/verify/history`
- `GET /api/verify/history/summary`
- `GET /api/verify/history/activity`
- `GET /api/verify/history/export`
- `GET /api/verify/history/:requestId`
- `DELETE /api/verify/history/:requestId`

Use these only when the user's request involves reporting or historical activity. For checkout fulfillment, use `POST /api/verify`, status polling/SSE, and webhooks.

## Request Payloads

Explicit bank mode is used whenever `bank` is present. Required fields live in `bank-specs.md`.

Optional `settlementAccount` is a one-off receiver check (wallet phone or bank account). If it is omitted, Verify.et matches against the account's saved `/api/bank-accounts` records. Completed results may include `settlementAccountMatch`. Do not fulfill when `matched` is false or `ambiguous` is true unless the product policy allows it.

Universal mode omits `bank` and sends `reference`, plus `suffix` or `phoneNumber` when `bank-specs.md` requires them.

## Response Shapes

Inline terminal response:

```json
{
  "success": true,
  "message": "Verification completed.",
  "data": [
    {
      "bank": "cbe",
      "status": "success",
      "verified": true
    }
  ],
  "requestId": "uuid",
  "verification": {
    "requestId": "uuid",
    "processingStatus": "completed",
    "status": "success",
    "verified": true,
    "result": {}
  },
  "links": {
    "statusUrl": "/api/verify/uuid"
  }
}
```

Queued response:

```json
{
  "success": true,
  "message": "Verification queued.",
  "data": [],
  "requestId": "uuid",
  "statusUrl": "/api/verify/uuid",
  "estimatedWaitMs": 5000,
  "verification": {
    "requestId": "uuid",
    "processingStatus": "queued",
    "status": "pending",
    "verified": false
  },
  "links": {
    "statusUrl": "/api/verify/uuid",
    "pollAfterMs": 1500
  }
}
```

`links.webhookRegistered: true` is added only when that verify request included a per-request callback URL. An active account webhook does not set it.

Status response:

```json
{
  "success": true,
  "message": "Verification status.",
  "data": {
    "requestId": "uuid",
    "bank": "cbe",
    "processingStatus": "running",
    "status": "pending",
    "verified": false
  }
}
```

Error response with verification error:

```json
{
  "success": false,
  "message": "Verification failed.",
  "requestId": "uuid",
  "error": {
    "code": "upstream_timeout",
    "message": "Request timed out",
    "retryable": true
  }
}
```

`data[0].confirmationHistory` can appear on successful verified results. `confirmedBefore: true` means Verify.et has previously confirmed the same canonical transaction.

## Status Interpretation

- `processingStatus: queued` or `running`: not terminal; keep pending UX and poll/SSE/wait for webhook.
- `processingStatus: completed`, `status: success`, `verified: true`: transaction verified.
- `processingStatus: completed`, `status: not_found`: terminal negative bank/provider result.
- `processingStatus: completed`, `status: failed`: terminal provider/platform failure; inspect `error`.
- `processingStatus: failed`: queue/worker failure; inspect `errorMessage` and `error`.

## Source-of-Truth Files

When working inside the Verify.et repository, prefer these files over stale notes:

- Routes: `apps/server/src/modules/verify/routes.ts`
- Controllers: `apps/server/src/modules/verify/controller.ts`
- Request parsing and caps: `apps/server/src/modules/verify/request.ts`
- Universal smart router: `apps/server/src/modules/verify/smart-router.ts`
- Service, cache, idempotency, and queue flow: `apps/server/src/modules/verify/service.ts`
- Contracts: `packages/contracts/src/verification.ts`, `packages/contracts/src/banks.ts`, `packages/contracts/src/api-key.ts`
- Error taxonomy: `packages/verification/src/errors.ts`
- Webhook endpoints: `apps/server/src/modules/webhook-endpoints/routes.ts`, `packages/contracts/src/webhook-endpoints.ts`, `packages/db/src/webhook-endpoints.ts`
- Webhook delivery and signing: `apps/worker/src/webhook-worker.ts`, `packages/queue/src/webhook-signing.ts`, `packages/queue/src/webhook-url.ts`
- Image processing: `apps/server/src/modules/image-processing/service.ts`, `apps/server/src/modules/image-processing/routes.ts`, `packages/receipt-read/src/read.ts`

## Related References

- Bank payload details: `bank-specs.md`
- Error handling: `error-codes.md`
- Webhooks: `../patterns/webhooks.md`
- Receipt images: `../patterns/image-processing.md`
