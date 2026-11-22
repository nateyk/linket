# Email branding logo + button radius Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Inject settings logo (non-SVG) and theme button radius into every React Email render so transactional mail matches admin branding.

**Architecture:** `EmailBranding` resolves logo URL + site name + button radius px from settings/`css_themes`. `ReactEmailRenderer::render` merges those props as defaults (caller props win). `LinketShell` and shared CTAs consume `logoUrl` / `siteName` / `buttonBorderRadiusPx`.

**Tech Stack:** Laravel 13 / PHP 8.4, Pest, React Email TSX, Vitest if shell DOM tests exist.

## Global Constraints

- Logo preference: `branding.logo_dark` → `branding.logo_light` → site name text.
- Skip image when path/URL ends with `.svg` (case-insensitive).
- Button radius map: `none`→0, `sm`→6, `md`→8, `default`/unknown→24.
- Merge branding inside renderer so call sites stay unchanged.
- Visible copy in app UI still uses `<Trans>`; email TSX may keep English (existing pattern).
- No new dependencies. Do not commit unless asked.

---

## File map

| File | Role |
|---|---|
| `app/Mail/EmailBranding.php` | Resolve branding props array |
| `tests/Unit/Mail/EmailBrandingTest.php` | Preference, SVG skip, absolute URL, radius map |
| `app/Mail/ReactEmailRenderer.php` | Merge branding defaults into props |
| `tests/Unit/Mail/ReactEmailRendererTest.php` | Assert merge (or focused new test) |
| `emails/_components/linket-shell.tsx` | Logo Img or siteName text; pass radius context |
| `emails/_components/linket-message.tsx` | Button radius |
| `emails/password-reset.tsx` | Button radius |
| `emails/order-confirmation.tsx` | Button radius |
| `emails/verify-email.tsx` | Pass branding into shell if needed |

---

### Task 1: EmailBranding helper (TDD)

**Files:**
- Create: `app/Mail/EmailBranding.php`
- Create: `tests/Unit/Mail/EmailBrandingTest.php`

**Produces:**
- `EmailBranding::props(): array{siteName: string, logoUrl: ?string, buttonBorderRadiusPx: int}`

- [ ] **Step 1:** Write Pest unit tests for logo preference, SVG skip, absolute URL, radius map, siteName fallback.
- [ ] **Step 2:** Run `ddev artisan test --compact tests/Unit/Mail/EmailBrandingTest.php` — expect fail.
- [ ] **Step 3:** Implement `EmailBranding` using `settings()`, `CssTheme::query()->where('default_light', true)->value('radius')`, `url()` / `PublicMediaUrl` as needed.
- [ ] **Step 4:** Re-run tests — pass.

### Task 2: Merge branding in ReactEmailRenderer

**Files:**
- Modify: `app/Mail/ReactEmailRenderer.php`
- Modify: `tests/Unit/Mail/ReactEmailRendererTest.php` (or add unit covering merge via stub branding)

**Produces:**
- `render()` uses `array_merge(app(EmailBranding::class)->props(), $props)` (caller wins).

- [ ] **Step 1:** Failing test that merged props include `buttonBorderRadiusPx` / `logoUrl` when branding is bound.
- [ ] **Step 2:** Implement merge; keep fallback path working.
- [ ] **Step 3:** Run renderer + branding tests.

### Task 3: LinketShell + CTA radius

**Files:**
- Modify: `emails/_components/linket-shell.tsx`
- Modify: `emails/_components/linket-message.tsx`
- Modify: `emails/password-reset.tsx`
- Modify: `emails/order-confirmation.tsx`
- Modify: `emails/verify-email.tsx` (pass siteName/logo into shell if props available)

**Produces:**
- Header Img when `logoUrl` set; else siteName text.
- Buttons use inline `borderRadius: ${buttonBorderRadiusPx}px` instead of `rounded-full`.

- [ ] **Step 1:** Update shell props + header.
- [ ] **Step 2:** Thread `buttonBorderRadiusPx` (default 24) through templates/buttons.
- [ ] **Step 3:** Rebuild email bundle if repo requires `scripts/dist/render-email.*` update (`npm run` script that builds it — check package.json).
- [ ] **Step 4:** Run related PHP feature tests for password-reset / verify-email / storefront receipt if they assert HTML.

### Task 4: Verify

- [ ] Run `ddev artisan test --compact --filter=EmailBranding`
- [ ] Run `ddev artisan test --compact --filter=ReactEmail`
- [ ] Confirm samples command still green (`SendEmailTemplateSamplesCommandTest`)
