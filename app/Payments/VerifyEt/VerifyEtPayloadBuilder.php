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
        $this->ensureSupportedBank($verification);
        $this->validateBankSpecificFields($verification);

        $payload = [
            'bank' => $verification->bank_code,
            'settlementAccount' => $verification->settlement_account,
        ];

        $payload = array_merge($payload, $this->resolveBankPayloadFields($verification));

        return array_filter($payload, static fn (mixed $value): bool => $value !== null && $value !== '');
    }

    private function ensureSupportedBank(DirectPaymentVerification $verification): void
    {
        if (!in_array($verification->bank_code, self::SUPPORTED_BANKS, true)) {
            throw new VerifyEtException(422, 'unsupported_bank');
        }
    }

    private function validateBankSpecificFields(DirectPaymentVerification $verification): void
    {
        $input = $verification->provider_input ?? [];
        if ($verification->bank_code === 'boa') {
            $this->validateBoaFields($input);

            return;
        }

        if ($verification->bank_code === 'cbe') {
            $this->validateCbeFields($verification);

            return;
        }

        if ($verification->bank_code === 'cbebirr') {
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
    private function validateCbeFields(DirectPaymentVerification $verification): void
    {
        if ($this->cbeSuffixAccepted($verification)) {
            return;
        }

        throw new VerifyEtException(422, 'invalid_bank_fields', 'INVALID_CBE_SUFFIX');
    }

    private function cbeSuffixAccepted(DirectPaymentVerification $verification): bool
    {
        $reference = $verification->reference;
        $suffix = ($verification->provider_input ?? [])['accountSuffix'] ?? null;
        if (preg_match('/^FT[0-9A-Z]{8,12}$/i', $reference) === 1) {
            return $this->isEightDigitSuffix($suffix);
        }

        if (!$this->suffixWasProvided($suffix)) {
            return true;
        }

        if (preg_match('/^FT/i', $reference) !== 1) {
            return false;
        }

        return $this->isEightDigitSuffix($suffix);
    }

    private function suffixWasProvided(mixed $suffix): bool
    {
        return is_string($suffix) && $suffix !== '';
    }

    private function isEightDigitSuffix(mixed $suffix): bool
    {
        return is_string($suffix) && preg_match('/^\d{8}$/', $suffix) === 1;
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
     * @return array<string, mixed>
     */
    private function resolveBankPayloadFields(DirectPaymentVerification $verification): array
    {
        $reference = $verification->reference;
        $input = $verification->provider_input ?? [];

        return match ($verification->bank_code) {
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
            'cbe' => $this->cbePayload($verification),
            default => [
                'referenceNumber' => $reference,
            ],
        };
    }

    /**
     * @return array<string, mixed>
     */
    private function cbePayload(DirectPaymentVerification $verification): array
    {
        $payload = ['reference' => $verification->reference];
        $suffix = ($verification->provider_input ?? [])['accountSuffix'] ?? null;
        if (!$this->suffixWasProvided($suffix)) {
            return $payload;
        }

        $payload['accountSuffix'] = $suffix;

        return $payload;
    }
}
