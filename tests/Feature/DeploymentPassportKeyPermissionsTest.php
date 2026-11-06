<?php

use League\OAuth2\Server\CryptKey;
use Tests\Support\DeploymentFixture;

beforeEach(function () {
    $this->deployment = new DeploymentFixture;
});

afterEach(function () {
    $this->deployment->cleanup();
});

test('artifact verification uses the explicit cPanel PHP binary over the environment default', function () {
    $result = $this->deployment->deploy(environment: ['PHP_BINARY' => '/bin/false']);

    $this->assertSame(0, $result->getExitCode(), $result->getOutput().$result->getErrorOutput());
});

test('deployment and repeated preparation preserve owner-only private keys and readable public keys', function (int $privateMode) {
    $fixture = $this->deployment;
    chmod($fixture->root.'/shared/storage/oauth-private.key', $privateMode);
    $digest = hash_file('sha256', $fixture->root.'/shared/storage/oauth-private.key');

    foreach (['20261104-120000-aaaaaaa', '20261104-120001-aaaaaaa'] as $release) {
        $result = $fixture->deploy($release);
        $this->assertSame(0, $result->getExitCode(), $result->getOutput().$result->getErrorOutput());
        expect($fixture->mode('shared/storage/oauth-private.key'))->toBe($privateMode)
            ->and(hash_file('sha256', $fixture->root.'/shared/storage/oauth-private.key'))->toBe($digest)
            ->and($fixture->mode('shared/storage/oauth-public.key'))->toBe(0600)
            ->and(array_unique(array_column($fixture->commands(), 'private_mode')))->toBe([$privateMode]);
    }

    expect((new CryptKey($fixture->root.'/current/storage/oauth-public.key'))->getKeyContents())->toBe($fixture->publicKey);
})->with([0600, 0400]);

test('unsafe private key permissions stop deployment before migration or activation', function (int $mode) {
    $fixture = $this->deployment;
    chmod($fixture->root.'/shared/storage/oauth-private.key', $mode);

    $result = $fixture->deploy();

    expect($result->isSuccessful())->toBeFalse()
        ->and(readlink($fixture->root.'/current'))->toBe($fixture->root.'/releases/previous')
        ->and(file_exists($fixture->root.'/commands.jsonl'))->toBeFalse()
        ->and($fixture->mode('shared/storage/oauth-private.key'))->toBe($mode)
        ->and($result->getOutput().$result->getErrorOutput())->not->toContain($fixture->privateKey);
})->with([0644, 0640, 0660, 0775]);

test('failed deployment and automatic rollback never loosen keys or private product files', function (string $failure) {
    $fixture = $this->deployment;
    $result = $fixture->deploy(environment: [$failure => '1']);

    expect($result->isSuccessful())->toBeFalse()
        ->and(readlink($fixture->root.'/current'))->toBe($fixture->root.'/releases/previous')
        ->and($fixture->mode('shared/storage/oauth-private.key'))->toBe(0600)
        ->and($fixture->mode('shared/storage/app/digital-products'))->toBe(0700)
        ->and($fixture->mode('shared/storage/app/digital-products/paid.pdf'))->toBe(0600)
        ->and(file_get_contents($fixture->root.'/current/storage/app/digital-products/paid.pdf'))->toBe('synthetic paid content')
        ->and(array_unique(array_column($fixture->commands(), 'private_mode')))->toBe([0600]);
    if ($failure === 'FAIL_POST') {
        expect($result->getOutput())->toContain('Rollback complete')
            ->and($fixture->mode('releases/previous/bootstrap/cache/config.php'))->toBe(0600);
    }
})->with(['FAIL_MIGRATE', 'FAIL_POST']);

