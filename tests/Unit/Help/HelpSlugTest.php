<?php

namespace Tests\Unit\Help;

use Common\Help\Models\HelpArticle;
use Common\Help\Models\HelpCategory;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Str;
use Tests\TestCase;

class HelpSlugTest extends TestCase
{
    use DatabaseTransactions;

    public function test_duplicate_names_produce_unique_slugs(): void
    {
        // The name is unique per run so the slug assertion holds even when the
        // help center already has seeded categories.
        $name = 'Getting Started '.Str::random(8);

        $a = HelpCategory::create(['name' => $name]);
        $b = HelpCategory::create(['name' => $name]);

        $this->assertSame(Str::slug($name), $a->slug);
        $this->assertNotEquals($a->slug, $b->slug);
    }

    public function test_duplicate_titles_produce_unique_article_slugs(): void
    {
        $category = HelpCategory::create(['name' => 'General']);

        $a = HelpArticle::create([
            'title' => 'How to start',
            'body' => '<p>Body</p>',
            'short_description' => 'Short',
            'help_category_id' => $category->id,
        ]);
        $b = HelpArticle::create([
            'title' => 'How to start',
            'body' => '<p>Body</p>',
            'short_description' => 'Short',
            'help_category_id' => $category->id,
        ]);

        $this->assertSame('how-to-start', $a->slug);
        $this->assertNotEquals($a->slug, $b->slug);
    }

    public function test_categories_order_by_sort_id(): void
    {
        $second = HelpCategory::create(['name' => 'Second '.Str::random(8), 'sort_id' => 2]);
        $first = HelpCategory::create(['name' => 'First '.Str::random(8), 'sort_id' => 1]);

        // Scoped to the two rows under test so seeded categories cannot skew it.
        $ordered = HelpCategory::whereIn('id', [$first->id, $second->id])->get();

        $this->assertTrue($ordered->first()->is($first));
        $this->assertTrue($ordered->last()->is($second));
    }
}
