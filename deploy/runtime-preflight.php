<?php

declare(strict_types=1);

/**
 * Read-only POSIX metadata audit. No Laravel bootstrap, environment access, key
 * reads, permission changes, subprocesses, or HTTP requests. Inventory arrives
 * on stdin so this program cannot accidentally open a secret as its input file.
 * PASS describes a bounded metadata check, never production readiness.
 */
function auditCheck(array &$checks, string $id, ?bool $result, string $reason): void
{
    $checks[$id] = ['status' => $result === null ? 'UNKNOWN' : ($result ? 'PASS' : 'FAIL'), 'reason' => $reason];
}

/** @return array{uid:int,gid:int,mode:int,ino:int,dev:int,nlink:int}|null */
function auditMetadata(string $path): ?array
{
    if (! str_starts_with($path, '/') || str_contains($path, '//') || preg_match('~(?:^|/)(?:\.|\.\.)(?:/|$)|\x00~', $path)) {
        throw new DomainException;
    }
    $part = '';
    foreach (explode('/', trim($path, '/')) as $component) {
        $part .= '/'.$component;
        clearstatcache(true, $part);
        if (is_link($part)) {
            throw new DomainException;
        }
    }
    $stat = @lstat($path);

    return $stat === false ? null : array_intersect_key($stat, array_flip(['uid', 'gid', 'mode', 'ino', 'dev', 'nlink']));
}

/** @param array{uid:int,gid:int,groups:list<int>}|null $identity */
function auditAccess(string $path, ?array $identity, int $required): ?bool
{
    if ($identity === null || $identity['uid'] === 0) {
        return null;
    }
    $stat = auditMetadata($path);
    if ($stat === null) {
        return null;
    }
    $shift = $stat['uid'] === $identity['uid'] ? 6 : (in_array($stat['gid'], [$identity['gid'], ...$identity['groups']], true) ? 3 : 0);
    if (((($stat['mode'] >> $shift) & 7) & $required) !== $required) {
        return false;
    }
    if ($path !== '/') {
        return auditAccess(dirname($path), $identity, 1);
    }

    return true;
}

function auditAlias(array &$checks, string $id, string $path, string $target): void
{
    $stat = @lstat($path);
    auditCheck($checks, $id, $stat === false ? null : is_link($path) && readlink($path) === $target, 'Only the exact canonical shared target is accepted; aliases are not followed.');
}

function auditInventory(array $inventory): void
{
    if (array_diff(array_keys($inventory), ['account_uid', 'roles', 'key_source', 'private_key', 'public_key', 'rollback_release'])) {
        throw new DomainException;
    }
    if (isset($inventory['account_uid']) && (! is_int($inventory['account_uid']) || $inventory['account_uid'] < 1)) {
        throw new DomainException;
    }
    if (isset($inventory['key_source']) && ! in_array($inventory['key_source'], ['file', 'environment', 'disabled'], true)) {
        throw new DomainException;
    }
    foreach (['private_key', 'public_key', 'rollback_release'] as $field) {
        if (isset($inventory[$field]) && (! is_string($inventory[$field]) || strlen($inventory[$field]) > 1024)) {
            throw new DomainException;
        }
    }
    $roles = $inventory['roles'] ?? [];
    if (! is_array($roles) || array_diff(array_keys($roles), ['cli', 'php_fpm', 'queue', 'scheduler', 'web', 'unauthorized'])) {
        throw new DomainException;
    }
    foreach ($roles as $identity) {
        if (! is_array($identity) || array_diff(array_keys($identity), ['uid', 'gid', 'groups', 'umask'])) {
            throw new DomainException;
        }
        foreach (['uid', 'gid'] as $field) {
            if (isset($identity[$field]) && (! is_int($identity[$field]) || $identity[$field] < 0)) {
                throw new DomainException;
            }
        }
        if (isset($identity['groups']) && (! is_array($identity['groups']) || count($identity['groups']) > 64 || array_filter($identity['groups'], fn (mixed $gid): bool => ! is_int($gid) || $gid < 0))) {
            throw new DomainException;
        }
        if (isset($identity['umask']) && (! is_string($identity['umask']) || ! preg_match('/^0[0-7]{3}$/D', $identity['umask']))) {
            throw new DomainException;
        }
    }
}

