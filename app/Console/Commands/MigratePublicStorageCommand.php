<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;

class MigratePublicStorageCommand extends Command
{
    protected $signature = 'media:migrate-public-storage {--dry-run : Show what would be moved without moving}';
    protected $description = 'Migrate legacy public media from public/storage to shared storage/app/public (idempotent)';

    public function handle(): int
    {
        $legacyRoot = public_path('storage');
        $canonicalRoot = storage_path('app/public');

        $this->info("Legacy root: $legacyRoot");
        $this->info("Canonical root: $canonicalRoot");

        if (!is_dir($legacyRoot) && !is_link($legacyRoot)) {
            $this->info('Legacy public/storage does not exist — nothing to migrate.');
            return self::SUCCESS;
        }

        if (is_link($legacyRoot)) {
            $target = readlink($legacyRoot);
            $this->info("public/storage is already symlink -> $target — skipping migration, verifying contents.");
            // ensure canonical dirs exist
            foreach (['avatars', 'link-images', 'branding-images', 'article-images'] as $sub) {
                File::ensureDirectoryExists("$canonicalRoot/$sub");
            }
            return self::SUCCESS;
        }

        // Legacy is real directory — migrate each sub
        $subdirs = ['avatars', 'link-images', 'branding-images', 'article-images'];
        $totalMigrated = 0;
        $totalSkipped = 0;

        foreach ($subdirs as $sub) {
            $src = "$legacyRoot/$sub";
            $dst = "$canonicalRoot/$sub";

            if (!is_dir($src)) {
                continue;
            }

            File::ensureDirectoryExists($dst);

            $files = File::files($src);
            foreach ($files as $file) {
                $destPath = "$dst/" . $file->getFilename();
                if (File::exists($destPath)) {
                    // check if same size, skip
                    if (File::size($destPath) === File::size($file->getPathname())) {
                        $totalSkipped++;
                        continue;
                    }
                    // different file, do not overwrite — log conflict
                    $this->warn("Conflict: $destPath exists with different size — skipping {$file->getFilename()}");
                    $totalSkipped++;
                    continue;
                }

                if ($this->option('dry-run')) {
                    $this->line("Would migrate: {$file->getFilename()} -> $sub/");
                    $totalMigrated++;
                } else {
                    File::copy($file->getPathname(), $destPath);
                    $totalMigrated++;
                }
            }

            // Also handle nested directories if any
            $dirs = File::directories($src);
            foreach ($dirs as $dir) {
                $base = basename($dir);
                $dstDir = "$dst/$base";
                File::ensureDirectoryExists($dstDir);
                foreach (File::allFiles($dir) as $file) {
                    $rel = str_replace($dir, '', $file->getPath());
                    $destPath = $dstDir . ($rel ? "/$rel" : '') . '/' . $file->getFilename();
                    File::ensureDirectoryExists(dirname($destPath));
                    if (File::exists($destPath)) {
                        $totalSkipped++;
                        continue;
                    }
                    if (!$this->option('dry-run')) {
                        File::copy($file->getPathname(), $destPath);
                    }
                    $totalMigrated++;
                }
            }
        }

        // Handle top-level files (rare)
        foreach (File::files($legacyRoot) as $file) {
            $name = $file->getFilename();
            if (in_array($name, ['.gitignore', '.htaccess'], true)) {
                continue;
            }
            $destPath = "$canonicalRoot/$name";
            if (!File::exists($destPath)) {
                if (!$this->option('dry-run')) {
                    File::copy($file->getPathname(), $destPath);
                }
                $totalMigrated++;
            } else {
                $totalSkipped++;
            }
        }

        $this->info("Migration complete: $totalMigrated migrated, $totalSkipped skipped (dry-run: " . ($this->option('dry-run') ? 'yes' : 'no') . ')');

        if (!$this->option('dry-run')) {
            $this->info('Note: legacy public/storage directory kept for manual verification. After verifying canonical files, you may replace it with symlink:');
            $this->line("  rm -rf public/storage && ln -sfn " . storage_path('app/public') . " public/storage");
        }

        return self::SUCCESS;
    }
}
