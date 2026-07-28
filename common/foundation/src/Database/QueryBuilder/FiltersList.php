<?php

namespace Common\Database\QueryBuilder;

use Illuminate\Support\Collection;

class FiltersList
{
    protected Collection $filters;

    protected array $supportedOperators = [
        'eq',
        'ne',
        'gt',
        'gte',
        'lt',
        'lte',
        'contains',
    ];

    public function __construct(
        protected array $filterableFields,
        protected array $params = [],
    ) {
        $this->filters = $this->parseFiltersFromParams();
    }

    public function all(): Collection
    {
        return $this->filters;
    }

    public function add(
        string $key,
        string $operator,
        mixed $value,
        bool $overwrite = true,
    ): self {
        $filter = new Filter([
            'key' => $key,
            'operator' => $operator,
            'value' => $value,
        ]);

        $index = $this->filters->search(
            fn(Filter $filter) => $filter->key === $key,
        );

        if ($overwrite) {
            if ($index !== false) {
                $this->filters->put($index, $filter);
            } else {
                $this->filters->push($filter);
            }
        } elseif ($index === false) {
            $this->filters->push($filter);
        }

        return $this;
    }

    public function remove(string $key): self
    {
        $this->filters = $this->filters->filter(
            fn(Filter $filter) => $filter->key !== $key,
        );
        return $this;
    }

    protected function parseFiltersFromParams(): Collection
    {
        return collect($this->params)
            ->filter(
                fn($value, $key) => in_array($key, $this->filterableFields),
            )
            ->map(
                // multiple date filters might also be separted by comma
                function ($value, $key) {
                    if (is_string($value) && str_ends_with($key, '_at')) {
                        $dateFilters = explode(',', $value);
                        return collect($dateFilters)->map(
                            fn($dateFilter) => $this->parseFilterValue(
                                $key,
                                $dateFilter,
                            ),
                        );
                    }

                    // there can be multiple filters for the same key
                    return collect($value)->map(
                        fn($value) => $this->parseFilterValue($key, $value),
                    );
                },
            )
            ->flatten(1)
            ->values();
    }

    protected function parseFilterValue(string $key, string $value): Filter
    {
        $parts = explode(':', $value, 2);

        return new Filter([
            'key' => $key,
            'operator' => count($parts) === 2 ? $parts[0] : '=',
            'value' => count($parts) === 2 ? $parts[1] : $value,
        ]);
    }
}
