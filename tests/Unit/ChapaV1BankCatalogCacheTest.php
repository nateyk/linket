<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Payments\Chapa\LinketChapaManager;
use App\Storefront\ChapaPayoutService;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class ChapaV1BankCatalogCacheTest extends TestCase
{
    public function testChangingMerchantCredentialsDoesNotReuseAnotherBanksCatalog(): void
    {
        Cache::flush();
        Http::fakeSequence()
            ->push([
                'status' => 'success',
                'data' => [['id' => 10, 'slug' => 'telebirr', 'currency' => 'ETB']],
            ])
            ->push([
                'status' => 'success',
                'data' => [['id' => 20, 'slug' => 'mpesa', 'currency' => 'ETB']],
            ]);

        $secret = 'CHASECK_TEST-cache-merchant-one';
        $manager = $this->createMock(LinketChapaManager::class);
        $manager->method('platformSecret')->willReturnCallback(
            static function () use (&$secret): string {
                return $secret;
            },
        );
        $this->app->instance(LinketChapaManager::class, $manager);

        $service = app(ChapaPayoutService::class);
        $this->assertSame('telebirr', $service->getBanks()[0]['slug']);

        $secret = 'CHASECK_TEST-cache-merchant-two';
        $this->assertSame('mpesa', $service->getBanks()[0]['slug']);

        $secret = 'CHASECK_TEST-cache-merchant-one';
        $this->assertSame('telebirr', $service->getBanks()[0]['slug']);
        Http::assertSentCount(2);
        $this->assertNull(Cache::get('chapa:v1:transfer-banks'));
    }

    public function testMissingSecretDoesNotReturnAnotherMerchantsCachedCatalog(): void
    {
        $manager = $this->createMock(LinketChapaManager::class);
        $manager->method('platformSecret')->willReturn('');
        $this->app->instance(LinketChapaManager::class, $manager);
        Http::fake();

        $this->expectExceptionMessage('Chapa secret is not configured');
        try {
            app(ChapaPayoutService::class)->getBanks();
        } finally {
            Http::assertNothingSent();
        }
    }
}
