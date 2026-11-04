# Linket AI V1 — Task 8 Historical Artifact & Runtime Evidence Review

**Date:** 2026-11-04. **Starting feature HEAD:** `5b7d2206da1ef11ddcdad501a2675caba2b2f859`. **Branch:** `feat/linket-ai-v1`. **Scope:** non-secret Git/GitHub metadata and existing local security documentation. **Release:** NO-GO.

This assessment is a **metadata-only investigation, not a production attestation or incident clearance**. No historical artifact payload was downloaded or inspected, no cPanel or production server was accessed, and no real keys, .env values, cached secrets, database records or live bearer tokens were read. Neither local testing nor a successful deployment workflow proves an archive free of secrets.

## 1. Timeline and source evidence

| Event | Verified source | Classification |
| --- | --- | --- |
| 2026-08-20: recursive `chmod -R 775` introduced to deployment | Git commit `e8af16b5ded78c04ce6ab1a2574192cd16652741` | Confirmed insecure source configuration. It could change restrictive shared files to group/other-readable modes if executed. |
| 2026-08-20 onward: historical CI archive construction lacked explicit Passport-key exclusions | Git history and Task 6 audit | Confirmed guard gap, **not** evidence a real key was archived. |
| 2026-11-04: bounded secret permission checks added locally | `f6e409ac841043f47cfd288fed5aadb21e95ee02` | Local mitigation; commit date is not a production rollout date. |
| 2026-11-04: artifact secret scanning/exclusion and verifier checks added locally | `5b7d2206da1ef11ddcdad501a2675caba2b2f859` | Local mitigation; not on `main` and not protecting historical archives. |

**Risk classifications:** confirmed vulnerable code and synthetic permission-broadening mechanism; plausible historical file-key/inline-key exposure if sensitive material was present when affected deployments ran; **no confirmed unauthorized read, key leak, or compromise**. The actual key source, production effective UID/GID, deployment steps reached, private-key provisioning dates, and retained historical artifact content remain **UNKNOWN**. Absence of logs or retained artifacts does not establish absence of prior disclosure.

## 2. Historical GitHub Actions inventory (metadata only)

The following are *sampled* CI archive records returned by GitHub's run-artifact metadata API on 2026-11-04. No archive bytes were downloaded. Their checksums/source claims and contents were not independently verified in this audit. A source SHA shown here is GitHub's metadata binding, not a forensic content attestation.

