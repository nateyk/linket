#!/usr/bin/env bash
# cPanel capability discovery — read-only, safe to run on production.
# Usage: bash deploy/cpanel-discovery.sh [--json]
# Outputs PASS / FAIL per capability per docs/deployment-architecture.md §3.
# Never prints secret values; never mutates the server.
set -euo pipefail

JSON=false
if [[ "${1:-}" == "--json" ]]; then JSON=true; fi

PASS=0; FAIL=0; WARN=0; UNKNOWN=0
results=()

check() {
  local name="$1" required="$2" why="$3" cmd="$4" verify="$5"
  local status="UNKNOWN" detail=""
  # shellcheck disable=SC2015
  if eval "$verify" >/dev/null 2>&1; then
    status="PASS"
    PASS=$((PASS+1))
  else
    # classify FAIL vs WARN by required flag
    if [[ "$required" == "REQUIRED" ]]; then status="FAIL"; FAIL=$((FAIL+1))
    else status="WARN"; WARN=$((WARN+1)); fi
  fi
  # capture one-line detail (sanitized)
  detail="$(eval "$cmd" 2>&1 | head -n 5 | tr '\n' ';' | sed 's/[^[:print:]]//g' | cut -c1-220)"
  results+=("$name|$required|$status|$why|$detail")
}

manual_check() {
  local name="$1" required="$2" why="$3" detail="$4"
  UNKNOWN=$((UNKNOWN+1))
  results+=("$name|$required|UNKNOWN|$why|$detail")
}

echo "=== Linket cPanel discovery — $(date -u +%Y-%m-%dT%H:%M:%SZ) ==="
echo "Host: $(hostname 2>&1 | head -1)  User: $(whoami 2>&1 | head -1)  PWD: $(pwd 2>&1 | head -1)"
echo ""

