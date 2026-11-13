<?php

namespace Tests\Feature;

use App\HelpCenter\Models\HcArticle;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

class HcArticleHtmlSanitizationTest extends TestCase
{
    use DatabaseTransactions;

    public function test_unsafe_html_cannot_be_stored_in_help_center_articles(): void
    {
        $article = $this->article(
            '<h2>Install Linket</h2>'.
            '<p onclick="alert(1)">Safe text</p>'.
            '<script>alert("xss")</script>'.
            '<img src="https://example.test/logo.png" onerror="alert(2)">'.
            '<a href="javascript:alert(3)">Unsafe link</a>',
        );

        $stored = DB::table('articles')->where('id', $article->id)->value('body');

        $this->assertStringContainsString('Safe text', $stored);
        $this->assertStringContainsString('id="install-linket"', $stored);
        $this->assertStringNotContainsString('<script', $stored);
        $this->assertStringNotContainsString('onclick=', $stored);
        $this->assertStringNotContainsString('onerror=', $stored);
        $this->assertStringNotContainsString('javascript:', $stored);
    }

    public function test_unsafe_legacy_database_content_is_sanitized_before_api_serialization(): void
    {
        $article = $this->article('<p>Original content</p>');

        DB::table('articles')->where('id', $article->id)->update([
            'body' => '<p>Legacy text</p><svg onload="alert(1)"></svg>'.
                '<a href="javascript:alert(1)">Click</a>',
        ]);

        $reloaded = $article->fresh();

        $this->assertStringContainsString('Legacy text', $reloaded->body);
        $this->assertStringNotContainsString('<svg', $reloaded->body);
        $this->assertStringNotContainsString('onload=', $reloaded->body);
        $this->assertStringNotContainsString('javascript:', $reloaded->toArray()['body']);
    }

    public function test_rich_text_lists_tables_images_and_safe_links_are_preserved(): void
    {
        $article = $this->article(
            '<h2 id="steps">Steps</h2>'.
            '<p style="text-align:center"><strong>Welcome</strong></p>'.
            '<ol><li>First</li><li>Second</li></ol>'.
            '<table><tbody><tr><td>ETB</td></tr></tbody></table>'.
            '<img src="https://example.test/guide.png" alt="Guide">'.
            '<a href="https://example.test/help" target="_blank">Read more</a>',
        );

        $body = $article->fresh()->body;

        $this->assertStringContainsString('id="steps"', $body);
        $this->assertStringContainsString('<strong>Welcome</strong>', $body);
        $this->assertStringContainsString('<ol>', $body);
        $this->assertStringContainsString('<table>', $body);
        $this->assertStringContainsString('https://example.test/guide.png', $body);
        $this->assertStringContainsString('https://example.test/help', $body);
    }

    public function test_approved_video_embeds_survive_but_arbitrary_iframes_do_not(): void
    {
        $article = $this->article(
            '<iframe src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ" width="560"></iframe>'.
            '<iframe src="https://evil.example.test/steal" onload="alert(1)"></iframe>'.
            '<iframe src="javascript:alert(1)"></iframe>',
        );

        $body = $article->fresh()->body;

        $this->assertStringContainsString('youtube-nocookie.com/embed/', $body);
        $this->assertStringNotContainsString('evil.example.test', $body);
        $this->assertStringNotContainsString('javascript:', $body);
        $this->assertStringNotContainsString('onload=', $body);
    }

    private function article(string $body): HcArticle
    {
        return HcArticle::query()->create([
            'title' => 'HC Sanitization '.Str::random(10),
            'body' => $body,
            'slug' => Str::lower(Str::random(10)),
            'draft' => false,
        ]);
    }
}
