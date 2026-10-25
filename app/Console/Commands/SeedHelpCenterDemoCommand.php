<?php

namespace App\Console\Commands;

use App\HelpCenter\Actions\SeedHelpCenterEventDemo;
use App\HelpCenter\Models\HcArticle;
use App\HelpCenter\Models\HcCategory;
use Common\Core\Install\CreateDefaultHelpCenter;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class SeedHelpCenterDemoCommand extends Command
{
    protected $signature = 'helpdesk:seed-hc-demo {--fresh : Remove existing HC categories and articles first} {--force : Skip confirmation with --fresh}';

    protected $description = 'Seed demo Help Center categories, sections, and articles (local/demo)';

    public function handle(): int
    {
        if (! app()->environment(['local', 'development', 'testing'])) {
            $this->error('This command is only available in local/dev environments.');

            return self::FAILURE;
        }

        if (! Schema::hasTable('categories') || ! Schema::hasTable('articles')) {
            $this->error('Help center tables are missing. Run migrations first.');

            return self::FAILURE;
        }

        if ($this->option('fresh')) {
            if (! $this->option('force') && ! $this->confirm('Delete ALL help center categories and articles?')) {
                return self::SUCCESS;
            }

            DB::table('category_article')->delete();
            HcArticle::query()->delete();
            HcCategory::query()->delete();
            $this->info('Cleared existing help center content.');
        }

        (new CreateDefaultHelpCenter())->execute();
        (new SeedHelpCenterEventDemo())->execute();

        $roots = HcCategory::query()->whereNull('parent_id')->count();
        $articles = HcArticle::query()->count();
        $this->info("Help center demo ready: {$roots} top-level categories, {$articles} articles.");

        return self::SUCCESS;
    }
}
