# React Email + Laravel Mail Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add React Email as Linket’s transactional email standard — shared shell, order confirmation, OTP verify, password reset — rendered via Node and sent through Laravel Mail.

**Architecture:** Templates live in `emails/`. `scripts/render-email.tsx` (run with `tsx`) accepts a template name + JSON props and prints `{ html, text }`. `App\Mail\ReactEmailRenderer` shells out to that script. `App\Mail\ReactEmailMailable` wraps the result for Laravel (`htmlString` + a tiny plain-text Blade view). First wire-ups: `SendStorefrontReceipt`, `VerifyEmailWithOtp`, and password reset via a Linket notification replacing stock `ResetPassword` mail.

**Tech Stack:** React Email (`react-email` + `tsx`), React 19, Laravel 13 / PHP 8.4 (DDEV), PHPUnit, Symfony Process.

**Spec:** `docs/superpowers/specs/2026-11-17-react-email-laravel-mail-design.md`

## Global Constraints

- Brand accent hex for email: `#0049cc` (from DESIGN.md Counter Blue `oklch(46% 0.214 259.815)`); neutrals soft ink `#3f3f3f`, muted `#8b8b8b`, page bg `#f5f5f5`, card `#ffffff`.
- Text **Linket** wordmark only — no SVG/WEBP logo uploads in v1.
- Structure inspired by Barebone demos; do not copy Barebone logo/social assets or `mobile:` media-query utilities.
- Use `Tailwind` + `pixelBasedPreset` from `react-email`. Buttons need `box-border`; borders need `border-solid`.
- Laravel `Content` in this project supports `htmlString` but **not** `textString` — plain text goes through Blade view `resources/views/emails/react-email-plain.blade.php`.
- PHP/Artisan/tests via DDEV: `ddev artisan test --compact …`.
- Node must be available wherever mail is rendered (DDEV app container / host used by queue workers).
- Do not migrate every Notification in v1 — only the three integrations below.
- Do not commit, push, or open a PR unless the user explicitly asks.
- Do not stage unrelated files (`NUL`, `public/build/manifest.json`, etc.).

---

## File Structure

**Create**
- `emails/_components/linket-theme.ts` — Tailwind theme tokens + `pixelBasedPreset`
- `emails/_components/linket-shell.tsx` — Html/Head/Body/Container/header/footer
- `emails/order-confirmation.tsx`
- `emails/verify-email.tsx`
- `emails/password-reset.tsx`
- `scripts/render-email.tsx` — CLI renderer
- `app/Mail/ReactEmailRenderer.php`
- `app/Mail/ReactEmailMailable.php`
- `app/Mail/ReactEmailRenderException.php`
- `app/Notifications/LinketResetPasswordNotification.php`
- `resources/views/emails/react-email-plain.blade.php`
- `tests/Unit/Mail/ReactEmailRendererTest.php`
- `tests/Unit/Mail/ReactEmailMailableTest.php`
- `tests/Feature/ReactEmailStorefrontReceiptTest.php` (or extend existing receipt tests)
- `tests/Feature/ReactEmailVerifyEmailTest.php`
- `tests/Feature/ReactEmailPasswordResetTest.php`

**Modify**
- `package.json` — add `react-email`, `tsx` (dev); script `"email": "email dev --dir emails --port 3000"`
- `tsconfig.json` — include `emails` (and `scripts` if needed for typecheck)
- `app/Storefront/Jobs/SendStorefrontReceipt.php` — use renderer + mailable
- `common/foundation/src/Auth/Notifications/VerifyEmailWithOtp.php` — return ReactEmailMailable
- `common/foundation/src/Auth/Models/BaseUser.php` — notify `LinketResetPasswordNotification`

---

### Task 1: Install tooling + theme/shell + Node/PHP render bridge

**Files:**
- Create: `emails/_components/linket-theme.ts`
- Create: `emails/_components/linket-shell.tsx`
- Create: `emails/order-confirmation.tsx` (minimal stub first — full copy in Task 2 is fine if stub is the real shell smoke template)
- Create: `scripts/render-email.tsx`
- Create: `app/Mail/ReactEmailRenderException.php`
- Create: `app/Mail/ReactEmailRenderer.php`
- Create: `app/Mail/ReactEmailMailable.php`
- Create: `resources/views/emails/react-email-plain.blade.php`
- Create: `tests/Unit/Mail/ReactEmailRendererTest.php`
- Create: `tests/Unit/Mail/ReactEmailMailableTest.php`
- Modify: `package.json`
- Modify: `tsconfig.json` `include` array to add `"emails"`, `"scripts"`

