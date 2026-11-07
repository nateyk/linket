# Linket AI V1 — Internal Forecast Ingestion and External Evidence Security Review

**Date:** 2026-11-05. **Status:** Engineering self-review only; NOT independent AppSec signoff. **Release decision:** NO-GO. No merges, production endpoints, provider secrets, or live storage actions authorized.

## Architecture and trust boundaries

1. Checkout event stream and Verify.et reconciliation are separate source identities. Source-specific HMAC and Ed25519 records can be verified by the Linket ingestor, which keeps only the Ed25519 public keys. Private signing keys and read-only Verify.et API keys must be operated outside Linket.
2. The Linket database contains a transactional hash-chain ledger and a mutable daily projection. Signed closed-window manifests anchor sequences and daily aggregate hashes. The manifest verifier reconstructs signatures and chain digests to detect in-window tampering or gaps.
3. An optional read-only S3 Object Lock COMPLIANCE adapter requires pinned AWS account owner, object-version ID, content SHA-256 and at least one year of remaining COMPLIANCE retention. It never uploads, overwrites, unlocks or deletes objects. The bucket and IAM role remain unprovisioned.
4. An optional Verify.et read-only history adapter uses GET /api/verify/history with explicit UTC dates, limit=50, offset and consistent meta totals; it rejects truncated/contradictory/duplicate pages. It exposes only SHA-256 request-ID hashes to its caller. It does not submit payments or call Verify.et write endpoints.
5. All components are default OFF, have no public routes or scheduled producers, and never enable a sixth forecast MCP tool. ForecastReliabilityGate and ForecastImmutableCoverageAudit always return independent_observation_coverage_verified=false, with monetary output suppressed.

## Security findings — evidence and remediation

| ID | Severity | Verification | Risk / evidence | Required remediation before release |
| --- | --- | --- | --- | --- |
| FC-01 | Critical | Confirmed architectural gap | Neither signed event records nor a provider-history query proves that every upstream payment was submitted, reported or successfully delivered. No-sale dates remain potentially ambiguous. | Obtain a provider-account completeness contract (signed daily closing inventory, event cursor or audited reconciliation feed), verify scope and gaps with a separate source. Keep forecasts disabled until validated. |
| FC-02 | High | Code-only, not live-verified | S3 COMPLIANCE verification is implemented but no external account, versioned Object Lock bucket, restricted IAM role or real retention evidence has been provisioned or tested. | Create a separate WORM evidence account and minimum-retention policy, deny Put/Delete/BucketConfiguration to Linket, run an operator-approved staging-only version/retention test. |
| FC-03 | High | Confirmed missing integration | No independently deployed checkout-event producer or Verify.et reconciliation signer exists. No Ed25519 private source key or externally generated object was used. | Deploy two separately operated producers, document ownership/credentials, use a read-only Verify.et API key, and test actual signed feeds end-to-end without exposing keys in logs/chat. |
| FC-04 | High | Confirmed residual risk | Event ledger is append-only only through application code. A privileged database operator could edit history before an immutable external manifest is available. | Restrict DB append/delete permissions, publish external signed manifest on closure, monitor replication and immutability, test tampering and rollback. |
| FC-05 | High | Confirmed residual risk | A previously valid signed manifest/object version may be stale after delayed verification, source outage or correction; pinned version alone does not prove latest global state. | Maintain an independently signed monotonic manifest inventory, reissue after corrections, reject stale windows and require repair before forecast eligibility. |
| FC-06 | Medium | Code inspected | Both source identities are keyed v1; operational KMS custody, rotation, signer separation and incident revocation are not proven. | Separate producer accounts, rotate/test keys with key IDs, verify public key pinning and incident rollback, and audit privilege separation. |
| FC-07 | Medium | Verified API documentation; no live call | Verify.et GET /api/verify/history is API-key/account scoped. It lists request status but does not by itself prove payment amounts, settlement matching, or provider-wide completeness. | Correlate scoped request-ID hashes against locally expected attempts and signed final outcomes, define outstanding/late statuses, and obtain provider confirmation of scope/retention semantics. |
| FC-08 | Medium | Mock-tested | S3 Object Lock reader checks COMPLIANCE mode, version, retention, size, owner and SHA metadata with AWS mocks; real IAM and live endpoint behavior remain untested. | Run nonproduction integration with an operator-created locked object, GetObjectRetention permissions, expected owner and forced mismatch exercises. |
| FC-09 | Medium | Confirmed residual risk | A 48-hour late-event watermark is a heuristic; Verify.et retries and long-running financial disputes can arrive later. | Validate actual maximum delays, maintain signed backfill/revision ledger, and invalidate affected forecasts until reproven. |
| FC-10 | Medium | Controlled boundary | Current ManifestVerifier requires closed contiguous source windows and all days, and refuses earning estimates, but upstream source authenticity still relies on externally managed keys rather than direct Verify.et signatures. | Obtain third-party attestation or independent account audit; review each producer's source-of-truth and account-level completeness. |

## Tests and current evidence

- Prior exact-head CI #41985936230 was green for the signed ingestor, MySQL security suite, frontend and final verification.
- New focused local tests: six independent signed-window cases, five mocked S3 Object Lock cases, two non-exposure checks and six Verify.et history pagination cases; all pass after strict S3 version-identifier regex correction.
- Three new synthetic guarded MySQL scenarios check cross-source externally signed manifests, database record tampering and forbidden foreign-tenant/disabled-flag evidence access; they still require full exact-head GitHub CI.
- No live Verify.et API calls, no AWS calls, no signing key provisioning and no production changes are part of this evidence.

## Mandatory staging gates

1. Explicit scoped API key with verification:read from a source account associated only with Linket-generated Verify.et attempts; prove account coverage, expiry and no verification:write permission.
2. Separate checkout and reconciliation hosts/accounts with independent Ed25519 private keys held in KMS/secret manager, no private key present on Linket host or committed repository.
3. Independent S3 account with versioning and Object Lock COMPLIANCE; read-only Linket role with bucket-owner pin and GetObject/GetObjectRetention/HeadObject only. Do not use governance mode as sufficient proof.
4. Positive and negative external-window tests: account ownership mismatch, unretained object, wrong version, bad SHA, signature forgery, missing day/sequence, stale version, late correction, compromised local DB, unresolved provider requests, and shortened retention.
5. Independently reviewed GO/NO-GO, Verify.et/fulfillment and OAuth regression suites, and release-specific rollback. Until then never wire external verification into the creator-facing forecast tool.

## Safe rollback

Keep CREATOR_AI_FORECAST_INGESTION_ENABLED, CREATOR_AI_FORECAST_EVIDENCE_ENABLED, CREATOR_AI_FORECAST_VERIFYET_HISTORY_ENABLED and CREATOR_AI_FORECAST_ENABLED false. If a staging incident occurs, stop collectors, revoke read/signing credentials outside Linket, preserve externally locked evidence, and invalidate/reissue affected source window manifests. Do not delete archived evidence or alter existing financial transactions.

## External references

- https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lock.html
- https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lock-managing.html
- https://verify.et/docs/api