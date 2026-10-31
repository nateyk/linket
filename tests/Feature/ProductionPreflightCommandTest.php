<?php

use Illuminate\Support\Facades\Artisan;

it('reports pass fail checks without leaking secrets', function () {
    $exit = Artisan::call('linket:production-preflight');
    $output = Artisan::output();

    expect($exit)->toBe(0)
        ->and($output)->toContain('Linket production preflight')
        ->and($output)->toContain('[PASS]')
        ->and($output)->toContain('dispute_migrations_applied')
        ->and($output)->toContain('Result:');

    Artisan::call('linket:production-preflight', ['--json' => true]);
    $json = Artisan::output();
    $payload = json_decode($json, true);

    expect($payload)->toBeArray()
        ->and($payload['checks'] ?? null)->toBeArray()
        ->and($json)->not->toMatch('/whsec_[A-Za-z0-9]{8,}/')
        ->and($json)->not->toContain('VERIFY_ET_API_KEY=')
        ->and(collect($payload['checks'])->pluck('check'))->toContain('redis_connect')
        ->and(collect($payload['checks'])->pluck('check'))->toContain('verify_et_webhook_signing_configured');

    foreach (collect($payload['checks'])->pluck('status') as $status) {
        expect(in_array($status, ['PASS', 'FAIL'], true))->toBeTrue();
    }
});
