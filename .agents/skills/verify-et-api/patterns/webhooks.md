# Webhook Implementation

Use this reference when registering, testing, or receiving Verify.et account webhooks.

Register one HTTPS endpoint for the API-key owner. Verify.et then sends finished verifications to every active endpoint subscribed to the matching event. Do not put `webhookUrl` or `x-webhook-url` on `POST /api/verify` after that endpoint is active.

The user can register it in the dashboard, or the agent can register it with the user's API key. Both paths create the same endpoint, return one `whsec_` secret, and queue `webhook.test`.

## Dashboard Setup

The user can do these steps. Do not drive their browser until they agree. See Dashboard setup in `../SKILL.md`.

1. Open `https://verify.et/dashboard/api-keys/webhooks` (API Keys → Webhooks).
2. Add a public HTTPS URL the user's server controls, such as `https://your-app.com/webhooks/verify`.
3. Copy the `whsec_` value once into the server environment as `VERIFY_ET_WEBHOOK_SECRET`.
4. Deploy or restart the receiver so it is serving with that secret.
5. Click Send test, then use the proof steps below. The endpoint stays `pending_verification` until that test returns a `2xx`.

## API Setup

Use this when the agent has the user's `x-api-key` and `verification:write`. Build the receiver first. Creating an endpoint queues a test immediately, before the new secret can be loaded, so that first delivery often fails. That failure does not activate the endpoint.

```bash
curl -X POST "https://verify.et/api/webhook-endpoints" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $VERIFY_ET_API_KEY" \
  -d '{"url":"https://your-app.com/webhooks/verify"}'
```

`201` `data` is `{ secret, endpoint }`. `endpoint.status` is `pending_verification`. `secret` starts with `whsec_` and is not returned again.

1. Write `secret` to `VERIFY_ET_WEBHOOK_SECRET` in the server environment that serves this URL. Do not commit it, log it, or leave it only in the chat transcript.
2. Restart or redeploy so the running receiver has the secret.
3. If that write is lost, `POST /api/webhook-endpoints/:endpointId/rotate-secret` and store the new secret. The previous secret keeps verifying for 24 hours.

Omit `subscribedEvents` unless the user asked for extra events. The default is `verification.completed` plus `webhook.test`. Optional events are `verification.succeeded`, `verification.not_found`, and `verification.failed`. They are separate messages. `webhook.test` is always subscribed. Each endpoint has its own secret. Route methods, the account cap, permissions, and error statuses are in `../references/api-endpoints.md`.

## URL Rules

Production URLs must be HTTPS. Rejected URLs include localhost, `.local`, bare hostnames, URL credentials, addresses longer than 2048 characters, hosts that do not resolve, and hosts that resolve to a private or reserved address.

## Prove the Endpoint Works

`POST /api/webhook-endpoints/:endpointId/test` only queues a delivery. Its `200` body says the test was queued. It does not mean the receiver accepted it. A test already pending in the last 10 seconds returns `429`.

Send the test only after the receiver is public and loaded with the saved secret:

```bash
curl -X POST "https://verify.et/api/webhook-endpoints/$ENDPOINT_ID/test" \
  -H "x-api-key: $VERIFY_ET_API_KEY"
```

Then poll until both of these are true:

- `GET /api/webhook-endpoints/:endpointId` returns `data.status: "active"`.
- `GET /api/webhook-endpoints/:endpointId/deliveries?limit=5` returns a `data.items` entry for `webhook.test` with `status: "success"` and a `2xx` `httpStatus`. Pass `cursor` for the next page if the test is not in the first page.

The test event is `webhook.test`, `X-Webhook-Test` is `true`, and `requestId` is `req_webhook_test`. Return `204` and do not fulfill an order.

A failed delivery row has `status: "failed"`, `httpStatus`, and `error`. `401` usually means the secret was missing or the signature was checked after JSON parsing. A timeout means the URL is not publicly reachable or the handler exceeded 30 seconds. Fix the receiver and send the test again. Live verifications are delivered only to `active` endpoints. `pending_verification`, `paused`, and `disabled` do not receive them. A pending endpoint cannot be patched to `active`.

After it is active, call `POST /api/verify` with no callback URL. On `202`, store `requestId`. A later `verification.completed` delivery is the live proof. `links.webhookRegistered` does not report this endpoint; see `../references/api-endpoints.md`.

## Delivery

