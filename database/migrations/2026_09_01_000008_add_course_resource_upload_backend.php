<?php

use Common\Settings\Models\Setting;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Arr;

return new class extends Migration {
    public function up(): void
    {
        $setting = Setting::query()->where('name', 'uploading')->first();
        $uploading = $setting?->value;

        if (!is_array($uploading) || !empty(Arr::get($uploading, 'types.courseResources.backends'))) {
            return;
        }

        $backends = Arr::get($uploading, 'types.courseVideos.backends', []);

        if (!$backends) {
            return;
        }

        $uploading['types']['courseResources']['backends'] = $backends;
        $setting->value = $uploading;
        $setting->save();
    }

    public function down(): void
    {
    }
};
