# My Portal Lesson Player Chrome Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Restyle the portal lesson player to v0 detail-header + stage + curriculum rail without changing APIs.

**Architecture:** Layout refactor of `lesson-player-page.tsx`; extract small header if useful. Keep data hooks and quiz/complete flows.

**Tech Stack:** React 19, existing portal APIs, `@shadcn/*`, lucide, `<Trans />`.

**Spec:** `docs/superpowers/specs/2026-10-23-my-portal-lesson-player-chrome-design.md`

## Global Constraints

- No `@app/account-settings` imports
- No Notes tab; no fake scrubber
- Static `<Trans />`; semantic tokens
- Commit only when user asks

## File map

| File | Role |
| --- | --- |
| `lesson-player-page.tsx` | New chrome layout |
| `lesson-player-page` tests / source asserts | Back link, tabs, isolation |
| Optional `portal-lesson-header.tsx` | Detail header fragment |

---

### Task 1: Failing expectations

- [x] Assert back → `/my-portal?section=courses`, Overview+Resources only, no account-settings import

### Task 2: Implement layout

- [x] Detail header + grid + stage + tabs + rail/sheet
- [x] Preserve complete / prev / next / quiz / resources download
- [x] Tests + build pass

---

**Commit policy:** Commit only when the user asks.
