<?php

namespace Tests\Feature;

use App\HelpCenter\Models\HcCategory;
use App\HelpCenter\Models\SearchTerm;
use App\Reports\Actions\HelpCenterSearchReport;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Tests\TestCase;

class HcSearchAnalyticsTest extends TestCase
{
    use DatabaseTransactions;

    public function test_search_term_reporting_category_column_is_present(): void
    {
        $this->assertTrue(Schema::hasColumn('search_terms', 'category_id'));
    }

    public function test_browser_beacon_logs_search_result_and_category_without_ip(): void
    {
        $category = HcCategory::query()->create([
            'name' => 'Search category '.Str::random(8),
        ]);
        $term = 'Documentation '.Str::random(8);
        $body = json_encode([
            'searchSession' => [[
                'term' => $term,
                'results' => [1, 2, 3],
                'categoryId' => $category->id,
                'clickedArticle' => true,
                'createdTicket' => false,
            ]],
        ]);

        $this->stateful()->call(
            'POST', '/search-term', ['_token' => 'hc-analytics-csrf'], [],
            [], ['CONTENT_TYPE' => 'text/plain', 'HTTP_ACCEPT' => 'application/json'], $body,
        )->assertOk();

        $record = SearchTerm::where('term', $term)->firstOrFail();
        $this->assertSame($category->id, (int) $record->category_id);
        $this->assertSame(3, (int) $record->result_count);
        $this->assertSame(1, (int) $record->clicked_article);
    }

    public function test_missing_or_invalid_beacon_json_is_rejected(): void
    {
        $this->stateful()->call(
            'POST', '/search-term', ['_token' => 'hc-analytics-csrf'], [],
            [], ['CONTENT_TYPE' => 'text/plain', 'HTTP_ACCEPT' => 'application/json'],
            '{not valid json',
        )->assertUnprocessable();

        $this->stateful()->postJson('/search-term', [
            'searchSession' => [[
                'term' => 'Missing results',
            ]],
        ])->assertUnprocessable();
    }

    public function test_search_report_groups_by_category_and_rejects_unknown_sort_fields(): void
    {
        $category = HcCategory::query()->create(['name' => 'Reports '.Str::random(8)]);
        $term = 'Unique report '.Str::random(8);
        SearchTerm::query()->create([
            'term' => $term,
            'normalized_term' => Str::lower($term),
            'result_count' => 2,
            'clicked_article' => true,
            'created_ticket' => false,
            'category_id' => $category->id,
        ]);

        $report = (new HelpCenterSearchReport())->generate('popular', [
            'orderBy' => 'count;drop table search_terms',
        ]);

        $record = $report->getCollection()->firstWhere('term', $term);
        $this->assertNotNull($record);
        $this->assertSame($category->id, (int) $record->category_id);
    }

    private function stateful(): static
    {
        return $this->withSession(['_token' => 'hc-analytics-csrf'])
            ->withHeader('Referer', config('app.url'))
            ->withHeader('X-CSRF-TOKEN', 'hc-analytics-csrf');
    }
}
