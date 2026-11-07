# PR-08 — Forecast reliability: empirical calibration and source completeness

**Status:** Research-only. No sixth MCP tool or creator-visible revenue forecast. Existing release remains NO-GO.

## Empirical calibration

`ForecastHorizonCalibration` requires **nine non-overlapping chronological horizon-length holdouts**, with at least 14 preceding training days. Six or more earlier folds calibrate a stress radius from observed **absolute horizon-total errors**; the latest three folds validate it without contributing to that radius. Candidate model: trailing seven-day mean. Benchmarks: last-observed-day naive baseline and weekly-seasonal baseline. A model must beat or tie both baselines on validation error, and each validation outcome must fit the previously measured maximum error plus a 25% floor. Sudden revenue shifts cause suppression.

Minimum calibration history is therefore **77 days for seven-day forecasts** and **284 days for 30-day forecasts**, stricter than the Q6 candidate thresholds of 30 days/10 verified orders and 90 days/30 orders. A candidate may be eligible for analysis without being eligible for release. These fold counts/validation rules are conservative initial engineering defaults, not calibrated prediction coverage probabilities. The current empirical validation figure is only a measured historical ratio; *it is not a 90% or 95% confidence interval and cannot establish future coverage in time series.*

## Observation coverage limitation

`ForecastReliabilityGate` invokes the existing candidate evaluator and calibration, then **always withholds forecast totals and ranges**, even with strong backtests, because the current sales-only daily aggregation cannot establish that every no-sale day was independently observed. A day with no recorded orders is not proof that ingestion was complete. The gate reports minimal bounded diagnostic counters and a machine-readable reason `independent_history_coverage_unverified`. It has **no** caller-supplied “trust me” override.

The existing `VerifiedRevenueDailySeries` prevents pre-workspace zero filling, excludes unauthenticated creator data, non-ETB/Chapa orders, and orders lacking successful matching Verify.et evidence. These protections do not establish historical record completeness after workspace creation.

## Remaining before release

1. Design a separate, independently checked historical observation/checkpoint source with actual persisted coverage evidence. Do not manufacture coverage flags from the SQL zero-filled series.
2. Test DB ingestion outages, backfill, cancelled/failed/late verification history and currency/amount consistency using isolated MySQL fixtures. Establish a data retention and provenance policy.
3. Test calibration coverage across representative synthetic seasonality, intermittent/sparse sales and volatile regime shifts; independently review the heuristic radius and any planned probabilistic interval method.
4. Wire any future publication path **only** through a reviewed coverage-and-calibration gate, reauthorize creator/Pro/workspace at each use, and preserve tool-registration default OFF.
5. Require exact-head full CI, Verify.et/fulfillment tests, independent AppSec, separate HTTPS OAuth staging and explicit owner approval before merging or deploying.

No provider calls, new tables, production data access or payment mutations were introduced by this slice.
