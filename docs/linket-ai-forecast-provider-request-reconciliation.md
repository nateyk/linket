# PR-08: Provider request-set reconciliation (diagnostics only)

The internal `ForecastProviderRequestReconciliation` component compares separately gathered and server-scoped local request-ID hashes against the request-ID fingerprints from `VerifyEtHistorySnapshotReader`. It rejects malformed, repeated, excessive and incomplete sources. It reports missing identities in either direction and outstanding provider requests; raw request IDs, buyer information and bank details never appear in its output.

**Security invariant:** Even an exact set match, including an empty set, does NOT prove the Verify.et account scope, the absence of undisclosed requests, or complete upstream provider delivery. The caller is responsible for obtaining authorized local hashes; there is deliberately no HTTP/MCP controller or account switching. Snapshot booleans are never promoted to attestation. Source-account completeness remains an operator/provider contract requirement. No forecast results are published.

## Staging prerequisites
- Confirm Verify.et publicly documents the exact GET history contract and that a dedicated account-scoped verification:read key exists and does not permit write operations.
- Establish a separately maintained record of all Linket-submitted verification attempt identities and pending/retry statuses, scoped to a creator and workspace without leaking raw identity data.
- Reconcile all missing and extra hashes; inspect account scope, pagination snapshot stability, late settlements and retention limitations.
- Confirm with provider whether it can issue a signed account-wide closing inventory with monotonic event cursor.
- Require externally immutable evidence, independent AppSec, full CI and separate ChatGPT OAuth staging before any creator-visible forecasting.

This is a pure, non-network, read-only diagnostic. It does not contact Verify.et, consume live credentials, generate a provider attestation, or change checkout/fulfillment.
