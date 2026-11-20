<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Storefront\Models\PayoutRequest;
use App\Storefront\Models\StorefrontPayoutIntent;
use App\Storefront\Services\AdminPayoutTransferStatusFilter;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Tests\TestCase;

class AdminPayoutTransferStatusFilterTest extends TestCase
{
    private int $sequence = 0;

    protected function setUp(): void
    {
        parent::setUp();
        config()->set('database.default', 'sqlite');
        config()->set('database.connections.sqlite.database', ':memory:');

        Schema::create('payout_requests', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('workspace_id')->default(1);
            $table->unsignedBigInteger('creator_id');
            $table->unsignedBigInteger('amount_cents');
            $table->string('currency')->default('ETB');
            $table->string('status')->default('processing');
            $table->timestamps();
        });
        (new (require database_path('migrations/2026_11_14_220000_create_storefront_payout_intents_table.php')))->up();
    }

    protected function tearDown(): void
    {
        Schema::dropIfExists('storefront_payout_intents');
        Schema::dropIfExists('payout_requests');
        parent::tearDown();
    }

    private function payout(): PayoutRequest
    {
        return PayoutRequest::query()->create([
            'workspace_id' => 1,
            'creator_id' => 30,
            'amount_cents' => 50000,
            'currency' => 'ETB',
            'status' => 'processing',
        ]);
    }

    private function intent(PayoutRequest $payout, string $status): StorefrontPayoutIntent
    {
        $this->sequence++;
        return StorefrontPayoutIntent::query()->create([
            'payout_request_id' => $payout->id,
            'merchant_reference' => sprintf('lk-test-%06d', $this->sequence),
            'idempotency_key' => (string) Str::uuid(),
            'amount_cents' => 50000,
            'currency' => 'ETB',
            'provider' => 'chapa',
            'withdrawal_code' => 'telebirr',
            'destination_snapshot' => '0911223344',
            'status' => $status,
        ]);
    }

    /** @return array<int, int> */
    private function filtered(string $status): array
    {
        $query = PayoutRequest::query();
        AdminPayoutTransferStatusFilter::apply($query, $status);

        return $query->orderBy('id')->pluck('id')->all();
    }

    public function testNotStartedIncludesNoIntentAndPreparedIntentOnly(): void
    {
        $unsubmitted = $this->payout();
        $prepared = $this->payout();
        $submitted = $this->payout();
        $this->intent($prepared, 'prepared');
        $this->intent($submitted, 'submitted');

        $this->assertSame([$unsubmitted->id, $prepared->id], $this->filtered('not_started'));
        $this->assertSame([$submitted->id], $this->filtered('submitted'));
    }

    public function testLatestIntentControlsWhichQueueStatusAppears(): void
    {
        $uncertain = $this->payout();
        $queued = $this->payout();
        $this->intent($uncertain, 'prepared');
        $this->intent($uncertain, 'submitted');
        $this->intent($queued, 'submitted');
        $this->intent($queued, 'provider_pending');

        $this->assertSame([$uncertain->id], $this->filtered('submitted'));
        $this->assertSame([$queued->id], $this->filtered('provider_pending'));
        $this->assertSame([], $this->filtered('not_started'));
    }

    public function testFailedAndSettledTransfersCanBeReviewedSeparately(): void
    {
        $failed = $this->payout();
        $settled = $this->payout();
        $action = $this->payout();
        $this->intent($failed, 'failed');
        $this->intent($settled, 'successful');
        $this->intent($action, 'requires_action');

        $this->assertSame([$failed->id], $this->filtered('failed'));
        $this->assertSame([$settled->id], $this->filtered('successful'));
        $this->assertSame([$action->id], $this->filtered('requires_action'));
    }

    public function testUnknownFilterCannotChangeTheAdminQueue(): void
    {
        $this->payout();
        $this->payout();
        $this->assertCount(2, $this->filtered('invalid_transfer_status'));
    }
}
