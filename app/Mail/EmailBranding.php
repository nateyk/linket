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
            if ($raw === '') {
                continue;
            }

            $resolved = $this->resolveRasterLogo($raw);
            if ($resolved !== null) {
                return $resolved;
            }
        }

        return null;
    }

    /**
     * Email clients often blank SVG in <img>. Prefer a local .png sibling when
     * the configured logo is SVG (default Linket marks), otherwise use raster URLs as-is.
     */
    private function resolveRasterLogo(string $value): ?string
    {
        if (! $this->isSvg($value)) {
            return $this->toAbsoluteUrl($value);
        }

        $pngCandidate = (string) preg_replace('/\.svg$/i', '.png', $value);
        if ($pngCandidate === $value) {
            return null;
        }

        $relative = ltrim((string) (PublicMediaUrl::normalize($pngCandidate) ?? $pngCandidate), '/');
        if ($relative === '' || ! is_file(public_path($relative))) {
            return null;
        }

        return $this->toAbsoluteUrl($pngCandidate);
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
