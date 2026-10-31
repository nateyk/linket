---
name: verify-et-api
description: Integrate, test, debug, and harden Verify.et transaction verification API implementations. Use when building Verify.et server-side adapters, payment or checkout verification, account webhook registration (dashboard or API), webhook receivers and signing secrets, opt-in receipt image processing (QR or OCR), polling or SSE status flows, API-key auth, idempotency, credits or quota handling, bank-specific payloads, or production error handling.
license: MIT
metadata:
  author: Verify.et
  version: "1.3.0"
  category: integration
  tags:
    - api
    - verification
    - banking
    - webhooks
    - images
    - idempotency
---

# Verify.et API

This portable skill applies to backend integrations in Node.js, Python, PHP, Go, Java, Ruby, .NET, Rust, and mobile apps that proxy through a trusted backend.

## Core Workflow

1. Identify the integration surface: backend REST adapter, checkout/payment verification, webhook receiver, polling/SSE status UI, dashboard/reporting usage, or framework-specific wrapper.
2. Load only the references needed:
   - `references/api-endpoints.md` for auth, endpoints, payloads, responses, permissions, and status flow.
   - `references/bank-specs.md` for explicit bank payloads and universal-router disambiguators.
   - `references/error-codes.md` for HTTP failures, verification error codes, retry decisions, credits, quotas, and idempotency conflicts.
   - `patterns/integration-methods.md` for choosing sync, queued, webhook, polling, or SSE flows.
   - `patterns/webhooks.md` for account webhook setup (dashboard or API), the signing secret, test delivery, signatures, and retries.
   - `patterns/image-processing.md` for opt-in receipt photos, QR then OCR, image credits, and multipart upload.
   - `debugging/common-mistakes.md` for production anti-patterns.
   - `debugging/production-checklist.md` for pre-launch validation.
3. Inspect the user's code before changing it. Find where API keys and `VERIFY_ET_WEBHOOK_SECRET` are stored, where `POST /api/verify` is called, whether an account webhook is active, whether a receipt photo is sent as multipart, how `202` is handled, whether duplicate submissions are possible, and whether Verify.et calls run server-side.
4. Keep Verify.et API keys server-side. Browser and mobile clients should call the user's backend, not Verify.et directly.
5. Prefer one small server-side Verify.et client/adapter over scattered raw `fetch` calls.
6. Send an `Idempotency-Key` for payment and checkout attempts, and persist the returned Verify.et `requestId`.
7. Treat `200` as an inline terminal response and `202` as queued work. Register one account webhook, save its `whsec_` secret, and prove the endpoint is `active` before relying on it. For `202`, store `requestId`. Use polling or SSE only when a screen needs progress. Leave `webhookUrl` off once that endpoint is active. Details are in `patterns/webhooks.md`.
8. Treat `confirmationHistory.confirmedBefore === true` as a repeat-confirmation signal. Do not fulfill blindly without applying the product's duplicate-payment policy.
9. Add focused tests at the user's boundary: request builder tests, webhook signature tests, image-upload tests, polling tests, idempotency conflict tests, and error mapping tests.

## Integration Decisions

- Use `POST /api/verify?waitMs=...` only as a best-effort convenience. Production workflows must still work when Verify.et returns `202`.
- Register one account webhook when the backend must learn the result even if the browser or mobile app closes. The user can add it under API Keys → Webhooks, or call `POST /api/webhook-endpoints` with their API key. Save the secret, prove the endpoint is active, then leave `webhookUrl` off the verify request.
- Use polling when the client needs a simple pending-status screen.
- Use SSE when an authenticated web UI needs lower-latency updates without frequent polling.
- Use both webhooks and polling/SSE for robust checkout UX: webhook updates server truth; polling/SSE updates the visible user flow.
- Use explicit `bank` payloads when the product already knows the provider. Use universal `reference` payloads when the UI accepts mixed receipts or links. Optional `settlementAccount` checks that the receipt paid the expected receiver; details are in `references/api-endpoints.md`.
- Send a receipt photo only as an optional multipart `image` after Image Processing is enabled. QR and OCR are chosen by Verify.et. See `patterns/image-processing.md`.
- Put irreversible fulfillment behind terminal state checks, duplicate-confirmation policy checks, and `settlementAccountMatch` when the product uses receiver matching.

## Debugging Baseline

Before diagnosing, capture:

- Request method, URL, body shape, headers used, and whether the API key was server-side.
- HTTP status, response body, `x-request-id`, `Retry-After`, and `X-Verify-Cache`.
- Verify.et `requestId`, `processingStatus`, `status`, `error.code`, and `error.retryable`.
- Bank/provider, raw receipt/reference, suffix/phone/settlementAccount disambiguators, account webhook status, image-processing enabled state and balance, and any legacy per-request webhook URL.
- Whether the same checkout attempt reused the same `Idempotency-Key`.

## Security Rules

- Do not place `x-api-key` or `whsec_` values in frontend code, mobile apps, logs, screenshots, or committed files.
- Do not trust a webhook payload before the endpoint secret verifies the raw body. Rules are in `patterns/webhooks.md`.
- Store `VERIFY_ET_WEBHOOK_SECRET` in the server environment that serves the receiver. The API returns that secret once.
- Make webhook processing idempotent by `X-Webhook-Event-Id`.
- Honor `Retry-After` for rate limits and temporary unavailability.
- Keep logs useful but redacted: include `requestId`, bank, status, and error code; omit API keys, cookies, receipt image bytes, and full authorization headers.

## Dashboard Setup

Webhook registration can be done with the API key. Image Processing enablement and image-credit top-ups cannot. Other account settings may also exist only in the dashboard.

When one of those settings is missing:

1. Say what is missing, which page changes it, and what to copy back into the project.
2. Ask the user to choose. They can do it themselves, or they can explicitly allow a browser or computer-use tool to do it while they are signed in.
3. Do not open a browser, sign in, click through verify.et, or enable a plugin until they choose help for that task. A general request to integrate Verify.et is not that permission.
4. If no browser tool is available, ask before installing or enabling one.
5. Do not ask for, store, or type their password. They sign in themselves.
6. Do not submit a payment or image-credit top-up unless they explicitly ask to complete that payment and give the pack and payment reference.
7. After either path, prove the setting with the API. Webhook proof is in `patterns/webhooks.md`. Image Processing proof is `data.enabled: true` and a positive `data.balance` from `GET /api/image-processing`.

## Sources

Use the current public docs when internet access is available:

- `https://verify.et/docs/get-started`
- `https://verify.et/docs/api`
- `https://verify.et/docs/sdk`

If working inside the Verify.et repository, prefer implementation source over stale docs. Relevant source paths are listed in `references/api-endpoints.md`.
