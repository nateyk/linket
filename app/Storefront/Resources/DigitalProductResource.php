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
            'learning_outcomes' => $this->learning_outcomes,
            'price_cents' => $this->price_cents,
            'currency' => $this->currency,
            'type' => $this->type ?? 'digital',
            'is_course' => ($this->type ?? 'digital') === 'course',
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
            'samples' => $this->creatorSamples(),
            // Always present (never whenLoaded): the product form treats a
            // missing key as "no placement" and would wipe it on the next
            // save. Falls back to an explicit query when the relation was
            // not eager-loaded, so correctness never depends on a
            // particular controller load() call.
            'biolink_ids' => $this->resource->relationLoaded('biolinks')
                ? $this->biolinks->pluck('id')->values()->all()
                : $this->resource->biolinks()->pluck('biolinks.id')->all(),
            'biolinks' => $this->whenLoaded('biolinks', fn() => $this->biolinks->map(fn($biolink) => [
                'id' => $biolink->id,
                'name' => $biolink->name,
                'short_url' => $biolink->short_url,
            ])),
            'course' => $this->whenLoaded('course', fn() => $this->course ? [
                'id' => $this->course->id,
                'require_sequential_completion' => $this->course->require_sequential_completion,
                'published_at' => $this->course->published_at,
                'instructor_user_id' => $this->course->instructor_user_id,
            ] : null),
            'approved_at' => $this->approved_at,
            'review_requested_at' => $this->review_requested_at,
            'has_pending_update' => $this->resource->hasPendingUpdate(),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }

    /**
     * Creator form hydration. Includes the file entry id so the form can
     * send it back. Public payloads must not use this shape.
     *
     * @return list<array{id: int, file_entry_id: int, title: ?string, kind: string, position: int, duration_ms: ?int, name: ?string, file_size: ?int, extension: ?string}>
     */
    private function creatorSamples(): array
    {
        $samples = $this->resource->relationLoaded('samples')
            ? $this->samples
            : $this->samples()->with('file')->orderBy('position')->get();

        if ($this->resource->relationLoaded('samples')) {
            $samples->loadMissing('file');
        }

        return $samples->map(fn ($sample): array => [
            'id' => $sample->id,
            'file_entry_id' => $sample->file_entry_id,
            'title' => $sample->title,
            'kind' => $sample->kind,
            'position' => $sample->position,
            'duration_ms' => $sample->duration_ms,
            'name' => $sample->file?->name,
            'file_size' => $sample->file?->file_size,
            'extension' => $sample->file?->extension,
        ])->values()->all();
    }
}
