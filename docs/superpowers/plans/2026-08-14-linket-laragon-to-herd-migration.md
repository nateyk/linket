# linket Laragon to Herd Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the linket Laravel 12 project (MySQL-backed) from Laragon (`C:\laragon\www\linket`) to Laravel Herd (`C:\Users\Nate\Herd\linket`, served at `http://linket.test`), migrating the `belink` MySQL database to dbngin, then remove the old Laragon copy after verification.

**Architecture:** Dump `belink` from Laragon's MySQL 8.4 with `mysqldump`, import into a new dbngin MySQL 8.4 instance, copy the git working tree (with populated `common` submodule) to Herd's parked directory (`%USERPROFILE%\Herd`), reinstall Composer + npm dependencies, update `.env` (`APP_URL` + MySQL credentials), verify DB and site, then delete the backup after user confirmation.

**Tech Stack:** Laravel 12, PHP 8.4 (Herd-managed), MySQL 8.4 (dbngin), Vite, npm, Composer.

## Global Constraints

- Do NOT run Laragon and Herd simultaneously (port conflicts). Laragon MySQL must be stopped before dbngin starts (both default to port 3306).
- Do NOT copy the raw MySQL data directory — dump/import only (Option B rejected).
- PHP requirement is `>=8.2`; Herd active PHP is 8.4.24 (satisfies).
- Keep `.git` history and the populated `common` submodule intact in the new copy.
- Do not commit `.env` to git (already gitignored).
- Delete the old Laragon copy ONLY after the user confirms the Herd site works in their browser.
- Herd must stay running; use `herd.bat` CLI for interactions.
- All artisan/composer commands in the new project MUST use Herd's PHP 8.4.24: prepend `C:\Users\Nate\.config\herd\bin\php84` to PATH (the `php` on PATH is Laragon's binary).

---

### Task 1: Dump belink from Laragon MySQL

**Files:**
- Create: `C:\Users\Nate\AppData\Local\Temp\opencode\linket\belink.sql` (dump file)

**Interfaces:**
- Produces: `C:\Users\Nate\AppData\Local\Temp\opencode\linket\belink.sql` — a complete `mysqldump --databases belink` dump (includes CREATE DATABASE), valid SQL, non-zero size.

- [ ] **Step 1: Verify Laragon MySQL binary exists and is not running**

Run:
```powershell
Test-Path "C:\laragon\bin\mysql\mysql-8.4.3-winx64\bin\mysqld.exe"
Test-Path "C:\laragon\bin\mysql\mysql-8.4.3-winx64\bin\mysqldump.exe"
Get-NetTCPConnection -LocalPort 3306 -State Listen -ErrorAction SilentlyContinue
```
Expected: binaries exist; no listener on 3306 (if something IS listening, stop it first — do not proceed with two MySQL instances).

- [ ] **Step 2: Create temp output directory**

Run:
```powershell
New-Item -ItemType Directory -Path "C:\Users\Nate\AppData\Local\Temp\opencode\linket" -Force | Out-Null
```

- [ ] **Step 3: Start Laragon mysqld directly (with datadir, no service)**

Run:
```powershell
$mysqld = "C:\laragon\bin\mysql\mysql-8.4.3-winx64\bin\mysqld.exe"
$out = "C:\laragon\bin\mysql\mysql-8.4.3-winx64\data\err.log"
Start-Process -FilePath $mysqld -ArgumentList "--datadir=C:/laragon/data/mysql-8.4","--port=3306","--console" -RedirectStandardError $out -PassThru
Start-Sleep -Seconds 8
Get-NetTCPConnection -LocalPort 3306 -State Listen -ErrorAction SilentlyContinue
```
Expected: listener on 3306 (mysqld started). If not listening, read `$out` err log and diagnose before continuing. NOTE: `--console` on Windows keeps it foreground; using Start-Process keeps the shell usable. Capture the PID.

- [ ] **Step 4: Dump belink**

