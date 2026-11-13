<?php

namespace Tests\Feature;

use App\HelpCenter\Actions\DeleteMultipleArticles;
use App\HelpCenter\Models\HcArticle;
use App\HelpCenter\Models\HcCategory;
use App\Models\User;
use Common\Permissions\Models\Permission;
use Common\Roles\Models\Role;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Str;
use Tests\TestCase;

class HcBatchScoutConsistencyTest extends TestCase
{
    use DatabaseTransactions;

    public function test_batch_publish_uses_model_events_to_refresh_search_documents(): void
    {
        $agent = $this->agent();
        $first = $this->article(true);
        $second = $this->article(true);
        $updated = [];

        Event::listen('eloquent.updated: '.HcArticle::class, function (HcArticle $article) use (&$updated) {
            $updated[] = $article->id;
        });

        $this->asAgent($agent)->postJson('/api/v1/hc/articles/batch-action', [
            'articleIds' => [$first->id, $second->id],
            'action' => 'changeArticleStatus',
            'data' => ['status' => 'published'],
        ])->assertOk();

        $this->assertDatabaseHas('articles', ['id' => $first->id, 'draft' => false]);
        $this->assertDatabaseHas('articles', ['id' => $second->id, 'draft' => false]);
        $this->assertEqualsCanonicalizing([$first->id, $second->id], $updated);
        $this->assertFalse($first->fresh()->toSearchableArray()['draft']);
    }

    public function test_batch_role_change_uses_model_events_and_is_idempotent(): void
    {
        $agent = $this->agent();
        $article = $this->article(false);
        $role = Role::query()->create([
            'name' => 'HC batch role '.Str::random(8),
            'type' => 'users',
            'default' => false,
            'guests' => false,
        ]);
        $changed = [];

        Event::listen('eloquent.updated: '.HcArticle::class, function (HcArticle $model) use (&$changed) {
            $changed[] = $model->id;
        });

        $payload = [
            'articleIds' => [$article->id],
            'action' => 'changeVisibility',
            'data' => ['roleId' => $role->id],
        ];

        $this->asAgent($agent)->postJson('/api/v1/hc/articles/batch-action', $payload)
            ->assertOk();
        $this->asAgent($agent)->postJson('/api/v1/hc/articles/batch-action', $payload)
            ->assertOk();

        $this->assertDatabaseHas('articles', [
            'id' => $article->id,
            'visible_to_role' => $role->id,
        ]);
        $this->assertSame([$article->id], $changed);
    }

    public function test_invalid_batch_payload_does_not_mutate_any_article(): void
    {
        $agent = $this->agent();
        $article = $this->article(true);

        foreach ([
            ['action' => 'invalidAction', 'data' => []],
            ['action' => 'changeArticleStatus', 'data' => ['status' => 'visible']],
            ['action' => 'changeVisibility', 'data' => ['roleId' => 99999999]],
        ] as $action) {
            $this->asAgent($agent)->postJson('/api/v1/hc/articles/batch-action', [
                'articleIds' => [$article->id],
                ...$action,
            ])->assertUnprocessable();
        }

        $this->assertDatabaseHas('articles', ['id' => $article->id, 'draft' => true]);
    }

    public function test_bulk_delete_removes_only_selected_articles_and_pivots(): void
    {
        $section = HcCategory::query()->create([
            'name' => 'Batch delete '.Str::random(8),
            'position' => 1,
        ]);
        $deleted = $this->article(false);
        $retained = $this->article(false);
        $deleted->categories()->attach($section->id);
        $retained->categories()->attach($section->id);

        // CI tests already run in a database transaction. The importer uses
        // the same removal path with index sync disabled, and the normal path
        // schedules Scout removal for after the outer transaction commits.
        (new DeleteMultipleArticles())->execute([$deleted->id]);

        $this->assertDatabaseMissing('articles', ['id' => $deleted->id]);
        $this->assertDatabaseMissing('category_article', ['article_id' => $deleted->id]);
        $this->assertDatabaseHas('articles', ['id' => $retained->id]);
        $this->assertDatabaseHas('category_article', ['article_id' => $retained->id]);
    }

    private function article(bool $draft): HcArticle
    {
        return HcArticle::query()->create([
            'title' => 'Batch '.Str::random(10),
            'body' => '<p>Help text</p>',
            'draft' => $draft,
        ]);
    }

    private function agent(): User
    {
        $agent = User::factory()->create(['type' => 'agent']);
        $permission = Permission::query()->firstOrCreate(['name' => 'articles.update']);
        $agent->permissions()->syncWithoutDetaching([$permission->id]);

        return $agent;
    }

    private function asAgent(User $user): static
    {
        return $this->actingAs($user)
            ->withSession(['_token' => 'hc-batch-csrf'])
            ->withHeader('Referer', config('app.url'))
            ->withHeader('X-CSRF-TOKEN', 'hc-batch-csrf');
    }
}
