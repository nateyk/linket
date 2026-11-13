<?php

namespace Tests\Feature;

use App\HelpCenter\Models\HcArticle;
use App\HelpCenter\Models\HcCategory;
use App\Models\User;
use Common\Permissions\Models\Permission;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Str;
use Tests\TestCase;

class HcReorderIntegrityTest extends TestCase
{
    use DatabaseTransactions;

    private function asManager(): static
    {
        $agent = User::factory()->create(['type' => 'agent']);
        $permission = Permission::query()->firstOrCreate(['name' => 'articles.update']);
        $agent->permissions()->syncWithoutDetaching([$permission->id]);

        return $this->actingAs($agent)
            ->withSession(['_token' => 'hc-reorder-test'])
            ->withHeader('Referer', config('app.url'))
            ->withHeader('X-CSRF-TOKEN', 'hc-reorder-test');
    }

    public function test_partial_category_reorder_is_rejected_without_changing_positions(): void
    {
        [$root, $first, $second] = $this->sections();

        $this->asManager()->postJson('/api/v1/hc/manager/categories/reorder', [
            'parentId' => $root->id,
            'ids' => [$second->id],
        ])->assertUnprocessable();

        $this->assertDatabaseHas('categories', ['id' => $first->id, 'position' => 1]);
        $this->assertDatabaseHas('categories', ['id' => $second->id, 'position' => 2]);
    }

    public function test_cross_parent_and_duplicate_category_ids_are_rejected(): void
    {
        [$root, $first, $second] = $this->sections();
        [, $foreign] = $this->singleSection();

        $this->asManager()->postJson('/api/v1/hc/manager/categories/reorder', [
            'parentId' => $root->id,
            'ids' => [$first->id, $foreign->id],
        ])->assertUnprocessable();

        $this->asManager()->postJson('/api/v1/hc/manager/categories/reorder', [
            'parentId' => $root->id,
            'ids' => [$first->id, $first->id],
        ])->assertUnprocessable();

        $this->assertDatabaseHas('categories', ['id' => $first->id, 'position' => 1]);
        $this->assertDatabaseHas('categories', ['id' => $second->id, 'position' => 2]);
        $this->assertDatabaseHas('categories', ['id' => $foreign->id, 'position' => 1]);
    }

    public function test_valid_category_reorder_updates_only_siblings(): void
    {
        [$root, $first, $second] = $this->sections();
        [, $foreign] = $this->singleSection();

        $this->asManager()->postJson('/api/v1/hc/manager/categories/reorder', [
            'parentId' => $root->id,
            'ids' => [$second->id, $first->id],
        ])->assertOk();

        $this->assertDatabaseHas('categories', ['id' => $second->id, 'position' => 1]);
        $this->assertDatabaseHas('categories', ['id' => $first->id, 'position' => 2]);
        $this->assertDatabaseHas('categories', ['id' => $foreign->id, 'position' => 1]);
    }

    public function test_partial_article_reorder_keeps_all_original_positions(): void
    {
        [, $firstSection] = $this->singleSection();
        [$first, $second] = $this->articles($firstSection);

        $this->asManager()->postJson(
            "/api/v1/hc/manager/sections/{$firstSection->id}/articles/reorder",
            ['ids' => [$second->id]],
        )->assertUnprocessable();

        $this->assertPivotPosition($firstSection, $first, 1);
        $this->assertPivotPosition($firstSection, $second, 2);
    }

    public function test_foreign_article_is_rejected_without_touching_other_section(): void
    {
        [, $section] = $this->singleSection();
        [, $otherSection] = $this->singleSection();
        [$first, $second] = $this->articles($section);
        [$foreign] = $this->articles($otherSection);

        $this->asManager()->postJson(
            "/api/v1/hc/manager/sections/{$section->id}/articles/reorder",
            ['ids' => [$second->id, $foreign->id]],
        )->assertUnprocessable();

        $this->assertPivotPosition($section, $first, 1);
        $this->assertPivotPosition($section, $second, 2);
        $this->assertPivotPosition($otherSection, $foreign, 1);
    }

    public function test_valid_article_reorder_updates_only_requested_section(): void
    {
        [, $section] = $this->singleSection();
        [$first, $second] = $this->articles($section);

        $this->asManager()->postJson(
            "/api/v1/hc/manager/sections/{$section->id}/articles/reorder",
            ['ids' => [$second->id, $first->id]],
        )->assertOk();

        $this->assertPivotPosition($section, $second, 1);
        $this->assertPivotPosition($section, $first, 2);
    }

    private function sections(): array
    {
        $root = HcCategory::query()->create([
            'name' => 'Root '.Str::random(8),
            'position' => 1,
        ]);
        $first = HcCategory::query()->create([
            'name' => 'First '.Str::random(8),
            'parent_id' => $root->id,
            'position' => 1,
        ]);
        $second = HcCategory::query()->create([
            'name' => 'Second '.Str::random(8),
            'parent_id' => $root->id,
            'position' => 2,
        ]);

        return [$root, $first, $second];
    }

    private function singleSection(): array
    {
        $root = HcCategory::query()->create([
            'name' => 'Parent '.Str::random(8),
            'position' => 1,
        ]);
        $section = HcCategory::query()->create([
            'name' => 'Child '.Str::random(8),
            'parent_id' => $root->id,
            'position' => 1,
        ]);

        return [$root, $section];
    }

    private function articles(HcCategory $section): array
    {
        $result = [];

        foreach ([1, 2] as $position) {
            $article = HcArticle::query()->create([
                'title' => 'Reorder '.Str::random(10),
                'body' => '<p>Safe help article</p>',
                'draft' => false,
            ]);
            $article->categories()->attach([
                $section->id => ['position' => $position],
                $section->parent_id => ['position' => $position],
            ]);
            $result[] = $article;
        }

        return $result;
    }

    private function assertPivotPosition(HcCategory $section, HcArticle $article, int $position): void
    {
        $this->assertDatabaseHas('category_article', [
            'category_id' => $section->id,
            'article_id' => $article->id,
            'position' => $position,
        ]);
    }
}
