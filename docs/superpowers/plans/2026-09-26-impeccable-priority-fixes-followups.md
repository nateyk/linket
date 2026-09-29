# Impeccable priority fixes — deferred follow-ups & rulings

Companion to `docs/superpowers/plans/2026-09-26-impeccable-priority-fixes.md`.
Spec: `.impeccable/critique/2026-09-26T08-23-44Z__common-foundation-resources-client.md`.

Outcome: all 5 tasks shipped on `main` (`f5f54849..c1bc5b02`, 15 commits), final review
returned "Ready to merge **with fixes**", one 5-commit fix wave + scoped re-review followed.
Everything below was deferred during that run and previously lived only in the gitignored
`.superpowers/sdd/2026-09-26-impeccable-priority-fixes/progress.md` ledger — reproduced here
so the record survives. Rulings are verbatim (each carries its cost-if-wrong); the deferred
minors are the per-task review findings judged safe to park.

## Where to start (partner decisions, highest value first)

1. **`--be-destructive` used as text measures 3.38–4.44:1** (form error labels, outline/ghost
   danger buttons) — the only AA failure left standing. Needs a shared-token redesign decision:
   a darker red re-opens every white-on-destructive pair app-wide. See ruling below;
   all measured values are in `task-3-report.md`.
2. **Three landing images still bake the BELINK wordmark** — `public/images/landing/{links,biolink,qr-codes}.webp`
   (text P0 closed, pixel P0 open). Two are justified declines, one (`biolink.webp`) is a re-shoot
   the product can do today; all three are parked as marketing art direction. Partner call.
3. **Admin `roundnessOptions` still offers `none|sm|md|default`** — 3 of 4 violate DESIGN.md
   "Only 24px, 16px and 12px exist"; an admin can re-save `sm` and reintroduce the defect class
   Task 4 removed (one select away).
4. **`/dashboard` global search input carries `rounded-button`** — an input that renders as a
   24px button on the main dashboard screen; one-line fix in `global-search-input.tsx:38`.