**Interfaces:**
- Consumes: Node + `tsx` at `base_path()`, Symfony Process
- Produces:
  - `ReactEmailRenderer::render(string $template, array $props): array{html: string, text: string}`
  - `ReactEmailMailable::__construct(string $html, string $text, string $subjectLine)` with `envelope()` / `content()`
  - CLI: `npx tsx scripts/render-email.tsx --template <name>` + props JSON on stdin → stdout JSON

- [ ] **Step 1: Write the failing PHPUnit tests**

Create `tests/Unit/Mail/ReactEmailRendererTest.php`:

```php
<?php

namespace Tests\Unit\Mail;

use App\Mail\ReactEmailRenderException;
use App\Mail\ReactEmailRenderer;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class ReactEmailRendererTest extends TestCase
{
    #[Test]
    public function it_parses_html_and_text_from_a_successful_script(): void
    {
        $script = base_path('tests/fixtures/react-email/fake-render.mjs');
        $renderer = new ReactEmailRenderer(
            nodeBinary: 'node',
            scriptPath: $script,
            timeoutSeconds: 10,
        );

        $result = $renderer->render('order-confirmation', ['buyerName' => 'Ada']);

        $this->assertSame('<p>Hello Ada</p>', $result['html']);
        $this->assertSame('Hello Ada', $result['text']);
    }

    #[Test]
    public function it_throws_when_script_exits_non_zero(): void
    {
        $script = base_path('tests/fixtures/react-email/failing-render.mjs');
        $renderer = new ReactEmailRenderer(
            nodeBinary: 'node',
            scriptPath: $script,
            timeoutSeconds: 10,
        );

        $this->expectException(ReactEmailRenderException::class);

        $renderer->render('missing', []);
    }
}
```

Create `tests/fixtures/react-email/fake-render.mjs`:

```js
import { readFileSync } from 'node:fs';

const args = process.argv.slice(2);
const templateIdx = args.indexOf('--template');
const template = templateIdx >= 0 ? args[templateIdx + 1] : '';
const props = JSON.parse(readFileSync(0, 'utf8') || '{}');
const name = props.buyerName ?? 'there';

process.stdout.write(
  JSON.stringify({
    html: `<p>Hello ${name}</p>`,
    text: `Hello ${name}`,
    template,
  }),
);
```

Create `tests/fixtures/react-email/failing-render.mjs`:

```js
console.error('boom');
process.exit(1);
```

Create `tests/Unit/Mail/ReactEmailMailableTest.php`:

```php
<?php

namespace Tests\Unit\Mail;

use App\Mail\ReactEmailMailable;
use App\Models\User;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class ReactEmailMailableTest extends TestCase
{
    #[Test]
    public function it_exposes_html_and_plain_text(): void
    {
        $mailable = new ReactEmailMailable(
            html: '<p>Hello</p>',
            text: 'Hello',
            subjectLine: 'Test subject',
        );

        $mailable->assertHasSubject('Test subject');
        $mailable->assertSeeInHtml('Hello');
        $mailable->assertSeeInText('Hello');
    }
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `ddev artisan test --compact tests/Unit/Mail/ReactEmailRendererTest.php tests/Unit/Mail/ReactEmailMailableTest.php`

Expected: FAIL (classes / fixtures missing)

- [ ] **Step 3: Install npm packages and scripts**

```bash
npm install react-email
npm install -D tsx
```

Add to `package.json` scripts:

```json
"email": "email dev --dir emails --port 3000"
```

Ensure `tsconfig.json` `include` contains `"emails"` and `"scripts"`.

- [ ] **Step 4: Implement theme + shell**

`emails/_components/linket-theme.ts`:

```ts
import { pixelBasedPreset, type TailwindConfig } from 'react-email';

