<?php

namespace App\Payments\VerifyEt;

use Illuminate\Validation\ValidationException;

final class ReceiptReference
{
    /**
     * Normalize first, then check the selected bank's format.
     * Receipt URLs must be reduced to their token before the format regex runs.
     */
    public function prepare(string $bank, string $reference, ?string $accountSuffix = null, ?string $phoneNumber = null): string
    {
        $normalized = $this->normalize($bank, $reference);
        $this->validateFormat($bank, $normalized, $accountSuffix, $phoneNumber);

        return $normalized;
    }

    /**
     * Normalize the user's reference input (trimming whitespace and extracting URL tokens).
     */
    public function normalize(string $bank, string $reference): string
    {
        $reference = trim($reference);

        // Check supported bank receipt URLs
        $urlPatterns = [
            'cbe' => '~^https://mbreciept\.cbe\.com\.et/([A-Za-z0-9_-]{6,150})/?$~iD',
            'awash' => '~^https://awashpay\.awashbank\.com(?::\d+)?/(-?[A-Za-z0-9_-]{6,140})/?$~iD',
            'kaafiebirr' => '~^https://receipt\.ebirr\.com/kaafimf/([A-Za-z0-9_-]{6,150})/?$~iD',
            'siinqee' => '~^https://(?:receipt|pay)\.siinqeebank\.com(?::\d+)?/([A-Za-z0-9_-]{6,150})/?$~iD',
        ];

        if (isset($urlPatterns[$bank]) && preg_match($urlPatterns[$bank], $reference, $matches)) {
            return $matches[1];
        }

        // Standard alphanumeric transaction reference
        if (preg_match('/^[A-Za-z0-9._-]{6,150}$/D', $reference)) {
            // Providers with uppercase convention
            if (in_array(strtolower($bank), ['telebirr', 'boa', 'mpesa', 'dashen'], true) || preg_match('/^FT/i', $reference)) {
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
    public function validateFormat(string $bank, string $reference, ?string $accountSuffix = null, ?string $phoneNumber = null): void
    {
        $bank = strtolower($bank);
        $reference = trim($reference);

        // Bank-specific format checking
        switch ($bank) {
            case 'cbe':
                if (preg_match('/^FT/i', $reference)) {
                    if (!preg_match('/^FT[0-9A-Z]{8,14}$/i', $reference)) {
                        throw ValidationException::withMessages([
                            'reference' => __('Enter a valid CBE FT reference number (e.g. FT25356LL011).'),
                        ]);
                    }
                    if (!$accountSuffix || !preg_match('/^\d{8}$/', $accountSuffix)) {
                        throw ValidationException::withMessages([
                            'account_suffix' => __('Older CBE FT references require the eight-digit transaction account suffix.'),
                        ]);
                    }
                } else {
                    if (!preg_match('/^[A-Za-z0-9_-]{6,150}$/', $reference)) {
                        throw ValidationException::withMessages([
                            'reference' => __('Enter a valid CBE receipt ID (e.g. fHCxyTVljBclm6Yk4C) or receipt URL.'),
                        ]);
                    }
                    if ($accountSuffix !== null && $accountSuffix !== '') {
                        throw ValidationException::withMessages([
                            'account_suffix' => __('CBE receipt IDs do not use an account suffix.'),
                        ]);
                    }
                }
                break;

            case 'boa':
                if (!preg_match('/^(?:FT[0-9A-Z]{8,14}|[A-Za-z0-9]{6,30})$/i', $reference)) {
                    throw ValidationException::withMessages([
                        'reference' => __('Enter a valid Bank of Abyssinia transaction reference.'),
                    ]);
                }
                if (!$accountSuffix || !preg_match('/^\d{5}$/', $accountSuffix)) {
                    throw ValidationException::withMessages([
                        'account_suffix' => __('Bank of Abyssinia requires the five-digit transaction account suffix.'),
                    ]);
                }
                break;

            case 'telebirr':
                if (!preg_match('/^[A-Za-z0-9]{8,30}$/', $reference)) {
                    throw ValidationException::withMessages([
                        'reference' => __('Enter a valid Telebirr transaction number (e.g. DET8FJGUJ4).'),
                    ]);
                }
                break;

            case 'mpesa':
                if (!preg_match('/^[A-Za-z0-9]{8,30}$/', $reference)) {
                    throw ValidationException::withMessages([
                        'reference' => __('Enter a valid M-Pesa transaction number (e.g. QAB12CD34).'),
                    ]);
                }
                break;

            case 'cbebirr':
                if (!preg_match('/^[A-Za-z0-9]{6,30}$/', $reference)) {
                    throw ValidationException::withMessages([
                        'reference' => __('Enter a valid CBE Birr receipt or transaction reference.'),
                    ]);
                }
                if (!$phoneNumber || !preg_match('/^(?:0[79]\d{8}|\+?251[79]\d{8})$/', $phoneNumber)) {
                    throw ValidationException::withMessages([
                        'phone_number' => __('CBE Birr requires a valid wallet phone number (e.g. 0912345678 or 0712345678).'),
                    ]);
                }
                break;

            case 'dashen':
                if (!preg_match('/^[A-Za-z0-9]{6,30}$/', $reference)) {
                    throw ValidationException::withMessages([
                        'reference' => __('Enter a valid Dashen Bank transaction reference.'),
                    ]);
                }
                break;

            default:
                if (!preg_match('/^[A-Za-z0-9._-]{6,150}$/', $reference)) {
                    throw ValidationException::withMessages([
                        'reference' => __('Enter a valid transaction reference or supported receipt URL.'),
                    ]);
                }
                break;
        }
    }
}
