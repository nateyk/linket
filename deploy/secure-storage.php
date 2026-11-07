<?php

declare(strict_types=1);

/**
 * Runs without booting Laravel, before Artisan can read or cache secret keys.
 * CLI and PHP-FPM must run as the same cPanel account. Ownership is never changed.
 */
function rejectDeployment(string $reason): never
{
    throw new DomainException($reason);
}

function checkPath(string $path): void
{
    if (! str_starts_with($path, '/') || str_contains($path, '//') || preg_match('~(?:^|/)(?:\.|\.\.)(?:/|$)|\x00~', $path)) {
        rejectDeployment('Noncanonical deployment path.');
    }

    $current = '';
    foreach (explode('/', trim($path, '/')) as $component) {
        $current .= '/'.$component;
        clearstatcache(true, $current);
        if (is_link($current)) {
            rejectDeployment('Unexpected symlink in a protected path.');
        }
    }
}

function prepareDirectory(string $path, int $maximumMode): void
{
    checkPath($path);
    $created = ! file_exists($path);
    if ($created && ! mkdir($path, $maximumMode)) {
        rejectDeployment('Cannot create required storage directory.');
    }
    if (! is_dir($path)) {
        rejectDeployment('Required storage path is not a directory.');
    }

    // Only this directory: retain restrictive access, add owner access, remove excess access.
    $mode = $created ? $maximumMode : ((fileperms($path) & 0777) & $maximumMode) | 0700;
    if (! chmod($path, $mode) || ! is_writable($path)) {
        rejectDeployment('Cannot secure required writable directory.');
    }
}

function checkRegularFile(string $path): void
{
    checkPath($path);
    if (! is_file($path) || ! is_readable($path) || lstat($path)['nlink'] !== 1) {
        rejectDeployment('Protected file must be readable, regular, and have exactly one link.');
    }
}

function protectSecretFile(string $path): void
{
    checkRegularFile($path);
    if (! chmod($path, 0600)) {
        rejectDeployment('Cannot restrict a secret-bearing file to its owner.');
    }
}

function checkKeyFile(string $path, string $shared, bool $private): void
{
    checkPath($path);
    if ((! str_starts_with($path, $shared.'/storage/') && ! str_starts_with($path, $shared.'/keys/'))
        || str_starts_with($path, $shared.'/storage/app/public/')) {
        rejectDeployment('Passport key file must be in nonpublic shared storage or shared/keys.');
    }
    checkRegularFile($path);
    $owner = fileowner($shared.'/.env');
    if (fileowner($path) !== $owner) {
        rejectDeployment('Passport key must belong to the deployment environment owner.');
    }
    for ($directory = dirname($path); $directory !== $shared; $directory = dirname($directory)) {
        if ((fileperms($directory) & 0022) !== 0 || fileowner($directory) !== $owner) {
            rejectDeployment('Passport key ancestors must belong to the deployment owner and prohibit group/other writes.');
        }
    }
    $mode = fileperms($path) & 07777;
    if (($private && ! in_array($mode, [0400, 0600], true)) || (! $private && ($mode & 0133) !== 0)) {
        rejectDeployment('Unsafe Passport key mode; private keys require 0400 or 0600. No key permissions were changed.');
    }
    // Passport's CryptKey permission check applies to public files too. Narrow
    // readable public keys to a supported owner-only mode without touching contents.
    if (! $private && ! chmod($path, $mode & 0600)) {
        rejectDeployment('Cannot secure Passport public key permissions.');
    }
}

