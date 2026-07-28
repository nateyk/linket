<?php

namespace Common\Permissions\Config;

use Illuminate\Contracts\Support\Arrayable;

class RestrictionConfigItem implements Arrayable
{
    public string $name;
    public string $displayName;
    public string $type;
    public string $description;

    public function __construct(array $config)
    {
        $this->name = $config['name'];
        $this->displayName = $config['display_name'] ?? $config['name'];
        $this->type = $config['type'];
        $this->description = $config['description'];
    }

    public function toArray(): array
    {
        return [
            'name' => $this->name,
            'display_name' => $this->displayName,
            /**
             * @var 'bool' | 'number'
             */
            'type' => $this->type,
            'description' => $this->description,
        ];
    }
}
