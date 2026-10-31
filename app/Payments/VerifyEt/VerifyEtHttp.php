<?php

namespace App\Payments\VerifyEt;

use Illuminate\Http\Client\Factory;

class VerifyEtHttp
{
    public function factory(): Factory
    {
        return new Factory();
    }
}
