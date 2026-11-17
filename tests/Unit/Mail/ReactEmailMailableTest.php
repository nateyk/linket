<?php

namespace Tests\Unit\Mail;

use App\Mail\ReactEmailMailable;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class ReactEmailMailableTest extends TestCase
{
    #[Test]
    public function it_exposes_html_and_plain_text(): void
    {
        $mailable = new ReactEmailMailable(
            html: '<p>Hello</p>',
            text: 'Hello',
            subjectLine: 'Test subject',
        );

        $mailable->assertHasSubject('Test subject');
        $mailable->assertSeeInHtml('Hello');
        $mailable->assertSeeInText('Hello');
    }

    #[Test]
    public function plain_text_part_does_not_escape_ampersands_in_urls(): void
    {
        $signedUrl = 'https://example.test/download?token=abc&expires=1';

        $mailable = new ReactEmailMailable(
            html: '<p>Link</p>',
            text: "Download: {$signedUrl}",
            subjectLine: 'Signed link',
        );

        $mailable->assertSeeInText($signedUrl);
        $mailable->assertDontSeeInText(htmlspecialchars($signedUrl, ENT_QUOTES, 'UTF-8', false));
    }
}