test('symlink keys and writable directory links are rejected without touching their targets', function (string $link) {
    $fixture = $this->deployment;
    mkdir($fixture->root.'/outside', 0700);
    $fixture->write('outside/sentinel', 'outside synthetic secret', 0600);
    if ($link === 'key') {
        unlink($fixture->root.'/shared/storage/oauth-private.key');
        symlink($fixture->root.'/outside/sentinel', $fixture->root.'/shared/storage/oauth-private.key');
    } elseif ($link === 'logs') {
        symlink($fixture->root.'/outside', $fixture->root.'/shared/storage/logs');
    } else {
        rename($fixture->root.'/shared/storage', $fixture->root.'/original-storage');
        symlink($fixture->root.'/outside', $fixture->root.'/shared/storage');
    }

    $result = $fixture->deploy();

    expect($result->isSuccessful())->toBeFalse()
        ->and(readlink($fixture->root.'/current'))->toBe($fixture->root.'/releases/previous')
        ->and($fixture->mode('outside'))->toBe(0700)
        ->and($fixture->mode('outside/sentinel'))->toBe(0600)
        ->and(scandir($fixture->root.'/outside'))->toBe(['.', '..', 'sentinel']);
})->with(['key', 'logs', 'storage']);

test('private fulfillment files survive a successful release outside the public media link', function () {
    $fixture = $this->deployment;
    $result = $fixture->deploy();
    $this->assertSame(0, $result->getExitCode(), $result->getErrorOutput());

    expect($fixture->mode('shared/storage/app/digital-products'))->toBe(0700)
        ->and($fixture->mode('shared/storage/app/digital-products/paid.pdf'))->toBe(0600)
        ->and(file_get_contents($fixture->root.'/current/storage/app/digital-products/paid.pdf'))->toBe('synthetic paid content')
        ->and(realpath($fixture->root.'/current/public/storage'))->toBe($fixture->root.'/shared/storage/app/public')
        ->and($fixture->mode('shared/storage/app/public'))->toBe(0755)
        ->and($fixture->mode('shared/storage/app/public/avatars'))->toBe(0755)
        ->and(file_exists($fixture->root.'/current/public/storage/digital-products/paid.pdf'))->toBeFalse();
});

test('OAuth disabled deployments do not need keys but enabled deployments fail closed without them', function (bool $enabled) {
    $fixture = $this->deployment;
    unlink($fixture->root.'/shared/storage/oauth-private.key');
    unlink($fixture->root.'/shared/storage/oauth-public.key');
    $fixture->environment($enabled ? "CREATOR_AI_MCP_OAUTH_ENABLED=true\n" : '');

    $result = $fixture->deploy();

    expect($result->isSuccessful())->toBe(! $enabled);
    if ($enabled) {
        expect(readlink($fixture->root.'/current'))->toBe($fixture->root.'/releases/previous');
    }
})->with([false, true]);

test('inline environment keys and cached configuration stay owner-only through rollback', function () {
    $fixture = $this->deployment;
    unlink($fixture->root.'/shared/storage/oauth-private.key');
    unlink($fixture->root.'/shared/storage/oauth-public.key');
    $fixture->environment('PASSPORT_PRIVATE_KEY="'.str_replace("\n", '\n', $fixture->privateKey).'"'."\n".'PASSPORT_PUBLIC_KEY="'.str_replace("\n", '\n', $fixture->publicKey).'"'."\nCREATOR_AI_MCP_OAUTH_ENABLED=true\n");

    $result = $fixture->deploy(environment: ['FAIL_POST' => '1']);

    expect($result->isSuccessful())->toBeFalse()
        ->and($result->getOutput())->toContain('Rollback complete')
        ->and($fixture->mode('shared/.env'))->toBe(0600)
        ->and($fixture->mode('current/bootstrap/cache'))->toBe(0700)
        ->and($fixture->mode('current/bootstrap/cache/config.php'))->toBe(0600)
        ->and($fixture->mode('releases/20261104-120000-aaaaaaa/bootstrap/cache/config.php'))->toBe(0600)
        ->and($result->getOutput().$result->getErrorOutput())->not->toContain($fixture->privateKey);
});