export const linketEmailTailwindConfig: TailwindConfig = {
  presets: [pixelBasedPreset],
  theme: {
    extend: {
      colors: {
        brand: '#0049cc',
        ink: '#3f3f3f',
        muted: '#8b8b8b',
        page: '#f5f5f5',
        card: '#ffffff',
        line: '#e5e5e5',
      },
    },
  },
};
```

`emails/_components/linket-shell.tsx`:

```tsx
import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Preview,
  Section,
  Tailwind,
  Text,
} from 'react-email';
import type { ReactNode } from 'react';
import { linketEmailTailwindConfig } from './linket-theme';

interface LinketShellProps {
  preview: string;
  children: ReactNode;
  footerNote?: string;
}

export function LinketShell({
  preview,
  children,
  footerNote = 'You received this email because of activity on your Linket account.',
}: LinketShellProps) {
  return (
    <Html lang="en">
      <Tailwind config={linketEmailTailwindConfig}>
        <Head />
        <Body className="bg-page m-0 font-sans text-ink">
          <Preview>{preview}</Preview>
          <Container className="mx-auto my-8 max-w-[560px] px-4">
            <Section className="mb-6">
              <Text className="m-0 text-xl font-semibold text-brand">Linket</Text>
            </Section>
            <Section className="rounded-2xl border border-solid border-line bg-card px-8 py-8">
              {children}
            </Section>
            <Hr className="border border-solid border-line my-8" />
            <Text className="m-0 text-center text-xs text-muted">{footerNote}</Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
```

- [ ] **Step 5: Implement Node renderer**

`scripts/render-email.tsx`:

```tsx
import { readFileSync } from 'node:fs';
import { render } from 'react-email';
import { createElement } from 'react';

type TemplateModule = {
  default: (props: Record<string, unknown>) => React.ReactElement;
};

const registry: Record<string, () => Promise<TemplateModule>> = {
  'order-confirmation': () => import('../emails/order-confirmation'),
  'verify-email': () => import('../emails/verify-email'),
  'password-reset': () => import('../emails/password-reset'),
};

function parseArgs(argv: string[]) {
  const templateIdx = argv.indexOf('--template');
  if (templateIdx < 0 || !argv[templateIdx + 1]) {
    throw new Error('Missing --template <name>');
  }
  return { template: argv[templateIdx + 1] };
}

async function main() {
  const { template } = parseArgs(process.argv.slice(2));
  const loader = registry[template];
  if (!loader) {
    throw new Error(`Unknown template: ${template}`);
  }

  const raw = readFileSync(0, 'utf8');
  const props = raw.trim() ? JSON.parse(raw) : {};
  const mod = await loader();
  const element = createElement(mod.default, props);
  const html = await render(element);
  const text = await render(element, { plainText: true });

  process.stdout.write(JSON.stringify({ html, text }));
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
```

Add minimal stub templates so the registry imports resolve (full content in Task 2). Example stub for each file:

```tsx
import { Heading, Text } from 'react-email';
import { LinketShell } from './_components/linket-shell';

export default function Stub() {
  return (
    <LinketShell preview="Stub">
      <Heading as="h1">Stub</Heading>
      <Text>Replace in Task 2.</Text>
    </LinketShell>
  );
}
```

- [ ] **Step 6: Implement PHP bridge + mailable**

`app/Mail/ReactEmailRenderException.php`:

```php
<?php

namespace App\Mail;

use RuntimeException;

final class ReactEmailRenderException extends RuntimeException
{
}
```

`app/Mail/ReactEmailRenderer.php`:

```php
<?php

namespace App\Mail;

use Symfony\Component\Process\Exception\ProcessFailedException;
use Symfony\Component\Process\Process;

final class ReactEmailRenderer
{
    public function __construct(
        private readonly ?string $nodeBinary = null,
        private readonly ?string $scriptPath = null,
        private readonly int $timeoutSeconds = 30,
    ) {
    }

    /**
     * @param  array<string, mixed>  $props
     * @return array{html: string, text: string}
     */
    public function render(string $template, array $props): array
    {
        $node = $this->nodeBinary ?? 'node';
        $script = $this->scriptPath ?? base_path('scripts/render-email.tsx');
        $tsx = base_path('node_modules/.bin/tsx');

        $command = str_ends_with($script, '.mjs')
            ? [$node, $script, '--template', $template]
            : [$node, $tsx, $script, '--template', $template];

        $process = new Process(
            command: $command,
            cwd: base_path(),
            timeout: $this->timeoutSeconds,
        );
        $process->setInput(json_encode($props, JSON_THROW_ON_ERROR));

        try {
            $process->mustRun();
        } catch (ProcessFailedException $e) {
            throw new ReactEmailRenderException(
                'React Email render failed: '.$process->getErrorOutput(),
                previous: $e,
            );
        }

        /** @var array{html?: mixed, text?: mixed} $decoded */
        $decoded = json_decode($process->getOutput(), true, flags: JSON_THROW_ON_ERROR);

        if (! is_string($decoded['html'] ?? null) || ! is_string($decoded['text'] ?? null)) {
            throw new ReactEmailRenderException('React Email render returned invalid JSON payload.');
        }

        return [
            'html' => $decoded['html'],
            'text' => $decoded['text'],
        ];
    }
}
```

`resources/views/emails/react-email-plain.blade.php`:

```blade
{{ $body }}
```

`app/Mail/ReactEmailMailable.php`:

```php
<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

final class ReactEmailMailable extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $html,
        public string $text,
        public string $subjectLine,
    ) {
    }

    public function envelope(): Envelope
    {
        return new Envelope(subject: $this->subjectLine);
    }

    public function content(): Content
    {
        return new Content(
            htmlString: $this->html,
            text: 'emails.react-email-plain',
            with: ['body' => $this->text],
        );
    }
}
```

- [ ] **Step 7: Run unit tests — expect pass**

Run: `ddev artisan test --compact tests/Unit/Mail/ReactEmailRendererTest.php tests/Unit/Mail/ReactEmailMailableTest.php`

Expected: PASS

- [ ] **Step 8: Smoke the real Node renderer (manual)**

```bash
echo '{"buyerName":"Ada","productName":"Demo","orderId":"ord_1","amountLabel":"10.00 ETB","downloads":[{"name":"file.pdf","url":"https://example.com/d"}]}' \
  | npx tsx scripts/render-email.tsx --template order-confirmation
```

Expected: JSON with `html` and `text` keys (after Task 2 templates are complete; with stubs, still valid JSON).

- [ ] **Step 9: Commit (only if user asked)**

```bash
git add package.json package-lock.json tsconfig.json emails scripts app/Mail resources/views/emails/react-email-plain.blade.php tests/Unit/Mail tests/fixtures/react-email
git commit -m "$(cat <<'EOF'
Add React Email render bridge for Laravel Mail.

EOF
)"
```

---

### Task 2: Full Linket email templates

**Files:**
- Modify: `emails/order-confirmation.tsx`
- Modify: `emails/verify-email.tsx`
- Modify: `emails/password-reset.tsx`

**Interfaces:**
- Consumes: `LinketShell`, `linketEmailTailwindConfig` tokens via shell
- Produces: default-export components with typed props + `.PreviewProps` matching the spec

- [ ] **Step 1: Implement `order-confirmation.tsx`**

```tsx
import { Button, Heading, Link, Text } from 'react-email';
import { LinketShell } from './_components/linket-shell';

