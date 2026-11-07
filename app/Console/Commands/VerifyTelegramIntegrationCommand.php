<?php

namespace App\Console\Commands;

use App\Telegram\Models\TelegramConnection;
use App\Telegram\Support\TelegramSettings;
use Illuminate\Console\Command;

final class VerifyTelegramIntegrationCommand extends Command
{
    protected $signature = 'linket:verify-telegram';

    protected $description = 'Report Telegram integration readiness (secret-free; use scripts/verify-telegram-integration.sh to run automated tests)';

    public function handle(): int
    {
        $this->printReadiness();

        return self::SUCCESS;
    }

    private function printReadiness(): void
    {
        $enabled = TelegramSettings::isOperational();
        $tokenConfigured = filled(TelegramSettings::get('token'));
        $secretConfigured = filled(TelegramSettings::get('webhook_secret'));
        $botUsername = ltrim((string) TelegramSettings::get('bot_username'), '@');
        $botUsernameConfigured = $botUsername !== '';
        $ready = $enabled;

        $this->table(
            ['Check', 'Status'],
            [
                ['Telegram enabled', $enabled ? 'yes' : 'no'],
                ['Bot token configured', $tokenConfigured ? 'yes' : 'no'],
                ['Webhook secret configured', $secretConfigured ? 'yes' : 'no'],
                ['Bot username', $botUsernameConfigured ? '@'.$botUsername : '—'],
                ['Creator connections', (string) TelegramConnection::query()->count()],
                [
                    'Notifications enabled (creators)',
                    (string) TelegramConnection::query()->where('notifications_enabled', true)->count(),
                ],
                ['Ready for creator linking', $ready ? 'yes' : 'no'],
                ['Webhook URL', url('integrations/telegram/webhook')],
            ],
        );

        if (! $ready) {
            $this->newLine();
            $this->warn(
                'Telegram is not fully configured. Creators will see “Unavailable” until enabled, token, secret, and bot username are set.',
            );
            $this->line('Automated synthetic tests do not require live credentials:');
            $this->line('  ./scripts/verify-telegram-integration.sh');
            $this->line('  composer test:telegram && npm run test:telegram');
        }
    }
}
