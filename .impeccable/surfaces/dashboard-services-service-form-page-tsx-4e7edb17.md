---
version: 1
slug: "dashboard-services-service-form-page-tsx-4e7edb17"
primary_target: "resources/client/dashboard/services/service-form-page.tsx"
related_targets: ["resources/client/dashboard/services/services-page.tsx","resources/client/dashboard/services/services-inquiries-page.tsx"]
---

# Creator service form — surface brief

Scope: `/dashboard/services/new` and `/dashboard/services/{id}/edit`, plus the service list and inquiry inbox that surround it.
Mode: Operate. Audience: a creator publishing a service offer. Job: define the offer (basics, packages, proof, FAQ, contact) and publish it with confidence.

## Direction contract

THESIS: The creator is not filling a form, they are publishing a promise. The form is a short checklist of promises, and a live customer preview sits beside it showing the exact card and package panel a visitor will get. The generic stack-of-cards "settings page" arrangement is refused.

OWN-WORLD: The established dashboard world — soft-pop token system, Inter, 16px fields on a 14px rhythm, hairline borders, muted surfaces, `rounded-card`/`rounded-input` scale, status colours doing real work only. No new colours, no new type, no new radii.

STORY: The creator finishes knowing the service is publishable and has already seen the visitor's view, so publishing is not a leap of faith.

FIRST VIEWPORT: Header with breadcrumb ("My Services"), page title as the single `<h1>` with a Draft/Published status chip (hidden under `sm`, so the title never truncates on a phone), and a right-aligned action group (Delete ghost, Save draft, Publish) with `size="sm"` buttons whose labels collapse under `sm`. Below it, a Notice Cream callout stating that Linket never handles payment, then a `max-w-6xl` two-column grid: left column is a progress read ("Service setup — N of 3 required sections complete"; only required sections move the bar, so optional sections never make a creator feel unfinished) plus a single-open accordion of bordered sections; right column is a sticky customer preview card (`xl:sticky xl:top-6`, matching the `xl` grid breakpoint so the behaviour is never inert) showing cover or a compact placeholder, draft notice, category, title, description, skills, starting price, the package rows, and the contact chips.

FORM: extend the established dashboard form (accordioned sections with `BuilderSectionHeader`, sticky right preview, header action bar) rather than inventing a new arrangement; this is a local extension, not a new visual world, so no concept round was run. Repeater rows are separated by hairline rules, never by a second bordered box: the section is already a bordered group, and stacked rings flatten the hierarchy.

Signature interaction: the preview is bound to form state, so it updates as the creator types; the blocks that arrive (price line, package rows, contact chips) fade in keyed on presence rather than value, so the preview reads as response without flickering on every keystroke.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.