5. **Local `.env:52` still `PAYPAL_PRODUCT_NAME="BeLink Subscription"`** — `env.example` is fixed,
   the live local env file is not (fresh installs are clean; this machine's copy is stale).
6. **Live Free row `max_storefronts: null` = unlimited** while pricing advertises "1 Storefront" —
   data Task 2 never touched; surface or fix with the partner.
7. **`public/images/landing/insights.webp` was re-shoot to Linket but is referenced nowhere**
   (neither code nor DB) — dead asset, mismatch with its siblings disclosed at re-review.

## Rulings (13, verbatim, each with cost-if-wrong)

1. Implement on `main`, not a worktree — a worktree would leave the ddev-served app and public/build pointing at the old tree and would strand a concurrent session's uncommitted changes; the session's five prior commits were accepted on `main`. — cost if wrong: mixed-history branches, recoverable by cherry-picking.
2. The concurrent session's ten uncommitted files are off limits to every implementer; each task stages only its own explicit file list — cost if wrong: a task that genuinely needs one of those files reports BLOCKED instead of silently committing someone else's work.
3. Task 1 renders the brand name as HTML text rather than editing SVG paths, since the wordmark's letters are vector outlines — cost if wrong: the lockup looks less like a crafted logo; the name becomes legible and correct either way.
4. Task 3 may change the accent value DESIGN.md pins, provided DESIGN.md is updated in the same commit — the spec's own token fails WCAG AA, and the partner chose accessibility in the critique's scope question; cost if wrong: brand hue drifts slightly, one-token revert.
5. Task 1 Important #2 (plan-mandated) — the brand name renders from `branding.site_name` (whose default resolves to Linket), NOT the literal string "Linket", everywhere except the pre-config install blade. The plan's own text said literal "Linket"; the reviewer showed that the literal (a) regressed my-order-shell.tsx from dynamic to static, (b) puts two name sources on one screen (auth-layout-v2.tsx:75 literal beside :62/:96 site_name), and (c) breaks the admin-configurable site name the app already ships. The spec's requirement is that one product name appears consistently, which site_name satisfies while the literal does not. — cost if wrong: slightly more plumbing than a constant; a one-commit revert if the partner wants white-label removed instead.
6. Task 2's sweep extends to the Pro side of PRODUCT.md:33 — `PRO_BENEFITS` seeds `commission_bps => 0` while PRODUCT.md:33 states Pro 5%, in the same file the task edits, and PRODUCT.md:57 says commission rates are facts. Reconcile the Pro seed to 500 bps (5%) rather than parking it. — the plan's Change 3 sweep was written around the Free 10% fact, so this is a scope extension taken on the plan's own authority (PRODUCT.md is the binding spec). — cost if wrong: if the product intent is actually 0% Pro, one line reverts and PRODUCT.md changes instead; there is no Pro row in the database, so nothing rendered depends on it today.
7. Task 3's acceptance gate ("every measured pair — light AND dark — >= 4.5:1 for normal text") covers the dark-mode hero `.light-island` "Pricing" button at 1.23:1 even though landing-page.tsx is not in Owns — the Done-when is a measurement gate over measured pairs, not a file list, and an effectively invisible hero button is the same defect class this task exists to fix; no other task owns landing-page.tsx, so there is no conflict. — cost if wrong: one extra file in the commit, revertible; and the button stays unreadable in dark mode if we defer it.
8. `--be-destructive` used AS TEXT (outline/ghost danger labels, form error text) measures 3.38–4.44 and is DEFERRED, not fixed here. The in-scope rule for fix round 1 was written around hover/alpha variants of tokens Task 3 already changed; the destructive token was not one of them, and fixing it means a shared-token redesign that cascades app-wide (darker red re-opens every white-on-destructive pair). That is a brand/design decision the partner should make, not one a P1 contrast task should absorb silently. — cost if wrong: form error text stays under AA until the follow-up pass; every measured value recorded in task-3-report.md so the follow-up starts from evidence.
9. Task 4 Important #1 (plan-mandated) — admin themes-settings `roundnessOptions` still offers none|sm|md|default, 3 of 4 violating DESIGN.md "Only 24px, 16px and 12px exist". DEFERRED as a follow-up, not fixed here: the brief explicitly required `.radius-sm` to survive as a legitimate theme option and Owns excludes the settings UI, so fixing it now would contradict the brief being executed. Routed to the polish pass + partner report. — cost if wrong: an admin can re-save 'sm' tomorrow and reintroduce inputs-looking-like-buttons; the migration proves the defect class is one select away. Mitigation: surfaced prominently in the final report.
10. Task 4 Important #2 (plan-mandated) — /dashboard's only real text field (global-search-input.tsx:38) carries `rounded-button` and renders 24px, so an input reads as a button on the main dashboard screen. DEFERRED as a follow-up: the component is outside the brief's Owns and the reviewer confirmed acceptance is satisfied by real 12px fields on /admin/users in both schemes. — cost if wrong: the exact violation this task restores everywhere else persists on one screen; one-line component fix in the polish pass, flagged to the partner.
11. Task 5 Important #2 (scope/Owns wording) — the header edits stay WITHOUT a prop gate, accepted. The brief's "shared header wiring only if a prop is required" was plan wording; the binding spec is the critique's "same public header with working anchors on both pages", and the reroute is keyed off hrefs the header itself defines (navigationItems/solutionsItems are landing-section anchors). Route-awareness belongs with the hrefs, not per-consumer opt-in: a prop would make every future page re-declare knowledge the header already has, and would let a page opt OUT of anchors that resolve correctly. The settle loop likewise must run on any hash-bearing landing load regardless of who set the hash, so prop-gating it would break plain deep links like /#features typed by a visitor. — cost if wrong: shared header carries route logic that a future page didn't ask for (though it is what its anchors need anyway); reverting to prop-gating is a small mechanical change. Landing plain visits proven byte-identical, so the regression risk the acceptance names is evidenced, not assumed. Minor #6 (settle loop arguably belongs in landing-page.tsx) recorded for the whole-branch pass.
12. Ruling (breaker adjudication, no second fix wave): all three residual image items PARKED and surfaced to the partner rather than fixed. links/qr-codes are justified declines whose resolution is marketing art direction; biolink.webp's decline was too quick on the technical side, but "what this asset should depict" is still the partner's content decision, and the skill's finish path routes residual load-bearing findings to the partner rather than to another fixer. — cost if wrong: the public landing keeps rendering BELINK in 3 of its 4 image sections (links, biolink, qr-codes) until the partner approves new art or copy; the text P0 stays closed, the pixel-level P0 stays open, and a future critique will re-flag it.
13. The plan workspace (`.superpowers/sdd/…`) is NOT deleted, contra the skill's clean-exit step — the final review returned "With fixes" rather than clean, and the deferred minors + every ruling lived only in that gitignored directory (final review's own M2). Until the partner says otherwise the record stays; with this file committed, the workspace may be deleted safely.

## Deferred minors (28, verbatim)

### Task 1 (brand)

- `redirect-error.blade.php:33` letter-spacing -0.01em vs tracking-tight -0.025em (DESIGN.md:237).
- `app-account-settings-page.tsx:41` rename preserved typo `linket-accunt-settings`.
- `use-datatable-route-type.ts:16` writer/reader pair only grep-protected (`as any` defeats tsc).
- Biolink watermarks now icon-only (biolink-layout.tsx:363, creator-profile-layout.tsx:573) — needs paired text, and creator-profile-layout.tsx belongs to the concurrent session.
- `env.example:1` APP_NAME=BeLink and `:56` PAYPAL_PRODUCT_NAME="BeLink Subscription" (fresh installs seed BeLink); `.env:52` same PayPal line. CI `MYSQL_DATABASE: belink_test` deliberately NOT renamed — would break CI. *(env.example fixed in final wave; `.env:52` still open.)*
- Evidence screenshot filenames `task1-login-390-dark.png` / `task1-dashboard-1440-light.png` appear swapped (contents correct).

### Task 2 (commission)

