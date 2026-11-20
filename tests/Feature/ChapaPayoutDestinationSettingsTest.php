<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\User;
use App\Storefront\ChapaPayoutService;
use App\Storefront\Models\DigitalProductWithdrawalMethod;
use Common\Permissions\Models\Permission;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Str;
use Tests\TestCase;

/**
 * Exercise the admin API rather than just the seller's filtered bank catalog.
 * All provider replies are local fixtures; no Chapa transfer is submitted.
 */
class ChapaPayoutDestinationSettingsTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();

        $admin = $this->makeUser();
        $admin->permissions()->attach(
            Permission::query()->firstOrCreate(['name' => 'admin'])
        );

        $this->stateful()->actingAs($admin);
        foreach ([
            'bank_transfer' => true,
            'telebirr' => true,
            'mpesa' => true,
            'cbebirr' => true,
            'yaya' => false,
        ] as $code => $active) {
            DigitalProductWithdrawalMethod::query()->updateOrCreate(
                ['code' => $code],
                [
                    'name' => $code,
                    'destination_label' => 'Account',
                    'minimum_amount_cents' => 100,
                    'maximum_amount_cents' => null,
                    'position' => 1,
                    'is_active' => $active,
                ],
            );
        }

        $this->bindBanks($this->activeBankFixture());
    }

    public function testAdminCatalogListsEachRecognizedBankAndOnlyAvailableWalletsAsEnabled(): void
    {
        $response = $this->getJson('/api/v1/admin/financial/chapa-payout-destinations')
            ->assertOk()
            ->assertJsonPath('provider_unavailable', false)
            ->assertJsonCount(11, 'data')
            ->assertJsonPath('data.0.code', 'awash')
            ->assertJsonPath('data.0.name', 'Awash Bank')
            ->assertJsonPath('data.0.provider_bank_id', 656)
            ->assertJsonPath('data.0.provider_available', true)
            ->assertJsonPath('data.0.admin_enabled', true)
            ->assertJsonPath('data.0.enabled', true)
            ->assertJsonPath('data.3.code', 'cbe')
            ->assertJsonPath('data.3.provider_bank_id', 946)
            ->assertJsonPath('data.8.code', 'telebirr')
            ->assertJsonPath('data.8.enabled', true)
            ->assertJsonPath('data.9.code', 'yaya')
            ->assertJsonPath('data.9.provider_available', false)
            ->assertJsonPath('data.9.enabled', false);

        $this->assertNull($response->json('data.9.provider_bank_id'));
    }

    public function testDisablingAndReenablingOneBankDoesNotDisableOtherBanks(): void
    {
        $url = '/api/v1/admin/financial/chapa-payout-destinations/awash';
        $this->putJson($url, ['enabled' => false])
            ->assertOk()
            ->assertJsonPath('data.admin_enabled', false);

        $this->assertSame(0, (int) settings('marketplace.payout_bank.awash.enabled', 1));
        $this->assertSame(1, (int) settings('marketplace.payout_bank.cbe.enabled', 1));

        $this->getJson('/api/v1/admin/financial/chapa-payout-destinations')
            ->assertJsonPath('data.0.enabled', false)
            ->assertJsonPath('data.3.enabled', true);

        $codes = array_column(app(ChapaPayoutService::class)->availableBankOptions(), 'code');
        $this->assertNotContains('awash', $codes);
        $this->assertContains('cbe', $codes);

        $this->putJson($url, ['enabled' => true])
            ->assertOk()
            ->assertJsonPath('data.admin_enabled', true);

        $this->assertContains(
            'awash',
            array_column(app(ChapaPayoutService::class)->availableBankOptions(), 'code'),
        );
    }

    public function testWalletSwitchUpdatesTheRealWithdrawalMethodInsteadOfBankFlags(): void
    {
        $url = '/api/v1/admin/financial/chapa-payout-destinations/telebirr';
        $this->putJson($url, ['enabled' => false])->assertOk();

        $this->assertFalse(
            (bool) DigitalProductWithdrawalMethod::query()->where('code', 'telebirr')->firstOrFail()->is_active
        );
        $this->getJson('/api/v1/admin/financial/chapa-payout-destinations')
            ->assertJsonPath('data.8.admin_enabled', false)
            ->assertJsonPath('data.8.enabled', false);

        $this->putJson($url, ['enabled' => true])->assertOk();

        $this->assertTrue(
            (bool) DigitalProductWithdrawalMethod::query()->where('code', 'telebirr')->firstOrFail()->is_active
        );
        $this->getJson('/api/v1/admin/financial/chapa-payout-destinations')
            ->assertJsonPath('data.8.enabled', true);
    }

    public function testAdminCannotEnableProviderThatChapaReportsInactiveOrUnrecognized(): void
    {
        foreach (['yaya', 'boa', 'nib'] as $code) {
            $this->putJson('/api/v1/admin/financial/chapa-payout-destinations/'.$code, [
                'enabled' => true,
            ])->assertUnprocessable()->assertJsonValidationErrors('enabled');
        }

        $this->putJson('/api/v1/admin/financial/chapa-payout-destinations/notreal', [
            'enabled' => true,
        ])->assertUnprocessable()->assertJsonValidationErrors('code');

        $this->putJson('/api/v1/admin/financial/chapa-payout-destinations/awash', [])
            ->assertUnprocessable()->assertJsonValidationErrors('enabled');
    }

    public function testBankEnableChecksChapaCurrencyIdAndBothActiveFlags(): void
    {
        $this->bindBanks([
            ['id' => 40, 'slug' => 'awash_bank', 'active' => 1, 'is_active' => 1, 'currency' => 'USD'],
            ['id' => 41, 'slug' => 'awash_bank', 'active' => 0, 'is_active' => 1, 'currency' => 'ETB'],
            ['id' => 42, 'slug' => 'awash_bank', 'active' => 1, 'is_active' => 0, 'currency' => 'ETB'],
            ['id' => 'invalid', 'slug' => 'awash_bank', 'active' => 1, 'is_active' => 1, 'currency' => 'ETB'],
        ]);

        $this->putJson('/api/v1/admin/financial/chapa-payout-destinations/awash', [
            'enabled' => true,
        ])->assertUnprocessable()->assertJsonValidationErrors('enabled');

        $this->getJson('/api/v1/admin/financial/chapa-payout-destinations')
            ->assertOk()
            ->assertJsonPath('data.0.provider_available', false)
            ->assertJsonPath('data.0.enabled', false);
    }

    public function testFailedProviderLookupKeepsCatalogVisibleButDisallowsActivation(): void
    {
        $this->app->instance(ChapaPayoutService::class, new class extends ChapaPayoutService {
            public function getBanks(): array
            {
                throw new \RuntimeException('Provider credentials must not reach the response');
            }
        });

        $this->getJson('/api/v1/admin/financial/chapa-payout-destinations')
            ->assertOk()
            ->assertJsonPath('provider_unavailable', true)
            ->assertJsonCount(11, 'data')
            ->assertJsonPath('data.0.provider_available', false)
            ->assertDontSee('Provider credentials must not reach the response');

        $this->putJson('/api/v1/admin/financial/chapa-payout-destinations/awash', [
            'enabled' => true,
        ])->assertUnprocessable()->assertJsonValidationErrors('enabled');
    }

    public function testDisablingBankDoesNotRequireChapaNetworkAvailability(): void
    {
        $this->bindBanks([]);
        $this->putJson('/api/v1/admin/financial/chapa-payout-destinations/awash', [
            'enabled' => false,
        ])->assertOk()->assertJsonPath('data.admin_enabled', false);
    }

    public function testNonAdminCannotReadOrChangePayoutDestinationConfiguration(): void
    {
        $user = $this->makeUser();
        $this->stateful()->actingAs($user);

        $this->getJson('/api/v1/admin/financial/chapa-payout-destinations')
            ->assertForbidden();

        $this->putJson('/api/v1/admin/financial/chapa-payout-destinations/awash', [
            'enabled' => false,
        ])->assertForbidden();
    }

    private function makeUser(): User
    {
        return User::query()->forceCreate([
            'name' => 'Payout settings test',
            'username' => Str::lower(Str::random(10)),
            'email' => Str::random(12).'@example.test',
            'password' => bcrypt('password'),
            'email_verified_at' => now(),
        ]);
    }

    private function stateful(): static
    {
        $csrf = 'payout-settings-coverage-csrf';
        return $this->withSession(['_token' => $csrf])
            ->withHeader('Referer', config('app.url'))
            ->withHeader('X-CSRF-TOKEN', $csrf);
    }

    /** @return array<int, array<string, mixed>> */
    private function activeBankFixture(): array
    {
        return [
            ['id' => 656, 'slug' => 'awash_bank', 'name' => 'Awash Bank', 'currency' => 'ETB', 'active' => 1, 'is_active' => 1],
            ['id' => 347, 'slug' => 'bank_of_abyssinia', 'name' => 'Bank of Abyssinia', 'currency' => 'ETB', 'active' => 1, 'is_active' => 0],
            ['id' => 946, 'slug' => 'cbe_bank', 'name' => 'Commercial Bank of Ethiopia (CBE)', 'currency' => 'ETB', 'active' => 1, 'is_active' => 1],
            ['id' => 855, 'slug' => 'telebirr', 'name' => 'telebirr', 'currency' => 'ETB', 'active' => 1, 'is_active' => 1],
            ['id' => 205, 'slug' => 'yayawallet', 'name' => 'YaYaWallet', 'currency' => 'ETB', 'active' => 0, 'is_active' => 1],
        ];
    }

    /** @param array<int, array<string, mixed>> $banks */
    private function bindBanks(array $banks): void
    {
        $this->app->instance(ChapaPayoutService::class, new class($banks) extends ChapaPayoutService {
            public function __construct(private array $banks) {}

            public function getBanks(): array
            {
                return $this->banks;
            }
        });
    }
}
