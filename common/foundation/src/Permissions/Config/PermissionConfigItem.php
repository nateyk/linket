<?php

namespace Common\Permissions\Config;

use Illuminate\Contracts\Support\Arrayable;
use Common\Permissions\Config\RestrictionConfigItem;

class PermissionConfigItem implements Arrayable
{
    public int $id;
    public string $name;
    public string $displayName;
    public string $group;
    public string $description;
    public array $roleTypes;

    /**
     * @var array<RestrictionConfigItem>
     */
    public array $restrictions;

    public function __construct(array $config)
    {
        $this->id = $config['id'] ?? 0;
        $this->name = $config['name'];
        $this->displayName = $config['display_name'] ?? $config['name'];
        $this->group = $config['group'];
        $this->description = $config['description'] ?? '';
        $this->restrictions = array_map(
            fn(array $restriction) => new RestrictionConfigItem($restriction),
            $config['restrictions'] ?? [],
        );
        $this->roleTypes = $config['role_types'] ?? [];
    }

    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'display_name' => $this->displayName,
            'group' => $this->group,
            'description' => $this->description,
            /**
             * @var array<array{name: string, display_name: string, type: 'bool' | 'number', description: string}>
             */
            'restrictions' => array_map(
                fn(
                    RestrictionConfigItem $restriction,
                ) => $restriction->toArray(),
                $this->restrictions,
            ),
        ];
    }
}
