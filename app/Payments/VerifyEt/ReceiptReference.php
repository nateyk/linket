<?php

namespace App\Payments\VerifyEt;

use Illuminate\Validation\ValidationException;

final class ReceiptReference
{
    /**
     * Normalize first, then check the selected bank's format.
     * Receipt URLs must be reduced to their token before the format regex runs.
     */
    public function prepare(string $bank, string $reference, ?string $accountSuffix = null): string
    {
        $normalized = $this->normalize($bank, $reference);
        $this->validateFormat($bank, $normalized, $accountSuffix);

        return $normalized;
    }

    /**
     * A receiving account number is a payment destination, never proof of a transfer.
     * Reject an accidental paste before spending a verification attempt or provider call.
     */
    public function assertNotReceivingAccount(string $reference, ?string $receivingAccount): void
    {
        if (!$receivingAccount) {
            return;
        }

        $cleanReference = strtolower((string) preg_replace('/[\\s-]+/', '', trim($reference)));
        $cleanAccount = strtolower((string) preg_replace('/[\\s-]+/', '', trim($receivingAccount)));

        if ($cleanReference !== '' && $cleanReference === $cleanAccount) {
            throw ValidationException::withMessages([
                'reference' => __('You entered the receiving account number. Enter the receipt ID or transaction reference from your completed transfer instead.'),
            ]);
        }
    }

    /**
     * Normalize the user's reference input (trimming whitespace and extracting URL tokens).
     */
    public function normalize(string $bank, string $reference): string
    {
        $reference = trim($reference);

        // Supported Linket bank receipt URLs
        $urlPatterns = [
            'cbe' => '~^https://(?:mbreciept\.|www\.)?cbe\.com\.et/(?:receipt/)?([A-Za-z0-9_-]{6,150})/?$~iD',
            'telebirr' => '~^https://apps\.ethiotelecom\.et/receipt/(?:.*[?&]transactionNo=)?([A-Za-z0-9]{8,30})~iD',
        ];

        if (isset($urlPatterns[$bank]) && preg_match($urlPatterns[$bank], $reference, $matches)) {
            return $matches[1];
        }

        // Standard alphanumeric transaction reference
        if (preg_match('/^[A-Za-z0-9._-]{6,150}$/D', $reference)) {
            if (in_array(strtolower($bank), ['telebirr', 'boa'], true) || preg_match('/^FT/i', $reference)) {
                return strtoupper($reference);
            }

            return $reference;
        }

        throw ValidationException::withMessages(['reference' => __('Enter a valid receipt reference or supported receipt URL.')]);
    }

    /**
     * Validate reference format against the selected bank/provider specifications.
     *
     * @throws ValidationException
     */
    public function validateFormat(string $bank, string $reference, ?string $accountSuffix = null): void
    {
        $reference = trim($reference);

        match (strtolower($bank)) {
            'cbe' => $this->validateCbeReference($reference, $accountSuffix),
            'boa' => $this->validateBoaReference($reference, $accountSuffix),
            'telebirr' => $this->assertReference($reference, '/^[A-Za-z0-9]{8,30}$/', __('Enter a valid Telebirr transaction number (e.g. DET8FJGUJ4).')),
            default => throw ValidationException::withMessages(['reference' => __('Unsupported bank provider. Linket supports CBE, Telebirr, and Bank of Abyssinia.')]),
        };
    }

    private function validateCbeReference(string $reference, ?string $accountSuffix): void
    {
        if (preg_match('/^FT/i', $reference) === 1) {
            $this->validateCbeFtReference($reference, $accountSuffix);

            return;
        }

        $this->validateCbeReceiptId($reference, $accountSuffix);
    }

    private function validateCbeFtReference(string $reference, ?string $accountSuffix): void
    {
        $this->assertReference($reference, '/^FT[0-9A-Z]{8,148}$/i', __('Enter a valid CBE FT reference number (e.g. FT25356LL011).'));
        if (preg_match('/^FT[0-9A-Z]{8,12}$/i', $reference) !== 1) {
            return;
        }

        if ($accountSuffix && preg_match('/^\d{8}$/', $accountSuffix) === 1) {
            return;
        }

        throw ValidationException::withMessages([
            'account_suffix' => __('Older CBE FT references require the eight-digit transaction account suffix.'),
        ]);
    }

    private function validateCbeReceiptId(string $reference, ?string $accountSuffix): void
    {
        $this->assertReference($reference, '/^[A-Za-z0-9_-]{6,150}$/', __('Enter a valid CBE receipt ID (e.g. fHCxyTVljBclm6Yk4C) or receipt URL.'));
        if ($accountSuffix === null || $accountSuffix === '') {
            return;
        }

        throw ValidationException::withMessages([
            'account_suffix' => __('CBE receipt IDs do not use an account suffix.'),
        ]);
    }

    private function validateBoaReference(string $reference, ?string $accountSuffix): void
    {
        $this->assertReference($reference, '/^(?:FT[0-9A-Z]{8,14}|[A-Za-z0-9]{6,30})$/i', __('Enter a valid Bank of Abyssinia transaction reference.'));
        if ($accountSuffix && preg_match('/^\d{5}$/', $accountSuffix) === 1) {
            return;
        }

        throw ValidationException::withMessages([
            'account_suffix' => __('Bank of Abyssinia requires the five-digit transaction account suffix.'),
        ]);
    }

    private function assertReference(string $reference, string $pattern, string $message): void
    {
        if (preg_match($pattern, $reference) === 1) {
            return;
        }

        throw ValidationException::withMessages([
            'reference' => $message,
        ]);
    }
}
