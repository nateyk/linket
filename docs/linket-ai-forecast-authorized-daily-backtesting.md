# Linket AI PR-08: Authorized forecast history and rolling-origin evaluation

Status: internal, default-off, no sixth MCP tool or public route. Production NO-GO.

VerifiedRevenueDailySeries reuses ScopedReportingService::verifiedOrders with the forecast feature, current Verify.et-backed Pro entitlement, creator workspace authorization, ETB filtering, bounded UTC dates and paid/fulfilled status restrictions. Aggregate output consists only of a UTC calendar day, verified order count and verified gross cents; missing sales days are zero-filled only within the authenticated SQL date range.

RollingRevenueBacktest evaluates two or three chronological, non-overlapping holdouts and compares a last-seven-day mean to a last-observed-day naive benchmark. The holdout results are diagnostics, not calibrated prediction intervals. It does not invoke an LLM or modify orders.

Remaining before publication: integrate backtest policy with forecast suppression, historical data-quality provenance, interval calibration, payment/fulfillment regression coverage, independent review and staging OAuth. Do not enable or register sixth MCP tool. Preserve fail-closed flags and security audits.
