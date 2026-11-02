<?php

namespace App\CreatorServices\Notifications;

use App\CreatorServices\Models\ServiceInquiry;
use App\Telegram\Support\TelegramNotificationChannels;
use App\Telegram\Support\TelegramNotificationPreferences;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use NotificationChannels\Telegram\TelegramMessage;

class NewServiceInquiryNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    /** @var array<int, int> */
    public array $backoff = [60, 300, 900];

    public function __construct(public int $inquiryId)
    {
        $this->onQueue('default');
    }

    public function via(object $notifiable): array
    {
        return TelegramNotificationChannels::append(
            $notifiable,
            ['mail', 'database'],
            TelegramNotificationPreferences::SERVICE_INQUIRIES,
        );
    }

    public function viaQueues(): array
    {
        return [
            'mail' => 'mail',
            'database' => 'default',
            'telegram' => 'default',
        ];
    }

    public function shouldSend(object $notifiable, string $channel): bool
    {
        return ServiceInquiry::query()->whereKey($this->inquiryId)->exists();
    }

    public function toMail(object $notifiable): MailMessage
    {
        $inquiry = $this->inquiry();

        if (!$inquiry) {
            return (new MailMessage())
                ->subject(__('New service inquiry'))
                ->line(__('Open your dashboard to view the latest inquiries.'));
        }

        $mail = (new MailMessage())
            ->subject(__('New inquiry for ":service"', ['service' => $inquiry->service?->title ?? __('your service')]))
            ->greeting(__('Hello, :name', ['name' => $notifiable->name]))
            ->line(__(':name wants to talk about your service.', ['name' => $inquiry->name]))
            ->line(__('Email: :email', ['email' => $inquiry->email]));

        if ($inquiry->phone) {
            $mail->line(__('Phone: :phone', ['phone' => $inquiry->phone]));
        }

        if ($inquiry->package) {
            $mail->line(__('Package: :package', ['package' => $inquiry->package->name]));
        }

        return $mail
            ->line(__('Message: :message', ['message' => $inquiry->message]))
            ->action(__('View inquiry'), url('/dashboard/services/inquiries'));
    }

    public function toTelegram(object $notifiable): TelegramMessage
    {
        $inquiry = $this->inquiry();
        $message = TelegramMessage::create()->normal();

        if (! $inquiry) {
            return $message
                ->content(__('New service inquiry'))
                ->line(__('Open Linket to view the latest inquiries.'))
                ->button(__('View inquiries'), url('/dashboard/services/inquiries'));
        }

        $message
            ->content(__('New service inquiry'))
            ->line(__(':name wants to talk about ":service".', [
                'name' => $inquiry->name,
                'service' => $inquiry->service?->title ?? __('your service'),
            ]));

        if ($inquiry->package) {
            $message->line(
                __('Package: :package', ['package' => $inquiry->package->name]),
            );
        }

        return $message->button(
            __('View inquiry'),
            url('/dashboard/services/inquiries'),
        );
    }

    public function toDatabase(object $notifiable): array
    {
        $inquiry = $this->inquiry();

        if (!$inquiry) {
            return [
                'mainAction' => [
                    'label' => __('Open dashboard'),
                    'action' => url('/dashboard/services/inquiries'),
                ],
                'lines' => [[
                    'content' => e(__('Open your dashboard to view the latest inquiries.')),
                    'type' => 'primary',
                ]],
            ];
        }

        $lines = [
            [
                'content' => e(__(':name sent an inquiry for ":service".', [
                    'name' => $inquiry->name,
                    'service' => $inquiry->service?->title ?? __('your service'),
                ])),
                'type' => 'primary',
            ],
            [
                'content' => e(__('Email: :email', ['email' => $inquiry->email])),
                'type' => 'secondary',
            ],
        ];

        if ($inquiry->package) {
            $lines[] = [
                'content' => e(__('Package: :package', ['package' => $inquiry->package->name])),
                'type' => 'secondary',
            ];
        }

        return [
            'mainAction' => [
                'label' => __('View inquiry'),
                'action' => url('/dashboard/services/inquiries'),
            ],
            'lines' => $lines,
        ];
    }

    private function inquiry(): ?ServiceInquiry
    {
        return ServiceInquiry::query()
            ->with(['service', 'package'])
            ->find($this->inquiryId);
    }
}
