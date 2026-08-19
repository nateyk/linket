<?php

namespace App\Kyc\Notifications;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class KycStatusChanged extends Notification
{
    use Queueable;

    public function __construct(
        public string $status,
        public ?string $rejectionReason = null,
    ) {}

    public function via(User $notifiable): array
    {
        return ['database', 'mail'];
    }

    public function toDatabase(User $notifiable): array
    {
        $approved = $this->status === 'approved';
        return [
            'image' => $notifiable->image,
            'mainAction' => [
                'action' => url('/account-settings/verification'),
                'label' => __('View'),
            ],
            'lines' => [
                [
                    'content' => $approved
                        ? __('Your account verification has been approved.')
                        : __('Your account verification was rejected.'),
                    'type' => 'primary',
                ],
                $approved
                    ? [
                        'content' => __('You are now a verified creator and can request payouts.'),
                        'type' => 'secondary',
                    ]
                    : [
                        'content' => __('Reason: :reason', [
                            'reason' => $this->rejectionReason ?? __('No reason provided.'),
                        ]),
                        'type' => 'secondary',
                    ],
            ],
        ];
    }

    public function toMail(User $notifiable): MailMessage
    {
        $mail = new MailMessage();
        if ($this->status === 'approved') {
            $mail->subject(__('Verification approved'))
                ->greeting(__('Hi :name!', ['name' => $notifiable->name]))
                ->line(__('Your account has been successfully verified.'))
                ->line(__('You can now request payouts for your product sales.'));
        } else {
            $mail->subject(__('Verification rejected'))
                ->greeting(__('Hi :name!', ['name' => $notifiable->name]))
                ->line(__('Your account verification was rejected.'))
                ->line(__('Reason: :reason', [
                    'reason' => $this->rejectionReason ?? __('No reason provided.'),
                ]))
                ->line(__('You can submit a new verification request from your account settings.'));
        }
        return $mail->action(
            __('Go to verification'),
            url('/account-settings/verification'),
        );
    }
}
