# Portal sign-in OTP + missing email templates

**Date:** 2026-11-22  
**Status:** Approved for implementation (user chose A + remaining missing templates)

## Goal

1. My Portal buyer sign-in OTP uses a dedicated large-digit React Email template.
2. Migrate the remaining non–React Email paths onto shared Linket shell templates.
3. Extend `mail:send-template-samples` so inbox QA covers every registered template.

## Templates

| Name | Purpose |
|---|---|
| `portal-sign-in` | 6-digit My Portal OTP, 10‑min expiry, link to `/my-portal` |
| `renewal-reminder` | Direct Pro renewal reminder (replaces `MailMessage`) |
| `ops-alert` | Short ops/admin alerts (replaces `Mail::raw` payment/Verify.et notices) |

Existing `verify-email`, `password-reset`, `order-confirmation`, `message` stay as-is.

## Wiring

- `SendDigitalProductOrderRecoveryLink` → `portal-sign-in`
- `DirectRenewalReminder::toMail` → `renewal-reminder` via `ReactEmailMailable`
- `ReconcilePendingVerifications` + `VerifyEtFailureHandler` → `ops-alert`

## Samples

`mail:send-template-samples` sends one sample per registered template (7 total after this).
