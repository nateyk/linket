<?php

namespace Tests\Feature\Support;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class SupportSchemaTest extends TestCase
{
    use RefreshDatabase;

    public function test_support_core_tables_exist(): void
    {
        $this->assertTrue(Schema::hasTable('groups'));
        $this->assertTrue(Schema::hasTable('group_user'));
        $this->assertTrue(Schema::hasTable('conversation_statuses'));
        $this->assertTrue(Schema::hasTable('conversations'));
        $this->assertTrue(Schema::hasTable('conversation_items'));
        $this->assertTrue(Schema::hasTable('conversation_views'));
        $this->assertTrue(Schema::hasTable('agent_settings'));
        $this->assertTrue(Schema::hasTable('agent_invites'));
    }

    public function test_conversations_have_support_owner_id(): void
    {
        $this->assertTrue(
            Schema::hasColumns('conversations', [
                'subject',
                'user_id',
                'type',
                'assignee_id',
                'group_id',
                'status_id',
                'status_category',
                'priority',
                'channel',
                'mode',
                'support_owner_id',
            ]),
        );
    }

    public function test_help_center_tables_exist(): void
    {
        $this->assertTrue(Schema::hasTable('articles'));
        $this->assertTrue(Schema::hasTable('categories'));
        $this->assertTrue(Schema::hasTable('category_article'));
        $this->assertTrue(Schema::hasTable('article_feedback'));
        $this->assertTrue(Schema::hasTable('search_terms'));
    }

    public function test_roles_have_agents_flag(): void
    {
        $this->assertTrue(Schema::hasColumn('roles', 'agents'));
    }
}
