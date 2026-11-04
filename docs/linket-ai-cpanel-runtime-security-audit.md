# Linket AI V1 — cPanel runtime and Passport key exposure audit

Date: 2026-11-04. Baseline: `f6e409ac841043f47cfd288fed5aadb21e95ee02`,
branch `feat/linket-ai-v1`, existing isolated worktree. Production was not
accessed. No production evidence, real signing material, rotation, deployment,
configuration changes, or remote MCP activation was performed. This report is
prepared for ChatGPT review and the existing Linket AI Notion tracker; it is not
a production attestation. The local Task 6 commit SHA is provided in the
accompanying implementation report.

## Decision and evidence boundary

**Release NO-GO until an authorized operator supplies the missing runtime and
historical evidence.** Task 5's deployment hardening remains unchanged. The new
`deploy/runtime-preflight.php` is a separate diagnostic, never an automatic
deployment approval or permission-repair tool.

The diagnostic reads filesystem metadata and a bounded, non-secret JSON
inventory on stdin. It never boots Laravel, loads `.env` or PHP config caches,
opens signing-key contents, starts subprocesses, contacts HTTP/DB services,
writes probes, changes permissions/ownership, changes umask, or switches links.
It reports current CLI effective UID/GID/groups/umask and PHP capabilities.
Other identities are explicitly **operator-supplied POSIX projections**, not
observed worker processes. POSIX projections do not resolve ACLs, read-only
mounts, SELinux/AppArmor, CageFS, `open_basedir`, or web-server policy.

Each check is `PASS`, `FAIL`, or `UNKNOWN`. `metadata_status` summarizes the
bounded projections. The overall status additionally includes independent
ACL, live runtime, HTTP/rollback, and key-configuration evidence, which this
CLI audit always leaves `UNKNOWN`. There is no flag to turn an assertion into
production proof. Exit codes are 1 for any FAIL, 2 for incomplete evidence,
and 0 only for a complete PASS; the current diagnostic cannot certify a
production PASS by itself. Tree inspection is capped at 10,000 entries across
private products and public trees; missing metadata or an incomplete scan is
UNKNOWN, never evidence of isolation.

The scan covers current and the selected rollback release plus shared public
media/private-product inode aliases. It cannot identify renamed byte copies of
secret contents, unknown key locations, unselected retained-release caches,
web-server rewrite/Alias rules, or backup/artifact contents. Those remain
separate inventory and incident-review questions; metadata PASS is deliberately
narrower than proof that no secret exists in a public location.

## Runtime compatibility matrix

`A` below means the verified cPanel account's numeric UID. Production values
are unknown; synthetic identities are not substitutes for production evidence.

| Actor | Required access and expected identity | Same UID A, valid paths/modes | Different application UID | Actual production |
|---|---|---|---|---|
| Deployment CLI | UID A; read `.env`/keys; write shared runtime/cache; critical deploy phase umask 0077 | POSIX compatible | Incompatible with owner-only keys/caches | UNKNOWN |
| PHP-FPM/LiteSpeed | UID A; read keys/config; write framework cache, sessions, logs and private products | POSIX compatible | FAIL even with the same GID when files are 0600 and directories 0700 | UNKNOWN |
| Queue | UID A; read shared configuration/current optimized caches; write runtime storage; fresh workers after cutover | POSIX compatible | FAIL | UNKNOWN |
| Scheduler | UID A; matching PHP version; read shared/current configuration; write required runtime directories | POSIX compatible | FAIL | UNKNOWN |
| cPanel owner | Own deployment controls, shared private directories and keys; no group/other directory writes | Compatible baseline | Incorrect ownership is FAIL | UNKNOWN |
| Static web server | May have a separate UID/GID; search every `/home`/account/deployment/release ancestor and read public files | Depends on traversal and file modes | Compatible if public access is explicit; private paths remain outside DocumentRoot | UNKNOWN |
| Other nonprivileged account | Cannot read owner-only keys or traverse private runtime directories | Must be rejected | Must be rejected | UNKNOWN |

