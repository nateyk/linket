# Receipt Image Processing

Use this reference when the user's app accepts a receipt photo or screenshot.

Image upload is optional. A JSON `POST /api/verify` is unchanged. To send a photo, use `multipart/form-data` on the same endpoint and include one file part named `image`. The server reads a QR code first. When the QR cannot form a verification request, it reads the screenshot with Verify.et's high-quality OCR model. That model is the reason the feature is opt-in and billed separately from verification credits.

The caller does not choose QR or OCR. `imageProcessing.method` in the response is `qr` or `ocr`.

## Turn It On

Image Processing starts off. An API key cannot enable it or buy credits.

1. The billing owner opens `https://verify.et/dashboard/api-keys/image-processing` and enables Image Processing.
2. They add image credits on that page. Packs are `pack_1000` (1,000 credits / 500 ETB), `pack_5000` (5,000 / 2,500 ETB), and `pack_10000` (10,000 / 4,500 ETB). These credits are persistent and are not refilled monthly.
3. Confirm with the API key before uploading:

```bash
curl "https://verify.et/api/image-processing" \
  -H "x-api-key: $VERIFY_ET_API_KEY"
```

`data.enabled` must be `true` and `data.balance` must be at least 1. `data.canManage` is `false` for an API key. `PATCH /api/image-processing` and top-up submission require the billing owner's signed-in session and return `403` for an API key.

If the user would rather not click through the dashboard, follow Dashboard setup in `../SKILL.md` and ask before using a browser. Do not submit a credit top-up unless they explicitly ask and provide the pack and payment reference.

## Upload

`Idempotency-Key` is required. The key must be a non-empty string of at most 255 characters. Set the HTTP client timeout to at least 45 seconds. Do not set `Content-Type: application/json`. Let the client set the multipart boundary.

- One JPEG, PNG, or WebP file. The part name is `image`. The declared type must match the file bytes.
- File size at most 8 MiB. The whole request body must stay under 9 MiB.
- Optional text parts fill a value the photo does not show: `bank`, `reference`, `referenceNumber`, `transactionNumber`, `receiptNumber`, `accountSuffix` or `suffix`, `phone` or `phoneNumber`, and `settlementAccount`.
- Omit `webhookUrl` when an account webhook is active. See `webhooks.md`.
- A supplied value that disagrees with the image returns `422` `IMAGE_FIELD_CONFLICT`. Leave a field out rather than guessing.

```bash
curl -X POST "https://verify.et/api/verify" \
  -H "x-api-key: $VERIFY_ET_API_KEY" \
  -H "Idempotency-Key: receipt-order-123" \
  -F "image=@receipt.jpg;type=image/jpeg" \
  -F "bank=cbe" \
  -F "reference=fHCxyTVljBclm6Yk4C"
```

```ts
const form = new FormData();
form.append("image", new Blob([bytes], { type: "image/jpeg" }), "receipt.jpg");
form.append("bank", "cbe");
form.append("reference", "fHCxyTVljBclm6Yk4C");

const response = await fetch("https://verify.et/api/verify", {
  method: "POST",
  headers: {
    "x-api-key": process.env.VERIFY_ET_API_KEY!,
    "Idempotency-Key": idempotencyKey,
  },
  body: form,
  signal: AbortSignal.timeout(45_000),
});
```

Mobile and browser clients upload the photo to the user's backend. That backend calls Verify.et. Do not put the API key in the app.

## Response

`200` and `202` keep the normal verification body and add:

```json
{
  "imageProcessing": {
    "attemptId": "img_...",
    "method": "qr",
    "chargedCredits": 1
  }
}
```

Store `requestId` and keep the same `202`, polling, SSE, and webhook behavior as a text verification. `waitMs` applies only after the image has been read. A `202` is still queued work.

One accepted image spends one image credit. Verification credits are still charged by the normal terminal verification rules. A later read, field, queue, or verification failure does not refund the image credit. An empty, oversized, undecodable, or wrong-type file spends no image credit. `402` `INSUFFICIENT_CREDITS` is the verification-credit check and also spends no image credit.

