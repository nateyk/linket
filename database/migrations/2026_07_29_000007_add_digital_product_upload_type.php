<?php

use Common\Settings\Models\Setting;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Arr;

return new class extends Migration {
    public function up(): void
    {
        $setting = Setting::query()->firstOrNew(['name' => 'uploading']);
        $uploading = $setting->value;

        if (!is_array($uploading)) {
            return;
        }

        $backendIds = collect($uploading['backends'] ?? [])
            ->pluck('id')
            ->filter()
            ->values()
            ->all();

        if (!$backendIds) {
            return;
        }

        $currentType = Arr::get($uploading, 'types.digitalProductFiles', []);
        $uploading['types']['digitalProductFiles'] = [
            ...$currentType,
            'backends' => $currentType['backends'] ?? $backendIds,
        ];

        $setting->value = $uploading;
        $setting->save();
    }

    public function down(): void
    {
        $setting = Setting::query()->where('name', 'uploading')->first();
        $uploading = $setting?->value;

        if (!is_array($uploading)) {
            return;
        }

        unset($uploading['types']['digitalProductFiles']);
        $setting->value = $uploading;
        $setting->save();
    }
};