test('environment file references only accept private nonpublic trusted paths', function (string $location) {
    $fixture = $this->deployment;
    $directory = match ($location) {
        'trusted' => 'shared/keys',
        'public' => 'shared/storage/app/public',
        default => 'outside',
    };
    mkdir($fixture->root.'/'.$directory, 0755, true);
    $fixture->write($directory.'/private.pem', $fixture->privateKey, 0600);
    $fixture->write($directory.'/public.pem', $fixture->publicKey, 0644);
    $fixture->environment('PASSPORT_PRIVATE_KEY="file://'.$fixture->root.'/'.$directory.'/private.pem"'."\n".'PASSPORT_PUBLIC_KEY="'.$fixture->root.'/'.$directory.'/public.pem"'."\nCREATOR_AI_MCP_OAUTH_ENABLED=true\n");

    $result = $fixture->deploy();

    expect($result->isSuccessful())->toBe($location === 'trusted')
        ->and($fixture->mode($directory.'/private.pem'))->toBe(0600)
        ->and($fixture->mode($directory.'/public.pem'))->toBe($location === 'trusted' ? 0600 : 0644);
    if ($location !== 'trusted') {
        expect(readlink($fixture->root.'/current'))->toBe($fixture->root.'/releases/previous');
    }
})->with(['trusted', 'public', 'outside']);

test('rollback targets cannot substitute unvalidated storage or environment symlinks', function (string $path) {
    $fixture = $this->deployment;
    mkdir($fixture->root.'/outside', 0700);
    $fixture->write('outside/.env', 'synthetic outside environment', 0600);
    unlink($fixture->root.'/releases/previous/'.$path);
    symlink($fixture->root.'/outside'.($path === '.env' ? '/.env' : ''), $fixture->root.'/releases/previous/'.$path);

    $result = $fixture->deploy();

    expect($result->isSuccessful())->toBeFalse()
        ->and(readlink($fixture->root.'/current'))->toBe($fixture->root.'/releases/previous')
        ->and(file_exists($fixture->root.'/commands.jsonl'))->toBeFalse()
        ->and($fixture->mode('outside/.env'))->toBe(0600);
})->with(['storage', '.env']);

test('cache symlinks cannot modify files outside the release', function () {
    $fixture = $this->deployment;
    mkdir($fixture->root.'/outside', 0700);
    $fixture->write('outside/config.php', '<?php return [];', 0644);
    symlink($fixture->root.'/outside/config.php', $fixture->root.'/releases/previous/bootstrap/cache/config.php');

    $result = $fixture->deploy();

    expect($result->isSuccessful())->toBeFalse()
        ->and($fixture->mode('outside/config.php'))->toBe(0644)
        ->and(file_exists($fixture->root.'/commands.jsonl'))->toBeFalse();
});

test('late key permission changes block activation after caches are built', function () {
    $fixture = $this->deployment;
    $result = $fixture->deploy(environment: ['UNSAFE_KEY' => '1']);

    expect($result->isSuccessful())->toBeFalse()
        ->and(readlink($fixture->root.'/current'))->toBe($fixture->root.'/releases/previous')
        ->and($result->getErrorOutput())->toContain('DEPLOY SECURITY:')
        ->and(array_column($fixture->commands(), 'command'))->toContain('optimize');
});

test('cached rollback configuration cannot reference an unsafe private key', function () {
    $fixture = $this->deployment;
    mkdir($fixture->root.'/shared/keys', 0700);
    $fixture->write('shared/keys/old-private.pem', $fixture->privateKey, 0644);
    $fixture->write('releases/previous/bootstrap/cache/config.php', '<?php return '.var_export([
        'passport' => ['private_key' => $fixture->root.'/shared/keys/old-private.pem'],
    ], true).';');

    $result = $fixture->deploy();

    expect($result->isSuccessful())->toBeFalse()
        ->and(file_exists($fixture->root.'/commands.jsonl'))->toBeFalse()
        ->and($fixture->mode('shared/keys/old-private.pem'))->toBe(0644);
});

