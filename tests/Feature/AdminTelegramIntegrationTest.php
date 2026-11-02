<?php

namespace Tests\Feature;

use App\Models\User;
use Common\Permissions\Models\Permission;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class AdminTelegramIntegrationTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();

        config()->set('app.installed', true);
        config()->set('services.telegram.enabled', true);
        config()->set('services.telegram.token', 'synthetic-bot-token');
        config()->set('services.telegram.bot_username', 'LinketTestBot');
        config()->set('services.telegram.webhook_secret', 'synthetic-webhook-secret');
        config()->set('services.telegram.link_token_ttl_minutes', 10);
        config()->set('services.telegram.http.timeout', 10);
        config()->set('services.telegram.http.connect_timeout', 5);
        \Illuminate\Support\Facades\URL::forceScheme('https');
    }

    public function test_non_admin_cannot_read_or_operate_telegram_integration(): void
    {
        $this->stateful()->actingAs(User::factory()->create(), 'sanctum');

        $this->getJson('/api/v1/admin/integrations/telegram')->assertForbidden();
        $this->postJson('/api/v1/admin/integrations/telegram/webhook/sync')->assertForbidden();
        $this->getJson('/api/v1/admin/integrations/telegram/health')->assertForbidden();
        $this->postJson('/api/v1/admin/integrations/telegram/test')->assertForbidden();
    }

    public function test_admin_health_payload_never_discloses_environment_secrets(): void
    {
        $this->stateful()->actingAs($this->admin(), 'sanctum');

        $this->getJson('/api/v1/admin/integrations/telegram')
            ->assertOk()
            ->assertJsonPath('telegram.enabled', true)
            ->assertJsonPath('telegram.bot_token_configured', true)
            ->assertJsonPath('telegram.webhook_secret_configured', true)
            ->assertJsonPath('telegram.bot_username', 'LinketTestBot')
            ->assertJsonPath('telegram.webhook_url', url('integrations/telegram/webhook'))
            ->assertJsonMissingPath('telegram.bot_token')
            ->assertJsonMissingPath('telegram.webhook_secret');

        $body = json_encode(
            $this->getJson('/api/v1/admin/integrations/telegram')->json(),
            JSON_THROW_ON_ERROR,
        );

        $this->assertStringNotContainsString('synthetic-bot-token', $body);
        $this->assertStringNotContainsString('synthetic-webhook-secret', $body);
    }

    public function test_admin_webhook_sync_uses_environment_secret_but_returns_only_safe_status(): void
    {
        Http::fake([
            'https://api.telegram.org/botsynthetic-bot-token/setWebhook' => Http::response([
                'ok' => true,
                'result' => true,
                'description' => 'Webhook was set',
            ]),
            'https://api.telegram.org/botsynthetic-bot-token/getWebhookInfo' => Http::response([
                'ok' => true,
                'result' => [
                    'url' => url('integrations/telegram/webhook'),
                    'has_custom_certificate' => false,
                    'pending_update_count' => 0,
                    'allowed_updates' => ['message'],
                ],
            ]),
        ]);

        $this->stateful()->actingAs($this->admin(), 'sanctum');

        $response = $this->postJson('/api/v1/admin/integrations/telegram/webhook/sync')
            ->assertOk()
            ->assertJsonPath('telegram.webhook.url', url('integrations/telegram/webhook'))
            ->assertJsonPath('telegram.webhook.pending_update_count', 0)
            ->assertJsonPath('telegram.webhook.allowed_updates.0', 'message')
            ->assertJsonMissingPath('telegram.bot_token')
            ->assertJsonMissingPath('telegram.webhook_secret');

        Http::assertSent(function ($request): bool {
            if (! str_ends_with($request->url(), '/setWebhook')) {
                return false;
            }

            $data = $request->data();

            return $data['url'] === url('integrations/telegram/webhook')
                && $data['secret_token'] === 'synthetic-webhook-secret'
                && $data['allowed_updates'] === ['message'];
        });

        $body = json_encode($response->json(), JSON_THROW_ON_ERROR);
        $this->assertStringNotContainsString('synthetic-bot-token', $body);
        $this->assertStringNotContainsString('synthetic-webhook-secret', $body);
    }

    public function test_test_notification_requires_admin_telegram_connection(): void
    {
        Notification::fake();
        $admin = $this->admin();
        $this->stateful()->actingAs($admin, 'sanctum');

        $this->postJson('/api/v1/admin/integrations/telegram/test')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['telegram']);

        Notification::assertNothingSent();
    }

    public function test_admin_test_notification_targets_connected_chat_even_when_creator_notifications_are_muted(): void
    {
        Notification::fake();

        $admin = $this->admin();
        $admin->telegramConnection()->create([
            'telegram_user_id' => 1234567890999,
            'telegram_chat_id' => 1234567890999,
            'telegram_username' => 'admin_test',
            'language_code' => 'en',
            'connected_at' => now(),
            'notifications_enabled' => false,
        ]);

        $message = (new \App\Telegram\Notifications\TelegramIntegrationTestNotification())
            ->toTelegram($admin);

        $this->assertSame(
            1234567890999,
            $message->getPayloadValue('chat_id'),
        );

        $this->stateful()->actingAs($admin, 'sanctum');

        $this->postJson('/api/v1/admin/integrations/telegram/test')
            ->assertOk()
            ->assertJsonPath('telegram.test_sent', true);

        Notification::assertSentTo(
            $admin,
            \App\Telegram\Notifications\TelegramIntegrationTestNotification::class,
        );
    }


    public function test_read_only_health_detects_mismatched_bot_and_webhook_without_changing_telegram(): void
    {
        Http::fake([
            'https://api.telegram.org/botsynthetic-bot-token/getMe' => Http::response([
                'ok' => true,
                'result' => ['id' => 12345, 'username' => 'UnexpectedBot'],
            ]),
            'https://api.telegram.org/botsynthetic-bot-token/getWebhookInfo' => Http::response([
                'ok' => true,
                'result' => [
                    'url' => 'https://other.example.test/telegram',
                    'pending_update_count' => 4,
                    'allowed_updates' => ['message'],
                    'last_error_date' => 1720000000,
                    'last_error_message' => 'sensitive provider detail',
                    'max_connections' => 20,
                ],
            ]),
        ]);

        $this->stateful()->actingAs($this->admin(), 'sanctum');

        $response = $this->getJson('/api/v1/admin/integrations/telegram/health')
            ->assertOk()
            ->assertJsonPath('telegram.status', 'degraded')
            ->assertJsonPath('telegram.bot.identity_matches', false)
            ->assertJsonPath('telegram.bot.username', 'UnexpectedBot')
            ->assertJsonPath('telegram.webhook.url_matches', false)
            ->assertJsonPath('telegram.webhook.pending_update_count', 4)
            ->assertJsonMissingPath('telegram.webhook.last_error_message');

        Http::assertSentCount(2);
        Http::assertNotSent(fn ($request): bool => str_ends_with($request->url(), '/setWebhook'));
        $json = $response->getContent();
        $this->assertStringNotContainsString('synthetic-bot-token', $json);
        $this->assertStringNotContainsString('synthetic-webhook-secret', $json);
        $this->assertStringNotContainsString('sensitive provider detail', $json);
    }

    public function test_webhook_sync_rejects_invalid_secret_before_network_call(): void
    {
        config()->set('services.telegram.webhook_secret', 'invalid secret with spaces');
        Http::fake();
        $this->stateful()->actingAs($this->admin(), 'sanctum');

        $this->postJson('/api/v1/admin/integrations/telegram/webhook/sync')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['telegram']);

        Http::assertNothingSent();
    }


    public function test_authorized_admin_can_save_encrypted_write_only_telegram_configuration(): void
    {
        $this->stateful()->actingAs($this->admin(), 'sanctum');
        $this->patchJson('/api/v1/admin/integrations/telegram', [
            'enabled' => true,
            'bot_username' => 'SavedTestBot',
            'token' => '123456:synthetic_saved_token',
            'webhook_secret' => 'synthetic_saved_secret',
        ])->assertOk()
            ->assertJsonPath('telegram.ready', true)
            ->assertJsonPath('telegram.bot_username', 'SavedTestBot')
            ->assertJsonMissingPath('telegram.token')
            ->assertJsonMissingPath('telegram.webhook_secret');

        $raw = \DB::table('telegram_integration_settings')->where('id', 1)->value('encrypted_config');
        $this->assertIsString($raw);
        $this->assertStringNotContainsString('synthetic_saved_token', $raw);
        $this->assertStringNotContainsString('synthetic_saved_secret', $raw);
        $settings = new \Common\Settings\Settings();
        $this->assertArrayNotHasKey('integrations.telegram', $settings->all());
        $this->assertArrayNotHasKey('telegram', $settings->getAllForFrontendForm()['integrations'] ?? []);
        $this->assertSame('123456:synthetic_saved_token', app(\NotificationChannels\Telegram\Telegram::class)->getToken());

        $this->postJson('/integrations/telegram/webhook', ['update_id' => 998811])
            ->assertUnauthorized();
        $this->withHeader('X-Telegram-Bot-Api-Secret-Token', 'synthetic_saved_secret')
            ->postJson('/integrations/telegram/webhook', ['update_id' => 998812])->assertNoContent();

        $this->patchJson('/api/v1/admin/integrations/telegram', [
            'enabled' => false, 'token' => '', 'webhook_secret' => '',
        ])->assertOk()->assertJsonPath('telegram.enabled', false)
            ->assertJsonPath('telegram.bot_token_configured', true);
        $saved = \App\Telegram\Support\TelegramSettings::stored();
        $this->assertSame('123456:synthetic_saved_token', $saved['token']);
        $this->assertSame('synthetic_saved_secret', $saved['webhook_secret']);
    }

    public function test_telegram_configuration_requires_both_admin_permissions(): void
    {
        $this->stateful()->actingAs(User::factory()->create(), 'sanctum')
            ->patchJson('/api/v1/admin/integrations/telegram', ['enabled' => false])
            ->assertForbidden();

        $adminWithoutSettings = User::factory()->create();
        $adminWithoutSettings->permissions()->attach(
            Permission::query()->firstOrCreate(['name' => 'admin.access']),
        );
        $this->stateful()->actingAs($adminWithoutSettings, 'sanctum')
            ->patchJson('/api/v1/admin/integrations/telegram', ['enabled' => false])
            ->assertForbidden();
    }

    public function test_telegram_settings_validate_secret_and_require_complete_configuration_before_enabling(): void
    {
        config()->set('services.telegram.token', null);
        config()->set('services.telegram.bot_username', null);
        config()->set('services.telegram.webhook_secret', null);
        $this->stateful()->actingAs($this->admin(), 'sanctum');
        $this->patchJson('/api/v1/admin/integrations/telegram', ['enabled' => true])
            ->assertUnprocessable()->assertJsonValidationErrors(['token', 'bot_username', 'webhook_secret']);
        $this->patchJson('/api/v1/admin/integrations/telegram', ['webhook_secret' => 'invalid secret'])
            ->assertUnprocessable()->assertJsonValidationErrors(['webhook_secret']);
    }

    private function admin(): User
    {
        $user = User::factory()->create();

        foreach (['admin.access', 'settings.update'] as $permission) {
            $user->permissions()->attach(
                Permission::query()->firstOrCreate(['name' => $permission]),
            );
        }

        return $user;
    }

    private function stateful(): static
    {
        return $this->withSession(['_token' => 'telegram-admin-settings'])
            ->withHeader('Referer', config('app.url'))
            ->withHeader('X-CSRF-TOKEN', 'telegram-admin-settings');
    }
}
