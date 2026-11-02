# Creator storefront homepage implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans or subagent-driven-development to implement this plan task-by-task.

**Goal:** Replace link-management-first marketing with an editable, accessible creator storefront homepage.

**Architecture:** A single JSON preset is consumed by Laravel default settings and the React admin editor. Existing section rendering, authenticated pricing API, translation wrappers, and admin live preview remain the system of record. Creator-specific illustrations are SVGs referenced through editable image fields, and a creator presentation variant makes the hero distinctive without altering existing templates.

**Tech Stack:** Laravel 12, PHP 8.4, React 19, Tailwind 4, shadcn/Base UI, Vite, Vitest.

**Spec:** Approved November 2 Linket creator storefront mockup and docs in this repository.

## Global Constraints
- Preserve all custom administrator landing-page settings.
- Match the approved white/blue Linket identity and avoid hardcoded prices/testimonials.
- Use the verified-payment/direct-to-creator model; never imply Linket holds buyer money.
- Text and screenshots must be admin replaceable, with live preview.
- Do not change payment, fulfillment, subscriptions, or deployment logic.

## Review Focus
- Existing custom settings survive a deployment.
- Newly added and renamed sections keep working anchors on desktop and mobile.
- Uploaded image dimensions never cause horizontal scroll at 360px and 390px.
- The hero CTA and navigation are keyboard-usable and visibly focusable.
- Pricing comes from the billing API, not the mockup JSON.

## Tasks

### 1. Content and safe migration
- [ ] Add a typed-compatible JSON preset of configurable sections.
- [ ] Make fresh installations use the preset.
- [ ] Only replace the old stock homepage for an existing site, never a customized page.
- [ ] Add PHP tests covering the preset and admin preservation.

### 2. Storefront visuals and admin UI
- [ ] Provide replaceable creator storefront, order, and payment SVG illustrations.
- [ ] Add the creative patterned hero presentation variant and responsive image handling.
- [ ] Add a confirmation-protected admin preset button with existing preview and save.
- [ ] Preserve the real pricing component.

### 3. Dynamic navigation, tests and polish
- [ ] Compute section anchors once for all nav surfaces.
- [ ] Test renamed and removed sections, duplicate headings, and pricing presence.
- [ ] Check PHP syntax, TypeScript, Vitest, build, and CI; capture release findings.
