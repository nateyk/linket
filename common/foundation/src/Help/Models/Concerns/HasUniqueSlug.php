<?php

namespace Common\Help\Models\Concerns;

use Illuminate\Support\Str;

trait HasUniqueSlug
{
    public static function generateUniqueSlug(string $source, string $column, ?int $ignoreId = null): string
    {
        $base = Str::slug($source);
        $base = $base !== '' ? $base : 'item';

        $slug = $base;
        $counter = 2;

        while (
            static::query()
                ->where($column, $slug)
                ->when($ignoreId !== null, fn ($query) => $query->where('id', '!=', $ignoreId))
                ->exists()
        ) {
            $slug = "{$base}-{$counter}";
            $counter++;
        }

        return $slug;
    }
}
