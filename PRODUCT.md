# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Creators who sell digital products (ebooks, presets, templates, courses, music, software). They arrive to turn their link-in-bio page into a place where followers can buy, not just click — and they manage that business from a dashboard alongside their page.

## Product Purpose

Linket gives a creator one polished bio page that is also a working storefront: buyers purchase a digital product directly on that page and get an instant download link, without the creator sending them anywhere else.

Success means a creator can publish a page, list a product, and complete a sale entirely inside Linket — and can see those sales in the dashboard afterward.

## Positioning

The storefront is built into the bio page itself. A creator sells digital products right on the page their audience already visits, with checkout and instant delivery happening there. Linktree and Beacons link out to a store; on Linket the store *is* the page.

## Operating Context

- Creators work on their page and storefront from `resources/client/dashboard/*`; their audience visits the public bio page and `{storeSlug}/products/{digitalProduct}` purchase flow.
- Payments, orders, courses and payouts are real transactional workflows: order success pages, `my-order` purchase history, course lessons, payout requests.
- Content is multilingual by requirement — all visible copy goes through `<Trans message="..." />` so strings are extractable (`resources/scripts/extract-translations.js`).
- A reference admin dashboard template (`docs/reference/`) is consulted for dashboard layouts and Base UI patterns; it is copied from, never imported.

## Capabilities and Constraints

- Link-in-bio page building: links, widgets, customization.
- Digital product sales with tiered entitlements. **Free and Pro are the only plans** (confirmed by `2026_08_08_221006_simplify_plans_to_free_pro.php`); commission rates are product facts — Free 10%, Pro 5%.
- Course delivery with lessons and analytics; order history and purchase history for buyers.
- **Stack constraint:** React 19 + Vite + react-router on the frontend, Laravel 12 + PHP 8.4 on the backend, Tailwind CSS 4 with design tokens in `common-tailwind.css`.
- **UI system constraint:** components come from `common/foundation/resources/client/shadcn` first, then `common/foundation/resources/client/ui`; icons from lucide. Styling uses design tokens (e.g. `text-muted-foreground`) rather than direct values. A new or competing component system is out of scope for future work.
- Editor/authoring surfaces depend on TipTap; charts on Chart.js; real-time via Laravel Reverb.
- Open (undecided): whether additional plan tiers return, and the exact entitlement boundaries beyond the two current plans.

## Brand Commitments

No binding voice, name guidance, or visual identity constraint has been asserted yet. The shadcn/Tailwind token system above is a structural commitment, not a brand voice.

## Evidence on Hand

- `creator-storefront-concept.md` — the storefront concept with plan tiers and commission math (Free: 7 products, 10%; Pro: 50 products, 5%).
- `docs/reference/README.md` — UI/UX working notes and the reference dashboard template.
- `agents.md` — frontend/backend code style rules, including the `<Trans>` and design-token requirements.
- `docs/deployment-architecture.md`, `docs/production-operations.md` — deployment and operations facts.
- Real payment integrations present in code: Stripe, PayPal, Chapa.

Absences future work must not fabricate: no testimonials, customer logos, press, benchmarks, published pricing page, or case studies were found in the repository.

## Product Principles

1. The page and the store are one artifact — never send the buyer off-platform to complete a purchase.
2. Plan entitlements and commission rates are facts, not copy to be softened or rounded.
3. Every string is translatable at the point it is written; untranslated visible copy is a defect.
4. Extend the existing shadcn/Tailwind token system rather than introducing parallel patterns.
5. Creator-facing workflows (publish, sell, get paid, review sales) outrank decorative surface polish.
