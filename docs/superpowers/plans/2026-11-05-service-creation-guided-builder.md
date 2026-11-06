# Service Creation Guided Builder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox status for independent verification.

**Goal:** Ship the approved four-stage Service Creation editor and desktop preview without modifying service API or business rules.

**Architecture:** Retain `ServiceFormPage`'s `ServiceFormState`, load, save, retry and delete handlers. Replace accordion navigation with a small typed `ServiceBuilderSteps` control and four conditional stage views. Reuse `ServicePreview` and existing field components, with the Settings stage grouping FAQs and contact fields.

**Tech Stack:** Laravel backend unchanged, React/TypeScript, shadcn/Base UI primitives, Tailwind design tokens, Vitest, Playwright, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-11-05-service-creation-guided-builder-design.md`

## Global Constraints
- Preserve direct creator service inquiries: Linket does not hold service payments.
- No fake autosave status, mock creator data or API changes.
- Keep mobile Preview accessible; one active form stage; all optional stages can be skipped.
- Use root `DESIGN.md` tokens and existing dashboard/navigation components.
- All DB writes in Playwright only against `belink_test`, loopback and mocked payment providers.

## Review Focus
1. Moving between stages must retain unsaved title and rich-text description; new DOM test.
2. A server validation error for packages, media, FAQs or contact must select the correct stage and focus field; add DOM test.
3. Preview must not send a mutation, and dialog keyboard dismissal must restore focus; DOM and E2E.
4. No implicit autosave, duplicate POST after network uncertainty, or unauthorized API changes; preserve DOM tests.
5. Mobile at 320px and 200% zoom must not cause horizontal document overflow; E2E viewport tests and manual zoom note.

### Task 1 — Guided navigation and stage composition
**Files:** `resources/client/dashboard/services/service-form/service-builder-steps.tsx`, `resources/client/dashboard/services/service-form/service-form-section.tsx`, `resources/client/dashboard/services/service-form-page.tsx`, `resources/client/dashboard/services/service-form-page.dom.test.tsx`
- [ ] Write DOM tests for four labelled stage buttons, active state, arbitrary navigation, retained state and previous/next actions.
- [ ] Implement typed stepper and convert section panels to semantic cards, preserving existing children and field handlers.
- [ ] Replace `Accordion.Root` with conditional stage content; group FAQ and contact under Settings.
- [ ] Map server errors to stage selection; keep keyboard save and invalid field focusing.
- [ ] Run TypeScript and Vitest on the branch, then commit.

### Task 2 — Honest preview and responsive layout
**Files:** `resources/client/dashboard/services/service-form-page.tsx`, `resources/client/dashboard/services/service-form-page.dom.test.tsx`
- [ ] Add desktop-only sticky preview using existing `ServicePreview`, with device-width selection.
- [ ] Preserve mobile dialog Preview and focus restoration; no invented media or saved timestamp.
- [ ] Layout header/actions, active card, stage footer and desktop sidebar using existing spacing and tokens.
- [ ] Test preview state and that next/back/preview produce no API mutations; commit.

### Task 3 — Isolated E2E and release evidence
**Files:** `tests/e2e/service-creation-responsive.spec.ts`, existing browser QA workflow only if coverage requires.
- [ ] Update browser matrix for 320/360/375/768/1440 and four stages.
- [ ] Verify title/description persistence, step actions, preview dialog keyboard, and lifecycle unchanged.
- [ ] Run exact-head GitHub native CI + isolated browser QA, inspect failures and correct.
- [ ] Open reviewable PR targeting protected `main` with evidence, risk and non-production status.

## Implementation method
Native execution on an isolated feature branch with separate review. Merge or deploy only after independent checks and release authorization.