export interface OrderConfirmationEmailProps {
  buyerName: string;
  productName: string;
  orderId: string;
  amountLabel: string;
  storeName?: string;
  downloads: Array<{ name: string; url: string }>;
  expiresAtLabel?: string;
  downloadLimitLabel?: string;
}

export default function OrderConfirmationEmail({
  buyerName,
  productName,
  orderId,
  amountLabel,
  storeName,
  downloads,
  expiresAtLabel,
  downloadLimitLabel,
}: OrderConfirmationEmailProps) {
  const primaryUrl = downloads[0]?.url;

  return (
    <LinketShell preview={`Your receipt for ${productName}`}>
      <Heading as="h1" className="m-0 mb-4 text-2xl font-semibold text-ink">
        Thanks for your purchase
      </Heading>
      <Text className="m-0 mb-4 text-base text-ink">
        Hi {buyerName}, your order for <strong>{productName}</strong>
        {storeName ? <> from {storeName}</> : null} is confirmed.
      </Text>
      <Text className="m-0 mb-1 text-sm text-muted">Order {orderId}</Text>
      <Text className="m-0 mb-6 text-sm text-muted">Total {amountLabel}</Text>
      {primaryUrl ? (
        <Button
          href={primaryUrl}
          className="box-border rounded-full bg-brand px-5 py-3 text-center text-sm font-medium text-white no-underline"
        >
          Download files
        </Button>
      ) : null}
      {downloads.length > 0 ? (
        <>
          <Text className="mt-6 mb-2 text-sm font-medium text-ink">Your downloads</Text>
          {downloads.map((file) => (
            <Text key={file.url} className="m-0 mb-1 text-sm">
              <Link href={file.url} className="text-brand no-underline">
                {file.name}
              </Link>
            </Text>
          ))}
        </>
      ) : null}
      {expiresAtLabel ? (
        <Text className="mt-4 mb-0 text-xs text-muted">Links expire {expiresAtLabel}.</Text>
      ) : null}
      {downloadLimitLabel ? (
        <Text className="mt-1 mb-0 text-xs text-muted">{downloadLimitLabel}</Text>
      ) : null}
    </LinketShell>
  );
}

