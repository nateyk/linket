<?php

/*
 * Batch 0 safety guard: abort the WHOLE PHPUnit run before any test,
 * migration, seeder, or RefreshDatabase/DatabaseTransactions trait can touch
 * a non-test database.
 *
 * Passes only when the resolved database is exactly `db_test` on the local
 * ddev host (`db`). Anything else — including the dev database `db` — exits
 * non-zero before Laravel boots.
 */

require __DIR__.'/../vendor/autoload.php';

function batch0_resolved_env(string $key): ?string
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

$db = batch0_resolved_env('DB_DATABASE');
$host = batch0_resolved_env('DB_HOST');

if ($db !== 'db_test' || $host !== 'db') {
    fwrite(
        STDERR,
        "REFUSING TO RUN TESTS: expected DB_DATABASE='db_test' on DB_HOST='db' "
        ."for the isolated test database (got DB_DATABASE='".($db ?? '(null)')."' "
        ."DB_HOST='".($host ?? '(null)')."').\n"
        ."The dev database is never a valid test target.\n"
    );
    exit(1);
}

// A cached config would pin the test run to whatever database was cached
// (usually the dev `db`), ignoring DB_DATABASE entirely. Bust it before
// Laravel boots so the run always resolves config from the test env.
foreach (['config.php', 'routes-v7.php'] as $cached) {
    $path = __DIR__.'/../bootstrap/cache/'.$cached;
    if (is_file($path)) {
        fwrite(STDERR, "Removing stale bootstrap/cache/{$cached} so tests cannot inherit a cached database.\n");
        @unlink($path);
    }
}
