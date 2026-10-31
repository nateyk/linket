<?php

use App\Payments\VerifyEt\VerifyEtJson;
use App\Payments\VerifyEt\VerifyEtMoney;
use App\Payments\VerifyEt\VerifyEtHttp;
use Illuminate\Support\Facades\Http;

it('parses provider amount tokens exactly without binary floating point', function (string $token, ?int $expected): void {
    Http::preventStrayRequests();
    $result = app(VerifyEtJson::class)->decode('{"data":[{"amount":' . $token . '}]}');
    expect(app(VerifyEtMoney::class)->cents($result['data'][0]['amount']))->toBe($expected);
})->with([
    ['2470', 247000],
    ['2470.00', 247000],
    ['"2470.00"', 247000],
    ['5600', 560000],
    ['5600.00', 560000],
    ['"5600.00"', 560000],
    ['0.01', 1],
    ['100.10', 10010],
    ['1e2', null],
    ['"1e2"', null],
    ['100.001', null],
    ['"100.001"', null],
    ['-1', null],
    ['"-0.01"', null],
    ['"1.2.3"', null],
    ['"NaN"', null],
    ['99999999999999999999', null],
]);

it('preserves escaped string contents and nested amount values in provider JSON', function (): void {
    $json = '{"note":"{\"amount\": 99.99}","data":{"result":[{"amount":100.10}]}}';
    $result = app(VerifyEtJson::class)->decode($json);
    expect($result['note'])->toBe('{"amount": 99.99}')
        ->and($result['data']['result'][0]['amount'])->toBe('100.10');
});

it('rejects already rounded floating-point amounts and malformed JSON', function (): void {
    expect(app(VerifyEtMoney::class)->cents(100.10))->toBeNull();
    expect(fn () => app(VerifyEtJson::class)->decode('{"amount":1.}'))->toThrow(JsonException::class);
});

it('does not publish provider HTTP events to application instrumentation', function (): void {
    expect(app(VerifyEtHttp::class)->factory()->getDispatcher())->toBeNull();
});
