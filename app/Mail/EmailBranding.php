<?php

namespace App\Mail;

use Common\Files\PublicMediaUrl;
use Common\Settings\Themes\CssTheme;
use Illuminate\Support\Str;

final class EmailBranding
{
    /**
     * Shared branding props merged into every React Email render.
     *
     * @return array{siteName: string, logoUrl: string|null, buttonBorderRadiusPx: int}
     */
    public function props(): array
    {
        return [
            'siteName' => $this->siteName(),
            'logoUrl' => $this->logoUrl(),
            'buttonBorderRadiusPx' => $this->buttonBorderRadiusPx(),
        ];
    }

    private function siteName(): string
    {
        $name = settings('branding.site_name');
        if (is_string($name) && trim($name) !== '') {
            return trim($name);
        }

        return (string) config('app.name', 'Linket');
    }

    private function logoUrl(): ?string
    {
        foreach (['branding.logo_dark', 'branding.logo_light'] as $key) {
            $raw = settings($key);
            if (! is_string($raw)) {
                continue;
            }

            $raw = trim($raw);
            if ($raw === '' || $this->isSvg($raw)) {
                continue;
            }

            return $this->toAbsoluteUrl($raw);
        }

        return null;
    }

    private function buttonBorderRadiusPx(): int
    {
        $radius = CssTheme::query()
            ->where('default_light', true)
            ->value('radius');

        return match (is_string($radius) ? $radius : null) {
            'none' => 0,
            'sm' => 6,
            'md' => 8,
            default => 24,
        };
    }

    private function isSvg(string $value): bool
    {
        $path = parse_url($value, PHP_URL_PATH);
        $candidate = is_string($path) && $path !== '' ? $path : $value;

        return Str::endsWith(Str::lower($candidate), '.svg');
    }

    private function toAbsoluteUrl(string $value): string
    {
        if (PublicMediaUrl::isAbsoluteUrl($value)) {
            if (Str::startsWith(Str::lower($value), '//')) {
                return 'https:'.$value;
            }

            return $value;
        }

        $normalized = PublicMediaUrl::normalize($value) ?? $value;
        $path = ltrim((string) $normalized, '/');

        return rtrim((string) config('app.url'), '/').'/'.$path;
    }
}
