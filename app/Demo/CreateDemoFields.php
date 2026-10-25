<?php

namespace App\Demo;

use App\Attributes\Models\CustomAttribute;
use App\HelpCenter\Models\HcCategory;

class CreateDemoFields
{
    public function execute()
    {
        $this->updateCategoryField();

        if (
            ! CustomAttribute::withoutGlobalScopes()
                ->where('key', 'phone')
                ->where('type', 'user')
                ->exists()
        ) {
            CustomAttribute::insert([
                [
                    'name' => 'Phone',
                    'key' => 'phone',
                    'type' => 'user',
                    'format' => 'phone',
                    'permission' => 'customerCanEdit',
                    'active' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ],
            ]);
        }
    }

    protected function updateCategoryField()
    {
        $categoryField = CustomAttribute::withoutGlobalScopes()
            ->where('key', 'category')
            ->first();
        if (! $categoryField) {
            return;
        }

        $hcCategories = HcCategory::get();
        $idFor = fn(string $name) => $hcCategories->where('name', $name)->first()?->id;

        $config = [
            'options' => array_values(
                array_filter([
                    $idFor('Shipping Methods')
                        ? [
                            'label' => 'Shipping issues',
                            'value' => 'shipping',
                            'hcCategories' => [$idFor('Shipping Methods')],
                        ]
                        : null,
                    $idFor('Troubleshooting')
                        ? [
                            'label' => 'Subscriptions and billing',
                            'value' => 'payment',
                            'hcCategories' => [$idFor('Troubleshooting')],
                        ]
                        : null,
                    $idFor('Getting Started')
                        ? [
                            'label' => 'Installation',
                            'value' => 'installation',
                            'hcCategories' => [$idFor('Getting Started')],
                        ]
                        : null,
                    $idFor('Customization')
                        ? [
                            'label' => 'Settings & configuration',
                            'value' => 'configuration',
                            'hcCategories' => [$idFor('Customization')],
                        ]
                        : null,
                ]),
            ),
        ];

        if ($config['options'] === []) {
            return;
        }

        $categoryField->update([
            'customer_name' => 'Hi, what can we help you with?',
            'config' => $config,
        ]);
    }
}
