<?php

namespace Tests\Unit\Blog;

use Common\Blog\Actions\SanitizeBlogHtml;
use Tests\TestCase;

class SanitizeBlogHtmlTest extends TestCase
{
    public function test_script_tags_are_stripped(): void
    {
        $result = app(SanitizeBlogHtml::class)->execute(
            '<p>Hello</p><script>alert(1)</script>'
        );

        $this->assertStringContainsString('<p>Hello</p>', $result);
        $this->assertStringNotContainsString('<script', $result);
        $this->assertStringNotContainsString('alert(1)', $result);
    }

    public function test_event_handler_attributes_are_stripped(): void
    {
        $result = app(SanitizeBlogHtml::class)->execute(
            '<p onclick="steal()">Text</p><img src="x" onerror="steal()">'
        );

        $this->assertStringNotContainsString('onclick', $result);
        $this->assertStringNotContainsString('onerror', $result);
    }

    public function test_javascript_urls_are_stripped(): void
    {
        $result = app(SanitizeBlogHtml::class)->execute(
            '<a href="javascript:alert(1)">click</a>'
        );

        $this->assertStringNotContainsString('javascript:', $result);
    }

    public function test_safe_formatting_is_preserved(): void
    {
        $html =
            '<h2>Title</h2><p><strong>Bold</strong> and <em>italic</em></p><ul><li>item</li></ul>';

        $this->assertSame(
            $html,
            app(SanitizeBlogHtml::class)->execute($html),
        );
    }

    public function test_null_input_returns_empty_string(): void
    {
        $this->assertSame('', app(SanitizeBlogHtml::class)->execute(null));
    }
}