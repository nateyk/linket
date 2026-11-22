<?php

namespace App\Console\Commands;

use App\Mail\ReactEmailMailable;
use App\Mail\ReactEmailRenderer;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;
use Throwable;

/**
 * Send one sample of every React Email template so production mail can be
 * visually verified (for example from a cPanel terminal).
 *
 *   php artisan mail:send-template-samples natenaelny@gmail.com
 *   php artisan mail:send-template-samples natenaelny@gmail.com --dry-run
 */
final class SendEmailTemplateSamplesCommand extends Command
{
    protected $signature = 'mail:send-template-samples
        {email=natenaelny@gmail.com : Recipient address for every sample}
        {--dry-run : Render templates without sending mail}';

    protected $description = 'Send sample renders of every React Email template to a mailbox';

    public function handle(): int
    {
        $email = strtolower(trim((string) $this->argument('email')));
        if (! filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $this->error('Invalid email address.');

            return self::FAILURE;
        }

        $dryRun = (bool) $this->option('dry-run');
        $sent = 0;
        $failed = 0;
        $renderer = app(ReactEmailRenderer::class);

        foreach ($this->samples() as $sample) {
            try {
                $rendered = $renderer->render($sample['template'], $sample['props']);
                $subject = '[sample] '.$sample['label'];
                $mailable = new ReactEmailMailable(
                    html: $rendered['html'],
                    text: $rendered['text'],
                    subjectLine: $subject,
                );
                $mailable->subject($subject);

                if ($dryRun) {
                    $this->line("dry-run  {$sample['template']}  {$sample['label']}");
                } else {
                    Mail::to($email)->send($mailable);
                    $this->info("sent     {$sample['template']}  {$sample['label']}");
                }
                $sent++;
            } catch (Throwable $e) {
                $failed++;
                report($e);
                $this->error("failed   {$sample['template']}  {$sample['label']}: {$e->getMessage()}");
            }
        }

        $this->newLine();
        $this->table(
            ['Metric', 'Count'],
            [
                [$dryRun ? 'Rendered' : 'Sent', (string) $sent],
                ['Failed', (string) $failed],
                ['Recipient', $email],
            ],
        );

        if (! $dryRun) {
            $this->comment('Check the inbox (and spam) for subjects starting with [sample].');
        }

        return $failed > 0 ? self::FAILURE : self::SUCCESS;
    }

    /**
     * @return list<array{template: string, label: string, props: array<string, mixed>}>
     */
    private function samples(): array
    {
        $appUrl = rtrim((string) config('app.url'), '/');

        return [
            [
                'template' => 'message',
                'label' => 'Generic message (welcome / payouts / tickets share this layout)',
                'props' => [
                    'preview' => 'Your Linket account is ready',
                    'heading' => 'Welcome to Linket',
                    'lines' => [
                        'Hi Nate, this is the shared transactional layout.',
                        'Welcome, payout, ticket, and most product emails use this template.',
                    ],
                    'actionLabel' => 'Open dashboard',
                    'actionUrl' => $appUrl.'/dashboard',
                    'note' => 'Sample only — safe to ignore.',
                ],
            ],
            [
                'template' => 'verify-email',
                'label' => 'Email verification OTP',
                'props' => [
                    'otp' => '482913',
                    'expiresInMinutes' => 30,
                    'accountSettingsUrl' => $appUrl.'/account-settings',
                    'siteName' => (string) config('app.name', 'Linket'),
                ],
            ],
            [
                'template' => 'password-reset',
                'label' => 'Password reset',
                'props' => [
                    'name' => 'Nate',
                    'resetUrl' => $appUrl.'/password/reset/sample-token',
                    'expiresInMinutes' => 60,
                    'siteName' => (string) config('app.name', 'Linket'),
                ],
            ],
            [
                'template' => 'order-confirmation',
                'label' => 'Storefront order confirmation / receipt',
                'props' => [
                    'buyerName' => 'Nate',
                    'productName' => 'Sample digital product',
                    'orderId' => 'LK-SAMPLE-1001',
                    'amountLabel' => '250.00 ETB',
                    'storeName' => 'Demo Creator Store',
                    'downloads' => [
                        [
                            'name' => 'sample-download.pdf',
                            'url' => $appUrl.'/downloads/sample',
                        ],
                    ],
                    'expiresAtLabel' => '7 days',
                    'downloadLimitLabel' => '5 downloads',
                ],
            ],
            [
                'template' => 'portal-sign-in',
                'label' => 'My Portal sign-in OTP',
                'props' => [
                    'otp' => '482913',
                    'expiresInMinutes' => 10,
                    'portalUrl' => $appUrl.'/my-portal',
                    'siteName' => (string) config('app.name', 'Linket'),
                ],
            ],
            [
                'template' => 'renewal-reminder',
                'label' => 'Direct Pro renewal reminder',
                'props' => [
                    'name' => 'Nate',
                    'planName' => 'Pro',
                    'daysBefore' => 7,
                    'renewUrl' => $appUrl.'/account-settings/billing',
                    'siteName' => (string) config('app.name', 'Linket'),
                ],
            ],
            [
                'template' => 'ops-alert',
                'label' => 'Ops / admin alert',
                'props' => [
                    'preview' => 'Payment needs review',
                    'heading' => 'Payment needs review',
                    'body' => 'A buyer payment needs your review in Linket.',
                    'note' => 'Sample only — safe to ignore.',
                    'siteName' => (string) config('app.name', 'Linket'),
                ],
            ],
        ];
    }
}
