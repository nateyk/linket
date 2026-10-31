<?php

use App\Payments\VerifyEt\ReceiptReference;
use Illuminate\Validation\ValidationException;

it('normalizes supported references and receipt URLs', function (string $bank, string $input, string $expected): void {
    expect(app(ReceiptReference::class)->normalize($bank, $input))->toBe($expected);
})->with([
    ['cbe', 'https://mbreciept.cbe.com.et/SYNTHETIC123', 'SYNTHETIC123'],
    ['awash', 'https://awashpay.awashbank.com:8225/-SYNTHETIC-123', '-SYNTHETIC-123'],
    ['telebirr', '000SYNTHETIC123', '000SYNTHETIC123'],
    ['boa', 'SYNTHETIC123', 'SYNTHETIC123'],
    ['cbebirr', 'SYNTHETIC123', 'SYNTHETIC123'],
    ['dashen', 'SYNTHETIC123', 'SYNTHETIC123'],
]);

it('rejects unrelated and deceptive receipt URLs', function (string $bank, string $input): void {
    expect(fn () => app(ReceiptReference::class)->normalize($bank, $input))->toThrow(ValidationException::class);
})->with([
    ['cbe', 'https://mbreciept.cbe.com.et.evil.example/SYNTHETIC123'],
    ['cbe', 'https://evil.example@mbreciept.cbe.com.et/SYNTHETIC123'],
    ['cbe', 'http://mbreciept.cbe.com.et/SYNTHETIC123'],
    ['awash', 'https://awashpay.awashbank.com.evil.example:8225/-SYNTHETIC-123'],
    ['awash', 'https://awashpay.awashbank.com:8225/-SYNTHETIC-123?url=evil'],
    ['telebirr', 'https://mbreciept.cbe.com.et/SYNTHETIC123'],
]);
