---
target: creator public storefront + store-builder live preview
total_score: 20
max_score: 32
na_heuristics: 7,10
p0_count: 0
p1_count: 2
target_identity: "file:/home/nate/projects/linket/resources/client/short-links/renderers/biolink-renderer/creator-profile-layout.tsx"
target_fingerprint: "sha256:3d6ec77c1b5d55938ce6a8bf4d1ec6edc6fa2f59aa13c78891da86b149efafe8"
target_path: /home/nate/projects/linket/resources/client/short-links/renderers/biolink-renderer/creator-profile-layout.tsx
timestamp: 2026-10-17T19-10-41Z
slug: olink-renderer-creator-profile-layout-tsx-40219de4
---
# Critique — creator public storefront + store-builder live preview

**Method:** dual-agent (A: 39cdb40e-f53f-4c57-ac78-522666648f46 · B: eb7f3892-31fb-4f98-b3a8-1465b1b602ea)
**Mode:** Operate · **Target:** `creator-profile-layout.tsx` (+ store-front, shop, product-card, bottom-nav, live-preview)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Active aria-pressed; published item count |
| 2 | Match System / Real World | 3 | “Published items” slightly admin-facing |
| 3 | User Control and Freedom | 3 | Bottom nav exits sections instantly |
| 4 | Consistency and Standards | 2 | Mobile nav ≠ desktop tabs; nav chrome leaked dashboard tokens |
| 5 | Error Prevention | 2 | Empty shop returns null |
| 6 | Recognition Rather Than Recall | 2 | Store behind Profile-first mobile default |
| 7 | Flexibility and Efficiency | n/a | Buyer browse — accelerators not the job |
| 8 | Aesthetic and Minimalist Design | 3 | Quiet cards; nav chrome + spring noise |
| 9 | Error Recovery | 2 | Silent shop fetch fail |
| 10 | Help and Documentation | n/a | Public buyer surface |
| **Total** | | **20/32** | **Needs work** |

## Design Specificity Verdict

**LLM:** Authored for Linket — `--biolink-*`, contrast-aware buttons, mobile section-nav vs desktop sticky tabs. Category-leaky: bottom nav painted dashboard `bg-card` / muted chrome; ProductCard still marketplace-personality under shop overrides.

**Deterministic scan:** 1 advisory (`design-system-radius` at creator-profile-layout.tsx:269 — `calc(avatarRadius - 4px)` pad subtract). **False positive.** Other five files clean.

**Visual overlays:** Login wall on `/dashboard/stores`; detect.js on login only — no reliable storefront overlay. Public slug `natee` inspected by Assessment A.

## Overall Impression

Appearance pipeline and preview architecture are strong. Biggest gap: mobile first-paint treated the page as a résumé, and the floating nav looked like a foreign dashboard widget on the buyer page. Preview≠public is **not** a P0 (same `?preview=1` public renderer).

## What's Working

1. Serious `--biolink-*` appearance pipeline (contrast seats, radius remap, profile/about shells).
2. Live preview iframes real public route + draft postMessage (A-06 section sync).
3. Mobile a11y: real nav + `aria-pressed`, reduced-motion paths.

## Priority Issues

### [P1] Mobile opens on Profile, burying the store
- **What:** Default section was Profile; Products only via bottom nav. Desktop defaults to Products.
- **Why:** “Bio page IS the store” fails first paint for mobile buyers.
- **Fix:** Default to Products when shop has items.
- **Suggested command:** `/impeccable polish`

### [P1] Bottom nav leaks dashboard chrome
- **What:** Shell used `bg-card/95`, `border-border`, `text-muted-foreground`; only active chip got appearance.
- **Why:** Soft-pop sealed buyer world broken; dark pill on light storefront.
- **Fix:** Pass `--biolink-*` shell + inactive classes; keep active appearance wiring.
- **Suggested command:** `/impeccable polish`

### [P2] Product cards still carry marketplace chrome
- hover scale / shadow vs quiet biolink tile — defer.

### [P2] Silent empty / failed shop
- `null` / silent catch — defer (harden/onboard).

### [P3] Decorative spring on bottom nav mount
- Prefer quieter state motion — defer.

### Detector advisory (P3 / FP)
- `4px` in avatar inset calc — not a radius token; leave as-is.

## Persona Red Flags

**Casey (mobile buyer):** First screen was identity-only; must discover Products via nav.
**Jordan (first-timer):** Icon-only inactive destinations; “published item” admin tone.
**Creator-editor:** Theme judgment false confidence until nav is tokenized.

## Minor Observations

- Message CTA `w-[52%]` arbitrary.
- Name hierarchy quiet vs DESIGN display sizes — coherent for Operate.
- Product media can dominate short phones.

## Questions to Consider

1. If the bio page is the store, should mobile default to Products (or identity+shop scroll)?
2. Should bottom nav be a biolink-native shell rather than a patched dashboard primitive?
3. What does a confident empty Products state teach in preview and public?
