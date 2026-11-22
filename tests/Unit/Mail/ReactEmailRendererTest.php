<?php

namespace Tests\Unit\Mail;

use App\Mail\EmailBranding;
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

        $this->assertStringContainsString('Hello Ada', $result['html']);
        $this->assertStringContainsString('Hello Ada', $result['text']);
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

    #[Test]
    public function it_gracefully_falls_back_when_node_binary_is_non_existent(): void
    {
        $renderer = new ReactEmailRenderer(
            nodeBinary: '/non/existent/path/to/node',
            timeoutSeconds: 5,
        );

        $result = $renderer->render('message', [
            'greeting' => 'Hello Developer',
            'lines' => ['Order #12345 confirmed.'],
        ]);

        $this->assertStringContainsString('Hello Developer', $result['html']);
        $this->assertStringContainsString('Order #12345 confirmed.', $result['text']);
    }

    #[Test]
    public function it_merges_email_branding_props_into_the_render_script_input(): void
    {
        $this->app->instance(EmailBranding::class, new class
        {
            public function props(): array
            {
                return [
                    'siteName' => 'Branded',
                    'logoUrl' => 'https://cdn.example/logo.png',
                    'buttonBorderRadiusPx' => 6,
                ];
            }
        });

        $script = base_path('tests/fixtures/react-email/fake-render.mjs');
        $renderer = new ReactEmailRenderer(
            nodeBinary: 'node',
            scriptPath: $script,
            timeoutSeconds: 10,
        );

        $result = $renderer->render('order-confirmation', ['buyerName' => 'Ada']);

        $this->assertStringContainsString('https://cdn.example/logo.png', $result['html']);
        $this->assertStringContainsString('|6</p>', $result['html']);
    }

    #[Test]
    public function it_lets_caller_props_override_branding_defaults(): void
    {
        $this->app->instance(EmailBranding::class, new class
        {
            public function props(): array
            {
                return [
                    'siteName' => 'Branded',
                    'logoUrl' => 'https://cdn.example/logo.png',
                    'buttonBorderRadiusPx' => 6,
                ];
            }
        });

        $script = base_path('tests/fixtures/react-email/fake-render.mjs');
        $renderer = new ReactEmailRenderer(
            nodeBinary: 'node',
            scriptPath: $script,
            timeoutSeconds: 10,
        );

        $result = $renderer->render('order-confirmation', [
            'buyerName' => 'Ada',
            'buttonBorderRadiusPx' => 0,
            'logoUrl' => 'https://cdn.example/override.png',
        ]);

        $this->assertStringContainsString('https://cdn.example/override.png', $result['html']);
        $this->assertStringContainsString('|0</p>', $result['html']);
    }
}
