<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Models\User;
use App\Storefront\Models\PayoutRequest;
use App\Storefront\Services\AdminPayoutStepUp;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class AdminPayoutStepUpTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        config()->set('cache.default', 'array');
        config()->set('services.chapa.admin_payout_step_up_required', true);
    }

    private function payout(): PayoutRequest
    {
        $payout = new PayoutRequest();
        $payout->id = 123;
        $payout->amount_cents = 50000;
        $payout->currency = 'ETB';
        $payout->payout_method_label = 'Telebirr ending 3344';

        return $payout;
    }

    private function request(array $changes = []): Request
    {
        $admin = new User();
        $admin->id = 99;
        $admin->password = Hash::make('valid-admin-password');
        $data = array_merge([
            'admin_password' => 'valid-admin-password',
            'confirmation_id' => 123,
            'confirmation_amount_cents' => 50000,
            'confirmation_currency' => 'ETB',
            'confirmation_destination_label' => 'Telebirr ending 3344',
        ], $changes);
        $request = Request::create('/api/v1/admin/withdrawals/123/submit-transfer', 'POST', $data);
        $request->setUserResolver(fn () => $admin);

        return $request;
    }

    public function testCorrectAdminPasswordAndExactWithdrawalSnapshotPasses(): void
    {
        app(AdminPayoutStepUp::class)->confirm($this->request(), $this->payout());
        $this->assertTrue(true);
    }

    public function testWrongAdminPasswordFailsClosed(): void
    {
        $this->expectException(ValidationException::class);
        app(AdminPayoutStepUp::class)->confirm(
            $this->request(['admin_password' => 'wrong-password']),
            $this->payout()
        );
    }

    public function testStaleAmountAndDestinationCannotConfirmDifferentWithdrawal(): void
    {
        foreach ([
            ['confirmation_amount_cents' => 50001],
            ['confirmation_destination_label' => 'CBE ending 1234'],
            ['confirmation_id' => 124],
        ] as $changes) {
            try {
                app(AdminPayoutStepUp::class)->confirm($this->request($changes), $this->payout());
                $this->fail('A stale or mismatched withdrawal confirmation must be rejected.');
            } catch (ValidationException) {
                $this->assertTrue(true);
            }
        }
    }

    public function testOptionalStepUpDisabledDoesNotChangeExistingTestModeFlow(): void
    {
        config()->set('services.chapa.admin_payout_step_up_required', false);
        app(AdminPayoutStepUp::class)->confirm($this->request(['admin_password' => '']), $this->payout());
        $this->assertTrue(true);
    }
}
