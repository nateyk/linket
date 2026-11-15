# Creator & Admin UX Modernization (Phase 7) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Modernize the creator receiving accounts and sales/payouts frontend interfaces to align with centralized platform-owned Chapa collections while strictly maintaining single-profile UX (zero workspace switchers).

**Architecture:** Update `resources/client/account-settings/receiving-accounts-page.tsx` and `resources/client/dashboard/digital-products/sales-payouts-page.tsx` to communicate that marketplace payments are collected centrally by Linket. Creator receiving accounts serve as withdrawal destination accounts (CBE, Telebirr, Dashen, etc.) for settled payouts rather than personal gateway merchant configurations.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Vite.

**Spec:** `docs/payments/2026-11-14-chapa-marketplace-sdk-adr.md` (ADR PR #244), LKP-003, UX Guidelines.

---

## Global Constraints

- **Strict Single-Profile UX:** NEVER introduce workspace switchers, workspace dropdowns, or workspace selection in receiving account forms, sales dashboards, or checkout flows.
- **Backwards Compatibility:** Creators with historical Chapa gateways or Verify.et receiving accounts must experience zero breaking changes.
- **CodeScene Code Health:** Keep frontend functions concise, zero primitive obsession, clean typing.

---

## Tasks

### Task 1: Receiving Accounts & Payout Destination UX

**Files:**
- Modify: `resources/client/account-settings/receiving-accounts-page.tsx`
- Test: `resources/client/account-settings/receiving-accounts-page.dom.test.tsx`

- [x] **Step 1: Update UI copy and guidance**
  - Clarify that buyers pay Linket directly via platform Chapa, and receiving accounts are used for receiving creator payouts.
  - Remove redundant mention of "in this workspace" to preserve pure single-profile consumer mental model.

- [x] **Step 2: Run DOM / TypeScript tests**

---

### Task 2: Sales & Payouts Dashboard Alignment

**Files:**
- Modify: `resources/client/dashboard/digital-products/sales-payouts-page.tsx`
- Test: `resources/client/dashboard/digital-products/sales-payouts-page.dom.test.tsx`

- [x] **Step 1: Ensure payout statuses match backend lifecycle**
  - Display `provider_pending` / `processing` ("Processing Settlement"), `paid` ("Paid"), `rejected` ("Rejected").
  - Retain hold days tooltip and balance breakdown.

- [x] **Step 2: Run DOM / TypeScript tests**

---

### Task 3: Quality Gates, CodeScene Audit & PR Creation

- [x] **Step 1: Run TypeScript and frontend build (`npm run build` or Vite check)**
- [ ] **Step 2: Push branch `work/lkp-003-ux-modernization` and open PR**
