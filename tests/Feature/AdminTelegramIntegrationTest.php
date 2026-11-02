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
    }

    public function test_non_admin_cannot_read_or_operate_telegram_integration(): void
    {
        $this->stateful()->actingAs(User::factory()->create(), 'sanctum');

        $this->getJson('/api/v1/admin/integrations/telegram')->assertForbidden();
        $this->postJson('/api/v1/admin/integrations/telegram/webhook/sync')->assertForbidden();
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