OrderConfirmationEmail.PreviewProps = {
  buyerName: 'Ada',
  productName: 'Launch Checklist',
  orderId: 'ord_demo_123',
  amountLabel: '250.00 ETB',
  storeName: 'Ada Studio',
  downloads: [
    { name: 'checklist.pdf', url: 'https://example.com/download/1' },
    { name: 'bonus.zip', url: 'https://example.com/download/2' },
  ],
  expiresAtLabel: 'in 7 days',
  downloadLimitLabel: 'Each file can be downloaded up to 10 times.',
} satisfies OrderConfirmationEmailProps;
```

- [ ] **Step 2: Implement `verify-email.tsx` (OTP)**

```tsx
import { Heading, Link, Text } from 'react-email';
import { LinketShell } from './_components/linket-shell';

export interface VerifyEmailProps {
  otp: string;
  expiresInMinutes: number;
  accountSettingsUrl: string;
  siteName: string;
}

export default function VerifyEmail({
  otp,
  expiresInMinutes,
  accountSettingsUrl,
  siteName,
}: VerifyEmailProps) {
  return (
    <LinketShell preview={`${siteName} security code`}>
      <Heading as="h1" className="m-0 mb-4 text-2xl font-semibold text-ink">
        Your {siteName} security code
      </Heading>
      <Text className="m-0 mb-6 text-5xl font-bold tracking-wide text-ink">{otp}</Text>
      <Text className="m-0 mb-4 text-base text-ink">
        This code will expire in {expiresInMinutes} minutes.
      </Text>
      <Text className="m-0 text-sm text-muted">
        If you did not request this code, go to{' '}
        <Link href={accountSettingsUrl} className="text-brand no-underline">
          Account settings
        </Link>{' '}
        and change your password right away.
      </Text>
    </LinketShell>
  );
}

VerifyEmail.PreviewProps = {
  otp: '482913',
  expiresInMinutes: 30,
  accountSettingsUrl: 'https://example.com/account-settings',
  siteName: 'Linket',
} satisfies VerifyEmailProps;
```

- [ ] **Step 3: Implement `password-reset.tsx`**

```tsx
import { Button, Heading, Text } from 'react-email';
import { LinketShell } from './_components/linket-shell';

export interface PasswordResetEmailProps {
  name: string;
  resetUrl: string;
  expiresInMinutes: number;
  siteName: string;
}

export default function PasswordResetEmail({
  name,
  resetUrl,
  expiresInMinutes,
  siteName,
}: PasswordResetEmailProps) {
  return (
    <LinketShell preview={`Reset your ${siteName} password`}>
      <Heading as="h1" className="m-0 mb-4 text-2xl font-semibold text-ink">
        Reset your password
      </Heading>
      <Text className="m-0 mb-4 text-base text-ink">
        Hi {name}, we received a request to reset your {siteName} password.
      </Text>
      <Button
        href={resetUrl}
        className="box-border rounded-full bg-brand px-5 py-3 text-center text-sm font-medium text-white no-underline"
      >
        Reset password
      </Button>
      <Text className="mt-6 mb-0 text-sm text-muted">
        This link expires in {expiresInMinutes} minutes. If you did not request a reset, you can
        ignore this email.
      </Text>
    </LinketShell>
  );
}

