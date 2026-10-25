<?php

namespace App\Demo\Console;

use App\Core\Modules;
use App\Demo\CreateDemoAgents;
use App\Demo\CreateDemoAttachments;
use App\Demo\CreateDemoCampaigns;
use App\Demo\CreateDemoCannedReplies;
use App\Demo\CreateDemoConversations;
use App\Demo\CreateDemoCustomers;
use App\Demo\CreateDemoFields;
use App\Demo\CreateDemoGroups;
use App\Demo\CreateDemoHelpCenter;
use App\Demo\CreateDemoMessages;
use App\Demo\CreateDemoPageVisits;
use App\Demo\CreateDemoSearchTerms;
use App\Demo\CreateDemoTags;
use App\Demo\CreateDemoToolsAndFlows;
use App\Demo\CreateDemoViews;
use Database\Seeders\SupportDefaultsSeeder;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Artisan;

/**
 * Seed BeDesk-style support demo data into Linket (native — same DB/app).
 */
class SeedSupportDemoData extends Command
{
    protected $signature = 'support:seed-demo {--fresh-defaults : Re-run SupportDefaultsSeeder first}';

    protected $description = 'Seed BeDesk-native support demo (HC, agents, tickets, canned replies).';

    public function handle(): int
    {
        @ini_set('memory_limit', '-1');
        @set_time_limit(0);

        $originalScoutDriver = config('scout.driver');
        config()->set('scout.driver', 'null');

        $this->info('Seeding support permissions + Agents role…');
        Artisan::call('db:seed', [
            '--class' => SupportDefaultsSeeder::class,
            '--force' => true,
        ]);

        $this->info('Demo groups…');
        (new CreateDemoGroups())->execute();

        $this->info('Demo agents…');
        (new CreateDemoAgents())->execute();

        $this->info('Demo canned replies…');
        (new CreateDemoCannedReplies())->execute();

        $this->info('Demo customers…');
        (new CreateDemoCustomers())->execute();

        $this->info('Demo help center…');
        (new CreateDemoHelpCenter())->execute();

        $this->info('Demo page visits…');
        (new CreateDemoPageVisits())->execute();

        $this->info('Demo fields…');
        (new CreateDemoFields())->execute();

        $this->info('Demo views…');
        (new CreateDemoViews())->execute();

        $this->info('Demo conversations…');
        (new CreateDemoConversations())->execute();

        $this->runOptional('Demo attachments', fn () => (new CreateDemoAttachments())->execute());
        $this->runOptional('Demo messages', fn () => (new CreateDemoMessages())->execute());
        $this->runOptional('Demo tags', fn () => (new CreateDemoTags())->execute());
        $this->runOptional('Demo search terms', fn () => (new CreateDemoSearchTerms())->execute());

        if (Modules::livechatInstalled()) {
            $this->runOptional(
                'Demo LiveChat campaigns',
                fn () => (new CreateDemoCampaigns())->execute(),
            );
        }

        if (Modules::aiInstalled()) {
            $this->runOptional(
                'Demo AI tools/flows',
                fn () => (new CreateDemoToolsAndFlows())->execute(),
            );
        }

        config()->set('scout.driver', $originalScoutDriver);

        $this->info('Support demo seed complete.');

        return self::SUCCESS;
    }

    protected function runOptional(string $label, callable $callback): void
    {
        $this->info($label.'…');
        try {
            $callback();
        } catch (\Throwable $e) {
            $this->warn("Skipped {$label}: ".$e->getMessage());
            report($e);
        }
    }
}