Run:
```powershell
& "C:\laragon\bin\mysql\mysql-8.4.3-winx64\bin\mysqldump.exe" -u root --databases belink --result-file="C:\Users\Nate\AppData\Local\Temp\opencode\linket\belink.sql"
```
Expected: exit 0; `belink.sql` exists and is non-trivial size (`(Get-Item ...).Length` > 100KB — verify; report actual size).

- [ ] **Step 5: Verify dump integrity and stop mysqld**

Run:
```powershell
Select-String -Path "...\belink.sql" -Pattern "CREATE DATABASE" | Select-Object -First 1
Get-Content "...\belink.sql" -Tail 3
Stop-Process -Id <mysqld PID from Step 3> -Force
Start-Sleep -Seconds 3
Get-NetTCPConnection -LocalPort 3306 -State Listen -ErrorAction SilentlyContinue
```
Expected: dump contains `CREATE DATABASE /*!32312 IF NOT EXISTS*/ \`belink\``, ends with `Dump completed` comment, port 3306 free after stop.

---

### Task 2: Install dbngin, create and import belink

**Files:**
- Consumes: `C:\Users\Nate\AppData\Local\Temp\opencode\linket\belink.sql`
- No repo files created.

**Interfaces:**
- Consumes: Task 1 dump file.
- Produces: a running MySQL 8.4 instance on dbngin's default port (3306) with database `belink` fully populated (table count and row counts match Laragon's original).

- [ ] **Step 1: Install dbngin**

Download and run the dbngin installer (winget preferred, fallback to the official installer):
```powershell
winget install --id=Gelio.dbngin -e --accept-source-agreements --accept-package-agreements
```
Expected: installed. If winget fails, download the installer from dbngin.com and run it silently. Verify install: `Test-Path "$env:LOCALAPPDATA\Programs\Dbngin"` or `Get-Command dbngin*`.

- [ ] **Step 2: Create a MySQL 8.4 instance in dbngin**

Via dbngin's GUI: create a MySQL 8.4 instance (default port 3306, root, no password). If CLI automation is unavailable, launch dbngin and note that the user creates the instance — report as DONE_WITH_CONCERNS with the exact click path. Verify the instance is listening:
```powershell
Get-NetTCPConnection -LocalPort 3306 -State Listen -ErrorAction SilentlyContinue
```
Expected: listener on 3306. (If the instance is running on a different port, record the ACTUAL port — the .env update in Task 3 must use it.)

- [ ] **Step 3: Import the dump**

Run:
```powershell
& "C:\laragon\bin\mysql\mysql-8.4.3-winx64\bin\mysql.exe" -u root -h 127.0.0.1 -P 3306 < "C:\Users\Nate\AppData\Local\Temp\opencode\linket\belink.sql"
```
NOTE: if the dump's `CREATE DATABASE` contains a `DEFAULT CHARACTER SET` clause, the import handles it. If the pipe redirect `<` fails in PowerShell, use `Get-Content -Raw ... | & mysql.exe ...` instead. Expected: exit 0, no errors.

- [ ] **Step 4: Verify import**

Run:
```powershell
& "C:\laragon\bin\mysql\mysql-8.4.3-winx64\bin\mysql.exe" -u root -h 127.0.0.1 -P 3306 -e "USE belink; SHOW TABLES; SELECT COUNT(*) AS tables_count FROM information_schema.tables WHERE table_schema='belink';"
```
Expected: `belink` present, tables listed. Record the table count. Also verify a known table has rows:
```powershell
& "...\mysql.exe" -u root -h 127.0.0.1 -P 3306 -e "SELECT COUNT(*) FROM belink.users;" 2>&1
```
Expected: succeeds (users table exists — adjust to any table from the SHOW TABLES output if users is absent).

---

### Task 3: Copy project to Herd directory

**Files:**
- Source: `C:\laragon\www\linket`
- Destination: `C:\Users\Nate\Herd\linket`

