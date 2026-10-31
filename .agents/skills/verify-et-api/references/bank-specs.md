# Bank-Specific Payloads

Use this reference when building validation, normalizing user input, or debugging `422` responses.

## Supported Direct Verification Banks

`POST /api/verify` supports direct verification for:

- `cbe`
- `telebirr`
- `mpesa`
- `dashen`
- `boa`
- `cbebirr`
- `awash`
- `siinqee`
- `kaafiebirr`

`zemen` may appear in status or enum surfaces, but direct `POST /api/verify` returns unsupported for now.

## Explicit Bank Payload Matrix

| Bank | Required payload | Notes |
| --- | --- | --- |
| `cbe` | `reference` or `referenceNumber` | Default is the Receipt ID. No suffix. `receiptNumber` is an accepted alias; prefer `reference`. An older `FT` reference still needs an 8-digit `accountSuffix`. See CBE below. |
| `telebirr` | `transactionNumber` or `reference` | Use the provider transaction/reference number exactly as shown to the customer. |
| `mpesa` | `transactionNumber` or `reference` | Receipt URLs or SMS text may be parsed when passed as `reference`. |
| `dashen` | `referenceNumber` or `reference` | Universal detection recognizes the current Dashen reference pattern. |
| `boa` | `referenceNumber` or `reference`, plus `accountSuffix` | Suffix must be exactly 5 digits. |
| `cbebirr` | `receiptNumber` or `reference`, plus `phone` or `phoneNumber` | Phone may normalize from `09...` to `251...`; prefer storing normalized `251XXXXXXXXX`. |
| `awash` | `referenceNumber` or `reference` | Full receipt URLs or configured token fragments can be used. |
| `siinqee` | `referenceNumber` or `reference` | Full receipt URLs or configured token fragments can be used. |
| `kaafiebirr` | `referenceNumber` or `reference` | Full `https://receipt.ebirr.com/kaafimf/...` URLs auto-route; a bare token needs explicit `bank`. `phone` or `phoneNumber` is optional. See Kaafi Ebirr below. |

## Universal Router Payload

Use universal mode when the user's UI accepts mixed receipts and references:

```json
{
  "reference": "receipt, URL, SMS text, or transaction reference",
  "suffix": "optional suffix for an older CBE or BOA FT reference",
  "phoneNumber": "optional CBE Birr phone disambiguator"
}
```

Detection rules:

- A CBE Receipt ID, or a CBE receipt link, routes to CBE with no `suffix`.
- An older `FT...` reference needs `suffix`.
  - 8 digits routes CBE.
  - 5 digits routes Bank of Abyssinia.
- Legacy FT composite references can include the suffix in the same value.
- Ten-character alphanumeric references route to Telebirr unless `phoneNumber` routes them to CBE Birr.
- `phoneNumber` accepts normalized `251XXXXXXXXX` or local `09XXXXXXXX`.
- Known M-Pesa receipt URLs or SMS text can yield the transaction number.
- Known CBE, Awash, Siinqee, and Kaafi Ebirr receipt URL origins can route automatically.
- A bare Kaafi Ebirr receipt token does not auto-route. Send explicit `bank: "kaafiebirr"` or the full receipt URL.
- If universal detection is ambiguous, send explicit `bank`.

## Bank Notes

### CBE

Use the Receipt ID. It replaces the older reference number and does not take an account suffix. This is the default CBE input. Most new CBE verifications use it. Use the older `FT` reference only when the customer has no Receipt ID.

```json
{
  "bank": "cbe",
  "reference": "fHCxyTVljBclm6Yk4C"
}
```

`referenceNumber` is the same field. `receiptNumber` is an accepted alias; prefer `reference`. A link on `https://mbreciept.cbe.com.et/` is accepted, and the ID is the last path segment. The ID is 12 to 128 characters from letters, digits, `_`, and `-`. It is not an `FT` reference.

Do not send `accountSuffix` with a Receipt ID. If a suffix is sent anyway, it must be exactly 8 digits.

Older `FT` reference, only when there is no Receipt ID:

```json
{
  "bank": "cbe",
  "referenceNumber": "FT25356LL011",
  "accountSuffix": "03996978"
}
```

`accountSuffix` or `suffix` must be exactly 8 digits. The suffix may also be attached to the end of the `FT` reference. Treat `confirmationHistory.confirmedBefore` seriously in checkout flows because CBE references can be reused in support disputes or duplicate submissions.

### Telebirr

Use `transactionNumber` for explicit payloads. In universal mode, a ten-character alphanumeric reference without a phone disambiguator routes to Telebirr.

### M-Pesa

Use `transactionNumber` for explicit payloads. When the user pastes a supported M-Pesa receipt URL or SMS snippet, pass it as `reference` and allow extraction.

### Dashen

Use `referenceNumber` or `reference`. If universal detection fails, switch to explicit `bank: "dashen"` rather than guessing.

### Bank of Abyssinia

Always collect the 5-digit `accountSuffix` when verifying BOA FT-style references. Without the suffix, the same reference shape can be ambiguous with CBE.

### CBE Birr

Collect both receipt/reference and phone. Normalize phone numbers before storage and display. Use `251XXXXXXXXX` for API payloads when possible.

### Awash and Siinqee

Use full receipt URLs when available. Token-only references should be passed exactly as received from the bank/provider.

### Kaafi Ebirr

The bank id is `kaafiebirr`. A full receipt URL on `https://receipt.ebirr.com` whose path starts with `/kaafimf/` can be sent as `reference` with no `bank`. A bare token, such as `ilgi8ctn1Tr6vhw_so79kw`, does not auto-route.

```json
{
  "bank": "kaafiebirr",
  "referenceNumber": "https://receipt.ebirr.com/kaafimf/ilgi8ctn1Tr6vhw_so79kw"
}
```

`phone` or `phoneNumber` is optional wallet context. Use `251XXXXXXXXX`, or `09XXXXXXXX` and let the API normalize it. Send the phone only on an explicit `bank: "kaafiebirr"` payload. Universal URL detection submits the URL without that phone.

## Validation Strategy

- Validate bank-specific required fields before calling Verify.et.
- Normalize whitespace and obvious phone formatting at the user's boundary.
- Keep the original user input for support/audit if policy permits.
- Persist the normalized payload used with each `Idempotency-Key`.
- When validation fails, return a user-actionable message that names the missing disambiguator.

## Related References

- Endpoint contract: `api-endpoints.md`
- Error handling: `error-codes.md`
- Integration choices: `../patterns/integration-methods.md`
