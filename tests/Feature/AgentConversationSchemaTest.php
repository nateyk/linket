<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class AgentConversationSchemaTest extends TestCase
{
    public function test_agent_conversation_tables_exist(): void
    {
        $this->assertTrue(Schema::hasTable('agent_conversations'));
        $this->assertTrue(Schema::hasColumns('agent_conversations', [
            'id',
            'participant_type',
            'participant_id',
            'title',
            'created_at',
            'updated_at',
        ]));

        $this->assertTrue(Schema::hasTable('agent_conversation_messages'));
        $this->assertTrue(Schema::hasColumns('agent_conversation_messages', [
            'id',
            'conversation_id',
            'participant_type',
            'participant_id',
            'agent',
            'role',
            'content',
            'attachments',
            'steps',
            'usage',
            'meta',
            'status',
            'created_at',
            'updated_at',
        ]));
    }
}
