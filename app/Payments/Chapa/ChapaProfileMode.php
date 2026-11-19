<?php

declare(strict_types=1);

namespace App\Payments\Chapa;

enum ChapaProfileMode: string
{
    case Test = 'test';
    case Live = 'live';
}
