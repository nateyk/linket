# Plan: Impeccable critique — priority fixes (linket)

Source: `.impeccable/critique/2026-09-26T08-23-44Z__common-foundation-resources-client.md` (score 25/40).
Scope agreed with the partner: **the five priority issues only** (2 P0 + 3 P1). Minor/P2-P3 observations are deferred to the later `/impeccable polish` run.

## Global Constraints

- **Branch:** `main`. Ruling recorded in the ledger: a worktree would strand the ddev-served app at `/home/nate/projects/linket` and the concurrent session's uncommitted work, so implementation continues on `main`, consistent with this session's five prior commits.
- **Commits are local only.** Never `git push`, never `git commit` with `-a`, never `git add -A` or `git add .`. Stage only the explicit file list this task owns. `.superpowers/` is git-ignored.
- **The working tree already carries unrelated uncommitted changes from a concurrent session.** Do not modify, revert, stage, or commit them: `common/foundation/resources/client/shadcn/avatar/avatar.tsx`, `common/foundation/resources/client/shadcn/image-crop/image-crop.tsx`, `common/foundation/resources/client/uploads/components/cropped-image-selector.tsx`, `opencode.json`, `public/build/manifest.json`, `resources/client/dashboard/stores/store-editor/content/widgets/shop-widget/shop-widget-renderer.tsx`, `resources/client/dashboard/stores/store-editor/creator-profile-editor.tsx`, `resources/client/digital-products/public/digital-product-public-pages.tsx`, `resources/client/digital-products/public/product-reviews-block.tsx`, `resources/client/digital-products/shared/product-card.tsx`.
- **Design truth:** `DESIGN.md` and `PRODUCT.md`. Where a finding forces a change to a value DESIGN.md pins, update DESIGN.md in the same commit and say so in the report. Never weaken `.impeccable/config.json` `ignoreValues` to make a check pass.
- **Build:** rendered output comes from `public/build`. Run `npm run build` after any change that must appear in a browser. `public/build/manifest.json` will show as modified — leave it unstaged.
- **Verification floor (run before reporting DONE):** `npx tsc --noEmit`; `npx oxlint <the files you changed>`; `npx vitest run`; `.opencode/skills/impeccable/scripts/impeccable detect --json resources/client` and `... common/foundation/resources/client` (both must print `[]` and exit 0; exit 2 = findings = fail).
- **Do not** run project-wide refactors, format unrelated files, or "clean up" code you were not asked to touch.
- **Never dispatch subagents.** Review arrives from the controller after your report.
- **App:** `https://linket.ddev.site` is already running — never start or stop servers. Login `admin@admin.com` / `password`.
- **Browser verification recipe** (no system Chromium otherwise):
  `export LD_LIBRARY_PATH=/tmp/opencode/libs/usr/lib/x86_64-linux-gnu` and `export NODE_PATH=/home/nate/projects/linket/node_modules`, write a `.cjs` script under `/tmp/opencode/`, run with `node`. Every Playwright context MUST set a real Chrome `userAgent` **and** `extraHTTPHeaders: { "sec-ch-ua": '"Google Chrome";v="131", "Not_A Brand";v="24"' }` — without it the server serves an unstyled crawler prerender instead of the SPA.
- **Commit message style:** `fix(<area>): <what changed>` — match `git log --oneline`.

## Task 1: Restore the Linket brand identity (P0)

The marketing surface sells "BeLink" while the product and footer say "Linket". PRODUCT.md:33 describes one product: "Linket gives a creator one polished bio page that is also a working storefront."

**Change 1 — copy.** In `resources/defaults/default-settings.php` replace `BeLink` with `Linket` at all four occurrences: line 65 ("…a full link-in-bio, BeLink gives you…"), line 194 ("…the rest of your BeLink dashboard."), line 204 ("BeLink scales with the features…"), line 242 ("…integrate BeLink into your stack."). These are defaults: check whether the installed DB `settings` table has stored copies of these strings (`DB::table('settings')` via `ddev php artisan tinker`) and update the stored rows too if present, so the rendered site changes without a re-seed.

**Change 2 — accessible names.** `public/images/favicon.svg`, `public/images/mobile-logo-dark.svg` and `public/images/mobile-logo-light.svg` each carry `aria-label="Belink favicon"` → `aria-label="Linket"`.