| Main CI run | Source SHA prefix | CI archive artifact ID | Creation (UTC) | GitHub expiry (UTC) | Related successful deployment workflow |
| --- | --- | --- | --- | --- | --- |
| [41656061509](https://github.com/nateyk/linket/actions/runs/41656061509) | `b6afb1ee` | `13240442401` | Nov 3 14:48 | Nov 6 14:48 | None established for this SHA |
| [41573563141](https://github.com/nateyk/linket/actions/runs/41573563141) | `bd1420b0` | `13202459484` | Nov 3 03:52 | Nov 6 03:52 | [41575854174](https://github.com/nateyk/linket/actions/runs/41575854174), Nov 3 04:03 |
| [41498094070](https://github.com/nateyk/linket/actions/runs/41498094070) | `0b84b277` | `13167678000` | Nov 2 18:24 | Nov 5 18:24 | [41501084655](https://github.com/nateyk/linket/actions/runs/41501084655), Nov 2 18:29 |
| [41474547856](https://github.com/nateyk/linket/actions/runs/41474547856) | `7f27eb20` | `13158115596` | Nov 2 15:57 | Nov 5 15:57 | [41480004078](https://github.com/nateyk/linket/actions/runs/41480004078), Nov 2 16:17 |
| [41340726761](https://github.com/nateyk/linket/actions/runs/41340726761) | `86854b19` | `13098045744` | Nov 1 19:28 | Nov 4 19:28 | [41342851636](https://github.com/nateyk/linket/actions/runs/41342851636), Nov 1 19:39 |

One Nov 3 CI run also retained a separate `frontend-build` artifact (`13240227240`); that is **not** classified as a release archive. The metadata API returned zero artifacts for sampled older CI runs `41275287641` (Nov 1), `35143901774` (Sep 16), `34400218938` (Sep 9), `33739839097` (Sep 3), `33627381084` (Sep 2), `32575703590` (Aug 22), and `32455239816` (Aug 21). A zero count can mean expiration, deletion, never uploaded, or lack of visibility; this audit **does not** classify any of those earlier archives as verified safe. Main's older successful deployment workflows and failed deploy attempts exist in the metadata between Aug and Nov; running a deployment workflow is not proof its storage-permission stage executed.

GitHub's stated archive retention for current CI artifacts is three days. Release packages retained on cPanel and in backups are **not inventoried** because the production host and storage are not accessible to this investigation.

### Operator-owned missing artifact evidence

- Identify intended production release IDs, exact approved source SHAs, creation and deployment timestamps, archived CI run IDs, storage locations, custody and retention.
- Record whether each deployment passed the shared-storage permission stage, even if a later health/migration step failed; reconcile deploy logs **without including secret-bearing text**.
- Inventory cPanel `releases/` and `backups/` **names, stat metadata, access-control metadata and retention only** under explicit operator authorization. Do **not** download, extract, scan or publish actual archives without a separately approved confidential evidence plan.
- If a retained artifact is approved for forensic contents inspection, have an incident owner define redaction, safe isolation, disposal and access tracking first. No such authorization was assumed here.

## 3. Runtime evidence and least-privilege matrix

See [existing detailed preflight and operator procedure](linket-ai-cpanel-runtime-security-audit.md) and `deploy/runtime-preflight.php`. Synthetic identity projections demonstrate *possibility*, not the actual server's effective identities.

| Verification control | Current production status | Evidence needed |
| --- | --- | --- |
| Deploy CLI UID/GID, `umask`, actual PHP binary | **UNKNOWN** | Approved operator's `id`, selected command/handler metadata (without environment dumps) |
| PHP-FPM/LiteSpeed effective UID/GID/groups and private key access | **UNKNOWN** | Approved pool/handler identity and access test with non-secret synthetic fixture |
| Queue/Horizon and scheduler effective UID/GID/groups | **UNKNOWN** | Approved process metadata; verify same owner model and required runtime writes |
| Private Passport key paths, modes, ACLs and ancestry | **UNKNOWN** | `stat`/`namei`/`getfacl` metadata only; no contents, no key hashes |
| Cached config, logs, sessions, product storage permissions | **UNKNOWN** | Strict owner/ACL and read/write/traversal evidence, not a recursive chmod |
| Separate static server public-media access | **UNKNOWN** | Approved browser/HTTP result codes for legitimate public asset (no tokens) |
| Private digital-product direct URL denial | **UNKNOWN** | Approved safe negative checks (no entitlement/download URLs pasted) |
| HTTPS issuer, proxy trust, canonical host and rollback | **UNKNOWN** | Staging/production operator review of TLS/forwarding and known-good rollback results |
| Historical live key read/access or compromise | **NOT ESTABLISHED** | Incident owner correlates release logs, provision history, access/audit logs and account/group history |

The metadata-only preflight deliberately returns UNKNOWN for missing independent runtime evidence. It does not read private contents or modify permissions. **Do not make it a public HTTP diagnostic endpoint.** Do not use `secure-storage.php` as a read-only diagnostic; it can modify local permissions.

## 4. Signing-key incident criteria and rotation readiness

Escalate to an incident owner for expedited rotation/revocation if any of the following is **confirmed**: private signing material appeared in an archive accessible to unintended actors; unauthorized private-key read/copy; public web exposure; untrusted account with effective path/file access during a relevant period; key material in logs/config backups of insufficient custody. Widened file permissions **without evidence of an unauthorized reader** is a serious *possible exposure*, not established compromise; the owner must set risk tolerance and decide a precautionary rotation as appropriate.

A **separately approved** rotation/rollback plan must: snapshot non-secret account/grant/token metadata; identify all key consumers and cached/retained release versions; revoke affected consents, authorization codes, access and refresh families; update signing-key material out-of-band with restricted ownership; restart/reload long-lived validators/workers; verify newly signed tokens and old-token rejection; require user re-consent/reconnection; monitor failures; and keep rollback of application code independent of the new key/DB revocation state. **Do not restore suspected-compromised keys to recover old sessions.** No rotation, revocation or production change occurred here.

## 5. Independent AppSec review package

- [ ] Review exact PKCE S256, client/redirect/issuer/resource/scope restrictions and one-workspace consent.
- [ ] Confirm Passport JWS verification and live token/grant/client/creator/workspace/verified-Pro checks for *every* MCP request.
- [ ] Review concurrency tests for refresh/code/approval/disconnect, separate MySQL transactions, and Sanctum isolation.
- [ ] Review secrets/package allowlist, hardlinks/symlinks/tar entry types, synthetic key variants, archive provenance, upload scope.
- [ ] Review cPanel runtime UID/GID, ACL, public/private media, key placement, cached config and error handling from operator evidence.
- [ ] Assess historical artifact and file-access exposure classification against approved security policy.
- [ ] Review staged key rotation, token family revocation, worker/release cache invalidation and rollback.
- [ ] Review Verify.et payment matching, fulfillment and read-only buyer privacy regression evidence.
- [ ] Record reviewer's findings, scope, residual risk, dated approval or required fixes; author self-review is not independent AppSec signoff.

## 6. GitHub and release state

- Local Task 8 baseline: `5b7d2206`, with five unpublished local commits relative to `origin/feat/linket-ai-v1` as observed before this report.
- As of this assessment, PR [#94](https://github.com/nateyk/linket/pull/94) has merge conflicts against `main`; the remote branch previously pointed at `3653eaaa`. Do not infer a new green CI from the last successful run on that older SHA.
- Source-level deployment and artifact security fixes do **not** cover previously retained release archives or substitute for host evidence.
- **No automatic merge, cPanel SSH, secrets inspection, token rotation, OAuth flag activation or production deployment is authorized in this assessment.**
- Release gates remaining: source branch CI on *exact proposed* SHA, PR merge conflict resolution and merge-ref CI, independent AppSec signoff, cPanel operator runtime and historical evidence, rotation decision, explicit owner approval.

**Decision:** NO-GO for OAuth/MCP production activation. Next practical milestone: review this report and prepare a safe integration/CI branch without changing production, then obtain the external host/incident-owner evidence.
