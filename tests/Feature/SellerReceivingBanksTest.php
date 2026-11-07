<?php

namespace Tests\Feature;

use App\Models\User;
use App\Storefront\Models\DirectPaymentMethod;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class SellerReceivingBanksTest extends TestCase
{
    use DatabaseTransactions;

    public function testSellerCanAddOnlyCbeTelebirrAndBankOfAbyssinia(): void
    {
        Storage::fake('local');
        DirectPaymentMethod::query()->where('code', 'awash')->update([
            'creator_setup_enabled' => true,
            'checkout_enabled' => true,
            'operationally_suspended' => false,
        ]);
        $creator = User::factory()->create();
        $this->withSession(['_token' => 'banks'])->withHeader('Referer', config('app.url'))->withHeader('X-CSRF-TOKEN', 'banks')
            ->actingAs($creator);

        $codes = collect($this->getJson('/api/v1/storefront/payment-methods')->assertOk()->json('available_methods'))->pluck('code')->all();
        $this->assertEqualsCanonicalizing(['cbe', 'telebirr', 'boa'], $codes);

        foreach (['telebirr' => '0912345678', 'cbe' => '1000123456789', 'boa' => '12345678'] as $bank => $account) {
            $this->postJson('/api/v1/storefront/payment-methods', [
                'provider' => $bank,
                'account_number' => $account,
                'account_name' => 'Test Recipient',
                'proof' => UploadedFile::fake()->create('proof.pdf', 10, 'application/pdf'),
            ])->assertCreated();
        }

        $this->postJson('/api/v1/storefront/payment-methods', [
            'provider' => 'mpesa',
            'account_number' => '0912345678',
            'account_name' => 'Test Recipient',
            'proof' => UploadedFile::fake()->create('proof.pdf', 10, 'application/pdf'),
        ])->assertUnprocessable();
    }
}
