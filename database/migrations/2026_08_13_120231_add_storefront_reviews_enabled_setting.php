<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Cache;

return new class extends Migration {
    public function up(): void
    {
        settings()->save(['storefront.reviews_enabled' => true]);
        Cache::forget('settings.public');
    }

    public function down(): void
    {
        \Common\Settings\Models\Setting::where(
            'name',
            'storefront.reviews_enabled',
        )->delete();
        Cache::forget('settings.public');
    }
};