The [cPanel permissions guidance](https://docs.cpanel.net/knowledge-base/general-systems-administration/best-practices-for-code-and-script-permissions/)
recommends running application code as its owner and documents handler-dependent
identities. [LiteSpeed suEXEC](https://docs.litespeedtech.com/lsws/suexec/)
can run external PHP applications under a UID different from the web-server
process. Neither documentation proves this host's selected handler or identity.

Repository evidence: `deploy/secure-storage.php` requires canonical shared
storage/environment aliases and owner-only keys/caches; `deploy/deploy.sh`
sets umask 0077 after extraction and checks both activation and rollback targets.
`deploy/supervisor/linket-horizon.conf.example` contains `user=www-data` and a
generic `/var/www/linket` path. **Do not copy that example unchanged to cPanel**:
the actual user/path must be reviewed against UID A. The architecture's cPanel
Supervisor example already calls for `user=<cpanel-user>`.

An ordinary PHP-FPM umask of 0022 does not by itself expose files beneath a
0700 private parent, but a 0077 umask can make newly written public media
unreadable by a separate web UID unless the upload adapter explicitly sets
public visibility. Verify real file modes/default ACLs and serving behavior.
The deployment script's 0077 phase is not evidence of FPM/worker umasks.

## Human-reviewed, read-only evidence procedure

These are instructions for an authorized human to review and run separately.
No SSH or production command was executed for this task. Keep results in an
approved private audit location. Record identity/permission metadata only.

1. Confirm the canonical deployment root, current release, intended rollback
   release, cPanel account UID/GID, handler/pool identity, queue/scheduler users,
   supplementary groups, and static web-worker identity. Use cPanel/WHM and
   service-manager configuration plus live process metadata. PHP-FPM domain
   configuration locations are documented by
   [cPanel](https://support.cpanel.net/hc/en-us/articles/360061455114-Where-are-the-PHP-FPM-configuration-files-located).
   A hosting administrator can inspect only the `user`/`group` directives;
   never export the complete pool or service configuration.
2. Safe process fields are PID, effective UID/GID, and executable name, for
   example `ps -eo pid,euid,egid,comm`. For an independently selected approved
   PID, inspect only numeric identity/group/mask fields:

   ```bash
   awk '/^(Uid|Gid|Groups|Umask):/ {print}' /proc/APPROVED_PID/status
   ```

   Use effective IDs, not the owner of a PHP script. Running CLI under a user
   does not establish FPM's PHP version, SAPI restrictions, groups, or access.
3. Collect `stat`/`namei` metadata for approved key paths, `.env`, optimized
   caches, private runtime/product directories, public media, and their parents.
   Capture UID, GID, mode, link count, inode/device, and timestamps without
   reading file data. Have the administrator review access/default ACLs using
   `getfacl -n -p -- APPROVED_PATH`; do not infer ACL absence from chmod bits.
   Review mount/MAC/CageFS restrictions without exporting secret-bearing mount
   options. Do not change ownership or permissions during diagnostics.
4. Prepare a non-secret inventory with observed numeric identities. The
   following values are **synthetic examples only**; replace every identity
   and release/path entry using reviewed evidence, not assumptions:

   ```json
   {
     "account_uid": 1001,
     "roles": {
       "cli": {"uid":1001,"gid":1001,"groups":[1001],"umask":"0077"},
       "php_fpm": {"uid":1001,"gid":1001,"groups":[1001],"umask":"0022"},
       "queue": {"uid":1001,"gid":1001,"groups":[1001],"umask":"0077"},
       "scheduler": {"uid":1001,"gid":1001,"groups":[1001],"umask":"0077"},
       "web": {"uid":99,"gid":99,"groups":[99],"umask":"0022"},
       "unauthorized": {"uid":2001,"gid":2001,"groups":[],"umask":"0022"}
     },
     "key_source": "file",
     "private_key": "shared/storage/oauth-private.key",
     "public_key": "shared/storage/oauth-public.key",
     "rollback_release": "APPROVED_RELEASE_ID"
   }
   ```

   Use `key_source` = `file`, `environment`, or `disabled`. Omit unknown facts;
   they must remain UNKNOWN. Paths are metadata, relative to the deployment
   root, confined to nonpublic `shared/storage` or `shared/keys`. Include custom
   configured paths and audit dormant default files too. Confirm key selection
   and disabled feature gates from approved deployment inventories or secret-manager
   metadata. Do not open `.env`/cached configuration containing inline keys for
   this audit, or copy environment dumps/key values into the inventory.
   Never pass a signing key, config cache, or environment file as stdin.
5. After review, run the scoped program as the deployment account:

   ```bash
   php /APPROVED_CANONICAL_ROOT/deploy/runtime-preflight.php /APPROVED_CANONICAL_ROOT < /APPROVED_NON_SECRET_INVENTORY.json
   ```

   The program emits JSON only. Exit 2 is expected while independent evidence
   remains unresolved. Do not run `secure-storage.php` for diagnostics: it
   changes permissions and loads key configuration. Do not publish a PHP,
   `phpinfo`, or diagnostic HTTP endpoint. Do not paste raw `ps aux`, cron
   commands, process environments, or existing general discovery-script output:
   they may contain credentials in arguments or configuration values.
6. In separately approved staging/runtime validation, establish fresh FPM and
   worker access, successful legitimate public-media delivery, denied direct
   private-product URLs, successful authorized fulfillment, and correct access
   after activation and rollback. Actual writes, worker restarts, HTTP checks,
   link swaps, or production changes need their own authorization and are not
   performed by this diagnostic. Capture only status codes and non-secret
   outcomes, never authenticated URLs, headers, tokens, or response secrets.

## Historical exposure assessment

| Classification | Evidence and limits |
|---|---|
| Confirmed insecure repository configuration | `e8af16b5ded78c04ce6ab1a2574192cd16652741` introduced recursive `chmod -R 775` on shared storage on 2026-08-20. `f6e409ac` removed it locally on 2026-11-04. These are commit dates, not production deployment/exposure dates. |
| Confirmed mechanism under synthetic conditions | Task 5 RED tests observed 0600/0400 keys become 0775. Group gained read/write; other users gained read. Changes occurred before activation and survived failed deployment/rollback because storage is shared. |
| Plausible file-key exposure | If a real private key existed under that tree when the vulnerable chmod executed, its permissions could have broadened. A failed migration, failed backup, or rollback after that stage would not undo the shared-file mode change. |
| Plausible inline-key exposure | Earlier `.env` mode 0640 allowed its group to read inline keys. Per-release cached configuration may contain inline keys and historically used a traversable 0775 cache directory; actual cache-file modes/ancestors must be established. |
| Additional plausible artifact channel | CI excludes `.env` and `bootstrap/cache/*.php`, but its archive command does not explicitly exclude `storage/oauth-*.key`. If keys existed in CI storage, they could enter an artifact. No default Passport key files or `*.key`/`*.pem` files were found in tracked-file metadata/history for the known default names; this is not proof that no keys ever existed in workspaces/artifacts/backups. |
| Confirmed unauthorized access or compromise | **None established.** Excess permissions alone do not establish that a user, request, or process read a key. |
| Actual production exposure interval, provisioned key source, affected readers | **UNKNOWN.** No production access, permission history, deployment records, account inventory, or access logs were supplied. |

An administrator should correlate accepted release SHAs/deployment IDs and
timestamps with key-provisioning metadata and execution of the old chmod stage,
including failed deployments. Collect current/historical stat/ACL/ancestor
metadata, cPanel account/group membership over time, authorized shell/process
identities, retained release caches, backup/artifact custody/access records,
and available web/file-access/audit logs with secret fields redacted. Current
ctime/mtime are not a historical permission ledger. HTTP logs usually cannot
prove absence of local file reads; lack of audit events is not proof of no
access. Preserve metadata and incident chronology before any separately
authorized remediation. Never hash, export, open, or inspect real key contents
for this task. A separate incident decision determines whether rotation is
required; simply restoring 0600 cannot undo a possible historical disclosure.

## Separate signing-key rotation proposal — not implemented or executed

This proposal was reviewed against the installed Passport 13.7.6 / League
implementations and Linket's binding/revocation logic. It still requires
incident-owner approval, staging evidence, and an independent deployment review.

| Component | Rotation behavior supported by inspected code |
|---|---|
| Access JWT | Signed with Passport's private key; validation uses one configured public key. Replacing the pair invalidates old signatures in freshly initialized validators. No dual-key grace period/key ring is implemented. |
| Refresh credentials and authorization codes | Encrypted with `Passport::tokenEncryptionKey`, defaulting to Laravel's encrypter key. No application override was found. Changing only the signing pair does **not** necessarily prevent decrypting an existing refresh credential or issuing a new-key access token. |
| Refresh families and grants | Linket checks refresh/access revocation, token bindings, client/resource/scopes, current connection status, and entitlements. `CreatorMcpConnectionRegistry::revoke` transactionally tombstones the connection and revokes its bound access/refresh rows. Outstanding codes and every affected historical family must also be addressed by the approved operation. |
| ChatGPT clients | Revoked grants/tokens require a fresh PKCE authorization and explicit user consent. Stable trusted public client IDs can remain; revoking a client registration is a separate decision and can require registration again. No stored plaintext tokens are exported or restored. |
| Shared keys and release config | `.env`/storage are shared; caches can embed inline keys or old file references. Old long-lived workers may retain a previous key/config until replaced. Every allowed retained release must be validated against the new key version and permissions. |
| Code rollback | **Rolling back application code does not restore previous signing keys.** Rebuilding caches reads the shared current configuration. Rollback must keep the new approved key set and DB revocations; never restore a suspected-compromised key or stale DB state to regain connectivity. |

Source anchors: installed `vendor/laravel/passport/src/PassportServiceProvider.php`
(`makeAuthorizationServer`, `makeCryptKey`), `Passport::tokenEncryptionKey`,
League `BearerTokenValidator` / `RefreshTokenGrant`, and application
`CreatorMcpPassportEncryptedPayload`, `CreatorMcpPassportTokenExchange`,
`CreatorMcpPassportTokenBindings`, `CreatorMcpPassportBearerAccess`, and
`CreatorMcpConnectionRegistry`. Official
[Passport deployment](https://laravel.com/docs/13.x/passport#deploying-passport)
and [revocation guidance](https://laravel.com/docs/13.x/passport#revoking-tokens)
also distinguish configured keys and access/refresh revocation.

Proposed future execution sequence, requiring a separate approved change:

1. Establish the affected key version, incident scope, all Passport clients,
   grants/families/codes, active workers, and retained releases using non-secret
   identifiers and metadata. Decide forced reconnect versus a separately
   engineered multi-key transition. For suspected disclosure, do not extend
   trust in the old signing key merely to preserve sessions.
2. Freeze the affected OAuth authorization, code exchange, refresh, and MCP
   traffic using independently verified gates across current and rollback
   releases; drain in-flight issuance. Leave Verify.et, payments, storefront,
   and fulfillment traffic/configuration outside the rotation operation.
3. Revoke affected grants, outstanding authorization codes, access tokens and
   all associated refresh families with a reviewed, transactional, repeatable
   operation. Recheck concurrent issuance/refresh behavior. Existing disconnect
   behavior is a useful building block, not a complete bulk rotation command.
4. Generate and provision a new matching signing pair in a versioned, owned
   0700 directory under `shared/keys`, with private/public regular files at
   0400/0600. This future operation must avoid logging/exporting key material.
   Use reviewed **regular-file paths** for both configuration references:
   Task 5 rejects key symlinks, including an `active` directory symlink.
5. Coordinate the pair/configuration transition under the traffic freeze;
   avoid a partially changed private/public pair. Build owner-only optimized
   caches for the active and approved rollback releases. Verify matching key
   selection, permissions, and compatibility without copying material into
   audit output. Restart all affected FPM/LiteSpeed and long-lived workers
   through the host's approved mechanisms; account for OPcache/realpath caches.
6. In staging, prove old JWTs fail, revoked old refresh credentials/codes fail,
   every family remains revoked, fresh consent yields usable new-key tokens,
   and code rollback retains the new key version and revocation state. Verify
   legitimate paid fulfillment and public media without exposing private URLs.
7. Reopen only approved OAuth capabilities, guide connected ChatGPT users
   through reconnection, monitor non-secret denial/health counts, and retire
   old key material according to the approved incident/custody policy.

Do not rotate `APP_KEY` as a shortcut: that is a different operation affecting
Laravel encrypted data/cookies and other application features. Do not implement
automatic production rotation, token export, a permissive legacy-key fallback,
or changes to Verify.et credentials/payment state in this task. Approved
rollback must use the hardened deployment entrypoint; rerunning a retained
pre-Task-5 deployment script can reintroduce recursive chmod.

## Validation and remaining blockers

Local verification on 2026-11-04:

| Check | Result |
|---|---|
| Initial RED, new read-only feature absent | 24 failed; later boundary regressions reproduced public-file/ancestor access, missing targets/input, private-directory modes, invalid umask, and incorrect CLI GID/groups before their fixes |
| `RuntimeSecurityPreflightTest.php` | 37 passed, 180 assertions; no skips |
| Unchanged `DeploymentPassportKeyPermissionsTest.php` | 32 passed, 148 assertions |
| Relevant PHP filter: `CreatorMcp`, `PublicMediaPersistence`, `PublicStorefrontProducts`, `StorefrontPublicAssets`, `VerifyEt`, `DigitalProduct`, `Fulfillment`, `ProductionPreflightCommand` | 328 passed, 2 skipped, 2,470 assertions; 115.07 seconds |
| Selected frontend: direct-payment modal, public-service page, service card/gallery; Vitest unit project, one worker | 20 passed across 4 files; 16.51 seconds |
| PHP syntax: diagnostic, fixture, test; deployment shell syntax | PASS |
| Release artifact, verified-CI resolution, release-gate scripts | All three PASS |
| Whitespace/diff checks | PASS |

Tests use temporary directories, synthetic identities and opaque test-key
canaries; atime/mode/ownership snapshots and a FIFO verify that the audit does
not open keys or execute cached configuration. Task 5 deployment/rollback tests
run unchanged. The `db_test` guard remains active. The relevant PHP skips were
the existing local public-storage symlink and missing Clockwork conditions.
Existing Vite/CommonJS-loader, React DOM-prop, and Base UI button-semantic
warnings remain; no frontend code changed. Passport 13.7.6 was confirmed from
the installed package before relying on its key/token behavior.

The full application suite was not rerun for this opt-in standalone diagnostic
and documentation-only change: it is not loaded by Laravel, the application
and Task 5 deployment implementations are unchanged, and the focused plus
relevant PHP/frontend regressions above cover the affected boundary. Task 5's
prior full-suite result is not presented as a new Task 6 run. No dependencies,
payment behavior, production settings, signing keys or deployment workflow were
changed.

Production blockers: actual account/handler/worker identities and supplementary
groups; complete parent traversal and real media modes; effective/default ACLs
and host restrictions; live FPM/worker access and PHP capabilities; verified
DocumentRoot/aliases/private HTTP denials; current and retained key sources and
cache consistency; deployment/exposure chronology; artifact/backup custody;
and a separately approved incident/rotation decision. The CI key-file exclusion
gap needs a separately tested release-artifact guard before a production GO.
No synthetic PASS clears these blockers. Next task: close that artifact guard,
have the authorized cPanel operator collect the bounded evidence above, then
approve a staging runtime/rollback rehearsal and any required incident response
or key-rotation implementation.