**Interfaces:**
- Consumes: Tasks 1-2 (DB ready on 3306).
- Produces: `C:\Users\Nate\Herd\linket\` containing the full git working tree (`.git` + populated `common` submodule included), but no `vendor/`, `node_modules/`, or `.env`.

- [ ] **Step 1: Verify destination does not exist**

Run:
```powershell
Test-Path "C:\Users\Nate\Herd\linket"
```
Expected: `False`.

- [ ] **Step 2: Robocopy the project tree**

Run:
```powershell
robocopy "C:\laragon\www\linket" "C:\Users\Nate\Herd\linket" /E /XD vendor node_modules /XF .env /NFL /NDL /NJH /NJS
```
Expected: exit code 0-7 (>=8 is failure).

- [ ] **Step 3: Verify the copy**

Run:
```powershell
Write-Output ".git: $(Test-Path 'C:\Users\Nate\Herd\linket\.git')"
Write-Output "common submodule: $(Test-Path 'C:\Users\Nate\Herd\linket\common\foundation')"
Write-Output "database dir: $(Test-Path 'C:\Users\Nate\Herd\linket\database')"
Write-Output ".env: $(Test-Path 'C:\Users\Nate\Herd\linket\.env')"
Write-Output "vendor: $(Test-Path 'C:\Users\Nate\Herd\linket\vendor')"
Write-Output "node_modules: $(Test-Path 'C:\Users\Nate\Herd\linket\node_modules')"
```
Expected: `.git` True, common submodule True, database True, `.env` False, vendor False, node_modules False.

- [ ] **Step 4: Verify submodule health in the copy**

Run:
```powershell
git -C "C:\Users\Nate\Herd\linket" submodule status
```
Expected: submodule `common` reported WITHOUT a leading `-` (uninitialized marker). A leading `-` means it must be initialized with `git submodule update --init` (requires SSH access to github.com — report if that fails).

---

### Task 4: Configure .env and install dependencies

**Files:**
- Create: `C:\Users\Nate\Herd\linket\.env` (copied from Laragon copy)
- Modify: `C:\Users\Nate\Herd\linket\.env` → `APP_URL=http://linket.test` and DB settings matching dbngin (default: host 127.0.0.1, port 3306, database belink, user root, empty password — use the ACTUAL port recorded in Task 2)

**Interfaces:**
- Consumes: Tasks 2-3 output.
- Produces: runnable project at the new path; `php artisan` works with Herd's PHP against the dbngin MySQL.

- [ ] **Step 1: Copy .env from the backup**

Run:
```powershell
Copy-Item "C:\laragon\www\linket\.env" "C:\Users\Nate\Herd\linket\.env"
```

- [ ] **Step 2: Update APP_URL**

Run:
```powershell
(Get-Content "$env:USERPROFILE\Herd\linket\.env") -replace 'APP_URL=.*','APP_URL=http://linket.test' | Set-Content "$env:USERPROFILE\Herd\linket\.env"
```

- [ ] **Step 3: Update DB settings (verify they match dbngin)**

Read the resulting `.env` DB block and confirm: `DB_HOST=127.0.0.1`, `DB_PORT=3306` (or the actual dbngin port from Task 2), `DB_DATABASE=belink`, `DB_USERNAME=root`, `DB_PASSWORD` empty. Fix with `-replace` if any line differs (e.g. `DB_PORT=3306` if it was something else).

- [ ] **Step 4: Install PHP dependencies with Herd's PHP**

Run (in `C:\Users\Nate\Herd\linket`):
```powershell
$env:PATH = "C:\Users\Nate\.config\herd\bin\php84;" + $env:PATH
php -v
composer install --no-interaction --no-progress
```
Expected: `php -v` reports PHP 8.4.24; composer exits 0.

- [ ] **Step 5: Install frontend dependencies**

Run (in `C:\Users\Nate\Herd\linket`):
```powershell
npm install
```
Expected: exit 0.

- [ ] **Step 6: Build frontend assets**

Run (in `C:\Users\Nate\Herd\linket`):
```powershell
npm run build
```
Expected: exit 0, `public/build` populated. (If the build fails due to TypeScript or missing env, report the exact error rather than working around it.)

- [ ] **Step 7: Link storage and verify artisan boots**

