<?php

namespace Database\Seeders;

use Common\Core\Install\CreateDefaultHelpCenter;
use Illuminate\Database\Seeder;

class CreateDefaultHelpCenterSeeder extends Seeder
{
    public function run(): void
    {
        (new CreateDefaultHelpCenter())->execute();
    }
}
