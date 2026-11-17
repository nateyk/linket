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
}