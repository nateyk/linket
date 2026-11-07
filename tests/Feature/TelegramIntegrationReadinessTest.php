<?php

namespace Tests\Feature;

use App\Models\User;
use App\Telegram\Models\TelegramLinkToken;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class TelegramIntegrationReadinessTest extends TestCase
{
    use DatabaseTransactions;

    public function test_saved_bot_credentials_make_telegram_available_when_the_enabled_flag_is_off(): void
    {
        config()->set('services.telegram.enabled', false);
        config()->set('services.telegram.token', null);
        config()->set('services.telegram.bot_username', null);
        config()->set('services.telegram.webhook_secret', null);

        \App\Telegram\Support\TelegramSettings::update([
            'enabled' => false,
            'token' => '123456:synthetic_saved_token',
            'bot_username' => 'linketnotifybot',
            'webhook_secret' => 'synthetic_saved_secret',
        ]);

        $user = User::factory()->create(['email_verified_at' => now()]);

        $this->stateful()
            ->actingAs($user)
            ->getJson('/api/v1/integrations/telegram')
            ->assertOk()
            ->assertJsonPath('telegram.enabled', true)
            ->assertJsonPath('telegram.connected', false)
            ->assertJsonPath('telegram.bot_username', 'linketnotifybot');

        $connect = $this->stateful()
            ->actingAs($user)
            ->postJson('/api/v1/integrations/telegram/connect')
            ->assertCreated();

        $this->assertStringStartsWith(
            'https://t.me/linketnotifybot?start=',
            (string) $connect->json('telegram.connect_url'),
        );
    }

    public function test_unconfigured_telegram_reports_unavailable_to_creators(): void
    {
        config()->set('services.telegram.enabled', false);
        config()->set('services.telegram.token', null);
        config()->set('services.telegram.bot_username', null);
        config()->set('services.telegram.webhook_secret', null);

        $user = User::factory()->create(['email_verified_at' => now()]);

        $this->stateful()
            ->actingAs($user)
            ->getJson('/api/v1/integrations/telegram')
            ->assertOk()
            ->assertJsonPath('telegram.enabled', false)
            ->assertJsonPath('telegram.connected', false);

        $this->stateful()
            ->actingAs($user)
            ->postJson('/api/v1/integrations/telegram/connect')
            ->assertStatus(503);
    }

    public function test_synthetic_end_to_end_creator_linking_flow(): void
    {
        \Illuminate\Support\Facades\Notification::fake();

        config()->set('services.telegram.enabled', true);
        config()->set('services.telegram.token', '100000:SyntheticTokenForAutomatedTests');
        config()->set('services.telegram.bot_username', 'LinketSyntheticBot');
        config()->set('services.telegram.webhook_secret', 'synthetic-webhook-secret');

        $user = User::factory()->create(['email_verified_at' => now()]);

        $connect = $this->stateful()
            ->actingAs($user)
            ->postJson('/api/v1/integrations/telegram/connect')
            ->assertCreated();

        $url = (string) $connect->json('telegram.connect_url');
        $this->assertStringStartsWith('https://t.me/LinketSyntheticBot?start=', $url);

        parse_str((string) parse_url($url, PHP_URL_QUERY), $query);
        $plainToken = (string) ($query['start'] ?? '');
        $this->assertNotSame('', $plainToken);

        $this->withHeader(
            'X-Telegram-Bot-Api-Secret-Token',
            'synthetic-webhook-secret',
        )->postJson('/integrations/telegram/webhook', [
            'update_id' => 990_001,
            'message' => [
                'text' => '/start '.$plainToken,
                'from' => [
                    'id' => 9_876_543_210,
                    'username' => 'synthetic_link_user',
                    'language_code' => 'en',
                ],
                'chat' => [
                    'id' => 9_876_543_210,
                    'type' => 'private',
                ],
            ],
        ])->assertNoContent();

        $this->stateful()
            ->actingAs($user)
            ->getJson('/api/v1/integrations/telegram')
            ->assertOk()
            ->assertJsonPath('telegram.enabled', true)
            ->assertJsonPath('telegram.connected', true)
            ->assertJsonPath('telegram.username', 'synthetic_link_user');

        $this->assertDatabaseHas('telegram_connections', [
            'user_id' => $user->id,
            'telegram_user_id' => 9_876_543_210,
        ]);
        $this->assertNotNull(
            TelegramLinkToken::query()
                ->where('user_id', $user->id)
                ->value('consumed_at'),
        );
    }

    public function test_user_start_on_t_me_kpc127_deep_link_connects_that_chat(): void
    {
        \Illuminate\Support\Facades\Notification::fake();

        config()->set('services.telegram.enabled', true);
        config()->set('services.telegram.token', '100000:SyntheticTokenForAutomatedTests');
        config()->set('services.telegram.bot_username', 'Kpc127');
        config()->set('services.telegram.webhook_secret', 'synthetic-webhook-secret');

        $user = User::factory()->create(['email_verified_at' => now()]);

        $connect = $this->stateful()
            ->actingAs($user)
            ->postJson('/api/v1/integrations/telegram/connect')
            ->assertCreated();

        $url = (string) $connect->json('telegram.connect_url');
        $this->assertStringStartsWith('https://t.me/Kpc127?start=', $url);

        parse_str((string) parse_url($url, PHP_URL_QUERY), $query);
        $plainToken = (string) ($query['start'] ?? '');
        $this->assertMatchesRegularExpression('/^[A-Za-z0-9_-]{20,64}$/', $plainToken);

        $webhook = fn (int $updateId, string $text) => $this->withHeader(
            'X-Telegram-Bot-Api-Secret-Token',
            'synthetic-webhook-secret',
        )->postJson('/integrations/telegram/webhook', [
            'update_id' => $updateId,
            'message' => [
                'text' => $text,
                'from' => [
                    'id' => 512_127_001,
                    'username' => 'Kpc127',
                    'language_code' => 'en',
                ],
                'chat' => [
                    'id' => 512_127_001,
                    'type' => 'private',
                ],
            ],
        ]);

        // Opening https://t.me/Kpc127 with no Linket token must not link an account.
        $webhook(990_127, '/start')->assertNoContent();
        $webhook(990_128, '/start https://t.me/Kpc127')->assertNoContent();

        $this->assertDatabaseMissing('telegram_connections', [
            'user_id' => $user->id,
        ]);

        // Pressing Start on https://t.me/Kpc127?start=<token> arrives as /start <token>.
        $webhook(990_129, '/start '.$plainToken)->assertNoContent();
        $webhook(990_130, '/start@Kpc127 '.$plainToken)->assertNoContent();

        $this->stateful()
            ->actingAs($user)
            ->getJson('/api/v1/integrations/telegram')
            ->assertOk()
            ->assertJsonPath('telegram.connected', true)
            ->assertJsonPath('telegram.username', 'Kpc127')
            ->assertJsonPath('telegram.bot_username', 'Kpc127');

        $this->assertSame(
            1,
            TelegramLinkToken::query()->where('user_id', $user->id)->whereNotNull('consumed_at')->count(),
        );
    }

    public function test_verify_telegram_command_reports_safe_readiness_without_secrets(): void
    {
        config()->set('services.telegram.enabled', true);
        config()->set('services.telegram.token', '100000:HiddenTokenValue');
        config()->set('services.telegram.bot_username', 'LinketSyntheticBot');
        config()->set('services.telegram.webhook_secret', 'hidden-webhook-secret');

        $this->artisan('linket:verify-telegram')
            ->expectsTable(
                ['Check', 'Status'],
                [
                    ['Telegram enabled', 'yes'],
                    ['Bot token configured', 'yes'],
                    ['Webhook secret configured', 'yes'],
                    ['Bot username', '@LinketSyntheticBot'],
                    ['Creator connections', '0'],
                    ['Notifications enabled (creators)', '0'],
                    ['Ready for creator linking', 'yes'],
                    ['Webhook URL', url('integrations/telegram/webhook')],
                ],
            )
            ->doesntExpectOutputToContain('HiddenTokenValue')
            ->doesntExpectOutputToContain('hidden-webhook-secret')
            ->assertSuccessful();
    }

    private function stateful(): static
    {
        return $this
            ->withSession(['_token' => 'test-csrf-token'])
            ->withHeader('Referer', config('app.url'))
            ->withHeader('X-CSRF-TOKEN', 'test-csrf-token');
    }
}
