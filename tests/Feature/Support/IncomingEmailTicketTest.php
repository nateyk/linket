<?php

namespace Tests\Feature\Support;

use App\Conversations\Email\TransformEmailIntoTicketOrReply;
use App\Conversations\Models\Conversation;
use App\Models\User;
use Database\Seeders\SupportDefaultsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Mockery;
use Tests\TestCase;

class IncomingEmailTicketTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(SupportDefaultsSeeder::class);
    }

    public function test_email_pipeline_class_is_loadable(): void
    {
        $this->assertTrue(class_exists(TransformEmailIntoTicketOrReply::class));
        $this->assertTrue(Schema::hasTable('conversations'));
        $this->assertTrue(Schema::hasTable('conversation_items'));
    }

    public function test_platform_ticket_keeps_null_support_owner(): void
    {
        $user = User::factory()->create(['email' => 'buyer@example.com']);

        $conversation = Conversation::query()->create([
            'subject' => 'Email ticket',
            'user_id' => $user->id,
            'type' => 'ticket',
            'channel' => 'email',
            'support_owner_id' => null,
            'status_category' => Conversation::STATUS_OPEN,
        ]);

        $this->assertNull($conversation->fresh()->support_owner_id);
    }

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }
}
