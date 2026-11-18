<?php

declare(strict_types=1);

namespace Tests\Feature;

use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class VerifyEtWebhookTest extends TestCase
{
    use DatabaseTransactions;

    public function testRetiredProviderWebhookCannotAcceptOrQueueAnyPayment(): void
    {
        Queue::fake();
        $before = DB::table('verify_et_webhook_deliveries')->count();

        $this->post('/billing/verify-et/webhook', [
            'event' => 'verification.completed',
            'requestId' => 'retired-provider-request',
        ])->assertNotFound();

        $this->assertSame($before, DB::table('verify_et_webhook_deliveries')->count());
        Queue::assertNothingPushed();
    }
}
