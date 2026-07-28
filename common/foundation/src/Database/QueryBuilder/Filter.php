<?php

namespace Common\Database\QueryBuilder;

class Filter
{
    public string $key;
    public string $operator;
    public mixed $value;

    public function __construct(array $data)
    {
        $this->key = $data['key'];
        $this->operator = $this->normalizeOperator($data['operator'] ?? '=');
        $this->value = $this->normalizeValue($data['value']);
    }

    protected function normalizeOperator(string $operator): string
    {
        return match ($operator) {
            'eq' => '=',
            'neq' => '!=',
            'gt' => '>',
            'gte' => '>=',
            'lt' => '<',
            'lte' => '<=',
            default => $operator,
        };
    }

    protected function normalizeValue(mixed $value): mixed
    {
        return match ($value) {
            'true' => true,
            'false' => false,
            'null' => null,
            default => $value,
        };
    }
}