/** @return list<string>|null */
function auditTree(string $directory, int &$remaining): ?array
{
    $stat = auditMetadata($directory);
    if ($stat === null || ($stat['mode'] & 0170000) !== 0040000) {
        return null;
    }
    try {
        $entries = new FilesystemIterator($directory, FilesystemIterator::SKIP_DOTS);
    } catch (UnexpectedValueException) {
        return null;
    }
    $paths = [];
    foreach ($entries as $entry) {
        if (--$remaining < 0) {
            return null;
        }
        $path = $entry->getPathname();
        $paths[] = $path;
        if (! is_link($path) && is_dir($path)) {
            $children = auditTree($path, $remaining);
            if ($children === null) {
                return null;
            }
            array_push($paths, ...$children);
        }
    }

    return $paths;
}

/** @param array<string,array{status:string,reason:string}> $checks */
function auditStatus(array $checks): string
{
    $states = array_column($checks, 'status');

    return in_array('FAIL', $states, true) ? 'FAIL' : (in_array('UNKNOWN', $states, true) ? 'UNKNOWN' : 'PASS');
}

$checks = [];
$observed = [];
set_error_handler(static function (int $severity): bool {
    if (! (error_reporting() & $severity)) {
        return true;
    }
    throw new RuntimeException;
});

