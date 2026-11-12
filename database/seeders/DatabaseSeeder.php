<?php

namespace Database\Seeders;

use Common\Database\Seeders\RolesTableSeeder;
use Common\Database\Seeders\CssThemesTableSeeder;
use Common\Database\Seeders\LocalizationsTableSeeder;
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
            SupportDefaultsSeeder::class,
            CssThemesTableSeeder::class,
            ServiceCategoriesSeeder::class,
            // Make English and actual Amharic UI translations available on fresh installs.
            LocalizationsTableSeeder::class,
            AmharicLocalizationSeeder::class,
        ]);
    }
}
