<?php

use Illuminate\Support\Facades\Route;

test('livechat module is installed and registers campaign routes', function () {
    expect(config('modules.livechat.installed'))->toBeTrue();
    expect(class_exists(\Livechat\LiveChatServiceProvider::class))->toBeTrue();

    $names = collect(Route::getRoutes())
        ->map(fn ($route) => $route->uri())
        ->filter(fn (string $uri) => str_contains($uri, 'lc/campaigns'))
        ->values();

    expect($names->isNotEmpty())->toBeTrue();
    expect($names->contains(fn (string $uri) => str_contains($uri, 'api/v1/lc/campaigns')))->toBeTrue();
});
