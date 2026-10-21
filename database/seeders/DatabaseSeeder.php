<?php

namespace Database\Seeders;

use Common\Database\Seeders\RolesTableSeeder;
use Common\Database\Seeders\CssThemesTableSeeder;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            RolesTableSeeder::class,
            AdminUserSeeder::class,
            DefaultSettingsSeeder::class,
            CreateDefaultMenusSeeder::class,
            CreateDefaultCustomPagesSeeder::class,
            CreateDefaultHelpCenterSeeder::class,
            CssThemesTableSeeder::class,
            ServiceCategoriesSeeder::class,
        ]);
    }
}