**Change 3 — the wordmark.** `public/images/logo-dark.svg` and `public/images/logo-light.svg` render "BELINK" as vector paths (1168×244 lockup), so the letters cannot be edited as text. They are referenced as settings defaults at `resources/defaults/default-settings.php:7,11` and `common/foundation/resources/defaults/default-settings.php:28,32`, and by `install-layout.blade.php:26` / `domain-connected-message.blade.php:17`. First search the repo for an existing Linket wordmark asset (any `logo*`/`wordmark*`/`brand*` in `public/`, `resources/`, or an SVG containing the text). If one exists, point the settings at it. If none exists — expected — replace the lockup usage with an icon-plus-text lockup: keep the icon glyph, render the brand name as HTML text "Linket" using DESIGN.md's heading roles (24px/600 for a header lockup), so the name is real text rather than paths. Apply consistently where the wordmark image renders (landing header/hero, auth layout, dashboard sidebar, install blade) and make sure both light and dark themes look correct.

**Ruling already on the record:** the brand name must be visible as text; the existing icon glyph may stay.

**Done when:** `grep -rni belink` across `resources/ common/ public/images/ config/ database/` (excluding `.ddev/ vendor/ node_modules/ public/build/`) returns no matches; the landing header, hero, auth screens and footer all read "Linket" in the browser at 1440 and 390; light and dark both verified; verification floor green.

**Owns:** `resources/defaults/default-settings.php`, `common/foundation/resources/defaults/default-settings.php`, `public/images/favicon.svg`, `public/images/mobile-logo-dark.svg`, `public/images/mobile-logo-light.svg`, the wordmark SVGs (replaced or retired), every component/blade that renders the wordmark, plus DB `settings` rows if stored copies exist.

## Task 2: Correct the Free plan commission to the documented fact (P0)

PRODUCT.md:33 is the fact: **Free 10%, Pro 5%**. PRODUCT.md:57: "Plan entitlements and commission rates are facts, not copy to be softened or rounded." The database ships Free at 5%.

**Change 1 — seed.** `database/migrations/2026_08_08_221006_simplify_plans_to_free_pro.php`: `FREE_BENEFITS['commission_bps'] = 1000` (line 11) and the feature string `'5% Linket transaction fee'` → `'10% Linket transaction fee'` (line 50).

**Change 2 — live data.** The installed DB row drives the rendered site: `products` id 1 (Free) has `commission_bps: 500` and `platform_fee_percent: 5` inside `storefront_benefits`, plus the `feature_list` JSON containing `"5% Linket transaction fee"`. Update all three to `1000`, `10` and `"10% Linket transaction fee"` via `ddev php artisan tinker` (or a small throwaway migration if that is the safer, reproducible route — say which you chose and why).

**Both fields matter:** `common/foundation/src/Billing/Products/ProductResource.php:121` builds the displayed feature from `platform_fee_percent`, while plan entitlement/checkout math reads `commission_bps`. Updating one alone re-creates the divergence the critique found.

**Change 3 — sweep.** `grep -rn "commission_bps\|platform_fee_percent\|transaction fee" database/ resources/ common/ config/` and reconcile every remaining hit with the 10% fact. Do not edit `.ddev/belink.sql` (untracked local dump).

**Done when:** the rendered pricing card and `/pricing` both read "10% Linket transaction fee"; a tinker query confirms `commission_bps = 1000` and `platform_fee_percent = 10`; no source file still claims 5%; verification floor green.

**Owns:** `database/migrations/2026_08_08_221006_simplify_plans_to_free_pro.php`, the `products` row for Free, any other seed/fixture carrying the 5% fact.

## Task 3: WCAG AA on the brand accent, touch targets, focus visibility (P1)

Measured failures (Assessment B): `#2b7fff` on white **3.76:1**, on `#eaf2ff` **3.34:1**, on `#fbfbfb` **3.63:1** (floor 4.5:1 at 14–16px); `#fcfcfc` on `#2b7fff` **3.67:1** (button labels); `#d2e3fd` on `#2b7fff` **2.89:1** (login promo copy); `#fcfcfc` on `#00a263` **3.22:1** and on `#b27b00` **3.57:1** (dashboard badges). Both directions on the accent fail, so only darkening the accent fixes both.

**Change 1 — the accent.** `config/themes.php:14` (`--be-primary`, light) is `oklch(62.3% 0.214 259.815)`; `:15` is `--be-primary-foreground`. Choose a darker lightness on the same hue (~259.8) whose **relative luminance ≤ 0.183**, which satisfies both directions at once (accent text on white ≥ 4.5:1 *and* white text on the accent ≥ 4.5:1). Compute the ratios rather than guessing — write the chosen value and every measured pair into the report. Check `--be-primary-foreground` still passes on the new value, and check the dark theme at `config/themes.php:49-50` too (Assessment B measured light mode only, so dark-mode ratios are yours to establish).

