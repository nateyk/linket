# Error Codes and Recovery

Use this reference for HTTP failures, verification error codes, retry decisions, quota issues, and idempotency conflicts.

## Capture First

- HTTP status, response JSON, `x-request-id`, `Retry-After`, and `X-Verify-Cache`.
- Verify.et `requestId`, `processingStatus`, `status`, `error.code`, and `error.retryable`.
- Payload mode: explicit bank or universal router.
- Bank/reference/suffix/phone/webhook URL.
- Whether the request used an API key, session cookie, idempotency key, webhook URL, and credits/quota.

## HTTP Error Matrix

| Status | Common cause | Recovery |
| --- | --- | --- |
| `400` | Invalid `Idempotency-Key`, invalid webhook URL, invalid webhook test body/scenario, or image/multipart body errors (`INVALID_IMAGE`, `INVALID_IMAGE_FIELDS`, `INVALID_MULTIPART`, `IMAGE_REQUIRED`, `IMAGE_IDEMPOTENCY_KEY_REQUIRED`) | Fix header/body shape. Keep idempotency keys non-empty and `<=255` chars. Use public HTTPS webhook URLs. Image codes are in `../patterns/image-processing.md`. |
| `401` | Missing, invalid, disabled, or expired API key/session | Use server-side `x-api-key`, rotate key, or fix session/env loading. |
| `402` | `INSUFFICIENT_CREDITS`, `NO_CREDITS`, or `INSUFFICIENT_IMAGE_CREDITS` | Verification credits and image credits are separate. Image codes and recovery are in `../patterns/image-processing.md`. Do not retry until the missing balance exists. |
| `403` | API key lacks `verification:write` or `verification:read`, or `IMAGE_PROCESSING_DISABLED` | Update key permissions, or have the billing owner enable Image Processing. Webhook creates, tests, updates, rotates, and deletes need `verification:write`. Lists and delivery reads need `verification:read`. |
| `404` | Wrong `requestId`, unknown webhook endpoint, or different caller scope | Persist returned ids and call again with the same account or API key. |
| `409` | `Idempotency-Key` reused with a different payload, duplicate webhook URL, 10 webhook endpoints already saved, or image idempotency conflict / in-progress | Keep one key and payload per checkout attempt. Reuse the saved webhook endpoint instead of registering the URL again. Image 409 recovery is in `../patterns/image-processing.md`. |
| `413` | `IMAGE_TOO_LARGE` | Keep the file at or under 8 MiB. See `../patterns/image-processing.md`. |
| `415` | `UNSUPPORTED_IMAGE` | Use JPEG, PNG, or WebP and match the declared type to the file bytes. |
| `422` | Missing fields, ambiguous universal payload, unsupported direct bank path, a pending webhook forced active, or image field/read failures | Fix bank-specific fields, or prove the webhook with a successful test before expecting `active`. Image 422 codes spent an image credit; see `../patterns/image-processing.md`. |
| `429` | API-key quota/rate limit, queue/backlog protection, or a webhook test already pending | Honor `Retry-After` when present. For webhook tests, wait about 10 seconds and read the delivery row. |
| `500` | Unexpected platform failure | Capture `x-request-id`; retry with backoff only when the operation is idempotent. |
| `502` | Legacy `POST /api/verify/test-webhook` failed because of DNS, TLS, firewall, network, or timeout, or `IMAGE_PROVIDER_FAILURE` | Account webhook failures are on the delivery row, not this status. Inspect reachability and follow `../patterns/webhooks.md`. OCR provider failure spent an image credit; see `../patterns/image-processing.md`. |
| `503` | Queue unavailable after request record creation, or `IMAGE_PROCESSING_UNAVAILABLE` | Persist `requestId`, honor `Retry-After`, and poll later. Image unavailability spends no image credit. |
| `504` | `IMAGE_OCR_TIMEOUT` | OCR exceeded 30 seconds. The image credit was spent. See `../patterns/image-processing.md`. |

## Verification Error Codes

| `error.code` | Retryable | Meaning | User-facing guidance |
| --- | --- | --- | --- |
| `not_found` | false | Bank/provider did not find the transaction | Ask the user to verify receipt/reference, suffix, phone, and settlement timing. |
| `invalid_input` | false | Input accepted by API shape but invalid for provider | Fix normalization or validation before retrying. |
| `parse_error` | usually false | Provider response changed or could not be parsed | Capture requestId and escalate; avoid retry spam. |
| `upstream_invalid_response` | false unless advised | Provider returned unexpected non-retryable response | Capture requestId and bank; retry only after investigation. |
| `upstream_timeout` | true unless terminal path says otherwise | Provider or proxy timed out | Retry with backoff or use queued flow; show pending/retry UI. |
| `upstream_rate_limited` | true | Provider or platform throttled requests | Back off and reduce per-bank concurrency. |
| `upstream_unavailable` | true | Provider/network unavailable or 5xx | Retry later and show temporary outage message. |
| `unsupported_bank` | false | Bank unsupported by the verification path | Use a supported bank or fallback flow. |
| `unknown` | often true | Unclassified error | Capture requestId, response body, bank, and logs before deciding retry. |

## Retry Rules

- Retry only when `error.retryable === true` or the HTTP status clearly indicates a transient condition.
- Use exponential backoff with jitter for retryable failures.
- Honor `Retry-After` when present.
- Do not retry validation errors, unsupported-bank errors, idempotency conflicts, or insufficient-credit responses until the underlying condition changes.
- Do not create a new idempotency key for a retry of the same checkout attempt. Reusing the same key with the same payload is the protection.

## Fast Triage

1. If the request fails before reaching Verify.et, check API key location, CORS assumptions, and browser/mobile direct calls.
2. If `401` or `403`, inspect key permissions and server environment loading.
3. If `402`, check which balance is empty. `INSUFFICIENT_IMAGE_CREDITS` is the image-credit balance. Other `402` codes are verification credits.
4. If `409`, verify the user's retry path keeps the same payload for the same idempotency key.
5. If `422`, compare the payload to `bank-specs.md`.
6. If `202` is treated as failure, fix the code to persist `requestId` and poll/SSE/webhook.
7. If duplicates happen, use stable idempotency keys and a policy for `confirmationHistory.confirmedBefore`.
8. If webhooks fail, read the endpoint status and `webhook.test` delivery, then follow `../patterns/webhooks.md`.
9. If latency is high, stop depending on inline `waitMs`; use queued UX and provider-status-aware retries.
10. If `error.code` starts with `IMAGE_`, or is `INVALID_IMAGE`, `INVALID_IMAGE_FIELDS`, `INVALID_MULTIPART`, `UNSUPPORTED_IMAGE`, or `INSUFFICIENT_IMAGE_CREDITS`, follow `../patterns/image-processing.md`. Do not treat it as a webhook or text-verification failure.

## Related References

- Endpoint contract: `api-endpoints.md`
- Bank payloads: `bank-specs.md`
- Common anti-patterns: `../debugging/common-mistakes.md`
- Receipt images: `../patterns/image-processing.md`
