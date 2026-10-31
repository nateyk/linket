<?php

namespace App\Payments\VerifyEt;

use Illuminate\Http\Client\Factory;
use Illuminate\Http\Client\PendingRequest;

class VerifyEtExperimentHttp
{
    public function request(string $apiKey): PendingRequest
    {
        return (new Factory())->baseUrl('https://verify.et')
            ->withHeaders(['x-api-key' => $apiKey])
            ->acceptJson()->asJson()->connectTimeout(10)->timeout(30)
            ->withOptions(['allow_redirects' => false]);
    }
}
