<?php

namespace App\Storefront\Notifications;

use App\Mail\ReactEmailMailable;
use App\Mail\ReactEmailMessage;
use App\Storefront\Models\PayoutRequest;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

final class ChapaPayoutStatusNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    /** @var array<int, int> */
    public array $backoff = [60, 300, 900];

    public function __construct(
        public string $event,
        public string $amountLabel,
        public string $reference,
        public ?string $reason = null,
    ) {
        $this->onQueue('mail');
        $this->afterCommit();
    }

    public static function notifyCreator(PayoutRequest $payout, string $event): void
    {
        $payout->loadMissing('creator');
        $payout->creator?->notify(self::forPayout($payout, $event));
    }

    public static function forPayout(PayoutRequest $payout, string $event): self
    {
        $amount = number_format(((int) $payout->amount_cents) / 100, 2)
            .' '.strtoupper((string) ($payout->currency ?: 'ETB'));
        $reference = (string) ($payout->transfer_reference ?: $payout->getKey());
        $reason = $event === 'failed' ? trim((string) $payout->rejection_reason) : '';

        return new self($event, $amount, $reference, $reason !== '' ? $reason : null);
    }

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function viaQueues(): array
    {
        return ['mail' => 'mail'];
    }

    public function toMail(object $notifiable): ReactEmailMailable
    {
        $name = is_string($notifiable->name ?? null) && $notifiable->name !== ''
            ? $notifiable->name
            : __('there');
        $sent = $this->event !== 'failed';
        $subject = $sent
            ? __('Your Linket payout was sent')
            : __('Your Linket payout could not be sent');
        $lines = [
            $sent
                ? __('We sent :amount to your receiving account.', ['amount' => $this->amountLabel])
                : __('We could not send :amount.', ['amount' => $this->amountLabel]),
        ];
        if (! $sent && is_string($this->reason) && $this->reason !== '') {
            $lines[] = __('Reason: :reason', ['reason' => $this->reason]);
        }
        $lines[] = __('Reference: :reference', ['reference' => $this->reference]);

        return ReactEmailMessage::toNotifiable(
            $notifiable,
            $subject,
            $subject,
            __('Hello, :name', ['name' => $name]),
            $lines,
            __('Open payouts'),
            url('/dashboard/payouts'),
        );
    }
}
