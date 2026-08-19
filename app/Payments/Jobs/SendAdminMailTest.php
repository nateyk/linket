<?php

namespace App\Payments\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Mail;

class SendAdminMailTest implements ShouldQueue
{
    use Dispatchable, Queueable, SerializesModels;

    public int $tries = 3;

    /** @var array<int, int> */
    public array $backoff = [60, 300, 900];

    public function __construct(
        private readonly string $email,
        private readonly string $name,
    ) {
        $this->onQueue('mail');
    }

    public function handle(): void
    {
        Mail::raw(
            __('This is a test email from Linket. If you received it, outgoing email and the mail queue are working.'),
            fn($message) => $message
                ->to($this->email, $this->name)
                ->subject(__('Linket email delivery test')),
        );
    }
}
