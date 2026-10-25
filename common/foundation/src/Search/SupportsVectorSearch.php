<?php

namespace Common\Search;

use Illuminate\Support\Collection;

/**
 * Minimal vector-search helpers for AI agent chunks.
 * Full Meilisearch/vector driver wiring can replace this stub later.
 */
trait SupportsVectorSearch
{
    public static function searchUsingVector(
        array $vector,
        int $limit = 5,
        ?string $distinctAttribute = null,
        ?array $categoryIds = [],
    ): Collection {
        return collect();
    }
}
