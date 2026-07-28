<?php

namespace Database\Seeders;

use Common\Core\Install\CreateDefaultMenus;
use Illuminate\Database\Seeder;

class CreateDefaultMenusSeeder extends Seeder
{
    public function run(): void
    {
        (new CreateDefaultMenus())->execute();
    }
}
