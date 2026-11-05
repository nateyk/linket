<?php

namespace App\CreatorAi\Storefront;

use Illuminate\Validation\ValidationException;

/**
 * A tiny fixed token mapping compatible with the existing Store button
 * editor. No custom CSS, JS, URLs, colors, images, layout or branding options.
 */
final class CreatorStorefrontTokenValidator
{
    private const PRESETS = [
        'clean' => [
            'variant' => 'outline',
            'radius' => 'rounded-sm',
            'shadow' => 'none',
        ],
        'editorial' => [
            'variant' => 'solid',
            'radius' => 'rounded-sm',
            'shadow' => 'soft',
        ],
        'soft' => [
            'variant' => 'solid',
            'radius' => 'rounded-full',
            'shadow' => 'soft',
        ],
    ];

    /** @param array<string,mixed> $candidate
     * @return array{preset:string,reason:string,btnConfig:array{variant:string,radius:string,shadow:string}}
     */
    public function clean(array $candidate): array
    {
        $keys = array_keys($candidate);
        sort($keys);
        if ($keys !== ['preset', 'reason']
            || ! is_string($candidate['preset'])
            || ! array_key_exists($candidate['preset'], self::PRESETS)
            || ! is_string($candidate['reason'])
            || ! mb_check_encoding($candidate['reason'], 'UTF-8')
            || preg_match('/[<>\x{0000}-\x{001F}\x{007F}]|https?:\/\/|(?:data|javascript):/iu', $candidate['reason']) === 1
            || mb_strlen(trim($candidate['reason'])) < 8
            || mb_strlen(trim($candidate['reason'])) > 220) {
            throw ValidationException::withMessages([
                'proposal' => 'AI returned an unsupported appearance proposal.',
            ]);
        }

        return [
            'preset' => $candidate['preset'],
            'reason' => trim($candidate['reason']),
            'btnConfig' => self::PRESETS[$candidate['preset']],
        ];
    }
}
