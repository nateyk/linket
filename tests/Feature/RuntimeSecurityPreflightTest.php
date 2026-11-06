<?php

use Tests\Support\RuntimeSecurityFixture;

beforeEach(function () {
    $this->runtime = new RuntimeSecurityFixture;
});

afterEach(function () {
    $this->runtime->cleanup();
});

function runtimeAuditReport(RuntimeSecurityFixture $fixture): array
{
    $process = $fixture->audit();
    test()->assertJson($process->getOutput(), $process->getErrorOutput());
    expect($process->getErrorOutput())->toBe('');

    return json_decode($process->getOutput(), true, flags: JSON_THROW_ON_ERROR);
}

test('same-account runtimes satisfy POSIX access while unobserved production evidence stays unknown', function () {
    $report = runtimeAuditReport($this->runtime);

    expect($report['status'])->toBe('UNKNOWN');
    foreach (['access.php_fpm.key', 'access.queue.environment', 'access.scheduler.environment', 'access.php_fpm.cache.current', 'access.queue.config.current', 'access.web.media', 'isolation.unauthorized.key', 'isolation.private_products', 'layout.current', 'layout.rollback'] as $check) {
        expect($report['checks'][$check]['status'])->toBe('PASS');
    }
    foreach (['evidence.acl', 'evidence.http', 'evidence.runtime'] as $check) {
        expect($report['checks'][$check]['status'])->toBe('UNKNOWN');
    }
});

test('different application identities cannot use owner-only keys configuration or runtime directories', function (string $role) {
    $this->runtime->inventory['roles'][$role]['uid'] += 30000;

    $report = runtimeAuditReport($this->runtime);

    expect($report['status'])->toBe('FAIL');
    expect($report['checks']['access.'.$role.'.key']['status'])->toBe('FAIL');
    expect($report['checks']['access.'.$role.'.environment']['status'])->toBe('FAIL');
    expect($report['checks']['access.'.$role.'.cache.current']['status'])->toBe('FAIL');
})->with(['php_fpm', 'queue', 'scheduler']);

test('incorrect deployment ownership is rejected', function () {
    $this->runtime->inventory['account_uid'] += 40000;

    $report = runtimeAuditReport($this->runtime);

    expect($report['checks']['ownership.shared/storage']['status'])->toBe('FAIL');
    expect($report['status'])->toBe('FAIL');
});

test('cache session and log directories must be writable and traversable', function (string $path, string $check) {
    chmod($this->runtime->root.'/'.$path, 0500);

    $report = runtimeAuditReport($this->runtime);

    expect($report['checks'][$check]['status'])->toBe('FAIL');
    expect($report['status'])->toBe('FAIL');
})->with([
    ['shared/storage/logs', 'access.php_fpm.directory.storage/logs'],
    ['shared/storage/framework/sessions', 'access.php_fpm.directory.storage/framework/sessions'],
    ['releases/current-release/bootstrap/cache', 'access.php_fpm.cache.current'],
]);

test('private key access and unsafe modes are checked without reading key contents', function (int $mode, string $expected) {
    $path = $this->runtime->root.'/shared/storage/oauth-private.key';
    chmod($path, $mode);
    touch($path, 1700000001, 1700000000);
    clearstatcache();

    $report = runtimeAuditReport($this->runtime);

    clearstatcache();
    expect($report['checks']['policy.private_key']['status'])->toBe($expected);
    expect(fileatime($path))->toBe(1700000000);
})->with([[0600, 'PASS'], [0400, 'PASS'], [0640, 'FAIL'], [0644, 'FAIL'], [0000, 'FAIL']]);

