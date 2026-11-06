# PR-08 — Historical checkpoint evidence foundation (internal only)

**State:** Schema contract and read-only, authorized integrity reviewer only. No production writer, collector, job, public route, provider API call or sixth MCP forecasting tool. Release remains NO-GO.

## Proposed input model
creator_ai_forecast_coverage_checkpoints stores source-specific daily summaries with a unique workspace/day/source key. The two anticipated projections are checkout_event_stream and verify_et_reconciliation. Fields include only dates, aggregate counts/cents, SHA-256 source cursor fingerprint, capture time, source watermark and seal time. No buyer names, receipts or account numbers. Missing timestamps/digests are allowed in storage to explicitly represent unverified evidence.

There is deliberately **no producer** in this work package. Operators must not insert data just to make forecasts eligible. Future producers must prove independent upstream authenticity, protected replay-safe event positions, and meaningful zero-activity observation semantics.

## Read-only assessment
ForecastObservationCheckpointAudit verifies current creator workspace and verified Pro authorization before reading. It requires contiguous UTC days (1 to 366), both source kinds on each day, distinct SHA-256 cursor fingerprints, source watermark at least 48 hours after the observed day closed, monotonic capture/seal times and exact aggregate reconciliation. It detects gaps, conflicting totals, unknown sources and suspicious metadata.

**Critically, even two matching rows yield independent_observation_coverage_verified=false, external_source_authenticity_verified=false, and reason checkpoint_lineage_not_independently_attested.** Locally computed digests cannot substitute for provider signatures. ForecastReliabilityGate is unchanged and still withholds money amounts. There is no user-provided override.

## Outstanding implementation gates
1. Specify independently authenticated event-stream and provider-reconciliation origin, ownership, retention and failure semantics.
2. Build append-only, idempotent protected checkpoint producers and separately verify immutable external provenance; do not mint synthetic historic observations.
3. Test actual ingestion outages, late verification, backfills, replay, gap repair and multi-tenant access on isolated MySQL.
4. Only after independent AppSec and staging proof should a reviewed attestation reader be considered for the future public forecast gate.
5. Preserve Verify.et payment matching, downloads, OAuth token safety, default-OFF features, CI and explicit release approval.