function checkConfiguredKey(#[SensitiveParameter] ?string $key, string $type, string $release, string $shared, bool $required): void
{
    $key = str_replace('\\n', "\n", $key ?? '');
    if (! $key) {
        $path = $shared.'/storage/oauth-'.$type.'.key';
        checkPath($path);
        if (! $required && ! file_exists($path)) {
            return;
        }
    } elseif (str_contains($key, '-----BEGIN ')) {
        $valid = $type === 'private' ? openssl_pkey_get_private($key) : openssl_pkey_get_public($key);
        if ($valid === false) {
            rejectDeployment('Invalid inline Passport key configuration.');
        }

        return;
    } else {
        $path = str_starts_with($key, 'file://') ? substr($key, 7) : $key;
        if (! str_starts_with($path, '/')) {
            $path = $release.'/'.$path;
        }
        // This is the one intentional symlink installed by deploy.sh.
        if (str_starts_with($path, $release.'/storage/')) {
            $path = $shared.'/storage/'.substr($path, strlen($release.'/storage/'));
        }
    }

    checkKeyFile($path, $shared, $type === 'private');
}

set_error_handler(static function (): never {
    // PHP/Dotenv exception messages may contain environment values. Never log them.
    throw new RuntimeException('Protected filesystem operation failed.');
});

try {
    if ($argc !== 3) {
        rejectDeployment('Usage: secure-storage.php <release> <shared>');
    }
    [$script, $release, $shared] = $argv;
    checkPath($release);
    checkPath($shared);
    if (! is_dir($release) || ! is_dir($shared) || ($shared !== dirname(dirname($release)).'/shared')) {
        rejectDeployment('Release and shared directories must belong to the same deployment root.');
    }
    foreach ([dirname($shared), dirname($release), $shared, $release] as $directory) {
        if ((fileperms($directory) & 0022) !== 0) {
            rejectDeployment('Deployment control directories must not be writable by group or others.');
        }
    }
    foreach (['storage' => $shared.'/storage', '.env' => $shared.'/.env'] as $name => $target) {
        if (! is_link($release.'/'.$name) || readlink($release.'/'.$name) !== $target) {
            rejectDeployment('Release must use the validated shared storage and environment symlinks.');
        }
    }
    protectSecretFile($shared.'/.env');
    require $release.'/vendor/autoload.php';

    // Use the same immutable environment repository and interpolation as Laravel.
    Dotenv\Dotenv::create(Illuminate\Support\Env::getRepository(), $shared)->load();
    $environment = static fn (string $name): mixed => Illuminate\Support\Env::get($name);
    if ($environment('APP_CONFIG_CACHE') || $environment('LARAVEL_STORAGE_PATH')) {
        rejectDeployment('Custom cache/storage paths require a separate deployment security review.');
    }
    $appEnv = $environment('APP_ENV');
    if ($appEnv && file_exists($release.'/.env.'.$appEnv)) {
        rejectDeployment('Release-specific environment files require a separate deployment security review.');
    }

    foreach ([
        'storage' => 0755,
        'storage/app' => 0755,
        'storage/app/digital-products' => 0700,
        'storage/app/uploads' => 0700,
        'storage/app/public' => 0755,
        'storage/app/public/avatars' => 0755,
        'storage/app/public/link-images' => 0755,
        'storage/app/public/branding-images' => 0755,
        'storage/app/public/article-images' => 0755,
        'storage/app/editable-views' => 0700,
        'storage/app/editable-views/seo-tags' => 0700,
        'storage/app/tokens' => 0700,
        'storage/tus' => 0700,
        'storage/logs' => 0700,
        'storage/framework' => 0700,
        'storage/framework/cache' => 0700,
        'storage/framework/sessions' => 0700,
        'storage/framework/views' => 0700,
        'storage/tntsearch' => 0700,
    ] as $directory => $mode) {
        prepareDirectory($shared.'/'.$directory, $mode);
    }
    prepareDirectory($release.'/bootstrap', 0755);
    prepareDirectory($release.'/bootstrap/cache', 0700);
    foreach (new DirectoryIterator($release.'/bootstrap/cache') as $entry) {
        if (! $entry->isDot()) {
            protectSecretFile($entry->getPathname());
        }
    }

    $cached = is_file($release.'/bootstrap/cache/config.php') ? require $release.'/bootstrap/cache/config.php' : null;
    $required = (bool) ($environment('CREATOR_AI_MCP_OAUTH_ENABLED') || $environment('CREATOR_AI_MCP_HTTP_ENABLED') || $environment('CREATOR_AI_MCP_TOKEN_HTTP_ENABLED'));
    $required = $required || ($cached['creator_ai']['features']['mcp_oauth'] ?? false)
        || ($cached['creator_ai']['features']['mcp_http_oauth'] ?? false)
        || ($cached['creator_ai']['features']['mcp_http_token'] ?? false);

    foreach (['private', 'public'] as $type) {
        // Check dormant default keys too: disabling OAuth must not conceal an unsafe provisioned key.
        checkConfiguredKey(null, $type, $release, $shared, false);
        checkConfiguredKey($environment('PASSPORT_'.strtoupper($type).'_KEY'), $type, $release, $shared, $required);
        if ($cached !== null) {
            checkConfiguredKey($cached['passport'][$type.'_key'] ?? null, $type, $release, $shared, $required);
        }
    }

    echo "Deployment storage and Passport permission checks passed.\n";
} catch (DomainException $exception) {
    fwrite(STDERR, 'DEPLOY SECURITY: '.$exception->getMessage()."\n");
    exit(1);
} catch (Throwable) {
    fwrite(STDERR, "DEPLOY SECURITY: Unable to validate protected storage or key configuration. No release may be activated.\n");
    exit(1);
}