test('the audit never loads environment or cached configuration and leaves metadata unchanged', function () {
    $fixture = $this->runtime;
    $paths = ['shared/.env', 'shared/storage/oauth-private.key', 'releases/current-release/bootstrap/cache/config.php'];
    $before = [];
    foreach ($paths as $path) {
        touch($fixture->root.'/'.$path, 1700000001, 1700000000);
        clearstatcache();
        $before[$path] = stat($fixture->root.'/'.$path);
    }

    $process = $fixture->audit();

    expect($process->getExitCode())->toBe(2);
    expect($process->getOutput())->not->toContain('synthetic-environment-secret', 'synthetic-private-key-must-not-be-read', 'cached-configuration-must-not-be-executed');
    foreach ($paths as $path) {
        clearstatcache();
        $after = stat($fixture->root.'/'.$path);
        foreach (['uid', 'gid', 'mode', 'size', 'mtime', 'atime', 'ino'] as $attribute) {
            expect($after[$attribute])->toBe($before[$path][$attribute]);
        }
    }
});

test('public media needs traversal through every ancestor directory', function () {
    chmod($this->runtime->root, 0700);

    $report = runtimeAuditReport($this->runtime);

    expect($report['checks']['access.web.media']['status'])->toBe('FAIL');
});

test('public aliases to private keys or purchased files are rejected', function (string $kind) {
    $fixture = $this->runtime;
    $target = $fixture->root.($kind === 'key' ? '/shared/storage/oauth-private.key' : '/shared/storage/app/digital-products/paid.pdf');
    if ($kind === 'hardlink') {
        link($target, $fixture->root.'/shared/storage/app/public/disguised.jpg');
    } else {
        symlink($target, $fixture->root.'/shared/storage/app/public/disguised.jpg');
    }

    $report = runtimeAuditReport($fixture);

    expect($report['checks']['public.aliases']['status'])->toBe('FAIL');
    expect($report['status'])->toBe('FAIL');
})->with(['key', 'product', 'hardlink']);

test('unsafe release or rollback symlinks never cause writes outside the trusted root', function (string $path) {
    $fixture = $this->runtime;
    mkdir($fixture->root.'/outside', 0700);
    $fixture->write('outside/sentinel', 'unchanged', 0600);
    unlink($fixture->root.'/'.$path);
    symlink($fixture->root.'/outside', $fixture->root.'/'.$path);

    $report = runtimeAuditReport($fixture);

    expect($report['status'])->toBe('FAIL');
    expect(fileperms($fixture->root.'/outside/sentinel') & 0777)->toBe(0600);
    expect(file_get_contents($fixture->root.'/outside/sentinel'))->toBe('unchanged');
})->with(['current', 'releases/previous/storage']);

test('missing identities umask and rollback evidence remain unknown', function () {
    $fixture = $this->runtime;
    unset($fixture->inventory['roles']['php_fpm'], $fixture->inventory['roles']['queue']['umask'], $fixture->inventory['rollback_release']);

    $report = runtimeAuditReport($fixture);

    expect($report['status'])->toBe('UNKNOWN');
    expect($report['checks']['identity.php_fpm']['status'])->toBe('UNKNOWN');
    expect($report['checks']['umask.queue']['status'])->toBe('UNKNOWN');
    expect($report['checks']['layout.rollback']['status'])->toBe('UNKNOWN');
});

test('environment and disabled key sources do not require inspecting or provisioning key contents', function (string $source) {
    $fixture = $this->runtime;
    $fixture->inventory['key_source'] = $source;
    unlink($fixture->root.'/shared/storage/oauth-private.key');
    unlink($fixture->root.'/shared/storage/oauth-public.key');

    $report = runtimeAuditReport($fixture);

    expect($report['status'])->toBe('UNKNOWN');
    expect($report['checks']['key.source']['status'])->toBe('UNKNOWN');
})->with(['environment', 'disabled']);

test('malformed or secret-bearing inventory is rejected without echoing its values', function () {
    $fixture = $this->runtime;
    $fixture->inventory['PASSPORT_PRIVATE_KEY'] = 'never-print-this-inventory-value';

    $process = $fixture->audit();

    expect($process->getExitCode())->toBe(1);
    $this->assertJson($process->getOutput());
    expect($process->getOutput())->not->toContain('never-print-this-inventory-value');
    expect(json_decode($process->getOutput(), true)['checks']['input']['status'])->toBe('FAIL');
});

