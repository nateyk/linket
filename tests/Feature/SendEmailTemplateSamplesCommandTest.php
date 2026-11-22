<?php

use App\Mail\ReactEmailMailable;
use App\Mail\ReactEmailRenderer;
use Illuminate\Support\Facades\Mail;

beforeEach(function () {
    Mail::fake();

    app()->instance(ReactEmailRenderer::class, new class
    {
        public function render(string $template, array $props): array
        {
            $label = $template.'|'.json_encode($props);

            return [
                'html' => '<p>'.$label.'</p>',
                'text' => $label,
            ];
        }
    });
});

test('mail send template samples sends every react email template to the recipient', function () {
    $this->artisan('mail:send-template-samples', [
        'email' => 'natenaelny@gmail.com',
    ])->assertSuccessful();

    Mail::assertSent(ReactEmailMailable::class, 4);

    Mail::assertSent(ReactEmailMailable::class, function (ReactEmailMailable $mail) {
        return $mail->hasTo('natenaelny@gmail.com')
            && str_contains((string) $mail->subject, '[sample]');
    });
});

test('mail send template samples dry run renders without sending', function () {
    $this->artisan('mail:send-template-samples', [
        'email' => 'natenaelny@gmail.com',
        '--dry-run' => true,
    ])->assertSuccessful();

    Mail::assertNothingSent();
});
