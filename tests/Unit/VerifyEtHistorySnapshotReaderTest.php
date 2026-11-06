<?php

use App\CreatorAi\Forecasting\VerifyEtHistorySnapshotReader;
use Carbon\CarbonImmutable;
use GuzzleHttp\Client;
use GuzzleHttp\Handler\MockHandler;
use GuzzleHttp\HandlerStack;
use GuzzleHttp\Middleware;
use GuzzleHttp\Psr7\Response;

function providerHistoryItem(int $index, bool $success = true): array
{
    return [
        'requestId' => 'request-synthetic-'.$index,
        'bank' => 'cbe',
        'status' => $success ? 'success' : 'failed',
        'processingStatus' => 'completed',
        'verified' => $success,
        'createdAt' => '2026-10-12T12:00:00.000Z',
    ];
}

function providerHistoryPage(array $items, int $total, int $offset): Response
{
    return new Response(200, ['content-type' => 'application/json'], json_encode([
        'success' => true,
        'message' => 'Synthetic history.',
        'data' => $items,
        'meta' => ['total' => $total, 'limit' => 50, 'offset' => $offset],
    ], JSON_THROW_ON_ERROR));
}

function providerHistoryReader(array $responses, array &$history = []): VerifyEtHistorySnapshotReader
{
    $stack = HandlerStack::create(new MockHandler($responses));
    $stack->push(Middleware::history($history));
    return new VerifyEtHistorySnapshotReader(new Client(['handler' => $stack]));
}

function providerHistoryRange(): array
{
    return [
        CarbonImmutable::parse('2026-10-10', 'UTC'),
        CarbonImmutable::parse('2026-10-15', 'UTC'),
    ];
}

test('independent Verify.et history adapter pages a full external account-scoped snapshot without exposing raw IDs', function () {
    config()->set('creator_ai.forecast_verify_et_history.enabled', true);
    $requests = [];
    $history = [];
    $reader = providerHistoryReader([
        providerHistoryPage(array_map('providerHistoryItem', range(1, 50)), 51, 0),
        providerHistoryPage([providerHistoryItem(51, false)], 51, 50),
    ], $history);
    [$from, $to] = providerHistoryRange();

    $result = $reader->snapshot('VERIFY_BANK_ET_synthetic_read_only_key', $from, $to);
    expect($result['requests_in_scope'])->toBe(51)
        ->and($result['successful_requests'])->toBe(50)
        ->and($result['pages_read'])->toBe(2)
        ->and($result['page_set_complete'])->toBeTrue()
        ->and($result['provider_account_scope_attested'])->toBeFalse()
        ->and($result['upstream_event_completeness_verified'])->toBeFalse()
        ->and($result['request_id_hashes'])->toHaveCount(51);
    expect(json_encode($result, JSON_THROW_ON_ERROR))->not->toContain('request-synthetic-');
    expect($history)->toHaveCount(2);
    foreach ($history as $entry) {
        expect($entry['request']->getMethod())->toBe('GET');
        expect((string) $entry['request']->getUri())->toContain('https://verify.et/api/verify/history');
        expect($entry['request']->getHeaderLine('x-api-key'))->toBe('VERIFY_BANK_ET_synthetic_read_only_key');
    }
});

test('Verify.et history adapter rejects truncated first pages instead of certifying coverage', function () {
    config()->set('creator_ai.forecast_verify_et_history.enabled', true);
    $history = [];
    $reader = providerHistoryReader([
        providerHistoryPage([providerHistoryItem(1)], 51, 0),
    ], $history);
    [$from, $to] = providerHistoryRange();
    expect(fn () => $reader->snapshot('VERIFY_BANK_ET_synthetic_read_only_key', $from, $to))
        ->toThrow(RuntimeException::class);
});

test('Verify.et history adapter rejects changing totals across offsets', function () {
    config()->set('creator_ai.forecast_verify_et_history.enabled', true);
    $history = [];
    $reader = providerHistoryReader([
        providerHistoryPage(array_map('providerHistoryItem', range(1, 50)), 51, 0),
        providerHistoryPage([providerHistoryItem(51)], 52, 50),
    ], $history);
    [$from, $to] = providerHistoryRange();
    expect(fn () => $reader->snapshot('VERIFY_BANK_ET_synthetic_read_only_key', $from, $to))
        ->toThrow(RuntimeException::class);
});

test('Verify.et history adapter rejects duplicate requests in paginated snapshots', function () {
    config()->set('creator_ai.forecast_verify_et_history.enabled', true);
    $history = [];
    $reader = providerHistoryReader([
        providerHistoryPage(array_map('providerHistoryItem', range(1, 50)), 51, 0),
        providerHistoryPage([providerHistoryItem(2)], 51, 50),
    ], $history);
    [$from, $to] = providerHistoryRange();
    expect(fn () => $reader->snapshot('VERIFY_BANK_ET_synthetic_read_only_key', $from, $to))
        ->toThrow(RuntimeException::class);
});

test('Verify.et history adapter rejects unavailable providers and inconsistent success markers', function () {
    config()->set('creator_ai.forecast_verify_et_history.enabled', true);
    $history = [];
    $reader = providerHistoryReader([new Response(503, [], '{}')], $history);
    [$from, $to] = providerHistoryRange();
    expect(fn () => $reader->snapshot('VERIFY_BANK_ET_synthetic_read_only_key', $from, $to))
        ->toThrow(RuntimeException::class);

    $item = providerHistoryItem(1);
    $item['verified'] = false;
    $reader = providerHistoryReader([providerHistoryPage([$item], 1, 0)], $history);
    expect(fn () => $reader->snapshot('VERIFY_BANK_ET_synthetic_read_only_key', $from, $to))
        ->toThrow(RuntimeException::class);
});

test('Verify.et history adapter is default off and rejects unsafe keys or future dates', function () {
    config()->set('creator_ai.forecast_verify_et_history.enabled', false);
    [$from, $to] = providerHistoryRange();
    expect(fn () => (new VerifyEtHistorySnapshotReader())->snapshot(
        'VERIFY_BANK_ET_synthetic_read_only_key', $from, $to
    ))->toThrow(RuntimeException::class);

    config()->set('creator_ai.forecast_verify_et_history.enabled', true);
    expect(fn () => (new VerifyEtHistorySnapshotReader())->snapshot('short', $from, $to))
        ->toThrow(InvalidArgumentException::class);
    expect(fn () => (new VerifyEtHistorySnapshotReader())->snapshot(
        'VERIFY_BANK_ET_synthetic_read_only_key',
        CarbonImmutable::now('UTC')->subDay(),
        CarbonImmutable::now('UTC')
    ))->toThrow(InvalidArgumentException::class);
});