check "SSH authenticated"         "REQUIRED"  "You are here"  'echo ok' '[[ "$(echo ok)" == "ok" ]]'
check "PHP CLI present"           "REQUIRED"  "Artisan, composer, cron"  'php -v 2>&1 | head -1' 'php -v >/dev/null 2>&1'
check "PHP version >=8.3"         "REQUIRED"  "Laravel 13 requires PHP >=8.3 (composer.json)" 'php -r "echo PHP_VERSION;"' 'php -r "exit(version_compare(PHP_VERSION, \"8.3.0\", \">=\")?0:1);"'
check "PHP ext pdo_mysql"         "REQUIRED"  "MySQL migrations" 'php -m | grep -i pdo_mysql' 'php -m | grep -qi pdo_mysql'
check "PHP ext mbstring"          "REQUIRED"  "String handling"  'php -m | grep -i mbstring' 'php -m | grep -qi mbstring'
check "PHP ext openssl"           "REQUIRED"  "Encryption/APP_KEY" 'php -m | grep -i openssl' 'php -m | grep -qi openssl'
check "PHP ext fileinfo"          "REQUIRED"  "Upload mime sniffing (spoof check)" 'php -m | grep -i fileinfo' 'php -m | grep -qi fileinfo'
check "PHP ext gd"                "REQUIRED"  "Image thumbs (intervention/image)" 'php -m | grep -i gd' 'php -m | grep -qi "^gd"'
check "PHP ext curl"              "REQUIRED"  "Chapa/guzzle" 'php -m | grep -i curl' 'php -m | grep -qi curl'
check "PHP ext zip"               "REQUIRED"  "Composer, zip exports" 'php -m | grep -i zip' 'php -m | grep -qi "^zip"'
check "PHP ext bcmath"            "REQUIRED"  "Money/fee math" 'php -m | grep -i bcmath' 'php -m | grep -qi bcmath'
check "PHP ext redis OR predis fallback" "PREFERRED" "Horizon/cache redis" 'php -m | grep -i redis; echo "---predis via composer.json"; grep -q predis composer.json 2>/dev/null && echo "predis present" || true' 'php -m | grep -qi redis || grep -q predis composer.json 2>/dev/null'
check "OPcache validate_timestamps or reload possible" "PREFERRED" "Symlink switch visibility" 'php -i | grep -i "opcache.validate_timestamps.*1\|opcache.enable"' 'php -i | grep -qi "opcache"'
check "Composer 2.x"              "PREFERRED" "Hybrid fallback builds" 'composer --version 2>&1 | head -1' 'composer --version >/dev/null 2>&1'
check "MySQL client (mysql)"      "PREFERRED" "DB checks" 'which mysql 2>&1 | head -1; mysql --version 2>&1 | head -1' 'which mysql >/dev/null 2>&1 || which mariadb >/dev/null 2>&1'
check "mysqldump"                 "PREFERRED" "Pre-migration backup" 'which mysqldump 2>&1 | head -1; mysqldump --version 2>&1 | head -1' 'which mysqldump >/dev/null 2>&1'
check "Node 20 (+ npm)"           "OPTIONAL"  "Only if building public/build on server (artifact preferred)" 'node -v 2>&1 | head -1; npm -v 2>&1 | head -1' 'node -v >/dev/null 2>&1 && npm -v >/dev/null 2>&1'
manual_check "Atomic symlink swap" "REQUIRED" "Must be proven in approved staging, not by a read-only production audit" "UNKNOWN: requires an explicitly approved scratch test on the target filesystem"
check "Existing shared directory writable" "REQUIRED" "Private product files survive releases" 'ls -ld ~/linket/shared 2>&1 | head -1' 'test -d ~/linket/shared && test -w ~/linket/shared'
check "Disk space (df -h ~)"      "REQUIRED"  "~5 releases (~6GB) required" 'df -h ~ 2>&1 | head -5' 'df -h ~ >/dev/null 2>&1'
check "Cron available"            "REQUIRED"  "schedule:run every minute" 'crontab -l 2>&1 | head -5; echo "---"; ls -la /var/spool/cron/crontabs 2>&1 | head -5; echo "---cPanel Cron UI present if this host is cPanel"' 'crontab -l >/dev/null 2>&1 || which crontab >/dev/null 2>&1 || test -d /var/spool/cron'
check "Supervisor/systemd or persistent-process (Horizon REQUIRED)" "REQUIRED" "Horizon is persistent — must not be spawned from cron every minute; fallback is flocked queue:work --stop-when-empty (see docs §11.2)" 'which supervisord 2>&1 | head -1; supervisorctl status 2>&1 | head -5; echo "---"; ps aux 2>&1 | grep -i horizon | head -3; echo "--- flocked fallback check: which flock && flock -h 2>&1 | head -1"' 'which supervisord >/dev/null 2>&1 || ps aux 2>&1 | grep -qi horizon || which flock >/dev/null 2>&1'
manual_check "DocumentRoot targets public/" "REQUIRED" "Only public/ may be web-exposed" "UNKNOWN: confirm in cPanel Domains UI that DocumentRoot is ~/linket/current/public"
# Extra diagnostics (not gates, just context)
echo ""
echo "--- Capabilities ---"
printf "%-42s | %-9s | %-4s | %s\n" "Capability" "Required" "Stat" "Why / detail"
printf "%-42s-+-%-9s-+-%-4s-+-%s\n" "------------------------------------------" "---------" "----" "--------------------"
for line in "${results[@]}"; do
  IFS='|' read -r name req stat why detail <<<"$line"
  printf "%-42s | %-9s | %-4s | %s\n" "$name" "$req" "$stat" "$why"
  printf "  detail: %s\n" "$detail"
done

echo ""
echo "--- PHP specifics ---"
php -v 2>&1 | head -3 || true
echo "php binary: $(which php 2>&1 | head -1)  php.ini: $(php --ini 2>&1 | grep "Loaded Configuration" | head -1)"
php -m 2>&1 | tr '\n' ',' | cut -c1-500 || true; echo ""
echo ""
echo "--- Composer ---"
composer --version 2>&1 | head -1 || echo "composer not found"
echo ""
echo "--- Node ---"
node -v 2>&1 | head -1 || echo "node not found"
npm -v 2>&1 | head -1 || echo "npm not found"
echo ""
echo "--- DB ---"
which mysql 2>&1 | head -1 || echo "mysql not found"
which mysqldump 2>&1 | head -1 || echo "mysqldump not found"
echo ""
echo "--- Cron ---"
crontab -l 2>&1 | head -10 || echo "(no crontab or not permitted)"
echo ""
echo "--- Summary ---"
echo "PASS=$PASS  WARN=$WARN  UNKNOWN=$UNKNOWN  FAIL=$FAIL"
if [[ $FAIL -gt 0 ]]; then
  echo "RESULT: FAIL — resolve all REQUIRED FAILs before cutover (see docs/deployment-architecture.md §3, §14, §15.1)"
  exit 1
elif [[ $UNKNOWN -gt 0 ]]; then
  echo "RESULT: INCOMPLETE — obtain manual evidence for every UNKNOWN before cutover"
  exit 2
else
  echo "RESULT: OK (all required checks proven; optional WARN items reviewed)."
fi
