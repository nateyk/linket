<?php

namespace Common\Billing\Notifications;

use App\Models\User;
use Common\Billing\Subscription;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use App\Mail\ReactEmailMailable;
use App\Mail\ReactEmailMessage;
use Illuminate\Notifications\Notification;

class PaymentFailed extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(public Subscription $subscription)
    {
    }

    public function via(mixed $notifiable): array
    {
        return ['mail', 'database'];
    }

    public function toMail(User $notifiable): ReactEmailMailable
    {
        return ReactEmailMessage::toNotifiable(
            $notifiable,
            $this->mainLine(),
            $this->mainLine(),
            __('Hello, :name', ['name' => $notifiable->name]),
            [$this->descriptionLine()],
            __('View subscription'),
            $this->mainAction(),
        );
    }

    public function toArray(mixed $notifiable): array
    {
        return [
            'lines' => [
                [
                    'content' => $this->mainLine(),
                ],
                [
                    'content' => $this->descriptionLine(),
                ],
            ],
            'buttonActions' => [
                [
                    'label' => __('View subscription'),
                    'action' => $this->mainAction(),
                ],
            ],
        ];
    }

    protected function mainLine(): string
    {
        $siteName = config('app.name');
        return __('Payment for :name subscription failed', [
            'name' => $siteName,
        ]);
    }

    protected function descriptionLine(): string
    {
        $siteName = config('app.name');
        $planName = $this->subscription->product->name;
        return __(
            'We could not charge your specified payment method for :planName. We will retry it one more time, after which time your subscription on :siteName will be cancelled and you will lose associated benefits.',
            ['siteName' => $siteName, 'planName' => $planName],
        );
    }

    protected function mainAction(): string
    {
        return config('app.url') . '/billing';
    }
}
