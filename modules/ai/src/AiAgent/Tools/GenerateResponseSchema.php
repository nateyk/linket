<?php

namespace Ai\AiAgent\Tools;

use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

class GenerateResponseSchema
{
    protected array $arrays = [];
    protected array $properties = [];
    protected array $itemsCounter = [];

    public function execute(array $data)
    {
        $this->processData($data, '');

        return [
            'arrays' => $this->arrays,
            'properties' => $this->properties,
            'data' => $data,
        ];
    }

    protected function processData($data, string $path, $parentKey = null)
    {
        if (!is_array($data)) {
            // Add as property if not an array
            if ($path !== '') {
                $this->properties[] = [
                    'id' => Str::uuid()->toString(),
                    'path' =>
                        $path === '0'
                            ? '[root].[*]'
                            : str_replace('.0', '.[*]', $path),
                    'value' => is_string($data)
                        ? Str::limit($data, 100)
                        : $data,
                    'format' => $this->determineFormat($data),
                ];
            }
            return;
        }

        // Check if this is a non-associative array
        if (array_is_list($data)) {
            $name = $parentKey ?? $this->generateItemsName();

            $this->arrays[] = [
                'name' => $name,
                'path' => $path ?: '[root]',
            ];

            // Process only the first item as representative for all items in the array
            // We assume all children have the same structure
            if (!empty($data)) {
                $firstIndex = array_key_first($data);
                $firstItem = $data[$firstIndex];
                $childPath = ($path ?: '[root]') . '.' . $firstIndex;

                $item = is_array($firstItem)
                    ? array_reduce(
                        $data,
                        function ($carry, $item) {
                            return array_merge($carry, $item);
                        },
                        [],
                    )
                    : $firstItem;

                // Process the first item only
                $this->processData($item, $childPath, null);
            }
        } else {
            // Process each key-value pair in associative array
            foreach ($data as $key => $value) {
                $childPath = $path === '' ? $key : $path . '.' . $key;
                $this->processData($value, $childPath, $key);
            }
        }
    }

    protected function generateItemsName(): string
    {
        $baseName = 'items';

        if (!isset($this->itemsCounter[$baseName])) {
            $this->itemsCounter[$baseName] = 0;
            return $baseName;
        }

        $this->itemsCounter[$baseName]++;
        return $baseName . $this->itemsCounter[$baseName];
    }

    protected function determineFormat($value): string
    {
        if ($value === null) {
            return 'null';
        }

        if (is_bool($value)) {
            return 'boolean';
        }

        if (is_numeric($value)) {
            return 'number';
        }

        if (is_string($value)) {
            // Check if the string is a date
            if ($this->isDateString($value)) {
                return 'date';
            }
            return 'string';
        }

        // Default to string for any other types
        return 'string';
    }

    protected function isDateString(string $value): bool
    {
        try {
            Carbon::parse($value);
            return true;
        } catch (\Exception $e) {
            return false;
        }
    }
}
