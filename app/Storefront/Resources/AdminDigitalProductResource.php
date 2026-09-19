<?php

namespace App\Storefront\Resources;

use App\Storefront\Models\DigitalProduct;
use Dedoc\Scramble\Attributes\SchemaName;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin DigitalProduct
 */
#[SchemaName('AdminDigitalProduct')]
class AdminDigitalProductResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'description' => $this->description,
            'learning_outcomes' => $this->learning_outcomes,
            'type' => $this->type ?? 'digital',
            'is_course' => ($this->type ?? 'digital') === 'course',
            'status' => $this->status,
            'rejection_reason' => $this->rejection_reason,
            'review_requested_at' => $this->review_requested_at,
            'has_pending_update' => $this->resource->hasPendingUpdate(),
            'approved_at' => $this->approved_at,
            'price_cents' => $this->price_cents,
            'currency' => $this->currency,
            'sales_count' => (int) ($this->sales_count ?? 0),
            'reviews_count' => (int) ($this->reviews_count ?? 0),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
            'creator' => $this->whenLoaded('creator', fn () => [
                'id' => $this->creator->id,
                'name' => $this->creator->name,
                'email' => $this->creator->email,
                'username' => $this->creator->username,
            ]),
            'cover' => $this->whenLoaded('cover', fn () => $this->cover ? [
                'id' => $this->cover->id,
                'name' => $this->cover->name,
                'url' => $this->cover->url,
            ] : null),
            'files' => $this->whenLoaded('files', fn () => $this->files->map(fn ($file) => [
                'id' => $file->id,
                'name' => $file->name,
                'file_size' => $file->file_size,
                'extension' => $file->extension,
                'url' => $file->url,
            ])),
            'stores' => $this->whenLoaded('biolinks', fn () => $this->biolinks->map(fn ($store) => [
                'id' => $store->id,
                'name' => $store->name,
                'short_url' => $store->short_url,
            ])),
            'course' => $this->whenLoaded('course', fn () => $this->course ? [
                'id' => $this->course->id,
                'published_at' => $this->course->published_at,
                'chapters_count' => (int) ($this->course->chapters_count ?? 0),
                'lessons_count' => (int) ($this->course->lessons_count ?? 0),
                'published_lessons_count' => (int) ($this->course->published_lessons_count ?? 0),
            ] : null),
            'history' => $this->whenLoaded('reviewEvents', fn () => $this->reviewEvents->map(fn ($event) => [
                'id' => $event->id,
                'event' => $event->event,
                'actor_role' => $event->actor_role,
                'actor' => $event->actor ? ['id' => $event->actor->id, 'name' => $event->actor->name] : null,
                'from_status' => $event->from_status,
                'to_status' => $event->to_status,
                'reason' => $event->reason,
                'meta' => $event->meta,
                'created_at' => $event->created_at,
            ])),
        ];
    }
}
