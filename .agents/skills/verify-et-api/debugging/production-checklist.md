# Production Checklist

Use this before shipping a Verify.et integration.

## API Boundary

- [ ] Verify.et API key is stored only in backend/server environment variables.
- [ ] Backend uses `x-api-key`, not bearer-style auth, for Verify.et API-key auth.
- [ ] Frontend and mobile clients call the user's backend, not Verify.et directly.
- [ ] One adapter/client owns Verify.et HTTP calls.
- [ ] Request body validation exists before calling Verify.et.
- [ ] Explicit bank payloads use the required fields in `../references/bank-specs.md`.
- [ ] Universal payloads collect `suffix` or `phoneNumber` when needed.
- [ ] If the product checks the receiver, `settlementAccount` is sent or saved bank accounts exist, and fulfillment respects `settlementAccountMatch`.

## Idempotency and State

- [ ] Each checkout/payment attempt has one stable `Idempotency-Key`.
- [ ] Retries reuse the same key with the same normalized payload.
- [ ] The Verify.et `requestId` is persisted.
- [ ] Local state distinguishes pending, success, not found, failed, and queue failure.
- [ ] Fulfillment requires a terminal state.
- [ ] `confirmationHistory.confirmedBefore` has an explicit product policy.

## Async Flow

- [ ] `202` responses are handled as queued work, not errors.
- [ ] Polling stops on terminal state and has a max attempts or deadline.
- [ ] Polling honors `links.pollAfterMs` and `Retry-After`.
- [ ] SSE clients handle terminal `done` events and reconnects.
- [ ] Webhooks update server truth when browser/mobile clients close.

## Webhooks

- [ ] `VERIFY_ET_WEBHOOK_SECRET` is in the server environment that serves the receiver, and it is not committed.
- [ ] The account webhook `status` is `active`. A dashboard Send test or `POST /api/webhook-endpoints/:endpointId/test` has a `webhook.test` delivery with `2xx`.
- [ ] Verify requests omit `webhookUrl` and `x-webhook-url`.
- [ ] Receiver reads the raw body, and signature rules match `../patterns/webhooks.md`.
- [ ] The handler returns `2xx` before heavy work and ignores an `X-Webhook-Event-Id` it already handled.

## Receipt Images

- [ ] Image Processing is enabled and `GET /api/image-processing` shows a positive image-credit balance before the first upload.
- [ ] Receipt photos are sent as one multipart `image` from the backend, with an `Idempotency-Key` and a client timeout of at least 45 seconds.
- [ ] Text fields are omitted when the photo already shows them, so the request does not send a conflicting value.
- [ ] Image-credit failures are shown separately from verification-credit failures.

## Errors and Retries

- [ ] HTTP `400`, `401`, `402`, `403`, `404`, `409`, `413`, `415`, `422`, `429`, `500`, `502`, `503`, and `504` are mapped intentionally.
- [ ] Retry logic checks `error.retryable`.
- [ ] Retry logic uses exponential backoff with jitter.
- [ ] Retry logic honors `Retry-After`.
- [ ] Non-retryable errors surface actionable messages to users or operators.
- [ ] Credits/quota failures do not retry until the user can act.

## Observability

- [ ] Logs include local attempt ID, Verify.et `requestId`, `x-request-id`, bank, status, and error code.
- [ ] Logs redact API keys, `whsec_` values, cookies, authorization headers, phone numbers when required by policy, and full raw payloads when they contain PII.
- [ ] Metrics track request count, latency, terminal status, retry count, webhook delivery success/failure, and duplicate webhook deliveries.
- [ ] Alerts cover elevated 5xx/503, webhook failure spikes, sustained latency, rate-limit spikes, and credit/quota exhaustion.

## Tests

- [ ] Request builder tests cover each supported bank.
- [ ] Universal-router tests cover ambiguous references, a CBE Receipt ID with no suffix, CBE/BOA `FT` suffixes, CBE Birr phone routing, URL routing, and Kaafi Ebirr full URL versus bare token.
- [ ] `200` inline response tests cover terminal fulfillment.
- [ ] `202` tests cover persistence, pending UI state, polling, and webhook fallback.
- [ ] Idempotency tests cover same-key same-payload retry and same-key different-payload conflict.
- [ ] Webhook tests cover valid signature, invalid signature, stale timestamp, duplicate delivery, and async processing.
- [ ] Image tests cover a QR success, an OCR screenshot success, a disabled account, an empty image balance, a field conflict, and an idempotency replay.
- [ ] Error mapping tests cover retryable and non-retryable cases.

## Related References

- Endpoint contract: `../references/api-endpoints.md`
- Webhooks: `../patterns/webhooks.md`
- Receipt images: `../patterns/image-processing.md`
- Common mistakes: `common-mistakes.md`
