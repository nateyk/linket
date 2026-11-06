# Linket AI V1 — Forecast reliability implementation, stage 1

**Scope:** PR-08 initial pure statistical evaluator only. This is **not** a shipping sales forecast and does not expose the sixth ChatGPT MCP tool. Production remains NO-GO.

## Implemented (synthetic-only foundation)

- The `VerifiedRevenueForecastEngine` accepts a contiguous, strictly typed UTC daily series of already-authorized **verified ETB gross revenue** and verified order counts. It does not query orders or decide if a payment is verified.
- It rejects gaps/duplicates, malformed dates, inconsistent counts, negative values and excessive history, rather than silently interpreting missing data as zero.
- Candidate evaluation requires 30 days and 10 verified orders for seven days, or 90 days and 30 verified orders for 30 days. Any history with no recent verified activity is suppressed.
- It holds out the most recent horizon without training leakage, compares a seven-day average to a naive last-observed-day model and suppresses forecasts that lose the backtest or have unacceptable average error.
- Estimated gross ETB cents and an explicitly **uncalibrated heuristic range** are returned only on an eligible synthetic series. No probability, confidence percentage or earnings guarantee is asserted.

## Required next tasks before any integration

1. Add an authenticated, workspace-scoped daily-series adapter based on `ScopedReportingService::verifiedOrders`, explicit UTC calendar coverage and correctly zero-filled legitimate no-sale days; separate missing observations from no-sale days.
2. Test paid/fulfilled double-count prevention, amount/currency, foreign tenant, cancelled/pending/failed statuses, historical workspaces and sparse/volatile/missing-data cases using guarded MySQL test fixtures.
3. Evaluate multiple rolling-origin holdouts and compare against more than one baseline; define an evidence-based minimum backtest performance and interval calibration policy with historical fixtures. A single holdout and heuristic range do **not** satisfy final model-validation requirements.
4. After independent review, add a default-OFF creator dashboard presentation and the sixth read-only MCP tool. Recheck current Pro entitlement and workspace permissions on every invocation. Expose no buyer/contact/payment/receiving-account fields.
5. Require green CI, QA/security review, explicit GO/NO-GO and staging verification before any rollout.

**Safety:** The existing `CreatorMcpToolGateway`, `CreatorMcpReadOnlyServer`, OAuth routes, Verify.et/paid fulfillment, product mutation and feature flags are deliberately untouched by this stage.
