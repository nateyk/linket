# Linket AI PR-08: Authorized forecast history and rolling-origin evaluation

Status: internal, default-off, no sixth MCP tool or public route. Production NO-GO.

VerifiedRevenueDailySeries reuses ScopedReportingService::verifiedOrders with the forecast feature, current Verify.et-backed Pro entitlement, creator workspace authorization, ETB filtering, bounded UTC dates and paid/fulfilled status restrictions. Aggregate output consists only of a UTC calendar day, verified order count and verified gross cents; missing sales days are zero-filled only within the authenticated SQL date range.

RollingRevenueBacktest evaluates two or three chronological, non-overlapping holdouts and compares a last-seven-day mean to a last-observed-day naive benchmark. The holdout results are diagnostics, not calibrated prediction intervals. It does not invoke an LLM or modify orders.

Remaining before publication: integrate backtest policy with forecast suppression, historical data-quality provenance, interval calibration, payment/fulfillment regression coverage, independent review and staging OAuth. Do not enable or register sixth MCP tool. Preserve fail-closed flags and security audits.

## Verify.et-only forecast evidence gate

Forecast history now **requires** an order with `payment_gateway=verify_et`, paid/fulfilled status, a successful related `DirectPaymentVerification`, non-null verified timestamp and canonical transaction identity, ETB currency, and an amount that exactly equals gross order cents. The Eloquent relation uses `EXISTS`, so multiple attempts cannot multiply revenue. Legacy Chapa and orders merely labeled paid are excluded. Existing sales reports, payment state transitions and fulfillment remain unchanged. Synthetic negative tests cover missing evidence, wrong amount, missing identity/timestamp and legacy gateway.
