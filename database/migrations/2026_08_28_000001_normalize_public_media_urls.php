<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Normalize users.image: storage/... -> /storage/...
        // Only touch rows that look like local storage paths, not http/https/blob/data
        $users = DB::table('users')
            ->where('image', 'like', 'storage/%')
            ->where('image', 'not like', 'http%')
            ->get(['id', 'image']);

        foreach ($users as $user) {
            $normalized = '/' . ltrim($user->image, '/');
            if ($normalized !== $user->image) {
                DB::table('users')->where('id', $user->id)->update(['image' => $normalized]);
            }
        }

        // Normalize biolinks/stores profile_config avatar_url/cover_url
        foreach (['biolinks', 'stores'] as $table) {
            if (!Schema::hasTable($table)) {
                continue;
            }
            if (!Schema::hasColumn($table, 'profile_config')) {
                continue;
            }

            DB::table($table)
                ->whereNotNull('profile_config')
                ->orderBy('id')
                ->chunkById(200, function ($rows) use ($table) {
                    foreach ($rows as $row) {
                        $config = json_decode($row->profile_config, true);
                        if (!is_array($config)) {
                            continue;
                        }

                        $changed = false;
                        foreach (['avatar_url', 'cover_url'] as $key) {
                            if (!isset($config[$key]) || !is_string($config[$key])) {
                                continue;
                            }
                            $value = trim($config[$key]);
                            if ($value === '') {
                                continue;
                            }
                            $lower = strtolower($value);
                            if (str_starts_with($lower, 'http://') || str_starts_with($lower, 'https://') || str_starts_with($lower, '//')) {
                                continue;
                            }
                            if (str_starts_with($lower, 'blob:') || str_starts_with($lower, 'data:')) {
                                $config[$key] = '';
                                $changed = true;
                                continue;
                            }
                            $ltrim = ltrim($value, '/');
                            if (str_starts_with($ltrim, 'storage/')) {
                                $normalized = '/' . $ltrim;
                                if ($normalized !== $value) {
                                    $config[$key] = $normalized;
                                    $changed = true;
                                }
                            }
                        }

                        if ($changed) {
                            DB::table($table)
                                ->where('id', $row->id)
                                ->update(['profile_config' => json_encode($config)]);
                        }
                    }
                });
        }
    }

    public function down(): void
    {
        // No down migration — normalization is idempotent and safe to keep
    }
};
