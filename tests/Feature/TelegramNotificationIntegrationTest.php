<?php

namespace Tests\Feature;

use App\CreatorServices\Notifications\NewServiceInquiryNotification;
use App\Models\User;
use App\Storefront\Notifications\VerifiedSaleNotification;
use App\Telegram\Models\TelegramLinkToken;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class TelegramNotificationIntegrationTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();

        config()->set('services.telegram.enabled', true);
        config()->set('services.telegram.token', 'synthetic-bot-token');
        config()->set('services.telegram.bot_username', 'LinketTestBot');
        config()->set('services.telegram.webhook_secret', 'synthetic-webhook-secret');
        config()->set('services.telegram.link_token_ttl_minutes', 10);
    }

    public function test_creator_can_generate_one_time_hashed_connection_token(): void
    {
        $user = User::factory()->create(['email_verified_at' => now()]);

        $response = $this->stateful()
            ->actingAs($user)
            ->postJson('/api/v1/integrations/telegram/connect')
            ->assertCreated();

        $url = $response->json('telegram.connect_url');
        $this->assertStringStartsWith('https://t.me/LinketTestBot?start=', $url);

        parse_str((string) parse_url($url, PHP_URL_QUERY), $query);
        $plainToken = (string) ($query['start'] ?? '');

        $this->assertNotSame('', $plainToken);
        $this->assertDatabaseHas('telegram_link_tokens', [
            'user_id' => $user->id,
            'token_hash' => hash('sha256', $plainToken),
            'consumed_at' => null,
        ]);
        $this->assertDatabaseMissing('telegram_link_tokens', [
            'token_hash' => $plainToken,
        ]);
    }

    public function test_valid_private_start_update_links_creator_once(): void
    {
        \Illuminate\Support\Facades\Notification::fake();
        $user = User::factory()->create(['email_verified_at' => now()]);
        $plainToken = 'SyntheticTelegramLinkToken1234567890';

        TelegramLinkToken::query()->create([
            'user_id' => $user->id,
            'token_hash' => hash('sha256', $plainToken),
            'expires_at' => now()->addMinutes(10),
        ]);

        $payload = [
            'update_id' => 900001,
            'message' => [
                'text' => '/start '.$plainToken,
                'from' => [
                    'id' => 1234567890123,
                    'username' => 'synthetic_creator',
                    'language_code' => 'en',
                ],
                'chat' => [
                    'id' => 1234567890123,
                    'type' => 'private',
                ],
            ],
        ];

        $this->withHeader(
            'X-Telegram-Bot-Api-Secret-Token',
            'synthetic-webhook-secret',
        )->postJson('/integrations/telegram/webhook', $payload)->assertNoContent();

        $this->assertDatabaseHas('telegram_connections', [
            'user_id' => $user->id,
            'telegram_user_id' => 1234567890123,
            'telegram_chat_id' => 1234567890123,
            'telegram_username' => 'synthetic_creator',
        ]);
        $this->assertNotNull(
            TelegramLinkToken::query()
                ->where('user_id', $user->id)
                ->value('consumed_at'),
        );

        $this->withHeader(
            'X-Telegram-Bot-Api-Secret-Token',
            'synthetic-webhook-secret',
        )->postJson('/integrations/telegram/webhook', $payload)->assertNoContent();

        \Illuminate\Support\Facades\Notification::assertSentToTimes(
            $user,
            \App\Telegram\Notifications\TelegramConnectedNotification::class,
            1,
        );
        \Illuminate\Support\Facades\Notification::assertSentTo(
            $user,
            \App\Telegram\Notifications\TelegramConnectedNotification::class,
            function ($notification) use ($user, $plainToken): bool {
                $message = $notification->toTelegram($user);
                $this->assertSame(1234567890123, $message->getPayloadValue('chat_id'));
                $body = json_encode($message->toArray(), JSON_THROW_ON_ERROR);
                $this->assertStringNotContainsString($plainToken, $body);

                return true;
            },
        );

        $this->assertSame(1, \DB::table('telegram_webhook_updates')->count());
        $this->assertSame(1, \DB::table('telegram_connections')->count());

        $channels = (new VerifiedSaleNotification(1))->via($user->fresh());
        $this->assertSame(['telegram'], $channels);
    }

    public function test_webhook_rejects_wrong_secret_before_storing_update(): void
    {
        $this->withHeader(
            'X-Telegram-Bot-Api-Secret-Token',
            'wrong-secret',
        )->postJson('/integrations/telegram/webhook', [
            'update_id' => 900002,
        ])->assertUnauthorized();

        $this->assertDatabaseMissing('telegram_webhook_updates', [
            'update_id' => 900002,
        ]);
    }

    public function test_group_chat_cannot_link_a_creator_account(): void
    {
        $user = User::factory()->create(['email_verified_at' => now()]);
        $plainToken = 'SyntheticTelegramGroupToken1234567890';

        TelegramLinkToken::query()->create([
            'user_id' => $user->id,
            'token_hash' => hash('sha256', $plainToken),
            'expires_at' => now()->addMinutes(10),
        ]);

        $this->withHeader(
            'X-Telegram-Bot-Api-Secret-Token',
            'synthetic-webhook-secret',
        )->postJson('/integrations/telegram/webhook', [
            'update_id' => 900003,
            'message' => [
                'text' => '/start '.$plainToken,
                'from' => ['id' => 1234567890123],
                'chat' => ['id' => -1001234567890, 'type' => 'supergroup'],
            ],
        ])->assertNoContent();

        $this->assertDatabaseMissing('telegram_connections', [
            'user_id' => $user->id,
        ]);
        $this->assertNull(
            TelegramLinkToken::query()
                ->where('user_id', $user->id)
                ->value('consumed_at'),
        );
    }

    public function test_disconnected_creator_does_not_receive_telegram_channel(): void
    {
        $user = User::factory()->create(['email_verified_at' => now()]);

        $channels = (new VerifiedSaleNotification(1))->via($user);

        $this->assertSame([], $channels);
    }

    public function test_creator_settings_expose_default_notification_preferences_without_secrets(): void
    {
        $user = User::factory()->create(['email_verified_at' => now()]);
        $user->telegramConnection()->create([
            'telegram_user_id' => 1234567890123,
            'telegram_chat_id' => 1234567890123,
            'telegram_username' => 'creator_test',
            'language_code' => 'en',
            'connected_at' => now(),
            'last_seen_at' => now(),
        ]);

        $this->stateful()
            ->actingAs($user)
            ->getJson('/api/v1/integrations/telegram')
            ->assertOk()
            ->assertJsonPath('telegram.connected', true)
            ->assertJsonPath('telegram.notifications_enabled', true)
            ->assertJsonPath('telegram.preferences.verified_sales', true)
            ->assertJsonPath('telegram.preferences.service_inquiries', true)
            ->assertJsonPath('telegram.preferences.product_moderation', true)
            ->assertJsonPath('telegram.preferences.payment_disputes', true)
            ->assertJsonPath('telegram.preferences.pro_billing', true)
            ->assertJsonMissingPath('telegram.bot_token')
            ->assertJsonMissingPath('telegram.webhook_secret');
    }

    public function test_creator_can_update_telegram_notification_preferences(): void
    {
        $user = User::factory()->create(['email_verified_at' => now()]);
        $user->telegramConnection()->create([
            'telegram_user_id' => 1234567890124,
            'telegram_chat_id' => 1234567890124,
            'telegram_username' => 'creator_preferences',
            'language_code' => 'en',
            'connected_at' => now(),
        ]);

        $this->stateful()
            ->actingAs($user)
            ->patchJson('/api/v1/integrations/telegram', [
                'notifications_enabled' => false,
                'preferences' => [
                    'verified_sales' => false,
                    'service_inquiries' => true,
                    'product_moderation' => false,
                    'payment_disputes' => true,
                    'pro_billing' => false,
                ],
            ])
            ->assertOk()
            ->assertJsonPath('telegram.notifications_enabled', false)
            ->assertJsonPath('telegram.preferences.verified_sales', false)
            ->assertJsonPath('telegram.preferences.service_inquiries', true);

        $connection = $user->fresh()->telegramConnection;
        $this->assertFalse($connection->notifications_enabled);
        $this->assertFalse($connection->notification_preferences['verified_sales']);
        $this->assertTrue($connection->notification_preferences['service_inquiries']);
    }

    public function test_global_mute_removes_telegram_from_notification_routing(): void
    {
        $user = User::factory()->create(['email_verified_at' => now()]);
        $user->telegramConnection()->create([
            'telegram_user_id' => 1234567890125,
            'telegram_chat_id' => 1234567890125,
            'telegram_username' => 'muted_creator',
            'language_code' => 'en',
            'connected_at' => now(),
            'notifications_enabled' => false,
        ]);

        $channels = (new VerifiedSaleNotification(1))->via($user->fresh());

        $this->assertSame([], $channels);
    }

    public function test_event_preferences_mute_only_the_selected_telegram_event(): void
    {
        $user = User::factory()->create(['email_verified_at' => now()]);
        $user->telegramConnection()->create([
            'telegram_user_id' => 1234567890126,
            'telegram_chat_id' => 1234567890126,
            'telegram_username' => 'selective_creator',
            'language_code' => 'en',
            'connected_at' => now(),
            'notifications_enabled' => true,
            'notification_preferences' => [
                'verified_sales' => false,
                'service_inquiries' => true,
                'product_moderation' => true,
                'payment_disputes' => true,
                'pro_billing' => true,
            ],
        ]);

        $this->assertSame(
            [],
            (new VerifiedSaleNotification(1))->via($user->fresh()),
        );
        $this->assertSame(
            ['mail', 'database', 'telegram'],
            (new NewServiceInquiryNotification(1))->via($user->fresh()),
        );
    }

    public function test_pruning_only_removes_telegram_records_older_than_thirty_days(): void
    {
        $user = User::factory()->create(['email_verified_at' => now()]);

        TelegramLinkToken::query()->create([
            'user_id' => $user->id,
            'token_hash' => hash('sha256', 'old-telegram-token'),
            'expires_at' => now()->subDays(31),
            'created_at' => now()->subDays(32),
        ]);
        TelegramLinkToken::query()->create([
            'user_id' => $user->id,
            'token_hash' => hash('sha256', 'recent-telegram-token'),
            'expires_at' => now()->addMinutes(5),
        ]);

        \DB::table('telegram_webhook_updates')->insert([
            ['update_id' => 910001, 'processed_at' => now()->subDays(31),
                'created_at' => now()->subDays(31), 'updated_at' => now()->subDays(31)],
            ['update_id' => 910002, 'processed_at' => now()->subDays(1),
                'created_at' => now()->subDay(), 'updated_at' => now()->subDay()],
        ]);

        $this->artisan('telegram:prune-records')->assertSuccessful();

        $this->assertDatabaseMissing('telegram_link_tokens', ['token_hash' => hash('sha256', 'old-telegram-token')]);
        $this->assertDatabaseHas('telegram_link_tokens', ['token_hash' => hash('sha256', 'recent-telegram-token')]);
        $this->assertDatabaseMissing('telegram_webhook_updates', ['update_id' => 910001]);
        $this->assertDatabaseHas('telegram_webhook_updates', ['update_id' => 910002]);
    }

    public function test_telegram_delivery_events_track_only_safe_connection_health(): void
    {
        $user = User::factory()->create(['email_verified_at' => now()]);
        $user->telegramConnection()->create([
            'telegram_user_id' => 1234567890123,
            'telegram_chat_id' => 1234567890123,
            'connected_at' => now(),
        ]);

        event(new \Illuminate\Notifications\Events\NotificationFailed(
            $user,
            new \App\Telegram\Notifications\TelegramIntegrationTestNotification(),
            'telegram',
            ['to' => 1234567890123, 'request' => ['text' => 'sensitive-notification-body'],
                'exception' => new \RuntimeException('sensitive-error-details')],
        ));

        $connection = $user->telegramConnection()->firstOrFail();
        $this->assertSame('attention_required', $connection->delivery_status);
        $this->assertSame(1, $connection->consecutive_failures);
        $this->assertStringNotContainsString('sensitive', json_encode($connection->toArray(), JSON_THROW_ON_ERROR));

        event(new \Illuminate\Notifications\Events\NotificationSent(
            $user,
            new \App\Telegram\Notifications\TelegramIntegrationTestNotification(),
            'telegram',
            ['ok' => true],
        ));

        $connection->refresh();
        $this->assertSame('healthy', $connection->delivery_status);
        $this->assertSame(0, $connection->consecutive_failures);
        $this->assertNotNull($connection->last_delivery_at);
    }

    public function test_connected_creator_can_request_non_financial_telegram_test(): void
    {
        \Illuminate\Support\Facades\Notification::fake();
        $user = User::factory()->create(['email_verified_at' => now()]);
        $this->stateful()->actingAs($user)
            ->postJson('/api/v1/integrations/telegram/test')->assertStatus(422);

        $user->telegramConnection()->create([
            'telegram_user_id' => 1234567890123,
            'telegram_chat_id' => 1234567890123,
            'connected_at' => now(),
        ]);
        $this->stateful()->actingAs($user)
            ->postJson('/api/v1/integrations/telegram/test')
            ->assertOk()->assertJsonPath('telegram.test_sent', true);

        \Illuminate\Support\Facades\Notification::assertSentTo(
            $user,
            \App\Telegram\Notifications\TelegramIntegrationTestNotification::class,
        );
    }

    public function test_queued_telegram_preference_is_rechecked_at_send_time(): void
    {
        $creator = User::factory()->create(['email_verified_at' => now()]);
        $connection = $creator->telegramConnection()->create([
            'telegram_user_id' => 1234567890765,
            'telegram_chat_id' => 1234567890765,
            'connected_at' => now(),
        ]);
        $notification = new \App\Storefront\Notifications\ProductModerationSummaryNotification(
            'approved',
            ['Test product'],
        );

        $this->assertContains('telegram', $notification->via($creator));
        $connection->forceFill([
            'notification_preferences' => [
                'product_moderation' => false,
            ],
        ])->save();

        $this->assertFalse($notification->shouldSend($creator->fresh(), 'telegram'));
        $this->assertTrue($notification->shouldSend($creator->fresh(), 'mail'));
    }

    private function stateful(): static
    {
        return $this
            ->withSession(['_token' => 'test-csrf-token'])
            ->withHeader('Referer', config('app.url'))
            ->withHeader('X-CSRF-TOKEN', 'test-csrf-token');
    }
}
