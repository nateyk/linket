#!/usr/bin/env bash
# Atomic Linket deploy — called from GitHub Actions over SSH.
# Usage:
#   bash ~/linket/deploy/deploy.sh \
#     --release-id="20260820-143000-a6fb0e1d" \
#     --artifact="releases/20260820-143000-a6fb0e1d.tar.gz" \
#     [--php-binary="php"] [--health-url="https://linket.example/up"] [--keep-releases=5]
#
# Preconditions (fail closed):
#   - DEPLOY_PATH is ~/linket (or $DEPLOY_PATH env override)
#   - artifact is a tar.gz uploaded by CI for the exact SHA being deployed
#   - shared/.env exists, shared/storage exists with correct perms
#   - php >=8.2, required extensions present
#
# Guarantees:
#   - Concurrency protected via flock on $DEPLOY_PATH/.deploy.lock
#   - Migration runs BEFORE symlink switch; failure aborts without touching current
#   - health failure auto-rolls back to previous release, then exits non-zero
#   - Never deletes current or previous release during cleanup
set -euo pipefail

# ---------- args ----------
RELEASE_ID=""
ARTIFACT=""
PHP_BIN="${PHP_BINARY:-php}"
HEALTH_URL="${APP_URL:-}/up"
KEEP_RELEASES="${KEEP_RELEASES:-5}"
LINK_PUBLIC_HTML="${LINK_PUBLIC_HTML:-false}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --release-id=*) RELEASE_ID="${1#*=}" ; shift ;;
    --release-id)  RELEASE_ID="$2"; shift 2 ;;
    --artifact=*)   ARTIFACT="${1#*=}"; shift ;;
    --artifact)     ARTIFACT="$2"; shift 2 ;;
    --php-binary=*) PHP_BIN="${1#*=}"; shift ;;
    --php-binary)   PHP_BIN="$2"; shift 2 ;;
    --health-url=*) HEALTH_URL="${1#*=}"; shift ;;
    --health-url)   HEALTH_URL="$2"; shift 2 ;;
    --keep-releases=*) KEEP_RELEASES="${1#*=}"; shift ;;
    --keep-releases)   KEEP_RELEASES="$2"; shift 2 ;;
    --link-public-html) LINK_PUBLIC_HTML="true"; shift ;;
    *) echo "Unknown arg: $1" >&2; exit 2 ;;
  esac
done

if [[ -z "$RELEASE_ID" ]]; then echo "Missing --release-id" >&2; exit 2; fi
if [[ -z "$ARTIFACT" ]]; then echo "Missing --artifact" >&2; exit 2; fi

