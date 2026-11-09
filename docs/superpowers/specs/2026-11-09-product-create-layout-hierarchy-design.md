# Product Create Layout Hierarchy

**Date:** 2026-11-09  
**Status:** Approved for implementation (continue from UX QA follow-up)

## Problem

The ebook / digital / audio create surface is a cramped single-column authoring page (`max-w-3xl`). Setup progress sits with the same visual weight as the first editor section, so hierarchy between “where am I?” and “start writing” is weak.

Course create already uses a wider shell (`max-w-6xl`) with a two-column preview layout. Non-course editors keep Preview in a dialog and do not need that sidebar for this fix.

## Goals

- Improve breathing room and status → content hierarchy for digital, ebook, and audio create/edit.
- Keep course layout unchanged.
- Keep local Sentry setup out of this PR (stash / restore only).
- Ship a focused PR from clean `main`.

## Non-goals

- No API, autosave, validation, or wizard-step changes.
- No course accordion / sticky preview redesign.
- No Sentry, MCP, or tooling commits in this PR.

## Approach (surgical)

1. Widen the non-course form shell from `max-w-3xl` to `max-w-5xl`.
2. Wrap `ProductFormProgress` + readiness hint in a distinct setup-status band above the editor stack.
3. Increase vertical gap between the status band and the first `ProductEditorSection` / editor card.
4. Leave section card chrome and copy alone unless tests require a shared test id.

## Success criteria

- Source/contract tests encode the wider shell and status band for non-course editors.
- Existing ebook/digital/audio editor DOM tests still pass.
- PR contains only product-create layout files (+ this design/plan if committed).
- After PR push, working tree can restore Sentry changes and check out `main`.
