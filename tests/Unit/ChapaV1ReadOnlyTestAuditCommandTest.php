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

    private function fakeReadOnlyEndpoints(
        string $paymentStatus = 'success',
        string $transferStatus = 'pending',
        bool $asList = false,
        bool $missingIdentity = false,
    ): void {
        $transferData = [
            'status' => $transferStatus,
            'reference' => 'lk-po-TEST123',
            'currency' => 'ETB',
            'amount' => '20.00',
            'account_number' => '251911223344',
        ];
        if ($missingIdentity) {
            unset($transferData['reference'], $transferData['currency'], $transferData['amount']);
        }

        Http::fake([
            'https://api.chapa.co/v1/banks' => Http::response([
                'status' => 'success',
                'data' => [
                    ['id' => 855, 'slug' => 'telebirr', 'currency' => 'ETB', 'is_active' => 1, 'active' => 1],
                    ['id' => 266, 'slug' => 'mpesa', 'currency' => 'ETB', 'is_active' => 0, 'active' => 0],
                    ['id' => 333, 'slug' => 'awash_bank', 'name' => 'Awash Bank', 'currency' => 'ETB', 'is_active' => 1, 'active' => 1],
                    ['id' => 444, 'slug' => 'hibret_bank', 'name' => 'Hibret Bank', 'currency' => 'ETB', 'is_active' => 0, 'active' => 0],
                ],
            ]),
            'https://api.chapa.co/v1/balances' => Http::response([
                'status' => 'success',
                'data' => [['currency' => 'ETB', 'available_balance' => 100, 'ledger_balance' => 120]],
            ]),
            'https://api.chapa.co/v1/transaction/verify/*' => Http::response([
                'status' => 'success',
                'data' => [
                    'status' => $paymentStatus,
                    'tx_ref' => 'lk-checkout-TEST123',
                    'currency' => 'ETB',
                    'amount' => '12.34',
                    'email' => 'private-buyer@example.test',
                ],
            ]),
            'https://api.chapa.co/v1/transfers/verify/*' => Http::response([
                'status' => 'success',
                'data' => $asList ? [$transferData] : $transferData,
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
        // Artisan::output() drains the console output buffer; read it once.
        $output = Artisan::output();
        $this->assertStringContainsString('telebirr', $output);
        $this->assertStringContainsString('Awash Bank', $output);
        $this->assertStringNotContainsString('Hibret Bank', $output);
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

    public function testItVerifiesExistingChapaTestCheckoutWithoutDisclosingBuyerDataOrWriting(): void
    {
        $this->withSecret('CHASECK_TEST-fixture');
        $this->fakeReadOnlyEndpoints();

        $this->assertSame(0, Artisan::call('chapa:v1:audit-test', [
            '--payment-reference' => 'lk-checkout-TEST123',
            '--payment-amount-cents' => '1234',
        ]));
        $output = Artisan::output();
        $this->assertStringContainsString('ETB amount matches', $output);
        $this->assertStringNotContainsString('private-buyer@example.test', $output);
        $this->assertStringNotContainsString('CHASECK_TEST-fixture', $output);
        Http::assertSentCount(3);
        Http::assertNotSent(fn ($request) => $request->method() !== 'GET');
    }

    public function testWrongPaymentAmountFailsClosedWithGetOnlyProviderCalls(): void
    {
        $this->withSecret('CHASECK_TEST-fixture');
        $this->fakeReadOnlyEndpoints();

        $this->assertSame(1, Artisan::call('chapa:v1:audit-test', [
            '--payment-reference' => 'lk-checkout-TEST123',
            '--payment-amount-cents' => '1235',
        ]));
        Http::assertSentCount(3);
        Http::assertNotSent(fn ($request) => $request->method() !== 'GET');
    }

    public function testPendingCheckoutDoesNotPassSettlementAcceptance(): void
    {
        $this->withSecret('CHASECK_TEST-fixture');
        $this->fakeReadOnlyEndpoints('pending');

        $this->assertSame(1, Artisan::call('chapa:v1:audit-test', [
            '--payment-reference' => 'lk-checkout-TEST123',
            '--payment-amount-cents' => '1234',
        ]));
        $this->assertStringContainsString('pending', Artisan::output());
        Http::assertNotSent(fn ($request) => $request->method() !== 'GET');
    }

    public function testPaymentRequiresReferenceAndAmountBeforeAnyNetworkCall(): void
    {
        $this->withSecret('CHASECK_TEST-fixture');
        Http::fake();

        $this->assertSame(1, Artisan::call('chapa:v1:audit-test', [
            '--payment-reference' => 'lk-checkout-TEST123',
        ]));
        Http::assertNothingSent();
    }

    public function testConfirmedTestTransferCanBeAcceptedAgainstExactAmount(): void
    {
        $this->withSecret('CHASECK_TEST-fixture');
        $this->fakeReadOnlyEndpoints('success', 'success');

        $this->assertSame(0, Artisan::call('chapa:v1:audit-test', [
            '--reference' => 'lk-po-TEST123',
            '--transfer-amount-cents' => '2000',
        ]));
        $this->assertStringContainsString('settlement verified', Artisan::output());
        Http::assertSentCount(3);
        Http::assertNotSent(fn ($request) => $request->method() !== 'GET');
    }

    public function testPendingTransferCannotPassStrictSettlementAcceptance(): void
    {
        $this->withSecret('CHASECK_TEST-fixture');
        $this->fakeReadOnlyEndpoints();

        $this->assertSame(1, Artisan::call('chapa:v1:audit-test', [
            '--reference' => 'lk-po-TEST123',
            '--transfer-amount-cents' => '2000',
        ]));
        Http::assertSentCount(3);
        Http::assertNotSent(fn ($request) => $request->method() !== 'GET');
    }

    public function testOneRecordDataArrayVerifiesExistingTestTransferExactly(): void
    {
        $this->withSecret('CHASECK_TEST-fixture');
        $this->fakeReadOnlyEndpoints('success', 'success', asList: true);

        $this->assertSame(0, Artisan::call('chapa:v1:audit-test', [
            '--reference' => 'lk-po-TEST123',
            '--transfer-amount-cents' => '2000',
        ]));
        $output = Artisan::output();
        $this->assertStringContainsString('returned 1 record(s)', $output);
        $this->assertStringContainsString('settlement verified', $output);
        $this->assertStringNotContainsString('251911223344', $output);
        Http::assertNotSent(fn ($request) => $request->method() !== 'GET');
    }

    public function testListResponseWithoutIdentityDoesNotClaimSettlement(): void
    {
        $this->withSecret('CHASECK_TEST-fixture');
        $this->fakeReadOnlyEndpoints('success', 'success', asList: true, missingIdentity: true);

        $this->assertSame(1, Artisan::call('chapa:v1:audit-test', [
            '--reference' => 'lk-po-TEST123',
            '--transfer-amount-cents' => '2000',
        ]));
        $output = Artisan::output();
        $this->assertStringContainsString('reference matches', $output);
        $this->assertStringContainsString('no', $output);
        $this->assertStringNotContainsString('settlement verified', $output);
        Http::assertNotSent(fn ($request) => $request->method() !== 'GET');
    }

    public function testTransferAmountWithoutReferenceIsRejectedBeforeProviderCalls(): void
    {
        $this->withSecret('CHASECK_TEST-fixture');
        Http::fake();

        $this->assertSame(1, Artisan::call('chapa:v1:audit-test', [
            '--transfer-amount-cents' => '2000',
        ]));
        Http::assertNothingSent();
    }

    public function testQueuedTransferStringInListMatchesReferenceWithoutSettlement(): void
    {
        $this->withSecret('CHASECK_TEST-fixture');
        Http::fake([
            'https://api.chapa.co/v1/banks' => Http::response([
                'status' => 'success',
                'data' => [
                    ['id' => 855, 'slug' => 'telebirr', 'currency' => 'ETB', 'is_active' => 1, 'active' => 1],
                ],
            ]),
            'https://api.chapa.co/v1/balances' => Http::response([
                'status' => 'success',
                'data' => [['currency' => 'ETB', 'available_balance' => 0, 'ledger_balance' => 0]],
            ]),
            'https://api.chapa.co/v1/transfers/verify/*' => Http::response([
                'status' => 'success',
                'data' => ['lk-sim-1795115964-22952'],
            ]),
        ]);

        $this->assertSame(0, Artisan::call('chapa:v1:audit-test', [
            '--reference' => 'lk-sim-1795115964-22952',
        ]));
        $output = Artisan::output();
        $this->assertStringContainsString('reference matches', $output);
        $this->assertStringContainsString('yes', $output);
        $this->assertStringContainsString('queued', $output);
    }

    public function testQueuedTransferStringWithAmountWarnsWithoutCrashing(): void
    {
        $this->withSecret('CHASECK_TEST-fixture');
        Http::fake([
            'https://api.chapa.co/v1/banks' => Http::response([
                'status' => 'success',
                'data' => [
                    ['id' => 855, 'slug' => 'telebirr', 'currency' => 'ETB', 'is_active' => 1, 'active' => 1],
                ],
            ]),
            'https://api.chapa.co/v1/balances' => Http::response([
                'status' => 'success',
                'data' => [['currency' => 'ETB', 'available_balance' => 0, 'ledger_balance' => 0]],
            ]),
            'https://api.chapa.co/v1/transfers/verify/*' => Http::response([
                'status' => 'success',
                'data' => ['lk-sim-1795115964-22952'],
            ]),
        ]);

        $this->assertSame(1, Artisan::call('chapa:v1:audit-test', [
            '--reference' => 'lk-sim-1795115964-22952',
            '--transfer-amount-cents' => '100',
        ]));
        $output = Artisan::output();
        $this->assertStringContainsString('queued in Chapa Test Mode', $output);
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
