<?php

namespace Tests\Feature;

use Common\Settings\Models\Setting;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class UploadBackendsBackfillTest extends TestCase
{
    use DatabaseTransactions;

    public function testBackfillAssignsLocalBackendToEveryUploadType(): void
    {
        $this->resetUploadingSettingToPreSeededState();

        $migration = require glob(
            database_path('migrations/*_backfill_upload_backends.php'),
        )[0];
        $migration->up();

        $value = Setting::query()
            ->where('name', 'uploading')
            ->firstOrFail()
            ->value;

        $localBackend = collect($value['backends'])->firstWhere(
            'type',
            'local',
        );
        $this->assertNotNull(
            $localBackend,
            'backfill did not create a local backend',
        );

        foreach (array_keys(config('filesystems.upload_types')) as $type) {
            $this->assertNotEmpty(
                $value['types'][$type]['backends'] ?? [],
                "upload type [{$type}] still has no backends after backfill",
            );
            $this->assertContains(
                $localBackend['id'],
                $value['types'][$type]['backends'],
                "upload type [{$type}] is not served by the local backend",
            );
        }
    }

    public function testSeederInvalidatesSettingsCache(): void
    {
        Cache::put(
            'settings.public',
            collect(['uploading' => ['stale' => true]]),
            now()->addDay(),
        );

        $migration = require glob(
            database_path('migrations/*_backfill_upload_backends.php'),
        )[0];
        $migration->up();

        $this->assertNull(
            Cache::get('settings.public'),
            'settings cache was not invalidated by the backfill',
        );
    }

    public function testSettingsCacheFlushMigrationClearsStaleCache(): void
    {
        Cache::put(
            'settings.public',
            collect(['uploading' => ['stale' => true]]),
            now()->addDay(),
        );

        $migration = require glob(
            database_path('migrations/*_flush_settings_cache.php'),
        )[0];
        $migration->up();

        $this->assertNull(Cache::get('settings.public'));
    }

    /**
     * Simulate an install whose "uploading" setting predates newer upload
     * types and backend assignment (the state that makes the frontend throw
     * "No backend found for upload type ...").
     */
    private function resetUploadingSettingToPreSeededState(): void
    {
        DB::table('settings')->updateOrInsert(
            ['name' => 'uploading'],
            [
                'value' => json_encode(['backends' => [], 'types' => []]),
                'private' => false,
                'updated_at' => now(),
                'created_at' => now(),
            ],
        );
    }
}
