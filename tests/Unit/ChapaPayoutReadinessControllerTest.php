<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Payments\Chapa\LinketChapaManager;
use App\Storefront\Controllers\ChapaPayoutReadinessController;
use App\Storefront\Services\ChapaV1PayoutMode;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Mockery;
use Tests\TestCase;

class ChapaPayoutReadinessControllerTest extends TestCase
{
    public function testAdminReadinessReturnsStatusAndPublicUrlButNeverSecrets(): void
    {
        Gate::shouldReceive('authorize')->once()->with('admin.access');
        config()->set('app.url', 'https://linket.example.test');
        config()->set('services.chapa.test_payouts_enabled', true);
        config()->set('services.chapa.secret', 'CHASECK_TEST-fixture-key-never-returned');
        config()->set('services.chapa.transfer_approval_secret', 'fixture-secret-never-returned');
        config()->set('services.chapa.admin_payout_step_up_required', true);

        $manager = Mockery::mock(LinketChapaManager::class);
        $manager->shouldReceive('platformSecret')->andReturn('CHASECK_TEST-fixture-key-never-returned');
        $mode = new ChapaV1PayoutMode($manager);
        $data = (new ChapaPayoutReadinessController())->__invoke(Request::create('/', 'GET'), $mode)['data'];

        $this->assertSame('test', $data['mode']);
        $this->assertTrue($data['enabled']);
        $this->assertTrue($data['approval_configured']);
        $this->assertTrue($data['admin_step_up_required']);
        $this->assertSame('https://linket.example.test/api/v1/chapa/transfer-approval', $data['approval_url']);
        $this->assertStringNotContainsString('fixture-secret', json_encode($data));
        $this->assertStringNotContainsString('fixtu' . 're-key', json_encode($data));
    }
}