try {
    if (PHP_SAPI !== 'cli' || $argc !== 2) {
        throw new DomainException;
    }
    $root = rtrim($argv[1], '/');
    $rootMetadata = auditMetadata($root);
    if ($rootMetadata === null || ($rootMetadata['mode'] & 0170000) !== 0040000) {
        auditCheck($checks, 'layout.root', null, 'Deployment root metadata is unavailable.');
    } else {
        try {
            $json = stream_isatty(STDIN) ? '{}' : stream_get_contents(STDIN, 65537);
            $json = trim($json) === '' ? '{}' : $json;
            $inventory = json_decode($json, true, 32, JSON_THROW_ON_ERROR);
            if (strlen($json) > 65536 || ! is_array($inventory) || ($inventory !== [] && array_is_list($inventory))) {
                throw new DomainException;
            }
            auditInventory($inventory);
        } catch (Throwable) {
            throw new DomainException;
        }
        $owner = $inventory['account_uid'] ?? null;
        $shared = $root.'/shared';
        $roles = [];
        foreach (['cli', 'php_fpm', 'queue', 'scheduler', 'web', 'unauthorized'] as $role) {
            $identity = $inventory['roles'][$role] ?? [];
            $roles[$role] = isset($identity['uid'], $identity['gid'], $identity['groups']) ? $identity : null;
            auditCheck($checks, 'identity.'.$role, $roles[$role] === null ? null : $identity['uid'] !== 0, 'Operator-supplied numeric identities are POSIX projections; root is not a least-privilege runtime.');
            $maskCompatible = isset($identity['umask']) ? (octdec($identity['umask']) & 0700) === 0 && ($role !== 'cli' || $identity['umask'] === '0077') : null;
            auditCheck($checks, 'umask.'.$role, $maskCompatible, 'Inventory umask must retain owner access; deployment must use 0077 for secret cache/backup creation. FPM public-upload visibility needs separate review.');
        }
        $groups = function_exists('posix_getgroups') ? posix_getgroups() : false;
        $posixAvailable = function_exists('posix_geteuid') && function_exists('posix_getegid') && is_array($groups);
        $observed = ['uid' => $posixAvailable ? posix_geteuid() : null, 'gid' => $posixAvailable ? posix_getegid() : null, 'groups' => $posixAvailable ? $groups : null, 'umask' => sprintf('%04o', umask()), 'php_version' => PHP_VERSION, 'sapi' => PHP_SAPI];
        auditCheck($checks, 'capability.identity', $posixAvailable ? true : null, 'Actual CLI effective identity is observed without reading process command lines or environment.');
        $cliMatches = null;
        if ($posixAvailable && $roles['cli'] !== null) {
            $expectedGroups = array_values(array_unique([$roles['cli']['gid'], ...$roles['cli']['groups']]));
            $actualGroups = array_values(array_unique([$observed['gid'], ...$observed['groups']]));
            sort($expectedGroups);
            sort($actualGroups);
            $cliMatches = $roles['cli']['uid'] === $observed['uid'] && $roles['cli']['gid'] === $observed['gid'] && $expectedGroups === $actualGroups;
        }
        auditCheck($checks, 'identity.cli_observed', $cliMatches, 'Declared CLI UID, effective GID and supplementary groups must match the observed process identity.');
        auditCheck($checks, 'capability.php', version_compare(PHP_VERSION, '8.3.0', '>='), 'CLI version must satisfy the installed Laravel major; other SAPIs remain unobserved.');
        foreach (['openssl', 'pdo_mysql', 'mbstring', 'fileinfo', 'curl', 'zip', 'bcmath'] as $extension) {
            auditCheck($checks, 'capability.'.$extension, extension_loaded($extension), 'Required CLI extension availability; application-worker PHP capabilities require separate evidence.');
        }

        foreach (['', 'shared', 'releases', 'shared/storage', 'shared/storage/app', 'shared/storage/framework', 'shared/storage/framework/cache', 'shared/storage/framework/sessions', 'shared/storage/framework/views', 'shared/storage/logs', 'shared/storage/app/digital-products'] as $relative) {
            $stat = auditMetadata($root.($relative === '' ? '' : '/'.$relative));
            auditCheck($checks, 'ownership.'.$relative, $stat !== null && $owner !== null ? $stat['uid'] === $owner : null, 'Deployment and private writable directories must belong to the declared cPanel account.');
            $privateDirectory = str_starts_with($relative, 'shared/storage/framework') || in_array($relative, ['shared/storage/logs', 'shared/storage/app/digital-products'], true);
            auditCheck($checks, 'policy.directory.'.$relative, $stat === null ? null : ($stat['mode'] & 0170000) === 0040000 && ($stat['mode'] & 0022) === 0 && (! $privateDirectory || ($stat['mode'] & 0077) === 0), 'Protected paths must be directories without group/other writes; private runtime directories must be owner-only.');
        }
        $environment = auditMetadata($shared.'/.env');
        auditCheck($checks, 'policy.environment', $environment === null ? null : ($environment['mode'] & 0170000) === 0100000 && ($environment['mode'] & 07777) === 0600 && $environment['nlink'] === 1 && ($owner === null || $environment['uid'] === $owner), 'Shared environment metadata only: owner-only regular configuration with one link.');

        $current = @readlink($root.'/current');
        $releases = [];
        $currentLayout = $current === false ? null : false;
        if ($current !== false && str_starts_with($current, $root.'/releases/') && preg_match('/^[A-Za-z0-9][A-Za-z0-9_-]*$/D', substr($current, strlen($root.'/releases/')))) {
            $currentMetadata = auditMetadata($current);
            $currentLayout = $currentMetadata === null ? null : ($currentMetadata['mode'] & 0170000) === 0040000;
            if ($currentLayout) {
                $releases['current'] = $current;
            }
        }
        auditCheck($checks, 'layout.current', $currentLayout, 'Current must point directly to an existing release directory inside the trusted deployment root. Missing metadata is UNKNOWN.');
        $rollback = $inventory['rollback_release'] ?? null;
        if ($rollback !== null && ! preg_match('/^[A-Za-z0-9][A-Za-z0-9_-]*$/D', $rollback)) {
            throw new DomainException;
        }
        if ($rollback !== null) {
            $rollbackMetadata = auditMetadata($root.'/releases/'.$rollback);
            if ($rollbackMetadata !== null && ($rollbackMetadata['mode'] & 0170000) === 0040000) {
                $releases['rollback'] = $root.'/releases/'.$rollback;
            }
        }
        auditCheck($checks, 'layout.rollback', ! isset($rollbackMetadata) ? null : isset($releases['rollback']), 'Rollback release must be an inventoried existing directory; this audit does not switch releases.');
        $secretInodes = [];
        foreach (['private', 'public'] as $type) {
            $relative = $inventory[$type.'_key'] ?? 'shared/storage/oauth-'.$type.'.key';
            $path = $root.'/'.$relative;
            $trusted = (str_starts_with($relative, 'shared/storage/') || str_starts_with($relative, 'shared/keys/')) && ! str_starts_with($relative, 'shared/storage/app/public/');
            if (! $trusted) {
                auditCheck($checks, 'policy.'.$type.'_key', false, 'Key metadata path must be nonpublic and inside trusted shared storage.');
                continue;
            }
            $stat = auditMetadata($path);
            $ancestors = $owner === null ? null : true;
            for ($directory = dirname($path); $directory !== $shared; $directory = dirname($directory)) {
                $parent = auditMetadata($directory);
                if ($parent === null) {
                    $ancestors = $ancestors === false ? false : null;
                } elseif (($parent['mode'] & 0170000) !== 0040000 || ($parent['mode'] & 0022) !== 0 || ($owner !== null && $parent['uid'] !== $owner)) {
                    $ancestors = false;
                }
            }
            auditCheck($checks, 'policy.'.$type.'_key_ancestors', $ancestors, 'Every key ancestor below shared must be owned by the declared account and prohibit group/other writes.');
            auditCheck($checks, 'policy.'.$type.'_key', $stat === null ? null : ($stat['mode'] & 0170000) === 0100000 && in_array($stat['mode'] & 07777, [0400, 0600], true) && $stat['nlink'] === 1 && ($owner === null || $stat['uid'] === $owner), 'Only owner-readable regular key files with one link are accepted; contents are never read.');
            if ($stat !== null) {
                $secretInodes[$stat['dev'].':'.$stat['ino']] = true;
            }
            if ($type === 'private') {
                foreach (['cli', 'php_fpm', 'queue', 'scheduler'] as $role) {
                    auditCheck($checks, 'access.'.$role.'.key', auditAccess($path, $roles[$role], 4), 'POSIX private-key readability and traversal for the declared identity, not proof of live runtime access.');
                }
                $unauthorized = auditAccess($path, $roles['unauthorized'], 4);
                auditCheck($checks, 'isolation.unauthorized.key', $unauthorized === null ? null : ! $unauthorized, 'Declared nonprivileged unauthorized identity must be denied by POSIX permissions.');
            }
        }
        auditCheck($checks, 'key.source', ($inventory['key_source'] ?? null) === 'file' ? true : null, 'Key source is supplied by the operator. Environment delivery, feature gates, and cached key selection are never read or inferred.');
        foreach (['cli', 'php_fpm', 'queue', 'scheduler'] as $role) {
            auditCheck($checks, 'access.'.$role.'.environment', auditAccess($shared.'/.env', $roles[$role], 4), 'POSIX configuration readability and ancestor traversal.');
            foreach (['storage/framework/cache', 'storage/framework/sessions', 'storage/framework/views', 'storage/logs', 'storage/app/digital-products'] as $directory) {
                auditCheck($checks, 'access.'.$role.'.directory.'.$directory, auditAccess($shared.'/'.$directory, $roles[$role], 3), 'POSIX directory write and search access; no test file is created.');
            }
        }
        $publicRoots = [$shared.'/storage/app/public'];
        foreach ($releases as $label => $release) {
            auditMetadata($release);
            auditAlias($checks, 'layout.'.$label.'.storage', $release.'/storage', $shared.'/storage');
            auditAlias($checks, 'layout.'.$label.'.environment', $release.'/.env', $shared.'/.env');
            auditAlias($checks, 'layout.'.$label.'.public_media', $release.'/public/storage', $shared.'/storage/app/public');
            $cache = auditMetadata($release.'/bootstrap/cache');
            $config = auditMetadata($release.'/bootstrap/cache/config.php');
            auditCheck($checks, 'policy.cache.'.$label, $cache === null || $config === null ? null : ($cache['mode'] & 07777) === 0700 && ($config['mode'] & 07777) === 0600 && $config['nlink'] === 1 && ($owner === null || ($cache['uid'] === $owner && $config['uid'] === $owner)), 'Optimized config is inspected with stat only; cache directory 0700 and config file 0600.');
            if ($config !== null) {
                $secretInodes[$config['dev'].':'.$config['ino']] = true;
            }
            foreach (['cli', 'php_fpm', 'queue', 'scheduler'] as $role) {
                auditCheck($checks, 'access.'.$role.'.cache.'.$label, auditAccess($release.'/bootstrap/cache', $roles[$role], 3), 'POSIX optimized-cache directory access during activation or rollback.');
                auditCheck($checks, 'access.'.$role.'.config.'.$label, auditAccess($release.'/bootstrap/cache/config.php', $roles[$role], 4), 'POSIX optimized-config readability; PHP configuration is never required or executed.');
            }
            $publicRoots[] = $release.'/public';
        }
        $mediaAccess = auditAccess($shared.'/storage/app/public', $roles['web'], 5);
        $remaining = 10000;
        $private = auditTree($shared.'/storage/app/digital-products', $remaining);
        $safe = $private === null ? null : true;
        foreach ($private ?? [] as $path) {
            if (is_link($path)) {
                $safe = false;
                continue;
            }
            $stat = auditMetadata($path);
            if ($stat !== null) {
                $secretInodes[$stat['dev'].':'.$stat['ino']] = true;
            }
        }
        if ($environment !== null) {
            $secretInodes[$environment['dev'].':'.$environment['ino']] = true;
        }
        foreach ($publicRoots as $publicRoot) {
            $paths = auditTree($publicRoot, $remaining);
            if ($paths === null && $safe !== false) {
                $safe = null;
            }
            if ($paths === null && $publicRoot === $shared.'/storage/app/public' && $mediaAccess !== false) {
                $mediaAccess = null;
            }
            foreach ($paths ?? [] as $path) {
                if (is_link($path)) {
                    if ($path !== $publicRoot.'/storage' || readlink($path) !== $shared.'/storage/app/public' || $publicRoot === $shared.'/storage/app/public') {
                        $safe = false;
                    }
                    continue;
                }
                $stat = auditMetadata($path);
                if ($publicRoot === $shared.'/storage/app/public' && $stat !== null && ($stat['mode'] & 0170000) === 0100000) {
                    $readable = auditAccess($path, $roles['web'], 4);
                    if ($readable === false || ($readable === null && $mediaAccess !== false)) {
                        $mediaAccess = $readable;
                    }
                }
                if (preg_match('/^(?:\.env(?:\..*)?|.*\.(?:key|pem))$/D', basename($path)) || ($stat !== null && isset($secretInodes[$stat['dev'].':'.$stat['ino']]))) {
                    $safe = false;
                }
            }
        }
        auditCheck($checks, 'access.web.media', $mediaAccess, 'POSIX read/search access for the public-media directory and every scanned media file, including every deployment/home ancestor. Actual HTTP serving remains unobserved.');
        auditCheck($checks, 'public.aliases', $safe, 'Bounded metadata scan rejects public secret names, unexpected symlinks, and inode aliases of inventoried keys/config/private products. Incomplete scans remain UNKNOWN.');
        auditCheck($checks, 'isolation.private_products', $safe, 'Purchased files remain outside canonical public media and its scanned aliases; HTTP authorization still needs separate evidence.');
    }
} catch (DomainException) {
    auditCheck($checks, 'input', false, 'Invalid metadata inventory or an unsafe noncanonical/symlink path. No input values are echoed.');
} catch (Throwable) {
    auditCheck($checks, 'audit', null, 'Metadata could not be verified. No exception details or input values are emitted.');
}

foreach (['acl' => 'ACLs, default ACLs, read-only mounts, MAC/CageFS and handler restrictions require an operator review; POSIX mode projections are insufficient.', 'runtime' => 'Actual PHP-FPM/LiteSpeed, queue and scheduler identities, PHP versions, umasks and fresh-process access have not been observed by this CLI audit.', 'http' => 'Real DocumentRoot, aliases, public-media responses, private-product denials, and atomic activation/rollback need separate approved staging/runtime evidence.', 'key_configuration' => 'Configured and retained-release key sources must be inventoried by an authorized operator without exporting key or environment values.'] as $id => $reason) {
    auditCheck($checks, 'evidence.'.$id, null, $reason);
}
$status = auditStatus($checks);
$metadataChecks = array_filter($checks, fn (string $id): bool => ! str_starts_with($id, 'evidence.'), ARRAY_FILTER_USE_KEY);
echo json_encode(['schema_version' => 1, 'scope' => 'read-only POSIX projections from operator inventory; not production certification', 'status' => $status, 'metadata_status' => auditStatus($metadataChecks), 'observed_cli' => $observed, 'checks' => $checks], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR)."\n";
exit($status === 'FAIL' ? 1 : ($status === 'UNKNOWN' ? 2 : 0));
