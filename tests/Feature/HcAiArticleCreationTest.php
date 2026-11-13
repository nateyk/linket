<?php

namespace Tests\Feature;

use Ai\AiAgent\Models\AiAgent;
use App\HelpCenter\Actions\CrupdateArticle;
use App\HelpCenter\Models\HcArticle;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Str;
use Tests\TestCase;

class HcAiArticleCreationTest extends TestCase
{
    use DatabaseTransactions;

    private mixed $previousAiSetting;

    protected function setUp(): void
    {
        parent::setUp();
        $this->previousAiSetting = config('modules.ai.installed');
        config()->set('modules.ai.installed', true);
    }

    protected function tearDown(): void
    {
        config()->set('modules.ai.installed', $this->previousAiSetting);
        parent::tearDown();
    }

    public function test_new_article_is_saved_before_it_is_attached_to_the_only_enabled_ai_agent(): void
    {
        $agent = AiAgent::query()->create([
            'name' => 'HC assistant '.Str::random(8),
            'enabled' => true,
        ]);

        $article = (new CrupdateArticle())->execute([
            'title' => 'AI-linked article '.Str::random(8),
            'body' => '<p>New knowledge for the agent</p>',
            'draft' => false,
        ]);

        $this->assertNotNull($article->id);
        $this->assertTrue($article->exists);
        $this->assertTrue($agent->articles()->whereKey($article->id)->exists());
        $this->assertTrue($article->fresh()->scan_pending);
    }

    public function test_draft_article_does_not_schedule_ai_ingestion(): void
    {
        $agent = AiAgent::query()->create([
            'name' => 'HC draft assistant '.Str::random(8),
            'enabled' => true,
        ]);

        $article = (new CrupdateArticle())->execute([
            'title' => 'Draft AI article '.Str::random(8),
            'body' => '<p>Not published yet</p>',
            'draft' => true,
        ]);

        $this->assertTrue($agent->articles()->whereKey($article->id)->exists());
        $this->assertFalse((bool) $article->fresh()->scan_pending);
    }

    public function test_multiple_enabled_agents_do_not_implicitly_link_new_article(): void
    {
        $first = AiAgent::query()->create([
            'name' => 'HC first assistant '.Str::random(8),
            'enabled' => true,
        ]);
        $second = AiAgent::query()->create([
            'name' => 'HC second assistant '.Str::random(8),
            'enabled' => true,
        ]);

        $article = (new CrupdateArticle())->execute([
            'title' => 'Nonlinked AI article '.Str::random(8),
            'body' => '<p>Shared knowledge not auto-assigned</p>',
            'draft' => false,
        ]);

        $this->assertFalse($first->articles()->whereKey($article->id)->exists());
        $this->assertFalse($second->articles()->whereKey($article->id)->exists());
        $this->assertFalse((bool) $article->fresh()->scan_pending);
    }

    public function test_explicit_ai_agent_id_is_linked_after_article_creation(): void
    {
        AiAgent::query()->create([
            'name' => 'HC unrelated assistant '.Str::random(8),
            'enabled' => true,
        ]);
        $selected = AiAgent::query()->create([
            'name' => 'HC selected assistant '.Str::random(8),
            'enabled' => true,
        ]);

        $article = (new CrupdateArticle())->execute([
            'title' => 'Explicit AI article '.Str::random(8),
            'body' => '<p>Knowledge for the selected agent</p>',
            'draft' => false,
            'aiAgentId' => $selected->id,
        ]);

        $this->assertTrue($selected->articles()->whereKey($article->id)->exists());
        $this->assertTrue((bool) $article->fresh()->scan_pending);
    }
}
