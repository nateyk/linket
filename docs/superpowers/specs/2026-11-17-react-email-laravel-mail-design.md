# React Email + Laravel Mail Design

**Date:** 2026-11-17  
**Status:** Draft for review  
**Stack:** React Email templates → Node render bridge → Laravel Mail

## Goal

Make React Email the standard for Linket transactional HTML email. First wave: shared Linket shell plus order confirmation, email verification (OTP), and password reset — sent through the existing Laravel mailer (not Resend SDK).

## Background

- Most product mail is still `Mail::raw` (e.g. `SendStorefrontReceipt`) or ad-hoc `MailMessage` HTML (e.g. `VerifyEmailWithOtp`).
- Password reset uses Laravel’s `ResetPassword` notification with a SPA URL from `BaseUser::sendPasswordResetNotification`.
- Repo logos under `public/images/` are SVG-only; email clients are unreliable with SVG, so v1 uses a text **Linket** wordmark.
- Brand: quiet neutrals + one Counter Blue accent from `DESIGN.md` (`oklch(46% 0.214 259.815)` → hex for email, ~`#2563eb` class).
- Structural reference: [React Email Barebone demos](https://github.com/resend/react-email/tree/canary/apps/demo/emails/01-Barebone) (`activation`, `password-reset`, `subscription-confirmation`).

## Decisions

| Decision | Choice |
|---|---|
| Sending | Keep Laravel Mail |
| Rendering | Node script + PHP `ReactEmailRenderer` at send time |
| Templates | React Email + Tailwind `pixelBasedPreset` |
| Logo | Text wordmark (no new logo uploads) |
| Scope v1 | Shell + 3 templates + wire 3 existing send paths |
| Out of scope v1 | Resend SDK, SVG logos, migrating every Notification, full i18n inside TSX |

## Architecture (Approach A)

```
emails/*.tsx  --preview-->  npm run email (email dev)
      |
      v  (send time)
scripts/render-email.mjs  --JSON props-->  { html, text }
      |
      v
App\Mail\ReactEmailRenderer
      |
      v
Laravel Mailable / Notification / Job  -->  configured mailer
```

## Layout

```
emails/
  _components/
    linket-shell.tsx       # Html, Head, Tailwind, Preview, header, footer
    linket-theme.ts        # brand hex tokens for Tailwind config
  order-confirmation.tsx
  verify-email.tsx
  password-reset.tsx
  static/                  # reserved; empty in v1
scripts/
  render-email.mjs
app/Mail/
  ReactEmailRenderer.php
```

Package/scripts:

- Dev dependency: `react-email` (and whatever the current package requires for `render`)
- `package.json` script: `"email": "email dev --dir emails --port 3000"`

## Render bridge

### Node — `scripts/render-email.mjs`

- CLI: `--template <name>`; props as JSON on stdin (or `--props <file>`)
- Maps template name → `emails/<name>.tsx` default export
- Calls `render(element)` and `render(element, { plainText: true })`
- stdout: single JSON object `{ "html": string, "text": string }`
- Non-zero exit on unknown template or render failure

### PHP — `App\Mail\ReactEmailRenderer`

```php
/**
 * @param  array<string, mixed>  $props
 * @return array{html: string, text: string}
 */
public function render(string $template, array $props): array
```

- Runs `node scripts/render-email.mjs --template {template}` with JSON props on stdin via Symfony Process
- Working directory: project root; Node must be available in the runtime that sends mail (DDEV / app host)
- Reasonable timeout; throw a clear domain exception on failure
- Callers pass HTML/text into Laravel `Content` / `MailMessage` / `Mail::html` as appropriate

## Templates & props

Shared shell: optional preview text, footer line, app name/URL. Tone: minimal, one h1, short body, one primary CTA (except OTP verify which emphasizes the code).

### `order-confirmation` (Barebone: subscription-confirmation)

Replaces raw body in `App\Storefront\Jobs\SendStorefrontReceipt`.

| Prop | Type | Notes |
|---|---|---|
| `buyerName` | string | Fallback “there” already used today |
| `productName` | string | Product title |
| `orderId` | string | Order UUID |
| `amountLabel` | string | Pre-formatted total + currency |
| `storeName` | string \| optional | Creator/store label if available |
| `downloads` | `{ name: string, url: string }[]` | Signed download links |
| `expiresAtLabel` | string \| optional | Human expiry copy |
| `downloadLimitLabel` | string \| optional | e.g. “up to 10 times” |

CTA: primary button to first download URL when present; list remaining files as links.

### `verify-email` (Barebone: activation, adapted for OTP)

Replaces inline HTML in `Common\Auth\Notifications\VerifyEmailWithOtp`.

Linket’s current verify flow is **OTP**, not a magic link.

| Prop | Type | Notes |
|---|---|---|
| `otp` | string | Security code |
| `expiresInMinutes` | number | Default 30 (matches current copy) |
| `accountSettingsUrl` | string | Account settings deep link |
| `siteName` | string | `config('app.name')` |

No primary “Verify” URL button; large OTP display + account-settings link for unexpected requests.

### `password-reset` (Barebone: password-reset)

Replaces default Laravel `ResetPassword` mail styling via custom notification (or `toMailUsing` / overridden notification from `BaseUser::sendPasswordResetNotification`).

| Prop | Type | Notes |
|---|---|---|
| `name` | string | Notifiable name |
| `resetUrl` | string | Existing `url("password/reset/$token")` callback |
| `expiresInMinutes` | number | From `auth.passwords.*.expire` / sensible default |
| `siteName` | string | App name |

CTA: Reset password → `resetUrl`.

Each template exports `.PreviewProps` for `email dev`.

## First integrations

1. **`SendStorefrontReceipt`** — build props from order + entitlements; `Mail::html`/`Mail::send` with html+text instead of `Mail::raw`.
2. **`VerifyEmailWithOtp`** — `toMail` uses renderer output (HtmlString body or custom Mailable).
3. **Password reset** — custom notification or `ResetPassword::toMailUsing` that renders `password-reset`.

Later waves (same bridge, not v1): recovery link job, review notifications, moderation, payouts, ticket mailables, etc.

## Styling rules (email-safe)

- `Tailwind` + `pixelBasedPreset`; no `rem`-only assumptions
- No flex/grid; use `Section` / `Row` / `Column`
- No responsive variant prefixes (`sm:`, `md:`) or `dark:`
- Buttons: include `box-border`; borders: explicit `border-solid`
- Keep HTML under ~102KB; always provide plain text twin

## Testing

- Preview visually with `npm run email`
- Unit/feature: renderer returns html/text for fixture props (Process mocked or Node available in CI)
- Feature: receipt / verify / reset paths still send mail (`Mail::fake` + assert subject + that renderer was invoked or html contains key strings)
- No change to queue names (`mail` queue for receipts) unless required

## Risks & mitigations

| Risk | Mitigation |
|---|---|
| Node missing on mail worker | Document DDEV/host Node requirement; fail loudly in renderer |
| Process latency on send | Keep templates small; queue already used for receipts |
| OTP vs link confusion | Spec locks OTP for verify; Barebone activation is structure-only |
| i18n | v1 English in TSX; Laravel can pass localized strings as props later |

## Non-goals

- Embedding `@react-email/editor` in the dashboard
- Hosting email preview in production
- Replacing Telegram / database notification channels
---

## Approval record

- Approach A (Node bridge + Laravel Mail): approved  
- §1 Layout & folders: approved  
- §2 Render bridge + send contract: approved  
- §3 Templates & props: approved (verify clarified as OTP to match existing Linket)  
