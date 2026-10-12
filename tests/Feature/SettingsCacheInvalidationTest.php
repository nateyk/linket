<?php

use Common\Core\Install\InsertDefaultSettings;
use Common\Settings\Models\Setting;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Cache;

uses(DatabaseTransactions::class);

// The settings manager serves the whole settings map from a 1 day
// "settings.public" cache blob. Any write that bypasses the manager must
// still invalidate that blob, otherwise newly added settings (eg. "menus"
// written by a seeder) never reach the client until the cache expires.
afterEach(fn() => Cache::forget('settings.public'));

function primePublicSettingsCache(): void
{
    Cache::put(
        'settings.public',
        collect(['probe' => 'stale']),
        now()->addDay(),
    );
}

it('forgets the cached public settings when a setting row is created directly', function () {
    primePublicSettingsCache();

    Setting::create(['name' => 'test.cache_probe', 'value' => 'fresh']);

    expect(Cache::get('settings.public'))->toBeNull();
});

it('forgets the cached public settings when a setting row is saved', function () {
    $setting = Setting::create(['name' => 'test.cache_probe_save', 'value' => 'a']);

    primePublicSettingsCache();
    $setting->value = 'b';
    $setting->save();

    expect(Cache::get('settings.public'))->toBeNull();
});

it('forgets the cached public settings when defaults are bulk inserted', function () {
    // remove a default so the install path actually performs an insert.
    Setting::where('name', 'branding.logo_light')->delete();

    primePublicSettingsCache();
    (new InsertDefaultSettings())->execute();

    expect(Setting::where('name', 'branding.logo_light')->exists())->toBeTrue();
    expect(Cache::get('settings.public'))->toBeNull();
});
