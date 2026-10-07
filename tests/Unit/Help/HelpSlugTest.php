<?php

namespace Tests\Unit\Help;

use Common\Help\Models\HelpArticle;
use Common\Help\Models\HelpCategory;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class HelpSlugTest extends TestCase
{
    use DatabaseTransactions;

    public function test_duplicate_names_produce_unique_slugs(): void
    {
        $a = HelpCategory::create(['name' => 'Getting Started']);
        $b = HelpCategory::create(['name' => 'Getting Started']);

        $this->assertSame('getting-started', $a->slug);
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
        $second = HelpCategory::create(['name' => 'Second', 'sort_id' => 2]);
        $first = HelpCategory::create(['name' => 'First', 'sort_id' => 1]);

        $ordered = HelpCategory::all();

        $this->assertTrue($ordered->first()->is($first));
        $this->assertTrue($ordered->last()->is($second));
    }
}
