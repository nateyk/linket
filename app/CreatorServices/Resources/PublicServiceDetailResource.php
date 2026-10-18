<?php

namespace App\CreatorServices\Resources;

use App\CreatorServices\Models\CreatorService;
use Illuminate\Http\Request;

/**
 * @mixin CreatorService
 */
class PublicServiceDetailResource extends PublicServiceResource
{
    public function toArray(Request $request): array
    {
        return [
            ...parent::toArray($request),
            'description' => $this->description,
            'gallery' => $this->whenLoaded('images', fn () => $this->images->map(fn ($image) => [
                'id' => $image->id,
                'url' => $image->file?->url,
            ])->values()->all()),
            'video_url' => $this->video_url,
            'live_demo_url' => $this->live_demo_url,
            'contact_channels' => $this->contact_channels ?? [],
            'packages' => $this->whenLoaded('packages', fn () => $this->packages->map(fn ($package) => [
                'id' => $package->id,
                'name' => $package->name,
                'description' => $package->description,
                'price_cents' => $package->price_cents,
                'currency' => $package->currency,
                'delivery_days' => $package->delivery_days,
                'revisions' => $package->revisions,
                'features' => $package->features ?? [],
            ])->values()->all()),
            'faqs' => $this->whenLoaded('faqs', fn () => $this->faqs->map(fn ($faq) => [
                'id' => $faq->id,
                'question' => $faq->question,
                'answer' => $faq->answer,
            ])->values()->all()),
        ];
    }
}
