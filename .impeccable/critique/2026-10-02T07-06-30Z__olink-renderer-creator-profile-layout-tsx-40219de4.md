---
target: creator-profile-layout.tsx (Creator profile sections tabs)
total_score: 22
max_score: 32
na_heuristics: 9,10
p0_count: 0
p1_count: 3
target_identity: "file:/home/nate/projects/linket/resources/client/short-links/renderers/biolink-renderer/creator-profile-layout.tsx"
target_fingerprint: "sha256:f62c7ef5ae1a686cfd97d2d47f8df13c4147772295db1c7bff5ea64d8e2b1064"
target_path: /home/nate/projects/linket/resources/client/short-links/renderers/biolink-renderer/creator-profile-layout.tsx
timestamp: 2026-10-02T07-06-30Z
slug: olink-renderer-creator-profile-layout-tsx-40219de4
---
# Critique — creator-profile-layout.tsx (Creator profile sections tabs)

Method: dual-agent (A: ses_f04ac5313ffe6fHtks3HS6mKOS · B: ses_f04ac5310ffeQVBfczAjCx3Hu9)
Target: resources/client/short-links/renderers/biolink-renderer/creator-profile-layout.tsx
No browser automation in this harness — browser visualization skipped; evidence is source + compiled CSS + CLI detector.

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Active tab double-signaled with two different colors (blue label, ink underline). |
| 2 | Match System / Real World | 3 | Plain labels; mobile treats "Profile" as a tab while desktop treats it as a column. |
| 3 | User Control and Freedom | 3 | Tabs reversible, but no URL/hash state — back/refresh drops the About view. |
| 4 | Consistency and Standards | 2 | Three color tokens across a two-tab control; desktop defaults `products` vs mobile `profile`; same line-tabs pattern styled differently in product-tabs.tsx; raw `aria-label` beside `<Trans>`; physical `ml-5/border-l-2/pl-4` in an RTL-ready system. |
| 5 | Error Prevention | 3 | Conditional rendering prevents dead tabs; `hasProducts` duplicated (151-155 vs 473-477); `at(-1)` shop-widget selection can hide a real section. |
| 6 | Recognition Rather Than Recall | 3 | Everything visible; socials aria-labels read like editor field names; creator `h1` truncated with no reveal (329). |
| 7 | Flexibility and Efficiency | 2 | Roving tabindex free, but no deep links, no scroll restoration, 27px hit target. |
| 8 | Aesthetic and Minimalist Design | 3 | Quiet token-driven chrome; dead `rounded-button`/`h-[calc]` classes, mismatched active pair, banned `[&>span:last-child]` selector. |
| 9 | Help Users Recognize, Diagnose, and Recover from Errors | n/a | Read-only public storefront — no task flow to recover from. |
| 10 | Help and Documentation | n/a | Public bio page in Experience/Persuade territory. |

**Total: 22/32 (69%) — Acceptable (top edge).** Applicable max 32; heuristics 9 and 10 scored n/a.

## Design Specificity Verdict

Half-authored for Linket. The composition is specific: 360px sticky identity column vs product column, biolink semantic tokens everywhere, conditional Products/About IA keyed to widget state, contrast-computed muted text. The tab bar itself is stock shadcn `variant="line"` fought with DOM-position selectors — `rounded-button` triggers that never show a pill, a duplicate `h-[calc(100%-1px)]`, a raw-English `aria-label`, and an active-label override that the compiled CSS proves loses to the shared component's (0,2,0) group rule. Sits next to product-tabs.tsx's different styling of the same pattern: two divergent implementations of one Linket pattern.

## Deterministic Scan (Assessment B)

Exit 0, 1 finding: `design-system-radius` at line 263 (`borderRadius: calc(... - 4px)` in the avatar inner-radius) — flagged as a probable false positive; the 4px is the documented `p-1` avatar pad subtracted inside `calc()`, not a standalone radius token. Browser visualization skipped (no browser automation available).

## Overall Impression

The page's structure and token discipline are real; the tab control and the page's scroll shell are where it falls apart. The single biggest opportunity: make the sticky creator card actually stick (it currently cannot, because of `overflow-hidden` on the layout wrapper) — which is also the user's stated "page fully scrollable / sticky card" request.

## What's Working

1. **Conditional IA done properly** — tabs render only when both sections exist (480-521); single-section pages degrade to the bare section; `showHeading={false}` kills the duplicated "Products" heading.
2. **Token discipline with engineering behind it** — every color resolves through `--biolink-*`; muted contrast is computed ≥4.5:1 (biolink-appearance.ts:458-476); the indicator recolor at 489 correctly discards stock `bg-background`.
3. **Platform-adaptive shell** — sticky column + inline tabs at ≥896px, thumb-zone `BottomNavBar` with safe-area inset on mobile, one `compact` switch for preview.

## Priority Issues

**[P1] Three color tokens across a two-tab control — this file's active-color override is dead code.**
The compiled bundle settles it: `group-data-[variant=line]/tabs-list:data-active:text-primary` is specificity (0,2,0); the file's `data-active:text-[var(--biolink-text)]` (493, 499) is (0,1,0) — the active label renders `var(--be-primary)`, never the ink written. The underline override `[&>span:last-child]:bg-[var(--biolink-text)]` (489) is (0,2,1) and does win — so underline renders ink. Hover renders a third token (`--be-foreground`). On a painted dark creator background `--be-primary` is 2.8:1 (documented failing-AA in biolink-appearance.ts:500-507) — the *active* tab becomes less legible than inactive ones. Same bug exists in product-tabs.tsx: a pattern, not a typo.
**Fix:** one token owns "active": `indicatorClass="bg-[var(--biolink-accent)]!"` on the list (supported slot, tabs.tsx:44-51), `hover:text-[var(--biolink-text)]!` and `data-active:text-[var(--biolink-accent)]!` on triggers; drop the `[&>span:last-child]` selector and dead `rounded-button`/duplicate `h-[calc]`. Long term: `Tabs` needs an active-color slot beside `indicatorClass`.

