<?php

namespace App\Kyc\Notifications;

use App\Kyc\Models\KycVerification;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class KycPendingAdminNotification extends Notification
{
    use Queueable;

    public function __construct(public KycVerification $kycVerification)
    {
    }

    public function via(User $notifiable): array
    {
        return ['database'];
    }

    public function toDatabase(User $notifiable): array
    {
        $user = $this->kycVerification->user;
        return [
            'image' => $user?->image,
            'mainAction' => [
                'action' => url('/admin/kyc-verifications'),
                'label' => __('Review'),
            ],
            'lines' => [
                [
                    'content' => __('New KYC verification request from :name.', [
                        'name' => $user?->name ?? __('Unknown user'),
                    ]),
                    'icon' => 'kyc',
                    'type' => 'primary',
                ],
                [
                    'content' => __(':type · :number', [
                        'type' => $this->kycVerification->document_type ===
                            KycVerification::DOCUMENT_TYPE_PASSPORT
                            ? __('Passport')
                            : __('National ID'),
                        'number' => $this->kycVerification->document_number,
                    ]),
                    'type' => 'secondary',
                ],
            ],
        ];
    }
}