- Success is any `2xx`. Return `204`, then do the rest of the work.
- Up to 5 attempts: immediately, then 30s, 2m, 8m, and 30m. Network errors, `408`, `429`, and `5xx` are retried.
- Retries reuse `X-Webhook-Event-Id` and the same JSON body. The timestamp header is new, so verify the signature again, then skip an event id already handled.
- Timeout defaults to 30 seconds.
- During the 24-hour secret rotation window, `X-Webhook-Signature` can contain two comma-separated `sha256=` values. Accept either one.

## Signature

Account deliveries are signed with that endpoint's `whsec_` secret. Compare against the raw body, not parsed JSON.

```text
HMAC-SHA256(secret, X-Webhook-Timestamp + "." + rawBody)
```

Reject timestamps more than 5 minutes from the current time. Strip the `sha256=` prefix and compare the hex digest with a timing-safe equality check.

Headers:

- `Content-Type: application/json`
- `User-Agent: VerifyTransactions-Webhook/1.0`
- `X-Webhook-Event`
- `X-Webhook-Event-Id`
- `X-Webhook-Timestamp` (ISO, fresh on each attempt)
- `X-Webhook-Delivery-Id`
- `X-Webhook-Signature`
- `X-Webhook-Test: true` on test pings

## Payload

```json
{
  "id": "event-uuid",
  "event": "verification.completed",
  "requestId": "verification-request-uuid",
  "timestamp": "2026-02-20T12:00:02.500Z",
  "data": {
    "processingStatus": "completed",
    "status": "success",
    "verified": true,
    "bank": "cbe",
    "amount": "1500",
    "currency": "ETB",
    "senderName": "Abebe Bikila",
    "receiverName": "Acme Trading",
    "referenceNumber": "FT26EXAMPLE1",
    "receiptNumber": "fHCxyExampleRcpt1",
    "durationMs": 2340,
    "completedAt": "2026-02-20T12:00:02.340Z"
  }
}
```

Sender, receiver, receipt, phone, amount, and provider timestamp fields are always present and are null when Verify.et does not have them. `data.error` is present when the check does not verify. `confirmationHistory` and `settlementAccountMatch` are included only when Verify.et has them. Do not fulfill until `data.processingStatus` is terminal and the product's duplicate-confirmation policy passes.

## Older One-Off URL

`webhookUrl` and `x-webhook-url` still deliver once. If that URL is already a saved endpoint, Verify.et does not send a second copy. An unregistered URL is signed with Verify.et's platform secret, not with the endpoint `whsec_` stored as `VERIFY_ET_WEBHOOK_SECRET`.

`POST /api/verify/test-webhook` checks an unsaved URL inline and does not activate an account endpoint. Use the account test above instead.

## Node Receiver

```ts
import crypto from "node:crypto";
import express from "express";

const app = express();
const TOLERANCE_MS = 5 * 60 * 1000;

app.post("/webhooks/verify", express.raw({ type: "application/json" }), (req, res) => {
  const timestamp = req.header("X-Webhook-Timestamp") ?? "";
  const signature = req.header("X-Webhook-Signature") ?? "";
  const eventId = req.header("X-Webhook-Event-Id");
  const rawBody = req.body.toString("utf8");
  const secret = process.env.VERIFY_ET_WEBHOOK_SECRET ?? "";
  const sentAt = Date.parse(timestamp);

  if (!secret) return res.sendStatus(401);
  if (!Number.isFinite(sentAt) || Math.abs(Date.now() - sentAt) > TOLERANCE_MS) {
    return res.sendStatus(401);
  }

  const expected = crypto.createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
  const matches = signature.split(",").some((part) => {
    const actual = Buffer.from(part.trim().replace(/^sha256=/, ""));
    const expectedBuf = Buffer.from(expected);
    return actual.length === expectedBuf.length && crypto.timingSafeEqual(actual, expectedBuf);
  });
  if (!matches) return res.sendStatus(401);
  if (req.header("X-Webhook-Test") === "true") return res.sendStatus(204);

  const event = JSON.parse(rawBody);
  // Persist eventId ?? event.id idempotently, then enqueue fulfillment.
  return res.sendStatus(204);
});
```

Do not mount `express.json()` ahead of this route. Other languages use the same raw-body check; copyable Python and PHP receivers are on `https://verify.et/docs/sdk`.

## Related References

- Integration choices: `integration-methods.md`
- Endpoint contract: `../references/api-endpoints.md`
- Common mistakes: `../debugging/common-mistakes.md`