The same idempotency key with the same file, text fields, and webhook URL replays the attempt and spends nothing more. A replay that already started verification returns `202` and the original `requestId`. A different file or different fields with that key returns `409` `IMAGE_IDEMPOTENCY_CONFLICT`. A read still running returns `409` `IMAGE_PROCESSING_IN_PROGRESS` with `Retry-After: 45`.

A queue failure stays on the same key. Wait for `Retry-After`, then send the same image and fields again. That retry does not spend another image credit. A failed read is sticky for that key: the same key returns the stored failure. Changing the photo or the text fields needs a new idempotency key, and that new attempt spends another image credit.

## Errors

| Status | `error.code` | What to do |
| --- | --- | --- |
| `400` | `IMAGE_IDEMPOTENCY_KEY_REQUIRED` | Send a valid `Idempotency-Key`. |
| `400` | `IMAGE_REQUIRED` | Send exactly one file part named `image`. |
| `400` | `INVALID_IMAGE` | The file is empty or cannot be decoded. |
| `400` | `INVALID_IMAGE_FIELDS` | Text parts must be unique allowed strings of at most 2048 characters. |
| `400` | `INVALID_MULTIPART` | The body is not valid multipart form data. Do not set `Content-Type: application/json`. |
| `402` | `INSUFFICIENT_CREDITS` | Verification balance is empty. No image credit was spent. |
| `402` | `INSUFFICIENT_IMAGE_CREDITS` | Image balance is empty. The body includes `error.balance` and `error.required`. Top up on the Image Processing page. |
| `403` | `IMAGE_PROCESSING_DISABLED` | The billing owner has not enabled uploads. |
| `409` | `IMAGE_IDEMPOTENCY_CONFLICT` | This key was used with a different image or fields. |
| `409` | `IMAGE_PROCESSING_IN_PROGRESS` | Retry the same key after `Retry-After` (45 seconds). |
| `413` | `IMAGE_TOO_LARGE` | Keep the file at or under 8 MiB and the body under 9 MiB. |
| `415` | `UNSUPPORTED_IMAGE` | Use JPEG, PNG, or WebP, and match the declared type to the bytes. |
| `422` | `IMAGE_FIELD_CONFLICT` | Remove the text field that disagrees with the image. Use a new idempotency key. The first attempt already spent an image credit. |
| `422` | `IMAGE_EXTRACTION_INCOMPLETE` | The photo is missing a bank field. The image credit was spent. A new key is required to add the missing field. |
| `422` | `IMAGE_UNREADABLE` | The QR and OCR read could not produce a verification request. The image credit was spent. The same key replays this failure. |
| `429` | `QUEUE_SATURATED` | Wait for `Retry-After`, then retry the same key. No extra image credit. |
| `502` | `IMAGE_PROVIDER_FAILURE` | The OCR model failed. The image credit was spent. The same key replays this failure. |
| `503` | `IMAGE_PROCESSING_UNAVAILABLE` | Image processing is temporarily unavailable. No image credit was spent. |
| `503` | `QUEUE_UNAVAILABLE` | Wait for `Retry-After`, then retry the same key. No extra image credit. |
| `504` | `IMAGE_OCR_TIMEOUT` | OCR exceeded 30 seconds. The image credit was spent. The same key replays this failure. |

Account routes other than the status check are listed in `../references/api-endpoints.md`.

## Privacy

The original upload and the OCR document are not stored. After verification starts, a metadata-stripped JPEG is held for review. Successful verification deletes it. A failed verification keeps it for at most 14 days, and only the signed-in billing owner can open it. Do not log image bytes.

## Related References

- Endpoint catalog: `../references/api-endpoints.md`
- Bank fields the extracted receipt must satisfy: `../references/bank-specs.md`
- Webhooks: `webhooks.md`
- HTTP recovery: `../references/error-codes.md`
