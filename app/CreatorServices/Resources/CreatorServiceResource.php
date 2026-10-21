<?php

namespace App\CreatorServices\Resources;

use App\CreatorServices\Models\CreatorService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin CreatorService
 */
class CreatorServiceResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'slug' => $this->slug,
            'status' => $this->status,
            'currency' => $this->currency,
            'category' => $this->category,
            'service_category_id' => $this->service_category_id,
            'service_subcategory_id' => $this->service_subcategory_id,
            'service_category' => $this->whenLoaded('serviceCategory', fn () => $this->serviceCategory?->name),
            'service_subcategory' => $this->whenLoaded('serviceSubcategory', fn () => $this->serviceSubcategory?->name),
            'skills' => $this->skills ?? [],
            'short_description' => $this->short_description,
            'description' => $this->description,
            'video_url' => $this->video_url,
            'live_demo_url' => $this->live_demo_url,
            'contact_channels' => $this->contact_channels ?? [],
            'cover' => $this->whenLoaded('cover', fn () => $this->cover ? [
                'id' => $this->cover->id,
                'url' => $this->cover->url,
            ] : null),
            'gallery' => $this->whenLoaded('images', fn () => $this->images->map(fn ($image) => [
                'id' => $image->id,
                'file_entry_id' => $image->file_entry_id,
                'url' => $image->file?->url,
            ])->values()->all()),
            'packages' => $this->whenLoaded('packages', fn () => $this->packages->map(fn ($package) => [
                'id' => $package->id,
                'name' => $package->name,
                'description' => $package->description,
                'price_cents' => $package->price_cents,
                'currency' => $package->currency,
                'delivery_days' => $package->delivery_days,
                'revisions' => $package->revisions,
                'features' => $package->features ?? [],
                'position' => $package->position,
            ])->values()->all()),
            'faqs' => $this->whenLoaded('faqs', fn () => $this->faqs->map(fn ($faq) => [
                'id' => $faq->id,
                'question' => $faq->question,
                'answer' => $faq->answer,
                'position' => $faq->position,
            ])->values()->all()),
            'store' => $this->whenLoaded('store', fn () => $this->store ? [
                'id' => $this->store->id,
                'name' => $this->store->name,
                'short_url' => $this->store->short_url,
            ] : null),
            'starting_price_cents' => $this->startingPriceCents(),
            'inquiries_count' => (int) ($this->inquiries_count ?? 0),
            'new_inquiries_count' => (int) ($this->new_inquiries_count ?? 0),
            'public_url' => $this->publicUrl(),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }

    private function startingPriceCents(): ?int
    {
        $packages = $this->resource->relationLoaded('packages')
            ? $this->resource->packages
            : $this->resource->packages()->get();
        $prices = $packages
            ->pluck('price_cents')
            ->filter(fn ($price): bool => $price !== null);

        return $prices->isEmpty() ? null : (int) $prices->min();
    }
}
