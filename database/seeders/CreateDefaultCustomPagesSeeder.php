<?php

namespace Database\Seeders;

use Common\Core\Install\CreateDefaultCustomPages;
use Illuminate\Database\Seeder;

class CreateDefaultCustomPagesSeeder extends Seeder
{
    public function run(): void
    {
        (new CreateDefaultCustomPages())->execute();
    }
}
