<?php

use App\Mail\EmailBranding;
use Common\Settings\Themes\CssTheme;

beforeEach(function () {
    config(['app.url' => 'https://linket.test']);
    config(['app.name' => 'Linket App']);
});

test('email branding prefers dark logo then light logo as absolute url', function () {
    settings()->set('branding.site_name', 'Linket Brand');
    settings()->set('branding.logo_dark', 'storage/branding/logo-dark.png');
    settings()->set('branding.logo_light', 'storage/branding/logo-light.png');

    $props = app(EmailBranding::class)->props();

    expect($props['siteName'])->toBe('Linket Brand')
        ->and($props['logoUrl'])->toBe('https://linket.test/storage/branding/logo-dark.png')
        ->and($props['buttonBorderRadiusPx'])->toBeInt();
});

test('email branding falls back to light logo when dark is empty', function () {
    settings()->set('branding.logo_dark', '');
    settings()->set('branding.logo_light', 'https://cdn.example/logo.png');

    $props = app(EmailBranding::class)->props();

    expect($props['logoUrl'])->toBe('https://cdn.example/logo.png');
});

test('email branding skips svg logos and returns null logoUrl', function () {
    settings()->set('branding.logo_dark', 'images/logo-dark.svg');
    settings()->set('branding.logo_light', 'images/logo-light.SVG');

    $props = app(EmailBranding::class)->props();

    expect($props['logoUrl'])->toBeNull();
});

test('email branding maps light theme radius to button pixels', function (string $radius, int $expectedPx) {
    settings()->set('branding.logo_dark', '');
    settings()->set('branding.logo_light', '');

    CssTheme::query()->delete();
    CssTheme::query()->create([
        'name' => 'Light '.$radius,
        'user_id' => null,
        'type' => 'site',
        'is_dark' => false,
        'default_light' => true,
        'default_dark' => false,
        'radius' => $radius,
        'values' => ['--be-primary' => '#0049cc'],
    ]);

    expect(app(EmailBranding::class)->props()['buttonBorderRadiusPx'])->toBe($expectedPx);
})->with([
    ['none', 0],
    ['sm', 6],
    ['md', 8],
    ['default', 24],
    ['weird', 24],
]);

test('email branding uses app name when site name setting is empty', function () {
    settings()->set('branding.site_name', '');
    settings()->set('branding.logo_dark', '');
    settings()->set('branding.logo_light', '');

    expect(app(EmailBranding::class)->props()['siteName'])->toBe('Linket App');
});