test('public media files must be readable by the declared static web identity', function () {
    chmod($this->runtime->root.'/shared/storage/app/public/avatars/test.jpg', 0600);

    $report = runtimeAuditReport($this->runtime);

    expect($report['checks']['access.web.media']['status'])->toBe('FAIL');
});

test('custom key ancestors cannot be writable by other users', function () {
    $fixture = $this->runtime;
    mkdir($fixture->root.'/shared/keys', 0755);
    chmod($fixture->root.'/shared/keys', 0777);
    $fixture->write('shared/keys/private.key', 'synthetic key', 0600);
    $fixture->inventory['private_key'] = 'shared/keys/private.key';

    $report = runtimeAuditReport($fixture);

    expect($report['status'])->toBe('FAIL');
    expect($report['checks']['policy.private_key_ancestors']['status'])->toBe('FAIL');
});

test('a missing current release target is unknown and a regular file is invalid', function (bool $missing) {
    $fixture = $this->runtime;
    unlink($fixture->root.'/current');
    if (! $missing) {
        $fixture->write('releases/invalid', 'not a release directory', 0600);
    }
    symlink($fixture->root.'/releases/invalid', $fixture->root.'/current');

    $report = runtimeAuditReport($fixture);

    expect($report['checks']['layout.current']['status'])->toBe($missing ? 'UNKNOWN' : 'FAIL');
})->with([true, false]);

test('a nonregular key is rejected without opening it', function () {
    $fixture = $this->runtime;
    unlink($fixture->root.'/shared/storage/oauth-private.key');
    posix_mkfifo($fixture->root.'/shared/storage/oauth-private.key', 0600);

    $report = runtimeAuditReport($fixture);

    expect($report['checks']['policy.private_key']['status'])->toBe('FAIL');
});

test('missing inventory input remains unknown instead of fabricating ownership evidence', function () {
    $process = $this->runtime->audit('');

    expect($process->getExitCode())->toBe(2);
    $report = json_decode($process->getOutput(), true, flags: JSON_THROW_ON_ERROR);
    expect($report['checks']['identity.php_fpm']['status'])->toBe('UNKNOWN');
    expect($report['checks']['ownership.shared/storage']['status'])->toBe('UNKNOWN');
});

test('secret runtime directories must retain owner-only access', function (string $directory) {
    chmod($this->runtime->root.'/'.$directory, 0755);

    $report = runtimeAuditReport($this->runtime);

    expect($report['checks']['policy.directory.'.$directory]['status'])->toBe('FAIL');
    expect($report['status'])->toBe('FAIL');
})->with(['shared/storage/logs', 'shared/storage/framework/sessions', 'shared/storage/app/digital-products']);

test('an application umask that removes owner access is incompatible', function () {
    $this->runtime->inventory['roles']['php_fpm']['umask'] = '0777';

    $report = runtimeAuditReport($this->runtime);

    expect($report['checks']['umask.php_fpm']['status'])->toBe('FAIL');
});

test('an incomplete public metadata scan is unknown rather than evidence of isolation', function () {
    for ($index = 0; $index < 10000; $index++) {
        touch($this->runtime->root.'/shared/storage/app/public/item-'.$index);
    }

    $report = runtimeAuditReport($this->runtime);

    expect($report['checks']['public.aliases']['status'])->toBe('UNKNOWN');
    expect($report['checks']['access.web.media']['status'])->toBe('UNKNOWN');
});

test('declared CLI groups must match observed effective process identity', function (string $field) {
    if ($field === 'gid') {
        $this->runtime->inventory['roles']['cli']['gid'] += 10000;
    } else {
        $this->runtime->inventory['roles']['cli']['groups'][] = 98765;
    }

    $report = runtimeAuditReport($this->runtime);

    expect($report['checks']['identity.cli_observed']['status'])->toBe('FAIL');
})->with(['gid', 'groups']);
