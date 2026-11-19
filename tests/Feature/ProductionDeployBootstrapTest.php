<?php

use Tests\Support\DeploymentFixture;

beforeEach(function () {
    $this->deployment = new DeploymentFixture;
});

afterEach(function () {
    $this->deployment->cleanup();
});

test('a failed upload-backend seeder stops deployment before creator seed, caches or activation', function () {
    $fixture = $this->deployment;
    $result = $fixture->deploy(environment: ['FAIL_UPLOAD_SEED' => '1']);

    $commands = array_column($fixture->commands(), 'command');

    expect($result->isSuccessful())->toBeFalse()
        ->and($result->getOutput())->toContain('MIGRATE FAILED')
        ->and(readlink($fixture->root.'/current'))->toBe($fixture->root.'/releases/previous')
        ->and($commands)->toContain('migrate')
        ->and($commands)->toContain('db:seed')
        ->and($commands)->not->toContain('creator-ai:seed-test-pro')
        ->and($commands)->not->toContain('optimize')
        ->and($commands)->not->toContain('route:list');
});

test('production deployment does not provision a ChatGPT test account when its optional email is configured', function () {
    $fixture = $this->deployment;
    $fixture->environment("LINKET_TEST_PRO_EMAIL=existing@example.test\nLINKET_TEST_PRO_PASSWORD=not-a-real-secret-test-value\n");

    $result = $fixture->deploy();
    $commands = array_column($fixture->commands(), 'command');

    expect($result->getExitCode())->toBe(0, $result->getOutput().$result->getErrorOutput())
        ->and($commands)->toContain('migrate')
        ->and($commands)->toContain('db:seed')
        ->and($commands)->not->toContain('creator-ai:seed-test-pro')
        ->and(readlink($fixture->root.'/current'))->toContain('20261104-120000-aaaaaaa');
});

test('a long route list is consumed before shortening its displayed output', function () {
    $fixture = $this->deployment;
    $result = $fixture->deploy(environment: ['LONG_ROUTE_LIST' => '1']);

    expect($result->getExitCode())->toBe(0, $result->getOutput().$result->getErrorOutput())
        ->and(readlink($fixture->root.'/current'))->toContain('20261104-120000-aaaaaaa')
        ->and(array_column($fixture->commands(), 'command'))->toContain('route:list');
});

test('a failed route-list smoke check prevents release activation', function () {
    $fixture = $this->deployment;
    $result = $fixture->deploy(environment: ['FAIL_ROUTE_LIST' => '1']);

    expect($result->isSuccessful())->toBeFalse()
        ->and($result->getErrorOutput())->toContain('Route listing smoke check failed before activation')
        ->and(readlink($fixture->root.'/current'))->toBe($fixture->root.'/releases/previous')
        ->and(array_column($fixture->commands(), 'command'))->toContain('route:list');
});
