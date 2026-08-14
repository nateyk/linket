<?php

namespace App\Storefront\Resources;

use App\Storefront\Models\DigitalProduct;
use Dedoc\Scramble\Attributes\SchemaName;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin DigitalProduct
 */
#[SchemaName('DigitalProduct')]
class DigitalProductResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'description' => $this->description,
            'price_cents' => $this->price_cents,
            'currency' => $this->currency,
            'status' => $this->status,
            'rejection_reason' => $this->rejection_reason,
            'sales_count' => (int) ($this->sales_count ?? 0),
            'gross_revenue_cents' => (int) ($this->gross_revenue_cents ?? 0),
            'cover_file_entry_id' => $this->cover_file_entry_id,
            'cover' => $this->whenLoaded('cover', fn() => $this->cover ? [
                'id' => $this->cover->id,
                'name' => $this->cover->name,
                'url' => $this->cover->url,
            ] : null),
            'files' => $this->whenLoaded('files', fn() => $this->files->map(fn($file) => [
                'id' => $file->id,
                'name' => $file->name,
                'file_size' => $file->file_size,
                'extension' => $file->extension,
            ])),
            'biolink_ids' => $this->whenLoaded('biolinks', fn() => $this->biolinks->pluck('id')->values()),
            'biolinks' => $this->whenLoaded('biolinks', fn() => $this->biolinks->map(fn($biolink) => [
                'id' => $biolink->id,
                'name' => $biolink->name,
                'short_url' => $biolink->short_url,
            ])),
            'approved_at' => $this->approved_at,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
