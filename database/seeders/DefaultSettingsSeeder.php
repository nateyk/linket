<?php

namespace Database\Seeders;

use Common\Core\Install\InsertDefaultSettings;
use Illuminate\Database\Seeder;

class DefaultSettingsSeeder extends Seeder
{
    public function run(): void
    {
        (new InsertDefaultSettings())->execute();
    }
}