PasswordResetEmail.PreviewProps = {
  name: 'Ada',
  resetUrl: 'https://example.com/password/reset/demo-token',
  expiresInMinutes: 60,
  siteName: 'Linket',
} satisfies PasswordResetEmailProps;
```

- [ ] **Step 4: Preview + CLI smoke**

```bash
npm run email
# and
echo '{"otp":"123456","expiresInMinutes":30,"accountSettingsUrl":"https://example.com/account-settings","siteName":"Linket"}' \
  | npx tsx scripts/render-email.tsx --template verify-email
```

Expected: preview UI loads; CLI prints JSON with OTP visible in `html`/`text`.

- [ ] **Step 5: Commit (only if user asked)**

```bash
git add emails
git commit -m "$(cat <<'EOF'
Add Linket React Email templates for receipt, OTP, and reset.

EOF
)"
```

---

### Task 3: Wire `SendStorefrontReceipt`

**Files:**
- Modify: `app/Storefront/Jobs/SendStorefrontReceipt.php`
- Create: `tests/Feature/ReactEmailStorefrontReceiptTest.php`

**Interfaces:**
- Consumes: `ReactEmailRenderer::render('order-confirmation', …)`, `ReactEmailMailable`
- Produces: queued HTML+text receipt instead of `Mail::raw`

- [ ] **Step 1: Write the failing feature test**

```php
<?php

namespace Tests\Feature;

use App\Mail\ReactEmailMailable;
use App\Mail\ReactEmailRenderer;
use App\Storefront\Jobs\SendStorefrontReceipt;
use Illuminate\Support\Facades\Mail;
use Mockery;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class ReactEmailStorefrontReceiptTest extends TestCase
{
    #[Test]
    public function receipt_job_sends_react_email_mailable(): void
    {
        Mail::fake();

        $this->mock(ReactEmailRenderer::class, function ($mock) {
            $mock->shouldReceive('render')
                ->once()
                ->with('order-confirmation', Mockery::type('array'))
                ->andReturn([
                    'html' => '<p>Receipt</p>',
                    'text' => 'Receipt',
                ]);
        });

        // Seed a paid StorefrontOrder with buyer_email + product + entitlement
        // using the same factories/helpers as existing storefront receipt tests.
        // Then:
        // (new SendStorefrontReceipt($order->id, force: true))->handle();

        Mail::assertSent(ReactEmailMailable::class, function (ReactEmailMailable $mail) {
            return $mail->subjectLine === __('Your digital product receipt')
                && str_contains($mail->html, 'Receipt');
        });
    }
}
```

Reuse existing order/entitlement factories from storefront feature tests in this repo (search `SendStorefrontReceipt` / `receipt_sent_at` tests and copy the seed setup verbatim into this test file).

- [ ] **Step 2: Run test — expect fail**

Run: `ddev artisan test --compact --filter=ReactEmailStorefrontReceiptTest`

Expected: FAIL (still `Mail::raw` / no mailable)

- [ ] **Step 3: Update the job**

In `SendStorefrontReceipt::handle()`, replace the `Mail::raw(...)` block with:

```php
$renderer = app(ReactEmailRenderer::class);
$rendered = $renderer->render('order-confirmation', [
    'buyerName' => $buyerName,
    'productName' => $order->product->title,
    'orderId' => $order->uuid,
    'amountLabel' => $total,
    'downloads' => $links->values()->all(),
    'expiresAtLabel' => $order->entitlements->min('expires_at')?->toDayDateTimeString(),
    'downloadLimitLabel' => __('Each file can be downloaded up to 10 times.'),
]);

Mail::to($order->buyer_email)->send(new ReactEmailMailable(
    html: $rendered['html'],
    text: $rendered['text'],
    subjectLine: __('Your digital product receipt'),
));
```

Keep lock, status checks, `receipt_sent_at`, and delivery status updates unchanged.

- [ ] **Step 4: Run test — expect pass**

Run: `ddev artisan test --compact --filter=ReactEmailStorefrontReceiptTest`

Expected: PASS

- [ ] **Step 5: Commit (only if user asked)**

```bash
git add app/Storefront/Jobs/SendStorefrontReceipt.php tests/Feature/ReactEmailStorefrontReceiptTest.php
git commit -m "$(cat <<'EOF'
Send storefront receipts with React Email HTML.

