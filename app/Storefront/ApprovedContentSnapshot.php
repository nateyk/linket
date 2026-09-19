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
     *     file_ids: array<int, int>
     * }
     */
    public function capture(DigitalProduct $product): array
    {
        return [
            'title' => $product->title,
            'description' => $product->description,
            'learning_outcomes' => $product->learning_outcomes,
            'price_cents' => $product->price_cents,
            'currency' => $product->currency,
            'type' => $product->type ?? 'digital',
            'cover_file_entry_id' => $product->cover_file_entry_id,
            'file_ids' => $product->files()->pluck('file_entries.id')->sort()->values()->all(),
        ];
    }
}
