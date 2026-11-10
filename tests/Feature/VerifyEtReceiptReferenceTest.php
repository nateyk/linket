<?php

use App\Payments\VerifyEt\ReceiptReference;
use Illuminate\Validation\ValidationException;

it('normalizes supported references and receipt URLs', function (string $bank, string $input, string $expected): void {
    expect(app(ReceiptReference::class)->normalize($bank, $input))->toBe($expected);
})->with([
    ['cbe', '  https://mbreciept.cbe.com.et/SYNTHETIC123  ', 'SYNTHETIC123'],
    ['cbe', 'https://cbe.com.et/receipt/SYNTHETIC123', 'SYNTHETIC123'],
    ['telebirr', '000SYNTHETIC123', '000SYNTHETIC123'],
    ['telebirr', 'https://apps.ethiotelecom.et/receipt/?transactionNo=DET8FJGUJ4', 'DET8FJGUJ4'],
    ['boa', 'SYNTHETIC123', 'SYNTHETIC123'],
]);

it('rejects unrelated and deceptive receipt URLs', function (string $bank, string $input): void {
    expect(fn () => app(ReceiptReference::class)->normalize($bank, $input))->toThrow(ValidationException::class);
})->with([
    ['cbe', 'https://mbreciept.cbe.com.et.evil.example/SYNTHETIC123'],
    ['cbe', 'https://evil.example@mbreciept.cbe.com.et/SYNTHETIC123'],
    ['cbe', 'http://mbreciept.cbe.com.et/SYNTHETIC123'],
    ['telebirr', 'https://mbreciept.cbe.com.et/SYNTHETIC123'],
]);

it('validates correct reference format across banks', function (string $bank, string $reference, ?string $accountSuffix = null): void {
    app(ReceiptReference::class)->validateFormat($bank, $reference, $accountSuffix);
    expect(true)->toBeTrue();
})->with([
    ['cbe', 'fHCxyTVljBclm6Yk4C', null],
    ['cbe', 'FT25356LL011', '12345678'],
    ['boa', 'FT25356LL011', '12345'],
    ['boa', 'TXN987654321', '54321'],
    ['telebirr', 'DET8FJGUJ4', null],
]);

it('rejects invalid reference formats or missing required bank fields', function (string $bank, string $reference, ?string $accountSuffix = null, string $expectedField = 'reference'): void {
    try {
        app(ReceiptReference::class)->validateFormat($bank, $reference, $accountSuffix);
        test()->fail("Expected ValidationException for {$bank} but none was thrown.");
    } catch (ValidationException $e) {
        expect($e->errors())->toHaveKey($expectedField);
    }
})->with([
    // CBE standard with unexpected account suffix
    ['cbe', 'fHCxyTVljBclm6Yk4C', '12345678', 'account_suffix'],
    // CBE FT missing suffix
    ['cbe', 'FT25356LL011', null, 'account_suffix'],
    // CBE FT invalid suffix length (5 digits instead of 8)
    ['cbe', 'FT25356LL011', '12345', 'account_suffix'],
    // BOA missing suffix
    ['boa', 'TXN987654321', null, 'account_suffix'],
    // BOA invalid suffix length (8 digits instead of 5)
    ['boa', 'TXN987654321', '12345678', 'account_suffix'],
    // Telebirr too short
    ['telebirr', 'SHORT', null, 'reference'],
    // Telebirr with invalid characters
    ['telebirr', 'DET8FJ!@#$', null, 'reference'],
    // Unsupported legacy banks
    ['cbebirr', 'TXN123456', null, 'reference'],
    ['dashen', 'DASH123456', null, 'reference'],
]);
