# Linket AI PR-08 — Signed checkpoint ingestion contract (not activated)

**Status:** implementation branch only, ingestion feature gate disabled by default. No controller, route, webhook, queue scheduler, dashboard or sixth MCP forecasting tool. Production remains NO-GO.

## Trust and signing
Only registered internal producer identities may submit a strictly shaped canonical JSON envelope to SignedForecastCheckpointIngestor. Every envelope contains source kind, workspace, opaque event ID, contiguous per-source sequence, prior event digest, calendar day, verified ETB counts/cents, revision, prior day revision digest, reason for a historical backfill, source watermark, signature timestamp and key ID. Each source has a distinct operator-provisioned 32+ byte base64 HMAC secret and explicit permitted workspace IDs. Additionally, the envelope MUST carry an Ed25519 detached signature made with a source-specific private key held outside Linket; Linket stores only the pinned public key. No keys, buyer PII, account numbers or raw receipt payloads are stored in event bodies or exposed to MCP.

Canonicalization uses a fixed field order and JSON_UNESCAPED_SLASHES/UNICODE. HMAC-SHA256 authenticity is checked before any database changes; unknown, extra, unsigned, malformed, mismatched workspace or wrong-source data are rejected. Keys may be configured per key ID for planned rotation; the initial deployment configuration uses v1 only, and missing keys/workspace allowlists deny all ingestion. The ingestion flag is independent from forecast publication.

**Important distinction:** HMAC authenticates the configured sender, and Ed25519 permits an external reviewer to verify an individual source record without the HMAC secret. Neither establishes completeness or that Verify.et itself signed the record; the named reconciler is an independent producer to be provisioned and reviewed. No independent provider-signed complete-history proof exists. An application administrator with access to secrets can still fabricate checkpoints. Nothing in this slice turns on the public forecast.

## Append-only evidence and replay
The database migration defines source-specific cursor/stream state and an append-only event ledger. Each event has a unique stream/sequence and stream/opaque-event-ID, includes previous event hash, revision and optional signed superseded-day hash. The ingestor transactions lock the stream row, accept only sequence +1 and the exact predecessor digest, return a safe duplicate result for byte-identical replays, and reject conflicting reuse or skipped positions. Old days may be backfilled only with an authenticated reason; revisions never overwrite old evidence and must explicitly reference the last recorded revision. A projection table holds the most recent daily summary but is only updated transactionally after the new event ledger entry succeeds.

**Limits:** append-only is enforced by the ingestor path and unique database constraints, not by database-imposed immutable storage; privileged SQL operators can still edit/delete the ledger. Immutable external storage, restricted DB credentials, producer key custody, independent Verify.et reconciliation sources and controls against omitted upstream events remain required before any attestation.

## Test matrix
Synthetic isolated MySQL tests validate: exact replays, conflicting event ID, wrong HMAC, extra PII, disabled gate, missing/duplicate signing keys, workspace authorization, out-of-order recovery, predecessor mismatch, historical backfills, signed correction audit trail, time/watermark validation, separate source cursors and atomic rollback when the materialized projection is absent.

## Next milestones
1. Independently provision and review two upstream producer integrations; preserve Verify.et webhook and settlement-match invariants.
2. Source-specific signing key rotation, KMS/secret rotation policy, signed manifest or provider provenance; no production keys in logs or app source.
3. Simulate ingestion outages, partial backfills and concurrent writers against MySQL guarded test DB. Review database isolation behavior under load.
4. Add immutable independently verified source history, external provenance checker, completeness semantics and operator recovery workflow; only then revisit the readiness gate.
5. Full CI, independent AppSec, ChatGPT OAuth staging and explicit GO/NO-GO before merge or deploy.