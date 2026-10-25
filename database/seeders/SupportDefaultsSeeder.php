<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

/**
 * Platform support defaults (BeDesk-native): group, statuses, attributes, inbox views.
 */
class SupportDefaultsSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            \Common\Database\Seeders\PermissionTableSeeder::class,
            SupportAgentsRoleSeeder::class,
            DefaultGroupSeeder::class,
            ConversationStatusesSeeder::class,
            InternalAttributesSeeder::class,
            DefaultViewsSeeder::class,
        ]);
    }
}
