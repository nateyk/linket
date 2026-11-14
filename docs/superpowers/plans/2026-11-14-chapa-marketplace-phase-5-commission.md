# Commission and Monetization Engine (Phase 5) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a configurable, integer-accurate commission policy service that snapshots immutable plan-based commission rates, platform fee cents, and net creator earnings onto storefront orders without float rounding errors or alterations to subscription billing schedules.

**Architecture:** Create an encapsulated `CommissionPolicy` service and immutable `CommissionSnapshot` DTO that reads the creator's current plan benefits via `Entitlements::feeBps()` and `Entitlements::planFor()`. Calculate fee cents and creator earnings using half-up integer arithmetic (`intdiv(($gross * $bps) + 5000, 10000)`), guaranteeing `$platformFeeCents + $creatorEarningsCents === $grossAmountCents`. Wire this policy into both platform Chapa checkouts and direct storefront checkouts.

**Tech Stack:** PHP 8.4, Laravel 11, PHPUnit.

**Spec:** `docs/payments/2026-11-14-chapa-marketplace-sdk-adr.md` (ADR PR #244), LKP-003, FIN-04, FIN-10.

## Global Constraints

- All calculations MUST use strict integer cents with zero floating-point arithmetic in financial totals.
- The invariant `$platformFeeCents + $creatorEarningsCents === $grossAmountCents` MUST strictly hold for every calculated order.
- Plan snapshots (`commission_bps`, `commission_plan_id`, `platform_fee_percent`, `platform_fee_cents`, `creator_earnings_cents`) on `StorefrontOrder` are immutable historical records.
- Do NOT alter subscription pricing, subscription intervals, or subscription invoices.
- CodeScene Code Health standards: Max 4 function arguments, max 5 constructor parameters, max 9 cyclomatic complexity per method, zero primitive obsession.

## Review Focus

1. **Fractional Cent Rounding**: Odd gross amounts (e.g., 99 cents or 1,234 cents) must use standard half-up integer rounding without losing or generating money.
2. **Double-Entry Balance Preservation**: The journal entry for a platform sale relies on `platform_fee_cents + creator_earnings_cents == gross_amount_cents`; any mismatch throws `UnbalancedJournalEntryException`.
3. **Plan Upgrades/Downgrades Isolation**: Repricing or changing plan commission rates in admin settings must never alter past order snapshots or historical earnings.
4. **Free Products Handled Gracefully**: Orders with `$grossAmountCents === 0` must always produce 0 fee cents and 0 earnings cents.
5. **Backwards Compatibility**: Plans with default 0 bps must continue to produce 0% platform fee cleanly.

---

## Tasks

### Task 1: `CommissionSnapshot` Value Object & `CommissionPolicy` Service

**Files:**
- Create: `app/Storefront/Commission/CommissionSnapshot.php`
- Create: `app/Storefront/Commission/CommissionPolicy.php`
- Test: `tests/Unit/CommissionPolicyTest.php`

- [ ] **Step 1: Write failing test in `tests/Unit/CommissionPolicyTest.php`**
  - Test 10% commission (1,000 bps) on 100,000 cents (1,000 ETB) -> 10,000 fee, 90,000 earnings.
  - Test 3% commission (300 bps) on 15,000 cents (150 ETB) -> 450 fee, 14,550 earnings.
  - Test odd cent rounding: 99 cents at 300 bps -> 3 cents fee, 96 cents earnings (`3 + 96 === 99`).
  - Test 0% commission (0 bps) on 5,000 cents -> 0 fee, 5,000 earnings.
  - Test 0 gross amount -> 0 fee, 0 earnings.
  - Test invariant check: `$fee + $earnings === $gross` across 1,000 random cent amounts.

- [ ] **Step 2: Implement `CommissionSnapshot`**
  - Readonly DTO with properties: `grossAmountCents`, `commissionBps`, `platformFeePercent`, `platformFeeCents`, `creatorEarningsCents`, `planId`.
  - Method `toArray(): array`.

- [ ] **Step 3: Implement `CommissionPolicy`**
  - Dependency: `?Entitlements $entitlements = null`.
  - Method `calculate(User $creator, int $grossAmountCents): CommissionSnapshot`.
  - Half-up integer rounding via `intdiv(($grossAmountCents * $bps) + 5000, 10000)`.

- [ ] **Step 4: Run unit tests and ensure all pass**

---

### Task 2: Integrate `CommissionPolicy` into Storefront Checkouts

**Files:**
- Modify: `app/Storefront/Services/ChapaStorefrontCheckout.php`
- Modify: `app/Storefront/Services/DirectStorefrontCheckout.php`
- Test: `tests/Unit/ChapaStorefrontCheckoutCommissionTest.php`

- [ ] **Step 1: Write failing test in `tests/Unit/ChapaStorefrontCheckoutCommissionTest.php`**
  - Verify `ChapaStorefrontCheckout` writes `commission_bps`, `platform_fee_percent`, `platform_fee_cents`, `creator_earnings_cents`, and `commission_plan_id` from `CommissionPolicy`.
  - Verify ledger lines created via `CreatorLedgerService` match `platform_fee_cents` and `creator_earnings_cents`.

- [ ] **Step 2: Update `ChapaStorefrontCheckout`**
  - Inject `?CommissionPolicy $commissionPolicy = null`.
  - In `persistPlatformOrder`, use `$commissionPolicy->calculate($creator, (int) $product->price_cents)`.
  - Populate `commission_bps`, `commission_plan_id`, `platform_fee_percent`, `platform_fee_cents`, and `creator_earnings_cents`.

- [ ] **Step 3: Update `DirectStorefrontCheckout`**
  - Replace hardcoded `$commissionBps = 0;` with `app(CommissionPolicy::class)->calculate($product->creator, (int) $product->price_cents)`.

- [ ] **Step 4: Run unit tests and ensure all pass**

---

### Task 3: Quality Gates, CodeScene Audit & PR Creation

**Files:**
- All created and modified files
- Run CodeScene complexity checks

- [ ] **Step 1: Check code complexity and biomarkers**
  - All methods <= 9 cyclomatic complexity.
  - All functions <= 4 arguments.
  - All constructors <= 5 arguments.
  - Zero primitive obsession.

- [ ] **Step 2: Run complete unit test suite locally**

- [ ] **Step 3: Create GitHub Pull Request**
  - Create branch `work/lkp-003-commission-engine`.
  - Open PR for Phase 5.
  - Monitor CI and CodeScene quality gates until 100% green.
