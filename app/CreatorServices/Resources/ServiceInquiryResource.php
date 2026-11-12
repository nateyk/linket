<?php

namespace App\CreatorServices\Resources;

use App\CreatorServices\Models\ServiceInquiry;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin ServiceInquiry
 */
class ServiceInquiryResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'phone' => $this->phone,
            'message' => $this->message,
            'question_answers' => $this->question_answers ?? [],
            'status' => $this->status,
            'read_at' => $this->read_at,
            'created_at' => $this->created_at,
            'service' => $this->whenLoaded('service', fn () => $this->service ? [
                'id' => $this->service->id,
                'title' => $this->service->title,
                'slug' => $this->service->slug,
            ] : null),
            'package' => $this->whenLoaded('package', fn () => $this->package ? [
                'id' => $this->package->id,
                'name' => $this->package->name,
            ] : null),
        ];
    }
}
