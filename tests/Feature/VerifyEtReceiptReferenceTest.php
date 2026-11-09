<?php

use App\Payments\VerifyEt\ReceiptReference;
use Illuminate\Validation\ValidationException;

it('normalizes supported references and receipt URLs', function (string $bank, string $input, string $expected): void {
    expect(app(ReceiptReference::class)->normalize($bank, $input))->toBe($expected);
})->with([
    ['cbe', '  https://mbreciept.cbe.com.et/SYNTHETIC123  ', 'SYNTHETIC123'],
    ['awash', 'https://awashpay.awashbank.com:8225/-SYNTHETIC-123', '-SYNTHETIC-123'],
    ['awash', 'https://awashpay.awashbank.com/SYNTHETIC123', 'SYNTHETIC123'],
    ['kaafiebirr', 'https://receipt.ebirr.com/kaafimf/ilgi8ctn1Tr6vhw', 'ilgi8ctn1Tr6vhw'],
    ['siinqee', 'https://receipt.siinqeebank.com/SINQEE123456', 'SINQEE123456'],
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

it('validates correct reference format across banks', function (string $bank, string $reference, ?string $accountSuffix = null, ?string $phoneNumber = null): void {
    app(ReceiptReference::class)->validateFormat($bank, $reference, $accountSuffix, $phoneNumber);
    expect(true)->toBeTrue();
})->with([
    ['cbe', 'fHCxyTVljBclm6Yk4C', null, null],
    ['cbe', 'FT25356LL011', '12345678', null],
    ['boa', 'FT25356LL011', '12345', null],
    ['boa', 'TXN987654321', '54321', null],
    ['telebirr', 'DET8FJGUJ4', null, null],
    ['mpesa', 'QAB12CD345', null, null],
    ['cbebirr', 'TXN123456', null, '0912345678'],
    ['cbebirr', 'TXN123456', null, '+251712345678'],
    ['dashen', 'DASH123456', null, null],
]);

it('rejects invalid reference formats or missing required bank fields', function (string $bank, string $reference, ?string $accountSuffix = null, ?string $phoneNumber = null, string $expectedField = 'reference'): void {
    try {
        app(ReceiptReference::class)->validateFormat($bank, $reference, $accountSuffix, $phoneNumber);
        test()->fail("Expected ValidationException for {$bank} but none was thrown.");
    } catch (ValidationException $e) {
        expect($e->errors())->toHaveKey($expectedField);
    }
})->with([
    // CBE standard with unexpected account suffix
    ['cbe', 'fHCxyTVljBclm6Yk4C', '12345678', null, 'account_suffix'],
    // CBE FT missing suffix
    ['cbe', 'FT25356LL011', null, null, 'account_suffix'],
    // CBE FT invalid suffix length (5 digits instead of 8)
    ['cbe', 'FT25356LL011', '12345', null, 'account_suffix'],
    // BOA missing suffix
    ['boa', 'TXN987654321', null, null, 'account_suffix'],
    // BOA invalid suffix length (8 digits instead of 5)
    ['boa', 'TXN987654321', '12345678', null, 'account_suffix'],
    // Telebirr too short
    ['telebirr', 'SHORT', null, null, 'reference'],
    // Telebirr with invalid characters
    ['telebirr', 'DET8FJ!@#$', null, null, 'reference'],
    // CBE Birr missing phone number
    ['cbebirr', 'TXN123456', null, null, 'phone_number'],
    // CBE Birr invalid phone number
    ['cbebirr', 'TXN123456', null, '12345', 'phone_number'],
    // Dashen too short
    ['dashen', '123', null, null, 'reference'],
]);
