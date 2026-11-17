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
}