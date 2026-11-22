<?php

namespace Tests\Feature;

use App\Conversations\Agent\Notifications\Ticketing\ConversationCreatedNotif;
use App\Models\User;
use Common\Auth\Events\UserCreated;
use Common\Notifications\SubscribeUserToNotifications;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\File;
use Tests\TestCase;

class SubscribeUserToNotificationsTest extends TestCase
{
    use DatabaseTransactions;

    public function test_notification_settings_defaults_file_exists(): void
    {
        $path = resource_path('defaults/notification-settings.php');

        $this->assertTrue(File::exists($path), 'resources/defaults/notification-settings.php must exist');

        $config = File::getRequire($path);

        $this->assertIsArray($config['available_channels'] ?? null);
        $this->assertNotEmpty($config['subscriptions'] ?? []);
    }

    public function test_user_created_seeds_agent_notification_subscriptions(): void
    {
        $agent = User::factory()->create(['type' => 'agent']);

        event(new UserCreated($agent, []));

        $this->assertTrue(
            $agent->notificationSubscriptions()
                ->where('notif_id', ConversationCreatedNotif::NOTIF_ID)
                ->exists(),
        );
    }

    public function test_subscribe_action_is_idempotent_for_same_user(): void
    {
        $user = User::factory()->create(['type' => 'agent']);

        (new SubscribeUserToNotifications())->execute($user, null);
        (new SubscribeUserToNotifications())->execute($user, null);

        $ids = $user->notificationSubscriptions()->pluck('notif_id');

        $this->assertSame($ids->count(), $ids->unique()->count());
    }

    public function test_creator_is_not_auto_subscribed_when_notif_subs_are_disabled(): void
    {
        config()->set('app.notif_subs_integrated', false);

        $creator = User::factory()->create(['type' => 'user']);

        event(new UserCreated($creator, []));

        $this->assertSame(0, $creator->notificationSubscriptions()->count());
    }

    public function test_admin_is_auto_subscribed_even_when_notif_subs_are_disabled(): void
    {
        config()->set('app.notif_subs_integrated', false);

        $admin = User::factory()->create(['type' => 'admin']);

        event(new UserCreated($admin, []));

        $this->assertTrue(
            $admin->notificationSubscriptions()
                ->where('notif_id', ConversationCreatedNotif::NOTIF_ID)
                ->exists(),
        );
    }
}