EOF
)"
```

---

### Task 4: Wire `VerifyEmailWithOtp`

**Files:**
- Modify: `common/foundation/src/Auth/Notifications/VerifyEmailWithOtp.php`
- Create: `tests/Feature/ReactEmailVerifyEmailTest.php`

**Interfaces:**
- Consumes: `ReactEmailRenderer::render('verify-email', …)`
- Produces: `toMail()` returns `ReactEmailMailable` (Laravel allows Mailables from notifications)

- [ ] **Step 1: Write failing test**

```php
<?php

namespace Tests\Feature;

use App\Mail\ReactEmailMailable;
use App\Mail\ReactEmailRenderer;
use App\Models\User;
use Common\Auth\Notifications\VerifyEmailWithOtp;
use Illuminate\Support\Facades\Notification;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class ReactEmailVerifyEmailTest extends TestCase
{
    #[Test]
    public function verify_email_notification_uses_react_email_mailable(): void
    {
        $this->mock(ReactEmailRenderer::class, function ($mock) {
            $mock->shouldReceive('render')
                ->once()
                ->with('verify-email', \Mockery::on(function (array $props) {
                    return ($props['otp'] ?? null) === '123456'
                        && ($props['expiresInMinutes'] ?? null) === 30;
                }))
                ->andReturn(['html' => '<p>123456</p>', 'text' => '123456']);
        });

        $user = User::factory()->create();
        $notification = new VerifyEmailWithOtp('123456');
        $mailable = $notification->toMail($user);

        $this->assertInstanceOf(ReactEmailMailable::class, $mailable);
        $this->assertStringContainsString('123456', $mailable->html);
    }
}
```

- [ ] **Step 2: Run — expect fail**

Run: `ddev artisan test --compact --filter=ReactEmailVerifyEmailTest`

Expected: FAIL (`toMail` still returns `MailMessage`)

- [ ] **Step 3: Implement**

Replace `VerifyEmailWithOtp::toMail` body with:

```php
public function toMail($notifiable): ReactEmailMailable
{
    $rendered = app(ReactEmailRenderer::class)->render('verify-email', [
        'otp' => $this->otp,
        'expiresInMinutes' => 30,
        'accountSettingsUrl' => url('account-settings'),
        'siteName' => config('app.name'),
    ]);

    return new ReactEmailMailable(
        html: $rendered['html'],
        text: $rendered['text'],
        subjectLine: __('Your :site security code is :code', [
            'site' => config('app.name'),
            'code' => $this->otp,
        ]),
    );
}
```

Add imports for `App\Mail\ReactEmailMailable` and `App\Mail\ReactEmailRenderer`. Keep `via(['mail'])`.

- [ ] **Step 4: Run — expect pass**

Run: `ddev artisan test --compact --filter=ReactEmailVerifyEmailTest`

Expected: PASS

- [ ] **Step 5: Commit (only if user asked)**

```bash
git add common/foundation/src/Auth/Notifications/VerifyEmailWithOtp.php tests/Feature/ReactEmailVerifyEmailTest.php
git commit -m "$(cat <<'EOF'
Render email verification OTP with React Email.

EOF
)"
```

---

### Task 5: Wire password reset

**Files:**
- Create: `app/Notifications/LinketResetPasswordNotification.php`
- Modify: `common/foundation/src/Auth/Models/BaseUser.php` (`sendPasswordResetNotification`)
- Create: `tests/Feature/ReactEmailPasswordResetTest.php`

**Interfaces:**
- Consumes: same reset URL callback as today (`url("password/reset/$token")`)
- Produces: `LinketResetPasswordNotification` → `ReactEmailMailable` via `password-reset` template
- `expiresInMinutes`: use `60` unless a passwords expire config exists in this app; keep constant documented in notification

- [ ] **Step 1: Write failing test**

```php
<?php

namespace Tests\Feature;

