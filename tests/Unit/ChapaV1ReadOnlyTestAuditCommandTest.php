<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Payments\Chapa\LinketChapaManager;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Http;
use Mockery;
use Tests\TestCase;

class ChapaV1ReadOnlyTestAuditCommandTest extends TestCase
{
    private function withSecret(string $secret): void
    {
        $manager = Mockery::mock(LinketChapaManager::class);
        $manager->shouldReceive('platformSecret')->andReturn($secret);
        $this->app->instance(LinketChapaManager::class, $manager);
    }

    private function fakeReadOnlyEndpoints(): void
    {
        Http::fake([
            'https://api.chapa.co/v1/banks' => Http::response([
                'status' => 'success',
                'data' => [
                    ['id' => 855, 'slug' => 'telebirr', 'currency' => 'ETB', 'is_active' => 1, 'active' => 1],
                    ['id' => 266, 'slug' => 'mpesa', 'currency' => 'ETB', 'is_active' => 0, 'active' => 0],
                ],
            ]),
            'https://api.chapa.co/v1/balances' => Http::response([
                'status' => 'success',
                'data' => [['currency' => 'ETB', 'available_balance' => 100, 'ledger_balance' => 120]],
            ]),
            'https://api.chapa.co/v1/transfers/verify/*' => Http::response([
                'status' => 'success',
                'data' => [
                    'status' => 'pending',
                    'reference' => 'lk-po-TEST123',
                    'currency' => 'ETB',
                    'amount' => '20.00',
                    'account_number' => '251911223344',
                ],
            ]),
        ]);
    }

    public function testItRejectsLiveCredentialsWithoutMakingAnyNetworkRequest(): void
    {
        $this->withSecret('CHASECK_LIVE-do-not-use');
        Http::fake();

        $this->assertSame(1, Artisan::call('chapa:v1:audit-test'));
        $this->assertStringContainsString('Requires a Chapa TEST secret key', Artisan::output());
        Http::assertNothingSent();
    }

    public function testItRejectsInvalidReferenceWithoutNetworkRequest(): void
    {
        $this->withSecret('CHASECK_TEST-fake');
        Http::fake();

        $this->assertSame(1, Artisan::call('chapa:v1:audit-test', ['--reference' => '../unsafe']));
        Http::assertNothingSent();
    }

    public function testItListsTestWalletsAndBalanceUsingOnlyGetRequests(): void
    {
        $this->withSecret('CHASECK_TEST-fake');
        $this->fakeReadOnlyEndpoints();

        $this->assertSame(0, Artisan::call('chapa:v1:audit-test'));
        $this->assertStringContainsString('telebirr', Artisan::output());
        Http::assertSent(fn ($request) => $request->url() === 'https://api.chapa.co/v1/balances');
        Http::assertSentCount(2);
        Http::assertNotSent(fn ($request) => $request->method() !== 'GET');
    }

    public function testItInspectsExistingReferenceWithoutPrintingRecipientData(): void
    {
        $this->withSecret('CHASECK_TEST-fake');
        $this->fakeReadOnlyEndpoints();

        $this->assertSame(0, Artisan::call('chapa:v1:audit-test', [
            '--reference' => 'lk-po-TEST123',
        ]));
        $output = Artisan::output();
        $this->assertStringContainsString('pending', $output);
        $this->assertStringContainsString('reference matches', $output);
        $this->assertStringNotContainsString('251911223344', $output);
        $this->assertStringNotContainsString('CHASECK_TEST-fake', $output);
        Http::assertSentCount(3);
        Http::assertNotSent(fn ($request) => $request->method() === 'POST');
    }

    public function testUnexpectedProviderShapeFailsWithoutTransferSubmission(): void
    {
        $this->withSecret('CHASECK_TEST-fake');
        Http::fake([
            'https://api.chapa.co/v1/banks' => Http::response([
                'status' => 'success', 'data' => [],
            ]),
            'https://api.chapa.co/v1/balances' => Http::response([
                'status' => 'success', 'data' => ['not-a-balance-list'],
            ]),
        ]);

        $this->assertSame(1, Artisan::call('chapa:v1:audit-test'));
        $this->assertStringContainsString('did not complete', Artisan::output());
        Http::assertNotSent(fn ($request) => $request->method() === 'POST');
    }
}
