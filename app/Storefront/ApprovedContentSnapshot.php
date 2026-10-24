<?php

namespace App\Storefront;

use App\Storefront\Models\DigitalProduct;

final class ApprovedContentSnapshot
{
    /**
     * @return array{
     *     title: string,
     *     description: ?string,
     *     learning_outcomes: ?array,
     *     price_cents: int,
     *     currency: string,
     *     type: string,
     *     cover_file_entry_id: ?int,
     *     file_ids: array<int, int>,
     *     sample_file_ids: array<int, int>,
     *     sample_titles: array<int|string, ?string>,
     *     sample_durations: array<int|string, ?int>
     * }
     */
    public function capture(DigitalProduct $product): array
    {
        $samples = $product->samples()->orderBy('position')->get();

        return [
            'title' => $product->title,
            'description' => $product->description,
            'learning_outcomes' => $product->learning_outcomes,
            'price_cents' => $product->price_cents,
            'currency' => $product->currency,
            'type' => $product->type ?? 'digital',
            'cover_file_entry_id' => $product->cover_file_entry_id,
            'file_ids' => $product->files()->pluck('file_entries.id')->sort()->values()->all(),
            // Order is the buyer-facing track order, so this list is not sorted.
            'sample_file_ids' => $samples->pluck('file_entry_id')->map(fn ($id): int => (int) $id)->all(),
            'sample_titles' => $samples->mapWithKeys(fn ($sample): array => [$sample->file_entry_id => $sample->title])->all(),
            'sample_durations' => $samples->mapWithKeys(fn ($sample): array => [$sample->file_entry_id => $sample->duration_ms])->all(),
        ];
    }
}
