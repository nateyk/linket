<?php

namespace App\CreatorServices\Actions;

use App\CreatorServices\Models\CreatorService;
use App\CreatorServices\Models\ServiceInquiry;
use App\CreatorServices\Notifications\NewServiceInquiryNotification;

class CreateServiceInquiry
{
    public function execute(CreatorService $service, array $data): ServiceInquiry
    {
        $inquiry = $service->inquiries()->create([
            'creator_service_package_id' => $data['package_id'] ?? null,
            'name' => trim((string) $data['name']),
            'email' => trim((string) $data['email']),
            'phone' => isset($data['phone']) && trim((string) $data['phone']) !== ''
                ? trim((string) $data['phone'])
                : null,
            'message' => trim((string) $data['message']),
            'status' => 'new',
        ]);

        $service->creator?->notify(new NewServiceInquiryNotification($inquiry->id));

        return $inquiry->load(['service', 'package']);
    }
}
