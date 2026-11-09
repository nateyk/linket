<?php

namespace App\Payments\VerifyEt;

use App\Payments\Models\DirectPaymentVerification;

final class VerifyEtPayloadBuilder
{
    private const SUPPORTED_BANKS = [
        'cbe', 'boa', 'telebirr', 'mpesa', 'cbebirr',
        'dashen', 'awash', 'siinqee', 'kaafiebirr', 'coopayebirr',
    ];

    /**
     * Build the request payload for Verify.et verification submission.
     *
     * @return array<string, mixed>
     * @throws VerifyEtException
     */
    public function build(DirectPaymentVerification $verification): array
    {
        $this->ensureSupportedBank($verification->bank_code);
        $input = $verification->provider_input ?? [];
        $this->validateBankSpecificFields($verification->bank_code, $verification->reference, $input);

        $payload = [
            'bank' => $verification->bank_code,
            'settlementAccount' => $verification->settlement_account,
        ];

        $payload = array_merge($payload, $this->resolveBankPayloadFields(
            $verification->bank_code,
            $verification->reference,
            $input,
        ));

        return array_filter($payload, static fn (mixed $value): bool => $value !== null && $value !== '');
    }

    private function ensureSupportedBank(string $bankCode): void
    {
        if (!in_array($bankCode, self::SUPPORTED_BANKS, true)) {
            throw new VerifyEtException(422, 'unsupported_bank');
        }
    }

    /**
     * @param array<string, mixed> $input
     * @throws VerifyEtException
     */
    private function validateBankSpecificFields(string $bank, string $reference, array $input): void
    {
        if ($bank === 'boa') {
            $this->validateBoaFields($input);
        } elseif ($bank === 'cbe') {
            $this->validateCbeFields($reference, $input);
        } elseif ($bank === 'cbebirr') {
            $this->validateCbeBirrFields($input);
        }
    }

    /**
     * @param array<string, mixed> $input
     * @throws VerifyEtException
     */
    private function validateBoaFields(array $input): void
    {
        if (!preg_match('/^\d{5}$/', (string) ($input['accountSuffix'] ?? ''))) {
            throw new VerifyEtException(422, 'invalid_bank_fields', 'INVALID_BOA_SUFFIX');
        }
    }

    /**
     * @param array<string, mixed> $input
     * @throws VerifyEtException
     */
    private function validateCbeFields(string $reference, array $input): void
    {
        $suffix = $input['accountSuffix'] ?? null;
        $isFt = (bool) preg_match('/^FT/i', $reference);

        if ($isFt && !preg_match('/^\d{8}$/', (string) $suffix)) {
            throw new VerifyEtException(422, 'invalid_bank_fields', 'INVALID_CBE_SUFFIX');
        }

        if (!$isFt && $suffix !== null) {
            throw new VerifyEtException(422, 'invalid_bank_fields', 'INVALID_CBE_SUFFIX');
        }
    }

    /**
     * @param array<string, mixed> $input
     * @throws VerifyEtException
     */
    private function validateCbeBirrFields(array $input): void
    {
        if ($this->cbeBirrPhone($input) === null) {
            throw new VerifyEtException(422, 'invalid_bank_fields', 'INVALID_CBEBIRR_PHONE');
        }
    }

    /**
     * Accept local 07/09 numbers and 251 numbers, then send the 251 form Verify.et prefers.
     *
     * @param array<string, mixed> $input
     */
    private function cbeBirrPhone(array $input): ?string
    {
        $digits = preg_replace('/\D/', '', (string) ($input['phoneNumber'] ?? '')) ?? '';

        if (preg_match('/^0([79]\d{8})$/', $digits, $parts) === 1) {
            return '251'.$parts[1];
        }

        if (preg_match('/^251([79]\d{8})$/', $digits, $parts) === 1) {
            return '251'.$parts[1];
        }

        return null;
    }

    /**
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    private function resolveBankPayloadFields(string $bank, string $reference, array $input): array
    {
        return match ($bank) {
            'telebirr', 'mpesa' => [
                'transactionNumber' => $reference,
            ],
            'cbebirr' => [
                'receiptNumber' => $reference,
                'phoneNumber' => $this->cbeBirrPhone($input),
            ],
            'boa' => [
                'referenceNumber' => $reference,
                'accountSuffix' => $input['accountSuffix'] ?? null,
            ],
            'cbe' => array_merge(
                ['reference' => $reference],
                ($input['accountSuffix'] ?? null) ? ['accountSuffix' => $input['accountSuffix']] : [],
            ),
            default => [
                'referenceNumber' => $reference,
            ],
        };
    }
}