use App\Mail\ReactEmailMailable;
use App\Mail\ReactEmailRenderer;
use App\Models\User;
use App\Notifications\LinketResetPasswordNotification;
use Illuminate\Support\Facades\Notification;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class ReactEmailPasswordResetTest extends TestCase
{
    #[Test]
    public function password_reset_uses_linket_react_email_notification(): void
    {
        Notification::fake();

        $this->mock(ReactEmailRenderer::class, function ($mock) {
            $mock->shouldReceive('render')
                ->andReturn(['html' => '<p>Reset</p>', 'text' => 'Reset']);
        });

        $user = User::factory()->create(['name' => 'Ada']);
        $user->sendPasswordResetNotification('demo-token');

        Notification::assertSentTo(
            $user,
            LinketResetPasswordNotification::class,
            function (LinketResetPasswordNotification $notification) use ($user) {
                $mailable = $notification->toMail($user);
                return $mailable instanceof ReactEmailMailable
                    && str_contains($mailable->html, 'Reset');
            },
        );
    }
}
```

- [ ] **Step 2: Run — expect fail**

Run: `ddev artisan test --compact --filter=ReactEmailPasswordResetTest`

Expected: FAIL (still `ResetPassword`)

- [ ] **Step 3: Implement notification + BaseUser hook**

`app/Notifications/LinketResetPasswordNotification.php`:

```php
<?php

namespace App\Notifications;

use App\Mail\ReactEmailMailable;
use App\Mail\ReactEmailRenderer;
use Illuminate\Notifications\Notification;

final class LinketResetPasswordNotification extends Notification
{
    public function __construct(public string $token)
    {
    }

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): ReactEmailMailable
    {
        $resetUrl = url('password/reset/'.$this->token);
        $name = is_string($notifiable->name ?? null) && $notifiable->name !== ''
            ? $notifiable->name
            : __('there');

        $rendered = app(ReactEmailRenderer::class)->render('password-reset', [
            'name' => $name,
            'resetUrl' => $resetUrl,
            'expiresInMinutes' => 60,
            'siteName' => config('app.name'),
        ]);

        return new ReactEmailMailable(
            html: $rendered['html'],
            text: $rendered['text'],
            subjectLine: __('Reset Password Notification'),
        );
    }
}
```

Update `BaseUser::sendPasswordResetNotification`:

```php
public function sendPasswordResetNotification(mixed $token): void
{
    $this->notify(new \App\Notifications\LinketResetPasswordNotification($token));
}
```

(Prefer a real `use` import at top of `BaseUser.php` instead of FQCN.)

- [ ] **Step 4: Run — expect pass**

Run: `ddev artisan test --compact --filter=ReactEmailPasswordResetTest`

Expected: PASS

- [ ] **Step 5: Regression sweep**

Run:

```bash
ddev artisan test --compact tests/Unit/Mail/ReactEmailRendererTest.php tests/Unit/Mail/ReactEmailMailableTest.php tests/Feature/ReactEmailStorefrontReceiptTest.php tests/Feature/ReactEmailVerifyEmailTest.php tests/Feature/ReactEmailPasswordResetTest.php
```

Expected: all PASS

- [ ] **Step 6: Commit (only if user asked)**

```bash
git add app/Notifications/LinketResetPasswordNotification.php common/foundation/src/Auth/Models/BaseUser.php tests/Feature/ReactEmailPasswordResetTest.php
git commit -m "$(cat <<'EOF'
Send password reset mail through React Email.

EOF
)"
```

---

## Spec coverage self-review

| Spec item | Task |
|---|---|
| Shared shell + theme / wordmark | Task 1–2 |
| Barebone-inspired templates | Task 2 |
| Node render CLI | Task 1 |
| PHP `ReactEmailRenderer` | Task 1 |
| Laravel Mail (not Resend) | Tasks 3–5 |
| Order confirmation + downloads[] | Task 2 + 3 |
| Verify OTP (not magic link) | Task 2 + 4 |
| Password reset URL | Task 2 + 5 |
| Preview via `npm run email` | Task 1 script + Task 2 |
| Plain text twin | Task 1 mailable + Blade |
| Out of scope (other notifications, Resend, SVG) | Not scheduled |

## Placeholder scan

No TBD/TODO steps. Feature receipt seed setup intentionally points implementers at existing storefront receipt test helpers — copy that seed block in full when implementing Task 3 (do not leave a stub assert without creating the order).

## Type consistency

- Template names: `order-confirmation`, `verify-email`, `password-reset`
- Renderer return: `array{html: string, text: string}`
- Mailable ctor: `(string $html, string $text, string $subjectLine)`
- Brand hex: `#0049cc` everywhere in email theme