**[P1] The sticky creator card can never stick.**
`CreatorCard` is `@4xl:sticky @4xl:top-8` (line 269) but every non-preview page renders inside `relative z-2 min-h-screen overflow-hidden` (biolink-layout.tsx:114). `overflow: hidden` creates a scroll container that never scrolls internally — sticky behaves as `static`. The 360px column exists to keep identity + verified badge + Message CTA in view while products scroll; it silently does nothing.
**Fix:** change line 114 to `overflow-x-clip` (NOT `overflow-x-hidden`, which computes the other axis to `auto` and breaks sticky identically). Background already clips itself (biolink-layout.tsx:398). Verify scroll + sticky after.

**[P1] Untranslated visible copy in mobile nav and tablist.**
`biolinkNavItems` labels "Profile"/"Products"/"About" are raw strings (158-163) rendered as visible text and `aria-label` in BottomNavBar; `aria-label="Creator profile sections"` (488) is raw while tab labels use `<Trans>` (495, 501). PRODUCT.md principle 3: untranslated visible copy is a defect. Also `aria-label="Bottom Navigation"` (bottom-nav-bar.tsx:67) ships on this page.
**Fix:** `trans(message(...))` for all four strings.

**[P2] Mobile tab semantics are broken; two breakpoints teach two different IA.**
Mobile renders `Tabs.Panel`s with no `Tabs.Tab`s — triggers are `role="navigation"` > `role="button"` with `aria-pressed`, so tabpanels have no tab to associate with; SR announces toggles, not tabs. Desktop defaults `products` (484), mobile `profile` (158); neither lives in the URL.
**Fix:** render bottom-nav items as `Tabs.Tab` styled to the nav chrome (or drop Tabs.Root on mobile for explicit `role="tabpanel"` + `aria-labelledby`); persist `activeTab` to `location.hash` in both layouts.

**[P2] Ergonomics and hover don't survive contact with reality.**
Trigger height resolves to 27px (`h-9` − `p-1` − 1px) with no `pointer-coarse` guard, while sibling public tabs add `pointer-coarse:min-h-11/min-h-12` (product-tabs.tsx:33, 39); iPad landscape at ≥896px container gets 27px targets. Hover uses `hover:text-foreground` (`--be-foreground`) — dark ink on dark painted grounds. `rounded-button` can never render (line variant has no fill on any state).
**Fix:** `pointer-coarse:min-h-11` on triggers, `hover:text-[var(--biolink-text)]!`, drop dead classes.

## Persona Red Flags

**Sam (accessibility-dependent):** mobile panels controlled by `aria-pressed` toggles — no tab announcement; active label 2.8:1 on painted dark grounds while inactive stays ≥4.5:1; English-only `aria-label` on the tablist; socials announced as editor field names ("Facebook url"); focus ring uses global `--be-primary` instead of the computed `--biolink-focus`.

**Casey (distracted mobile):** store one tap deeper on mobile than desktop; no hash persistence so interruptions reset to Profile; ~224px of dead scroll tail (`pb-20` panels + empty `py-6` wrapper around a `fixed` nav + `pb-[calc(6rem+…)]` on main); socials `size="icon-sm"` (32px) icon-only, under 44px; BottomNavBar uses a framer spring scale + `whileTap scale:0.97` against DESIGN's 1px-press-only motion vocabulary.

**Riley (stress tester):** `h1`/headline `truncate`d with no title/wrap fallback (329, 345); About prose uses physical `border-l-2 / pl-4 / ml-5` (566) — broken in RTL; stale `public_item_count` can hide or empty the Products tab; only the last shop widget (`at(-1)`) is surfaced; preview mode's `stickyBottom` fixed nav may escape the preview frame (needs browser verification).

## Minor Observations

- `showHeading` is NOT dead (suppresses the duplicate heading at 452/509); `compact` on `CreatorProfileContent` (462, 516, 528) IS dead — its only caller never passes it.
- `[&>span:last-child]` is the exact anti-pattern `indicatorClass` exists for (tabs.tsx:44-51).
- `hasProducts` logic copy-pasted (151-155 vs 473-477) — extract to a shared helper.
- AboutSection prose is `text-sm`/`text-xs` — DESIGN's Two-Size Rule puts reading copy at 16px.
- Indicator geometry holds (lands on the divider with ~0.5px overhang); only the color is wrong.
- Detector's single `design-system-radius` finding at line 263 is a false positive (the `calc()` pad subtraction).
- `@4xl` engages desktop layout at ≥896px container width — a 200%-zoomed desktop user silently gets the mobile IA.

## Questions to Consider

1. Should Linket own a `Tabs` skin instead of fighting shadcn's — accent token, `indicatorClass`, touch guards built in — and who owns it?
2. If the sticky card never sticks, what is the 360px left column for?
3. Which is the canonical first impression — Products (desktop) or Profile (mobile)? Pick one, put it in the hash, let both breakpoints agree.
4. Is blue-label-over-ink-underline a decision anyone made, or what a specificity fight looks like from the outside?