test('process environment keys need no files and generated caches remain private', function () {
    $fixture = $this->deployment;
    unlink($fixture->root.'/shared/storage/oauth-private.key');
    unlink($fixture->root.'/shared/storage/oauth-public.key');

    $result = $fixture->deploy(environment: [
        'PASSPORT_PRIVATE_KEY' => $fixture->privateKey,
        'PASSPORT_PUBLIC_KEY' => $fixture->publicKey,
        'CREATOR_AI_MCP_OAUTH_ENABLED' => 'true',
        'UNSAFE_CACHE' => '1',
    ]);

    $this->assertSame(0, $result->getExitCode(), $result->getErrorOutput());
    expect($fixture->mode('current/bootstrap/cache/config.php'))->toBe(0600)
        ->and($fixture->mode('current/bootstrap/cache'))->toBe(0700)
        ->and($result->getOutput().$result->getErrorOutput())->not->toContain($fixture->privateKey);
});

test('a required writable directory replaced with a file blocks deployment', function () {
    $fixture = $this->deployment;
    $fixture->write('shared/storage/logs', 'not a directory', 0600);

    $result = $fixture->deploy();

    expect($result->isSuccessful())->toBeFalse()
        ->and(file_exists($fixture->root.'/commands.jsonl'))->toBeFalse()
        ->and($fixture->mode('shared/storage/oauth-private.key'))->toBe(0600);
});

test('hard linked keys cannot affect external aliases', function () {
    $fixture = $this->deployment;
    link($fixture->root.'/shared/storage/oauth-private.key', $fixture->root.'/outside-key');

    $result = $fixture->deploy();

    expect($result->isSuccessful())->toBeFalse()
        ->and($fixture->mode('outside-key'))->toBe(0600)
        ->and(file_exists($fixture->root.'/commands.jsonl'))->toBeFalse();
});

test('custom key directories writable by other users cannot supply signing keys', function (bool $nested) {
    $fixture = $this->deployment;
    mkdir($fixture->root.'/shared/keys', 0755);
    $directory = 'shared/keys';
    if ($nested) {
        $directory .= '/nested';
        mkdir($fixture->root.'/'.$directory, 0755);
    }
    chmod($fixture->root.'/'.$directory, 0777);
    $fixture->write($directory.'/private.pem', $fixture->privateKey, 0600);
    $fixture->environment('PASSPORT_PRIVATE_KEY="'.$fixture->root.'/'.$directory.'/private.pem"'."\n");

    $result = $fixture->deploy();

    expect($result->isSuccessful())->toBeFalse()
        ->and(file_exists($fixture->root.'/commands.jsonl'))->toBeFalse()
        ->and($fixture->mode($directory.'/private.pem'))->toBe(0600);
})->with([false, true]);

test('noncanonical public key paths cannot bypass the trusted private storage boundary', function (string $path) {
    $fixture = $this->deployment;
    mkdir($fixture->root.'/shared/storage/app/public', 0755);
    $fixture->write('shared/storage/app/public/private.pem', $fixture->privateKey, 0600);
    $fixture->environment('PASSPORT_PRIVATE_KEY="'.$fixture->root.'/'.$path.'"'."\n");

    $result = $fixture->deploy();

    expect($result->isSuccessful())->toBeFalse()
        ->and(file_exists($fixture->root.'/commands.jsonl'))->toBeFalse()
        ->and($fixture->mode('shared/storage/app/public/private.pem'))->toBe(0600);
})->with(['shared/storage/app//public/private.pem', 'shared/storage//app/public/private.pem', 'shared/storage/app/private/../public/private.pem']);

test('deployed public keys work with Passport permission validation enabled', function () {
    $fixture = $this->deployment;
    $result = $fixture->deploy();
    $this->assertSame(0, $result->getExitCode(), $result->getErrorOutput());

    expect((new CryptKey($fixture->root.'/current/storage/oauth-public.key'))->getKeyContents())->toBe($fixture->publicKey)
        ->and($fixture->mode('shared/storage/oauth-private.key'))->toBe(0600);
});