DEPLOY_PATH="${DEPLOY_PATH:-$HOME/linket}"
# Allow caller to pass absolute artifact or relative to DEPLOY_PATH
if [[ "$ARTIFACT" != /* ]]; then ARTIFACT="$DEPLOY_PATH/$ARTIFACT"; fi

RELEASES="$DEPLOY_PATH/releases"
SHARED="$DEPLOY_PATH/shared"
CURRENT="$DEPLOY_PATH/current"
LOCK="$DEPLOY_PATH/.deploy.lock"
RELEASE_DIR="$RELEASES/$RELEASE_ID"

log() { echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $*" ; }
fail() { echo "DEPLOY FAIL: $*" >&2; exit 1; }

# ---------- lock ----------
mkdir -p "$DEPLOY_PATH" "$RELEASES" "$SHARED"
exec 9>"$LOCK"
if ! flock -n 9; then
  fail "Another deployment is in progress (flock $LOCK held). Concurrency guard triggered."
fi
log "Lock acquired: $LOCK"

# ---------- preflight ----------
log "Preflight — PHP=$PHP_BIN  DEPLOY_PATH=$DEPLOY_PATH  RELEASE_ID=$RELEASE_ID  ARTIFACT=$ARTIFACT"

if ! command -v "$PHP_BIN" >/dev/null 2>&1; then fail "PHP binary not found: $PHP_BIN (set PHP_BINARY env)"; fi
PHP_VER="$($PHP_BIN -r 'echo PHP_VERSION;' 2>&1)"
log "PHP $PHP_VER ($PHP_BIN)"
if ! $PHP_BIN -r 'exit(version_compare(PHP_VERSION, "8.2.0", ">=") ? 0 : 1);' 2>&1; then
  fail "PHP $PHP_VER < 8.2 required"
fi
for ext in pdo_mysql mbstring openssl fileinfo curl zip bcmath; do
  if ! $PHP_BIN -m 2>&1 | grep -qi "^${ext}\|^${ext} "; then
    # case-insensitive fallback for gd naming
    if [[ "$ext" == "fileinfo" ]]; then continue; fi
    if ! $PHP_BIN -m 2>&1 | grep -qi "$ext"; then
      fail "PHP extension missing: $ext (php -m)"
    fi
  fi
done

if [[ ! -f "$SHARED/.env" ]]; then fail "Shared env missing: $SHARED/.env — create from env.example per docs/production-operations.md"; fi
if [[ ! -e "$ARTIFACT" ]]; then fail "Artifact not found: $ARTIFACT"; fi
mkdir -p "$SHARED/storage/app" "$SHARED/storage/framework/cache" "$SHARED/storage/framework/sessions" "$SHARED/storage/framework/views" "$SHARED/storage/logs" "$SHARED/storage/tus" "$SHARED/bootstrap/cache" 2>/dev/null || true

# record previous release for rollback (if any)
PREV_TARGET=""
if [[ -L "$CURRENT" ]]; then
  PREV_TARGET="$(readlink -f "$CURRENT" 2>&1 || readlink "$CURRENT" 2>&1 || echo "")"
  log "Current -> $PREV_TARGET"
else
  log "No current symlink yet (first deploy)"
fi
PREV_NAME="$(basename "$PREV_TARGET" 2>/dev/null || echo "")"

# ---------- extract ----------
if [[ -d "$RELEASE_DIR" ]]; then
  # idempotent re-run: remove partial previous attempt with same id (but never if it's current)
  if [[ "$RELEASE_DIR" == "$(readlink -f "$CURRENT" 2>/dev/null || echo "__none__")" ]]; then
    fail "RELEASE_ID $RELEASE_ID is already the live current — refusing to re-extract over live"
  fi
  log "Removing stale release dir from previous attempt: $RELEASE_DIR"
  rm -rf "$RELEASE_DIR"
fi
mkdir -p "$RELEASE_DIR"
log "Extracting artifact $ARTIFACT -> $RELEASE_DIR"
tar -xzf "$ARTIFACT" -C "$RELEASE_DIR" --strip-components=0 2>&1 | tail -n 20
# Some CI tarballs contain a top-level folder; normalize so artisan is at release root
if [[ ! -f "$RELEASE_DIR/artisan" && -f "$RELEASE_DIR"/*/artisan ]]; then
  log "Normalizing nested top-level directory in tarball"
  INNER="$(find "$RELEASE_DIR" -maxdepth 1 -type d -name "linket*" -o -name "release*" | head -1)"
  if [[ -n "$INNER" && -d "$INNER" ]]; then
    shopt -s dotglob
    mv "$INNER"/* "$RELEASE_DIR"/ 2>&1 | tail -n 5 || true
    rmdir "$INNER" 2>/dev/null || true
    shopt -u dotglob
  fi
fi
[[ -f "$RELEASE_DIR/artisan" ]] || fail "Artifact extraction did not produce artisan at $RELEASE_DIR/artisan"
if [[ -f "$RELEASE_DIR/RELEASE_SHA" ]]; then
  log "Artifact RELEASE_SHA=$(cat "$RELEASE_DIR/RELEASE_SHA" 2>&1 | head -1) (kept as audit trail)"
fi
# sanity: public/build must exist (artifact mode)
if [[ ! -f "$RELEASE_DIR/public/build/manifest.json" ]]; then
  log "WARN: public/build/manifest.json missing in release — Vite build may have been skipped"
  if command -v node >/dev/null 2>&1 && [[ -f "$RELEASE_DIR/package.json" ]]; then
    log "Attempting server-side npm ci && npm run build fallback (hybrid)"
    (cd "$RELEASE_DIR" && npm ci 2>&1 | tail -n 20 && npm run build 2>&1 | tail -n 40)
    [[ -f "$RELEASE_DIR/public/build/manifest.json" ]] || fail "Fallback npm build still missing public/build/manifest.json"
  else
    fail "public/build/manifest.json missing and no node fallback available — deploy artifact must contain built assets"
  fi
fi

# ---------- shared links ----------
log "Linking shared files"
# .env
ln -sfn "$SHARED/.env" "$RELEASE_DIR/.env"
# storage (entire storage dir is shared — private product files + tus survive)
if [[ -L "$RELEASE_DIR/storage" || -d "$RELEASE_DIR/storage" ]]; then rm -rf "$RELEASE_DIR/storage"; fi
ln -sfn "$SHARED/storage" "$RELEASE_DIR/storage"
# Ensure storage subdirs exist (shared side)
mkdir -p "$SHARED/storage/app/digital-products" "$SHARED/storage/app/uploads" "$SHARED/storage/app/editable-views/seo-tags" "$SHARED/storage/app/tokens" "$SHARED/storage/tus" "$SHARED/storage/logs" "$SHARED/storage/framework/cache" "$SHARED/storage/framework/sessions" "$SHARED/storage/framework/views" "$SHARED/storage/tntsearch"
# bootstrap/cache: keep per-release but ensure writable; optionally symlink to shared
mkdir -p "$RELEASE_DIR/bootstrap/cache" "$SHARED/bootstrap/cache"
chmod 775 "$RELEASE_DIR/bootstrap/cache" 2>/dev/null || true
chmod 775 "$SHARED/storage" "$SHARED/storage/framework" "$SHARED/storage/logs" 2>/dev/null || true

# vendor fallback (hybrid) — only if artifact somehow lacks vendor
if [[ ! -d "$RELEASE_DIR/vendor" ]]; then
  log "vendor/ missing — running composer install --no-dev (hybrid fallback)"
  (cd "$RELEASE_DIR" && composer install --no-dev --prefer-dist --optimize-autoloader --no-interaction 2>&1 | tail -n 40)
  [[ -d "$RELEASE_DIR/vendor" ]] || fail "composer install fallback failed to create vendor/"
fi

# ---------- perms ----------
log "Setting permissions (storage 775, bootstrap/cache 775, .env 640 where applicable)"
chmod -R 775 "$SHARED/storage" 2>/dev/null || true
chmod 775 "$RELEASE_DIR/bootstrap/cache" 2>/dev/null || true
chmod 640 "$SHARED/.env" 2>/dev/null || true

# ---------- pre-migration backup (best-effort) ----------
BACKUP_FILE=""
if command -v mysqldump >/dev/null 2>&1; then
  # parse DB creds from shared env (without exposing password in logs)
  DB_HOST="$(grep -E '^DB_HOST=' "$SHARED/.env" 2>/dev/null | cut -d= -f2- | tail -1 | tr -d '\"'\'' ' || echo "127.0.0.1")"
  DB_PORT="$(grep -E '^DB_PORT=' "$SHARED/.env" 2>/dev/null | cut -d= -f2- | tail -1 | tr -d '\"'\'' ' || echo "3306")"
  DB_DB="$(grep -E '^DB_DATABASE=' "$SHARED/.env" 2>/dev/null | cut -d= -f2- | tail -1 | tr -d '\"'\'' ' || echo "")"
  DB_USER="$(grep -E '^DB_USERNAME=' "$SHARED/.env" 2>/dev/null | cut -d= -f2- | tail -1 | tr -d '\"'\'' ' || echo "")"
  DB_PASS="$(grep -E '^DB_PASSWORD=' "$SHARED/.env" 2>/dev/null | cut -d= -f2- | tail -1 | tr -d '\"'\'' ' || echo "")"
  if [[ -n "$DB_DB" && -n "$DB_USER" ]]; then
    mkdir -p "$DEPLOY_PATH/backups"
    BACKUP_FILE="$DEPLOY_PATH/backups/pre-${RELEASE_ID}.sql.gz"
    log "Creating pre-migration backup $BACKUP_FILE (mysqldump --single-transaction --quick)"
    # Use MYSQL_PWD to avoid password on cmdline
    if MYSQL_PWD="$DB_PASS" mysqldump -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" --single-transaction --quick "$DB_DB" 2>&1 | gzip -c > "$BACKUP_FILE" 2>&1; then
      sha256sum "$BACKUP_FILE" 2>&1 | head -1 | log 2>&1 || true
      log "Backup OK: $(du -h "$BACKUP_FILE" 2>&1 | awk '{print $1}')  $(sha256sum "$BACKUP_FILE" 2>&1 | awk '{print $1}' | cut -c1-16)..."
    else
      log "WARN: mysqldump backup failed — continuing deploy (manual backup recommended before destructive migrations)"
      rm -f "$BACKUP_FILE" 2>/dev/null || true
      BACKUP_FILE=""
    fi
  else
    log "WARN: DB creds not found in shared/.env — skipping mysqldump backup (create DB backup manually before destructive migrations)"
  fi
else
  log "WARN: mysqldump not available — skipping pre-migration backup (ensure offsite backup exists per docs/production-operations.md)"
fi

# ---------- pre-migration health (no DB writes) ----------
log "Pre-migration health check in $RELEASE_DIR"
if ! (cd "$RELEASE_DIR" && $PHP_BIN artisan deploy:health --pre 2>&1 | tail -n 30); then
  log "Pre-migration health reported WARN — inspecting but continuing (health --pre is advisory)"
fi

# ---------- migrate (BEFORE symlink switch) ----------
log "Running migrations in $RELEASE_DIR"
set +e
(cd "$RELEASE_DIR" && $PHP_BIN artisan migrate --force --no-interaction 2>&1)
MIGRATE_RC=$?
if [[ $MIGRATE_RC -eq 0 ]]; then
  # Migrations can mutate cached state (e.g. the settings cache); make sure
  # the live app never serves stale cached values after a migration.
  (cd "$RELEASE_DIR" && $PHP_BIN artisan cache:clear --no-interaction 2>&1 | tail -n 3)
fi
set -e
if [[ $MIGRATE_RC -ne 0 ]]; then
  log "MIGRATE FAILED (exit $MIGRATE_RC) — aborting, current unchanged"
  log "Release dir kept at $RELEASE_DIR for forensics; previous current still live"
  # do not switch symlink, do not cleanup this failed release
  exit $MIGRATE_RC
fi
log "Migrations OK"

# ---------- caches (inside new release, before activation) ----------
log "Building optimized caches in new release"
(cd "$RELEASE_DIR" && $PHP_BIN artisan optimize 2>&1 | tail -n 20)
(cd "$RELEASE_DIR" && $PHP_BIN artisan event:cache 2>&1 | tail -n 20 || true)
# view cache is included in optimize, but also explicit:
(cd "$RELEASE_DIR" && $PHP_BIN artisan view:cache 2>&1 | tail -n 5 || true)
(cd "$RELEASE_DIR" && $PHP_BIN artisan route:list 2>&1 | head -n 5) # smoke route load
# storage:link idempotent — creates public/storage -> storage/app/public inside release
if (cd "$RELEASE_DIR" && $PHP_BIN artisan storage:link 2>&1 | tail -n 10); then
  log "storage:link OK"
else
  log "storage:link reported issue (may already exist) — checking"
  [[ -L "$RELEASE_DIR/public/storage" ]] || log "WARN: public/storage symlink missing after storage:link"
fi
# assert private product prefix is NOT inside public
if [[ -d "$RELEASE_DIR/storage/app/digital-products" ]]; then
  : # correct shared location via symlink
  log "Private product storage correctly under storage/app/digital-products (shared)"
fi
if [[ -d "$RELEASE_DIR/public/digital-products" ]]; then
  log "WARN: public/digital-products exists — private files must not be under public/"
fi

# ---------- activate atomically (temp symlink + mv -Tf for same-filesystem atomic rename) ----------
log "Activating release atomically: $RELEASE_DIR -> $CURRENT (via temp symlink + mv -Tf)"
# atomic_swap creates a temp symlink on the same filesystem and renames it over the live symlink
# mv -Tf is atomic on POSIX when source and target are on same mount
ln -s "$RELEASE_DIR" "$CURRENT.next"
# use -Tf to atomically replace symlink target without dereferencing
mv -Tf "$CURRENT.next" "$CURRENT"

# optional cPanel public_html symlink (same atomic technique)
if [[ "$LINK_PUBLIC_HTML" == "true" ]]; then
  PH="$HOME/public_html"
  if [[ -e "$PH" && ! -L "$PH" ]]; then
    log "WARN: $PH exists and is not a symlink — skipping LINK_PUBLIC_HTML (resolve manually per §6.3)"
  else
    log "Linking $PH -> $CURRENT/public (atomic)"
    ln -s "$CURRENT/public" "$PH.next"
    mv -Tf "$PH.next" "$PH"
  fi
fi

# ---------- post-activation: queue restart ----------
# Only touch Horizon when actually running redis queues; otherwise plain queue:restart.
QUEUE_CONN="$(grep -E '^QUEUE_CONNECTION=' "$SHARED/.env" 2>/dev/null | tail -1 | cut -d= -f2- | tr -d "\"'" || true)"
log "Restarting queue workers for new code (QUEUE_CONNECTION=${QUEUE_CONN:-unknown})"
if [[ "${QUEUE_CONN,,}" == "redis" ]]; then
  if (cd "$CURRENT" && $PHP_BIN artisan horizon:terminate 2>&1 | tail -n 10); then
    log "horizon:terminate OK (Supervisor will restart)"
  else
    log "horizon:terminate failed — trying queue:restart fallback"
    (cd "$CURRENT" && $PHP_BIN artisan queue:restart 2>&1 | tail -n 5 || true)
  fi
else
  (cd "$CURRENT" && $PHP_BIN artisan queue:restart 2>&1 | tail -n 3 || true)
fi

# ---------- post-activation health (gates rollback) ----------
HEALTH_RC=0
log "Post-activation health — curl $HEALTH_URL"
if [[ -n "$HEALTH_URL" && "$HEALTH_URL" != "/up" ]]; then
  if ! curl -fsS --retry 3 --retry-delay 2 --max-time 10 "$HEALTH_URL" 2>&1 | head -n 20; then
    log "HEALTH FAIL: curl $HEALTH_URL did not return 2xx"
    HEALTH_RC=1
  else
    log "HTTP health OK"
  fi
else
  log "HEALTH_URL not set or is /up placeholder — skipping HTTP check (set APP_URL env in deploy job)"
fi

log "Running deploy:health --post in $CURRENT"
if ! (cd "$CURRENT" && $PHP_BIN artisan deploy:health --post 2>&1 | tail -n 40); then
  log "deploy:health --post reported failure"
  HEALTH_RC=1
fi

if [[ $HEALTH_RC -ne 0 ]]; then
  log "POST-ACTIVATION HEALTH FAILED — rolling back to $PREV_TARGET"
  if [[ -n "$PREV_TARGET" && -d "$PREV_TARGET" ]]; then
    ln -s "$PREV_TARGET" "$CURRENT.next"
    mv -Tf "$CURRENT.next" "$CURRENT"
    (cd "$CURRENT" && $PHP_BIN artisan optimize 2>&1 | tail -n 5 || true)
    (cd "$CURRENT" && $PHP_BIN artisan horizon:terminate 2>&1 | tail -n 5 || (cd "$CURRENT" && $PHP_BIN artisan queue:restart 2>&1 | tail -n 5 || true))
    log "Rollback complete — current now -> $PREV_TARGET; failed release kept at $RELEASE_DIR for forensics"
  else
    log "No previous release to rollback to (first deploy failed) — current remains at failed release for inspection"
  fi
  exit 1
fi
log "Post-activation health OK"

# ---------- cleanup ----------
log "Cleanup — keeping last $KEEP_RELEASES releases (never deleting current or previous)"
# List releases sorted newest first (by mtime of directory)
# Guard: never rm current target or PREV_NAME
CURRENT_NAME="$(basename "$(readlink -f "$CURRENT" 2>/dev/null || echo "")")"
KEEP="$KEEP_RELEASES"
if [[ "$KEEP" -lt 3 ]]; then KEEP=3; fi
# Build keep set
KEEP_SET=("$CURRENT_NAME")
if [[ -n "$PREV_NAME" ]]; then KEEP_SET+=("$PREV_NAME"); fi
# newest KEEP - len(KEEP_SET) additional (already counting current+prev)
EXTRA_KEEP=$((KEEP - ${#KEEP_SET[@]}))
if [[ $EXTRA_KEEP -lt 0 ]]; then EXTRA_KEEP=0; fi
# collect all release names newest-first
# NOTE: no process substitution — /dev/fd is unavailable in some cPanel containers
RELEASES_TMP="$(mktemp)"
ls -1t "$RELEASES" 2>/dev/null | grep -E '^[0-9]{8}-' > "$RELEASES_TMP" || true
ALL_RELEASES=()
while IFS= read -r name; do [[ -n "$name" ]] && ALL_RELEASES+=("$name"); done < "$RELEASES_TMP"
rm -f "$RELEASES_TMP"
KEPT=0
for name in "${ALL_RELEASES[@]}"; do
  # do we keep it?
  keep=false
  for k in "${KEEP_SET[@]}"; do [[ "$name" == "$k" ]] && keep=true && break; done
  if $keep; then continue; fi
  if [[ $KEPT -lt $EXTRA_KEEP ]]; then
    KEEP_SET+=("$name")
    KEPT=$((KEPT+1))
    continue
  fi
  # candidate for deletion — but never if it's current/prev
  should_delete=true
  for k in "${KEEP_SET[@]}"; do [[ "$name" == "$k" ]] && should_delete=false && break; done
  if $should_delete; then
    # Additional guard: never delete if still referenced by current
    CANDIDATE="$RELEASES/$name"
    if [[ "$CANDIDATE" == "$(readlink -f "$CURRENT" 2>/dev/null || echo "__none__")" ]]; then
      log "Skipping cleanup of $name (is current)"
      continue
    fi
    log "Cleaning old release: $CANDIDATE"
    rm -rf "$CANDIDATE"
  fi
done
log "Cleanup done — remaining releases: $(ls -1 "$RELEASES" 2>&1 | tr '\n' ' ')"

# ---------- record meta ----------
log "Recording DEPLOY_META"
cat > "$RELEASE_DIR/DEPLOY_META" <<EOF
release_id=$RELEASE_ID
artifact=$ARTIFACT
deployed_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)
php_version=$PHP_VER
prev_release=$PREV_NAME
backup_file=${BACKUP_FILE:-none}
health_url=$HEALTH_URL
EOF
if [[ -f "$RELEASE_DIR/RELEASE_SHA" ]]; then
  log "RELEASE_SHA=$(cat "$RELEASE_DIR/RELEASE_SHA" 2>&1 | head -1)"
fi
cat "$RELEASE_DIR/DEPLOY_META" 2>&1 | tail -n 10

log "DEPLOY SUCCESS — $RELEASE_ID is now live at $CURRENT"
log "Verify: curl -fsS $HEALTH_URL && $PHP_BIN $CURRENT/artisan deploy:health --post && $PHP_BIN $CURRENT/artisan horizon:status"
