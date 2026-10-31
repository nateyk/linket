# Common Mistakes

Use this as a production review checklist when a Verify.et integration is flaky, insecure, or hard to debug.

## 1. Calling Verify.et From Browser or Mobile Code

Problem: The API key is exposed to users, logs, app bundles, or browser tooling.

Fix: Browser and mobile clients call the user's backend. The backend calls Verify.et with `x-api-key`.

## 2. Using Bearer-Style Auth Instead of `x-api-key`

Problem: Requests authenticate with the wrong header.

Fix: Use `x-api-key: VERIFY_BANK_ET_...` for Verify.et API-key auth.

## 3. Treating `202` as a Failure

Problem: Queued verification is marked failed even though it is still processing.

Fix: Store `requestId`, show pending state, and poll/SSE/wait for webhook until a terminal state is reached.

## 4. Reusing an Idempotency Key With a Different Payload

Problem: Verify.et returns `409`, or retries become unsafe.

Fix: Generate one stable idempotency key per checkout/payment attempt and reuse it only with the same normalized payload.

## 5. Generating a New Idempotency Key for Each Retry

Problem: Duplicate requests can create duplicate work or duplicate fulfillment paths.

Fix: Retry the same attempt with the same key and same payload.

## 6. Missing Bank Disambiguators

Problem: FT references, CBE Birr receipts, or universal references cannot be routed.

Fix: Do not ask for a suffix with a CBE Receipt ID. Collect `suffix` only for CBE or BOA `FT` references, and `phoneNumber` for CBE Birr when needed. See `../references/bank-specs.md`.

## 7. Caching Pending Status as Final

Problem: The UI or backend keeps showing pending after the verification completes.

Fix: Cache only terminal states, or set very short TTLs for pending states and revalidate before fulfillment.

## 8. Polling Too Fast or Forever

Problem: The client creates unnecessary traffic and worsens rate limits.

Fix: Use `links.pollAfterMs` or a conservative interval, set a deadline, back off after repeated pending responses, and honor `Retry-After`.

## 9. Ignoring Webhook Signature Validation

Problem: A forged callback can update local payment state.

Fix: Validate `X-Webhook-Signature` with the endpoint secret before trusting the payload. Rules are in `../patterns/webhooks.md`.

## 10. Verifying Webhooks After JSON Parsing

Problem: Signature checks fail because whitespace or body bytes changed.

Fix: Capture the raw request body before JSON middleware parses it.

## 11. Non-Idempotent Webhook Processing

Problem: Retries or duplicate deliveries double-fulfill orders or send duplicate notifications.

Fix: Persist `X-Webhook-Event-Id` first, then make side effects conditional on first processing. Retries reuse that id.

## 12. Account Webhook Never Becomes Active

Problem: Live verifications never arrive, or the receiver rejects them. The endpoint is still `pending_verification`, the running server does not have the `whsec_` secret, or a per-request `webhookUrl` is signed with the platform secret.

Fix: Follow the setup and proof steps in `../patterns/webhooks.md`. A queued test response is not delivery. Live events go only to `active` endpoints.

## 13. Doing Heavy Work Inside the Webhook Handler

Problem: Verify.et times out and retries even though the receiver eventually processes the event.

Fix: Verify, persist, enqueue, and return `2xx` quickly.

## 14. Ignoring `confirmationHistory.confirmedBefore`

Problem: A previously confirmed transaction can fulfill a new checkout without review.

Fix: Define a product policy: block, review, or allow only when business rules prove it is safe.

## 15. Retrying Non-Retryable Errors

Problem: The integration spams invalid requests and hides the actionable error.

Fix: Retry only when `error.retryable === true` or HTTP status indicates a transient condition.

## 16. Sending a Receipt Image as JSON

Problem: The photo never reaches Verify.et, or the upload returns `403` `IMAGE_PROCESSING_DISABLED` or `402` `INSUFFICIENT_IMAGE_CREDITS`.

Fix: Follow `../patterns/image-processing.md`. Enable Image Processing in the dashboard, keep image credits separate from verification credits, and send one multipart file named `image`.

## 17. Logging Secrets or Losing Correlation IDs

Problem: Logs either leak credentials or lack enough data for support.

Fix: Redact API keys, `whsec_` values, cookies, auth headers, and receipt image bytes. Keep `requestId`, `x-request-id`, bank, status, and error code.

## Related References

- Error handling: `../references/error-codes.md`
- Bank payloads: `../references/bank-specs.md`
- Production checklist: `production-checklist.md`
