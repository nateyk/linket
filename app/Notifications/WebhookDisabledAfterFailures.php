<?php

namespace App\Notifications;

use App\Webhooks\Models\Webhook;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class WebhookDisabledAfterFailures extends Notification
{
    use Queueable;

    public function __construct(protected Webhook $webhook) {}

    public function via(): array
    {
        return ['mail', 'database'];
    }

    public function toMail(): MailMessage
    {
        [$headline, $details] = $this->notificationLines();

        return (new MailMessage)
            ->line($headline)
            ->line($details)
            ->action(__('Review webhooks'), url('/account-settings/webhooks'));
    }

    public function toArray(): array
    {
        return [
            'mainAction' => [
                'label' => __('Review webhooks'),
                'action' => url('/account-settings/webhooks'),
            ],
            'lines' => collect($this->notificationLines())
                ->map(fn(string $line) => ['content' => $line])
                ->values()
                ->all(),
            'webhookId' => $this->webhook->id,
        ];
    }

    private function notificationLines(): array
    {
        return [
            __('Your webhook ":name" was disabled after too many consecutive failed delivery attempts.', [
                'name' => $this->webhook->name,
            ]),
            __('Please verify the endpoint availability and then re-enable this webhook.'),
        ];
    }
}
