<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Storefront\ChapaPayoutService;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use RuntimeException;
use Tests\TestCase;

class ChapaV1SupportedPayoutDestinationsTest extends TestCase
{
    public function testOnlyConfiguredActiveChapaV1ProvidersAreExposed(): void
    {
        config()->set('database.default', 'sqlite');
        config()->set('database.connections.sqlite.database', ':memory:');

        Schema::create('digital_product_withdrawal_methods', function (Blueprint $table): void {
            $table->id();
            $table->string('code');
            $table->string('name');
            $table->boolean('is_active');
            $table->timestamps();
        });

        try {
            foreach ([
                ['bank_transfer', true],
                ['cbebirr', true],
                ['mpesa', true],
                ['telebirr', true],
                ['yaya', false],
                ['paypal', true],
            ] as [$code, $enabled]) {
                DB::table('digital_product_withdrawal_methods')->insert([
                    'name' => $code, 'code' => $code, 'is_active' => $enabled,
                    'created_at' => now(), 'updated_at' => now(),
                ]);
            }

            $service = $this->service();
            $options = $service->availableBankOptions();

            $this->assertSame(['awash', 'cbebirr', 'cbe', 'telebirr'], array_column($options, 'code'));
            $this->assertSame(
                ['Awash Bank', 'CBEBirr', 'Commercial Bank of Ethiopia (CBE)', 'telebirr'],
                array_column($options, 'name')
            );
            $this->assertSame(202, $service->resolveBank('cbe')['id']);
            $this->assertSame(205, $service->resolveBank('yaya')['id']);
        } finally {
            Schema::dropIfExists('digital_product_withdrawal_methods');
        }
    }

    public function testUnsupportedProviderCannotBecomeAPayoutDestination(): void
    {
        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('not part of the supported Chapa payout methods');
        $this->service()->resolveBank('madeupbank');
    }

    public function testBankAliasesResolveToCurrentChapaIdsInsteadOfHardcodedIds(): void
    {
        $service = $this->service();
        $this->assertSame(206, $service->resolveBank('awash')['id']);
        $this->assertSame('awash', ChapaPayoutService::canonicalBankCode('Awash Bank'));
        $this->assertSame('boa', ChapaPayoutService::canonicalBankCode('Bank of Abyssinia'));
        $this->assertSame('dashen', ChapaPayoutService::canonicalBankCode('Dashen Bank'));
        $this->assertSame('hibret', ChapaPayoutService::canonicalBankCode('Hibret Bank'));
        $this->assertSame('nib', ChapaPayoutService::canonicalBankCode('Nib International Bank'));
        $this->assertSame('zemen', ChapaPayoutService::canonicalBankCode('Zemen Bank'));
    }

    public function testUnavailableChapaProviderCannotBeUsedForTransfers(): void
    {
        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('not available for ETB');
        $this->service()->resolveBank('mpesa');
    }

    private function service(): ChapaPayoutService
    {
        return new class extends ChapaPayoutService {
            public function getBanks(): array
            {
                return [
                    ['id' => 201, 'slug' => 'cbebirr', 'name' => 'CBEBirr', 'currency' => 'ETB', 'is_active' => 1, 'active' => 1],
                    ['id' => 202, 'slug' => 'cbe_bank', 'name' => 'Commercial Bank of Ethiopia (CBE)', 'currency' => 'ETB', 'is_active' => 1, 'active' => 1],
                    ['id' => 203, 'slug' => 'mpesa', 'name' => 'M-Pesa', 'currency' => 'ETB', 'is_active' => 0, 'active' => 1],
                    ['id' => 204, 'slug' => 'telebirr', 'name' => 'telebirr', 'currency' => 'ETB', 'is_active' => 1, 'active' => 1],
                    ['id' => 205, 'slug' => 'yaya_wallet', 'name' => 'YaYaWallet', 'currency' => 'ETB', 'is_active' => 1, 'active' => 1],
                    ['id' => 206, 'slug' => 'awash_bank', 'name' => 'Awash Bank', 'currency' => 'ETB', 'is_active' => 1, 'active' => 1],
                ];
            }
        };
    }
}
