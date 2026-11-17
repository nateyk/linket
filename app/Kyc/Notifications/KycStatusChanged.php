<?php

namespace App\Kyc\Notifications;

use App\Models\User;
use Illuminate\Bus\Queueable;
use App\Mail\ReactEmailMailable;
use App\Mail\ReactEmailMessage;
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

    public function toMail(User $notifiable): ReactEmailMailable
    {
        $heading = __('Hi :name!', ['name' => $notifiable->name]);
        $action = __('Go to verification');
        $url = url('/account-settings/verification');

        if ($this->status === 'approved') {
            return ReactEmailMessage::toNotifiable(
                $notifiable,
                __('Verification approved'),
                __('Your account verification has been approved.'),
                $heading,
                [
                    __('Your account has been successfully verified.'),
                    __('You can now request payouts for your product sales.'),
                ],
                $action,
                $url,
            );
        }

        return ReactEmailMessage::toNotifiable(
            $notifiable,
            __('Verification rejected'),
            __('Your account verification was rejected.'),
            $heading,
            [
                __('Your account verification was rejected.'),
                __('Reason: :reason', [
                    'reason' => $this->rejectionReason ?? __('No reason provided.'),
                ]),
                __('You can submit a new verification request from your account settings.'),
            ],
            $action,
            $url,
        );
    }
}
