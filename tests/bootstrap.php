<?php

/*
 * Batch 0 safety guard: abort the WHOLE PHPUnit run before any test,
 * migration, seeder, or RefreshDatabase/DatabaseTransactions trait can touch
 * a non-test database.
 *
 * The test target is whatever the environment resolves to, NOT a hardcoded
 * hostname. That keeps one source of truth per environment:
 *   - local DDEV: `.env.testing` exists (APP_ENV=testing) -> db_test on host db
 *   - CI:         `.env.testing` is gitignored and absent  -> `.env` -> 127.0.0.1
 *
 * This guard resolves the target the same way Laravel's
 * LoadEnvironmentVariables bootstrapper does, then refuses to run when the
 * resolved database is the application's own database instead of an isolated
 * test database. The dev database is never a valid test target.
 *
 * Note: this runs before Laravel boots, so the env file has not been parsed
 * yet. Process values (including phpunit.xml <env>) win over file values, and
 * later duplicate keys win within the file — both matching phpdotenv.
 */

require __DIR__.'/../vendor/autoload.php';

function batch0_process_env(string $key): ?string
{
    $value = getenv($key);
    if ($value !== false && $value !== '') {
        return $value;
    }

    if (isset($_ENV[$key]) && $_ENV[$key] !== '') {
        return (string) $_ENV[$key];
    }

    if (isset($_SERVER[$key]) && $_SERVER[$key] !== '') {
        return (string) $_SERVER[$key];
    }

    return null;
}

/**
 * Parse a dotenv file the way phpdotenv would: later duplicate keys win.
 *
 * Deliberately small — DB_* values are simple assignments. Anything it cannot
 * read leaves the key unresolved, which makes the guard refuse to run rather
 * than guess.
 */
function batch0_parse_env_file(string $path): array
{
    if (! is_file($path)) {
        return [];
    }

    $vars = [];

    foreach (file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [] as $line) {
        $line = trim($line);

        if (str_starts_with($line, "\xEF\xBB\xBF")) {
            $line = trim(substr($line, 3));
        }

        if ($line === '' || str_starts_with($line, '#')) {
            continue;
        }

        $line = preg_replace('/^export\s+/', '', $line);

        if (! str_contains($line, '=')) {
            continue;
        }

        [$name, $value] = explode('=', $line, 2);
        $name = trim($name);

        if (! preg_match('/^[A-Za-z_][A-Za-z0-9_.]*$/', $name)) {
            continue;
        }

        $value = trim($value);

        if (strlen($value) >= 2 && ($value[0] === '"' || $value[0] === "'") && str_ends_with($value, $value[0])) {
            $value = substr($value, 1, -1);
        } elseif ($value !== '' && $value[0] !== '"' && $value[0] !== "'") {
            $value = trim(preg_split('/\s+#/', $value, 2)[0]);
        }

        $vars[$name] = $value;
    }

    return $vars;
}

/**
 * The env file Laravel will load: `.env.{APP_ENV}` when it exists, else `.env`.
 */
function batch0_environment_file(string $base): string
{
    $appEnv = batch0_process_env('APP_ENV');

    if ($appEnv !== null && is_file($base.'.'.$appEnv)) {
        return $base.'.'.$appEnv;
    }

    return $base;
}

$baseEnv = __DIR__.'/../.env';
$environmentFile = batch0_environment_file($baseEnv);

$fileVars = batch0_parse_env_file($environmentFile);
$appVars = batch0_parse_env_file($baseEnv);

$resolve = static function (string $key) use ($fileVars): ?string {
    $process = batch0_process_env($key);

    if ($process !== null && $process !== '') {
        return $process;
    }

    $fromFile = $fileVars[$key] ?? null;

    return ($fromFile === null || $fromFile === '') ? null : $fromFile;
};

$database = $resolve('DB_DATABASE');
$host = $resolve('DB_HOST');
$connection = strtolower((string) ($resolve('DB_CONNECTION') ?? 'mysql'));
$appDatabase = $appVars['DB_DATABASE'] ?? null;
$source = basename($environmentFile);

$problems = [];

if ($database === null) {
    $problems[] = 'DB_DATABASE is not set';
}

if (in_array($connection, ['mysql', 'mariadb'], true) && $host === null) {
    $problems[] = "DB_HOST is not set (connection '{$connection}')";
}

// The application database (from .env) is only an acceptable test target when
// it is itself a dedicated test database — CI has no separate dev database and
// points .env at belink_test.
if ($database !== null && $appDatabase !== null
    && $database === $appDatabase
    && ! str_contains(strtolower($database), 'test')) {
    $problems[] = "DB_DATABASE='{$database}' is the application's own database (from .env)";
}

if ($problems !== []) {
    fwrite(
        STDERR,
        "REFUSING TO RUN TESTS (resolved from {$source}):\n"
        .'  - '.implode("\n  - ", $problems)."\n"
        ."Tests need an isolated database. Create .env.testing — a copy of .env with\n"
        ."DB_DATABASE (and matching DB_HOST/DB_USERNAME/DB_PASSWORD) pointed at a\n"
        ."disposable test database, e.g. db_test — then re-run.\n"
    );
    exit(1);
}

fwrite(
    STDOUT,
    sprintf(
        "Batch 0 guard: %s via %s (from %s)\n",
        $database,
        $host ?? 'n/a',
        $source
    )
);

// Keep the guarded database and application caches isolated across every
// application boot, including subprocesses started by integration tests.
foreach (['DB_DATABASE' => $database, 'APP_ENV' => 'testing', 'APP_CONFIG_CACHE' => sys_get_temp_dir().'/linket-test-config-'.getmypid().'.php', 'APP_ROUTES_CACHE' => sys_get_temp_dir().'/linket-test-routes-'.getmypid().'.php'] as $key => $value) {
    putenv($key.'='.$value);
    $_ENV[$key] = $value;
    $_SERVER[$key] = $value;
}
