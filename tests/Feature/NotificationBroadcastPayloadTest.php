<?php

namespace Tests\Feature;

use App\Conversations\Agent\Notifications\Ticketing\ConversationCreatedNotif;
use App\Conversations\Models\Conversation;
use App\Conversations\Models\ConversationItem;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Notifications\Messages\BroadcastMessage;
use Illuminate\Support\Facades\Broadcast;
use ReflectionClass;
use Tests\TestCase;

class NotificationBroadcastPayloadTest extends TestCase
{
    use DatabaseTransactions;

    public function test_ticket_notification_broadcast_matches_database_payload_shape(): void
    {
        $customer = User::factory()->create(['name' => 'Ada Customer']);
        $agent = User::factory()->create(['type' => 'agent']);

        $conversation = Conversation::query()->create([
            'user_id' => $customer->id,
            'type' => 'ticket',
            'subject' => 'Help with payout',
            'mode' => Conversation::MODE_NORMAL,
        ]);

        ConversationItem::query()->create([
            'conversation_id' => $conversation->id,
            'user_id' => $customer->id,
            'type' => 'message',
            'body' => 'I need help with my payout.',
        ]);

        $conversation->load(['user', 'latestMessage']);

        $notification = new ConversationCreatedNotif($conversation);
        $broadcast = $notification->toBroadcast($agent);

        $this->assertInstanceOf(BroadcastMessage::class, $broadcast);
        $this->assertSame($notification->toArray($agent), $broadcast->data);
    }

    public function test_user_receives_broadcast_notifications_on_authorized_channel(): void
    {
        $user = User::factory()->create();

        $this->assertSame(
            'App.User.'.$user->id,
            $user->receivesBroadcastNotificationsOn(),
        );
    }

    public function test_private_user_channel_authorizes_only_the_same_user(): void
    {
        $owner = User::factory()->create();
        $intruder = User::factory()->create();

        $callback = $this->channelCallback('App.User.{id}');

        $this->assertTrue((bool) $callback($owner, (string) $owner->id));
        $this->assertFalse((bool) $callback($intruder, (string) $owner->id));
    }

    private function channelCallback(string $pattern): callable
    {
        // Ensure routes/channels.php callbacks are registered on a real driver.
        config()->set('broadcasting.default', 'pusher');
        config()->set('broadcasting.connections.pusher.key', 'test-key');
        config()->set('broadcasting.connections.pusher.secret', 'test-secret');
        config()->set('broadcasting.connections.pusher.app_id', 'test-app');
        config()->set('broadcasting.connections.pusher.options.cluster', 'mt1');

        require base_path('routes/channels.php');

        $broadcaster = Broadcast::driver('pusher');
        $property = (new ReflectionClass($broadcaster))->getProperty('channels');
        $property->setAccessible(true);
        $channels = $property->getValue($broadcaster);

        $this->assertArrayHasKey($pattern, $channels);

        return $channels[$pattern];
    }
}