**Change 2 — DESIGN.md.** DESIGN.md pins the accent at line 5 (`primary: "oklch(62.3% 0.214 259.815)"`) and names it at line 161. Update both to the new value in the same commit — a design document that specifies a token which fails AA is itself the defect. Also update `.impeccable/design.json` if it mirrors that token.

**Change 3 — status badges.** Find the tokens behind `#00a263` and `#b27b00` (grep `themes.php` for `positive`/`warning` equivalents) and darken the pairs where white/near-white text sits on them to ≥ 4.5:1 at 12–14px.

**Change 4 — touch targets (390px).** Under 44×44: footer social links **16×16**, pricing Annual/Monthly radios **16×16**, login checkbox **16×16**, hamburger **32×32**, footer text links **20px** tall. Enlarge the hit area with padding/`min` sizing (WCAG 2.5.8 floor is 24×24; aim for 44 where it does not disturb the layout) without changing the visible glyph size — wrap or pad rather than scale the icon.

**Change 5 — focus visibility.** The landing header "Features" trigger computes `outline-style: none` on `:focus-visible`, leaving a color-only indicator. DESIGN.md:449 requires `focus-visible:outline-2` in the primary color on every interactive element. Give the trigger a visible ring.

**Done when:** every measured pair — light *and* dark — is ≥ 4.5:1 for normal text (≥ 3:1 only where text is genuinely ≥ 18.66px bold or ≥ 24px) and the report lists the measured ratios; a 390px re-probe shows no tappable element under 24×24 with the targets above at ≥ 44px where feasible; keyboard tab shows a visible ring on the Features trigger; screenshots at 1440 and 390, light and dark; verification floor green.

**Owns:** `config/themes.php`, `DESIGN.md`, `.impeccable/design.json` (if mirrored), the footer/nav/checkbox/radio components carrying the small targets, `common/foundation/resources/client/ui/landing-page/header/` focus styles.

## Task 4: Restore the Three-Radius Rule (P1)

`common/foundation/resources/views/framework.blade.php:14` applies `'radius-' . ($bootstrapData->initialTheme->radius ?? 'default')`, and the active value resolves to `sm`. `common-tailwind.css:172-178` maps `.radius-sm` button→`--radius-md` (6px) and input→`--radius-md` (6px), so fields read as buttons; cards land at 8px. DESIGN.md's Shapes section: controls are pills at 24px, fields softly squared at 12px "so an input never reads as a button", badges 16px, and "Only 24px, 16px and 12px exist."

**Change:** trace where `radius` is set on the theme/bootstrap data (start at `BaseBootstrapData` and `CssTheme`, then the settings row or config that supplies it) and set it to `default`, which `common-tailwind.css:59-63` already resolves to input 12 / button 24 / card 24 / badge 16 — exactly DESIGN.md. Do not delete the `.radius-sm` block: it remains a legitimate theme option, we just stop selecting it. If the value is stored in the DB, update the stored row as well as any default, and say which you changed.

**Done when:** rendered measurements in the browser — button 24px, input 12px, card 24px, badge 16px — on the landing, `/login`, and one dashboard screen, light and dark; verification floor green.

**Owns:** the theme radius source (config/settings/bootstrap), `framework.blade.php` only if the class expression itself must change.

## Task 5: Give `/pricing` and `/contact` the public header (P1)

`common/foundation/resources/client/billing/pricing-table/pricing-page.tsx:36-44` renders only `Navbar.AuthContent` ("Register | Login") and no menu — the DOM probe reports `navs: []` on both `/pricing` and `/contact`. The landing at `/` shows Features / Pricing / Contact / Dashboard / Sign In / Get Started. A visitor loses every exit on the page where the decision is made, and the CTA vocabulary changes mid-flow.

**Change:** render the same public header the landing uses (`Navbar.Menu position="landing-page"` plus the same auth content) on both `/pricing` and `common/foundation/resources/client/contact/contact-us-page.tsx`. Use the landing's existing `navigationItems` so the anchors stay in sync — do not hand-copy a second nav list.

**Out of scope (deferred minor):** the `max-w-6xl` vs `max-w-7xl` container mismatch on these pages. Do not change container widths in this task.

**Done when:** `/pricing` and `/contact` show the full header with working anchors at 1440 and 390 (mobile sheet included), the landing header is unchanged, and the verification floor is green.

**Owns:** `common/foundation/resources/client/billing/pricing-table/pricing-page.tsx`, `common/foundation/resources/client/contact/contact-us-page.tsx`, plus shared header wiring only if a prop is required.