Run (in `C:\Users\Nate\Herd\linket`):
```powershell
$env:PATH = "C:\Users\Nate\.config\herd\bin\php84;" + $env:PATH
php artisan storage:link
php artisan about
```
Expected: storage link created (or "already exists"), `about` outputs Environment local, Database mysql, no errors.

---

### Task 5: Verify database connectivity and Herd site serving

**Files:**
- No file changes — read-only verification.

**Interfaces:**
- Consumes: Tasks 2-4 output.
- Produces: proof the site works at `http://linket.test` against the migrated MySQL database.

- [ ] **Step 1: Verify migrations match the imported database**

Run (in `C:\Users\Nate\Herd\linket`):
```powershell
$env:PATH = "C:\Users\Nate\.config\herd\bin\php84;" + $env:PATH
php artisan migrate:status
```
Expected: all migrations show `Ran`; no `Pending` rows. If Pending rows appear, the DB import may have missed tables — investigate before continuing.

- [ ] **Step 2: Verify Laravel can query the database**

Run (in `C:\Users\Nate\Herd\linket`):
```powershell
php artisan tinker --execute="echo App\Models\User::count();"
```
Expected: prints a count > 0 (users table populated from the dump). If `App\Models\User` doesn't exist, use `DB::table('users')->count()` and record which model/table you used.

- [ ] **Step 3: Verify Herd serves the site**

Run:
```powershell
& "$env:USERPROFILE\.config\herd\bin\herd.bat" sites
```
Expected: `linket` listed with path `C:\Users\Nate\Herd\linket`.

- [ ] **Step 4: Confirm HTTP response from Herd**

Run:
```powershell
curl.exe -s -o NUL -w "%{http_code}" http://linket.test
```
Expected: `200` (or `302`). A transient `502` on cold start is known — retry once after a few seconds.

- [ ] **Step 5: Confirm the login/home page HTML loads**

Run:
```powershell
curl.exe -s http://linket.test/login | Select-String -Pattern "linket|login|Laravel"
```
Expected: matches found. If `/login` 404s (route may not exist), check `/` instead and report which page you used.

---

### Task 6: Smoke-test core flows, then remove backup

**Files:**
- Delete: `C:\laragon\www\linket` (backup removal, ONLY after user verification)
- Modify: `C:\Users\Nate\Herd\linket\opencode.json` (if it references the old path)

**Interfaces:**
- Consumes: Task 5 verification.
- Produces: clean final state — only `C:\Users\Nate\Herd\linket` remains.

- [ ] **Step 1: Open the site in the browser**

Run:
```powershell
Start-Process "http://linket.test"
```
Expected: site opens; user confirms login page renders and a core flow (login/dashboard) works. **STOP HERE and wait for user confirmation before Step 2.**

- [ ] **Step 2: Fix hardcoded old paths (if present)**

Check `C:\Users\Nate\Herd\linket\opencode.json` (and any config in `.agents/`) for `C:/laragon/www/linket`; replace with `C:/Users/Nate/Herd/linket` (JSON-safe forward slashes). Verify with `ConvertFrom-Json`.

- [ ] **Step 3: User confirms verification, then delete the backup**

Run:
```powershell
Remove-Item -Recurse -Force "C:\laragon\www\linket"
```
Expected: contents deleted. NOTE: like the numanfreight migration, the empty root folder may remain if opencode.exe's cwd is inside it — Windows blocks deleting a process's cwd. Report it; the user deletes it after closing the session: `Remove-Item -Recurse -Force "C:\laragon\www\linket"`.

- [ ] **Step 4: Commit config fixes**

Commit any opencode.json/path fixes from the new location (stage ONLY the intended files):
```powershell
git -C "C:\Users\Nate\Herd\linket" add opencode.json
git -C "C:\Users\Nate\Herd\linket" commit -m "chore: migrate dev environment from Laragon to Herd"
```
Expected: commit lands, `git status --short` shows only the pre-existing .agents changes (7143 modified lines were already uncommitted in the source — do NOT commit those).