- New data-fix migration :37-43 — null/invalid JSON in storefront_benefits decodes to `[]` and gets a fee-only object, which makes `benefitsFor()` skip its default-plan fallback (all-null/unlimited entitlements on odd data). Fix: inject only when decoded array non-empty, or merge defaults first. *(superseded by final-wave commit `5d00b397`, which guards exactly this.)*
- Data-fix migration :30-31 — `first()` with no orderBy; only one row corrected if multiple free=true rows ever exist. Add `orderBy('id')` + loop, or document the invariant.
- `EntitlementSystemTest.php:530` pins only the display fact — nothing pinned `commission_bps=1000` as a literal, so a future half-edit (500 bps + 10% display) renders 10% while charging 5% and stays green. *(addressed in final wave `5d00b397` via `assertSame(1000, …)` at :538.)*

### Task 3 (a11y)

- `navigation-menu.tsx:79-86` — focus swap also dropped `focus:bg-accent focus:text-accent-foreground` that the trigger kept; mega-menu links lose tint-on-focus, undocumented.
- Migration `2026_09_28_000002:15-16` docblock says luminance 0.1044; actual Y=0.0912 (report says 0.0917) — wrong number committed.
- `task-3-report.md:110` says "7 pairs PASS" then lists 8 ratios — count wrong, values pass.
- Status labels now ride `text-primary-foreground` on positive/warning fills (alert.tsx:60-75, badge.tsx:19, button.tsx:70) — cross-token coupling; a dedicated `positive-foreground`/`warning-foreground` would express it.
- DESIGN.md gained `dark-positive`/`dark-warning` keys; `.impeccable/design.json` has no mirror entries (precedent: `primary-dark` exists).
- `npm run build` chunk-size warning is the only noise in reported verification output — confirm the diff's ~179 added lines didn't push it over threshold.
- *(obs)* `.impeccable/design.json` `extensions/motion[3]` still says "Filled buttons drop to 80% on hover" — same 80/95 drift just fixed in DESIGN.md.
- *(pre-existing)* DESIGN.md:176-178 "Confirm Green … never a solid slab behind text" contradicts the shipped solid positive button (button.tsx:70) and DESIGN.md:387-388.

### Task 4 (radius)

- `task-4-report.md:212-214` says "those four cells" are probes; raw output shows 10 of 32 (method line discloses categories correctly — count nit).
- Migration predicate widens beyond 'sm' to any non-default site radius (none/md/lg); no legitimate value lost, but docblock could state the widening is deliberate DESIGN.md enforcement.

### Task 5 (header)

- `header.tsx:133-135` four window listeners stay registered after the loop exits by settle/cap/gesture (harmless — they only set `stopped`, but dead).
- `header.tsx:103` `document.querySelector(href)` throws SyntaxError on a malformed selector and runs before the pathname check; all anchor sources are static kebab-case today, and `:84` pre-exists — wrap for parity with the Important fix.
- `header.tsx:76,78` `goToLandingSection` returns a boolean both call sites discard.
- `header.tsx:122-162` settle loop is landing scroll policy, not header concern — natural home `landing-page.tsx` (not owned); whole-branch pass to consider moving it.
- `header.tsx:75` off-landing anchor nav is a full document reload; header already sits in router context (LinkButton at :226) so `useNavigate` is available — revisit later.
- Contact z-10→z-50 and pricing newly-sticky were not requested; both align the pages with the landing header and computed styles verify sticky on both routes — acceptable, noted.
- *(obs, pre-existing)* `use-cookie.ts:73` same-class unguarded `decodeURIComponent` in `getCookie`, reached during render by color-scheme-provider on every route — a stray '%' cookie blanks the app the same way.
- *(obs, pre-existing)* `decode-backend-filters.ts:9` unguarded `decodeURIComponent` on a query param.
- Re-review noted no saved console log for the quoted URIError text itself (hash-error.cjs exists, stdout unwritten); blank-page screenshots + exact 65-char match corroborate it.

## Scheduled follow-ups (2, verbatim)

- Task 1: marketing binaries still bake the BELINK wordmark — `public/images/landing/{links,biolink,qr-codes,insights}.webp` (links.webp IS the hero image, visible in first viewport) and `public/images/verts/landing-top.webp`. Outside brief Owns; grep cannot see them. *(verts/landing-top.webp + insights.webp re-shot in final wave; the three landing images remain — see ruling 12.)*
- Task 3: destructive-as-text family (lowest 3.38 light hover) — needs a dedicated pass; plus non-text deferred items chart-2 2.08/3.76, storybook.css 3.76, manifest theme_color 3.76.

## Also surfaced to the partner at Finish

- Final-review accepted deferrals: I3 roundnessOptions + global-search-input (rulings 9–10), I4 `--be-destructive` as text (ruling 8), M3 pre-existing `max_storefronts` null=unlimited on the live Free row (data Task 2 never touched).
- Reviewer asymmetry note on I4: Task 3's "every measured pair ≥ 4.5:1" gate was not literally met — destructive-as-text is the one measured failure left, deliberately deferred as a brand decision.
