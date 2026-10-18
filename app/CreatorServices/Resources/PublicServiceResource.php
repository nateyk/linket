<?php

namespace App\CreatorServices\Resources;

use App\CreatorServices\Models\CreatorService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin CreatorService
 */
class PublicServiceResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $packages = $this->relationLoaded('packages') ? $this->packages : collect();
        $prices = $packages
            ->pluck('price_cents')
            ->filter(fn ($price): bool => $price !== null);

        return [
            'id' => $this->id,
            'slug' => $this->slug,
            'title' => $this->title,
            'category' => $this->category,
            'short_description' => $this->short_description,
            'skills' => $this->skills ?? [],
            'cover' => $this->whenLoaded('cover', fn () => $this->cover ? [
                'url' => $this->cover->url,
            ] : null),
            'packages_count' => (int) ($this->packages_count ?? $packages->count()),
            'starting_price_cents' => $prices->isEmpty() ? null : (int) $prices->min(),
            'currency' => $this->currency,
            'public_url' => $this->publicUrl(),
        ];
    }
}
