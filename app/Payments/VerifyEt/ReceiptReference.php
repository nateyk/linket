<?php

namespace App\Payments\VerifyEt;

use Illuminate\Validation\ValidationException;

final class ReceiptReference
{
    public function normalize(string $bank, string $reference): string
    {
        if (preg_match('/^[A-Za-z0-9._-]{6,150}$/D', $reference)) {
            return $reference;
        }
        $pattern = match ($bank) {
            'cbe' => '~^https://mbreciept\.cbe\.com\.et/([A-Za-z0-9_-]{6,150})/?$~iD',
            'awash' => '~^https://awashpay\.awashbank\.com:8225/(-[A-Za-z0-9-]{6,140})/?$~iD',
            default => null,
        };
        if ($pattern !== null && preg_match($pattern, $reference, $matches)) {
            return $matches[1];
        }
        throw ValidationException::withMessages(['reference' => __('Enter a valid receipt reference or supported receipt URL.')]);
    }
}
