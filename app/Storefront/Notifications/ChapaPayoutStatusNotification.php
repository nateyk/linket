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

    public string $event;
    public string $amountLabel;
    public string $reference;
    public ?string $reason;

    public function __construct(
        string $event,
        string $amountLabel,
        mixed $reference,
        mixed $reason = null,
    ) {
        $this->event = $event;
        $this->amountLabel = $amountLabel;
        $this->reference = (string) $reference;
        $this->reason = is_string($reason) && $reason !== '' ? $reason : null;
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
        $cents = (int) $payout->amount_cents;
        $currency = strtoupper((string) ($payout->currency ?: 'ETB'));
        $amount = number_format($cents / 100, 2).' '.$currency;
        $reference = (string) ($payout->transfer_reference ?: $payout->getKey());
        $reason = $event === 'failed' ? trim((string) $payout->rejection_reason) : null;

        return new self($event, $amount, $reference, $reason);
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
        $isSent = $this->event !== 'failed';
        $subject = $this->buildSubject($isSent);

        return ReactEmailMessage::toNotifiable(
            $notifiable,
            $subject,
            $subject,
            __('Hello, :name', ['name' => $name]),
            $this->buildLines($isSent),
            __('Open payouts'),
            url('/dashboard/payouts'),
        );
    }

    private function buildSubject(bool $isSent): string
    {
        if ($isSent) {
            return __('Your Linket payout was sent');
        }

        return __('Your Linket payout could not be sent');
    }

    /**
     * @return list<string>
     */
    private function buildLines(bool $isSent): array
    {
        if ($isSent) {
            return [
                __('We sent :amount to your receiving account.', ['amount' => $this->amountLabel]),
                __('Reference: :reference', ['reference' => $this->reference]),
            ];
        }

        $lines = [
            __('We could not send :amount.', ['amount' => $this->amountLabel]),
        ];
        if (is_string($this->reason) && $this->reason !== '') {
            $lines[] = __('Reason: :reason', ['reason' => $this->reason]);
        }
        $lines[] = __('Reference: :reference', ['reference' => $this->reference]);

        return $lines;
    }
}
