<?php

namespace Tests\Feature;

use App\Conversations\Agent\Notifications\Ticketing\ConversationCreatedNotif;
use App\Conversations\Models\Conversation;
use App\Conversations\Models\ConversationItem;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Notifications\Messages\BroadcastMessage;
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
}
