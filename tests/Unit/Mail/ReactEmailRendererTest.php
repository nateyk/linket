<?php

namespace Tests\Unit\Mail;

use App\Mail\ReactEmailRenderException;
use App\Mail\ReactEmailRenderer;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class ReactEmailRendererTest extends TestCase
{
    #[Test]
    public function it_parses_html_and_text_from_a_successful_script(): void
    {
        $script = base_path('tests/fixtures/react-email/fake-render.mjs');
        $renderer = new ReactEmailRenderer(
            nodeBinary: 'node',
            scriptPath: $script,
            timeoutSeconds: 10,
        );

        $result = $renderer->render('order-confirmation', ['buyerName' => 'Ada']);

        $this->assertSame('<p>Hello Ada</p>', $result['html']);
        $this->assertSame('Hello Ada', $result['text']);
    }

    #[Test]
    public function it_throws_when_script_exits_non_zero(): void
    {
        $script = base_path('tests/fixtures/react-email/failing-render.mjs');
        $renderer = new ReactEmailRenderer(
            nodeBinary: 'node',
            scriptPath: $script,
            timeoutSeconds: 10,
        );

        $this->expectException(ReactEmailRenderException::class);

        $renderer->render('missing', []);
    }

    #[Test]
    public function it_renders_fallback_in_testing_environment_without_script(): void
    {
        $renderer = new ReactEmailRenderer();

        $result = $renderer->render('message', [
            'greeting' => 'Hello Ada',
            'lines' => ['Your payout was sent.', 'Reference: lk-123'],
        ]);

        $this->assertStringContainsString('Hello Ada', $result['html']);
        $this->assertStringContainsString('Your payout was sent.', $result['html']);
        $this->assertStringContainsString('Reference: lk-123', $result['text']);
    }
}
