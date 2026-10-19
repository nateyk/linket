---
version: 1
slug: "t-services-public-public-service-page-tsx-b61c1f8c"
primary_target: "resources/client/services/public/public-service-page.tsx"
related_targets: ["resources/client/services/public/service-package-panel.tsx","resources/client/services/public/service-gallery.tsx"]
---

# Public service page — surface brief

Scope: `/services/{slug}` for a published creator service. Mode: Persuade — the visitor reads the offer, picks a tier, and asks for a quote.

## Direction contract

THESIS: This is a storefront counter, not a form result. One painted surface holds the work and its story; the rail holds the offer and the way to ask. The page must read as the same shop as the product page next door, because it is.

OWN-WORLD: The storefront's own painted appearance — `--biolink-*` tokens, the store's Appearance → Buttons setting, the shared surface recipe (`biolinkSurfaceCard`), surface shadow and container radius that the product page already uses. No dashboard tokens on the public page and no new colours.

STORY: The visitor sees the work, understands what the tiers include, picks one, and sends one message. Nothing on the page asks for money, so the page never pretends a checkout exists.

FIRST VIEWPORT: A quiet back link, then a two-column shop layout — the hero surface (gallery, category and skills, title, one-line deck) on the left and the offer rail on the right with the selected tier's price, its delivery/revisions, what is included, and one full-width CTA wearing the store's button appearance.

FORM: extend the product detail page's public shell and surface recipe rather than inventing a second storefront style; no concept round was run. Tabs stay for description/FAQ, and the seller card stays in the rail.

SIGNATURE: every action on the page wears the store's own button appearance, and the rail mirrors the product pricing card so the two shop pages are recognisably one shop.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review verdict and DESIGN.md left intact because the world is unchanged.
