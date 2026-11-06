# Linket Service Creation — Guided Builder Design

**Status:** Approved direction from the creator's high-fidelity screen concept on 2026-11-05. This is a service-only interaction redesign, not a new service/payment backend.

## Intent
Replace the overlong five-accordion Service Creation form with a focused, creator-friendly guided flow matching Linket's Creator's Counter dashboard language. The creator can build a real service offer, preview the draft and publish directly to a chosen storefront without navigating a wall of fields.

## Visual direction and alternatives
- **Approved:** Four-stage guided editor with compact horizontal progress navigation and an honest storefront preview panel on desktop. The form is a stable bordered card; the parallel preview is its defining affordance. On mobile, preview opens in the existing accessible dialog.
- **Considered, rejected:** Retain five expandable sections and polish spacing only. This repeats the previous design problem.
- **Considered, rejected:** Introduce an entirely new page framework and API. It would fork Linket's service domain state and existing creator editor primitives.

Colors, type, radius, spacing and shadows come exclusively from root `DESIGN.md` and the existing shadcn/Tailwind primitives. No new palette, font or hard-coded brand color.

## Layout and steps
1. **Details** — storefront, title, short summary, category/subcategory, skills, rich description.
2. **Media** — cover, gallery, video, live-demo URL; all optional.
3. **Packages** — existing optional quote/package model; no checkout.
4. **Settings** — FAQ and direct contact channels. Show a restrained note that contracts and service payments are agreed directly with the creator.

Steps are accessible buttons, navigable in any order. A step change never saves, publishes or resets data. Next/Back controls advance the same stage model. Mark the selected step with `aria-current=step`. If the API returns a field error, switch to the relevant step and focus the invalid field.

## Parallel preview
At desktop widths, a restrained right-hand preview shows the existing `ServicePreview` using the exact unsaved `ServiceFormState`; it is not a published URL or a functional quote form. Desktop/mobile preview-size toggle changes the preview card width only. At smaller widths, a labelled Preview action opens the same existing modal preview. Never invent creator content (e.g., a cover image or price) or display a false “Saved moments ago.”

## Behavior invariants
- Preserve existing `/dashboard/services/new` and `/dashboard/services/:serviceId/edit` routes and POST/PUT/DELETE body contracts.
- Preserve free-form skills, quote-only service, optional cover/packages/FAQ/contact fields, owner authorization, direct inquiry/payout model.
- Preserve draft/publish actions, duplicate-save guard, uncertain-outcome recovery, load retry, edit delete-confirmation, URL validation and error feedback.
- Service creation requires a title according to current backend rules. Navigation between steps requires no title. Publishing/invalid save must show its error on Details.
- No implicit autosave. No production change from a feature-branch PR.
- Use the existing locale/translations, dashboard header, fields, file uploader, preview and alert/dialog primitives.

## Verification
Existing Vitest DOM coverage and isolated Playwright QA must be adjusted for the four stages and preview, plus a test that data entered on Details survives step changes. Verify at 320/360/375/768/1440 widths, keyboard/focus restoration, API retry, duplicate/uncertain save, service publish/edit/delete on disposable `belink_test` with mocked Verify.et. Run native CI and browser workflow on the **exact head**; do not merge while red. Native 200% zoom and screen-reader review remain separate manual signoffs.
