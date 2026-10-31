<?php

use App\Models\User;
use App\Payments\Models\DirectPaymentVerification;
use App\Payments\VerifyEt\VerifyEtGateway;
use App\Storefront\Commands\GenerateCommissionInvoices;
use App\Storefront\Models\CommissionAccrual;
use App\Storefront\Models\CommissionInvoice;
use App\Storefront\Models\DigitalProduct;
use App\Storefront\Models\StorefrontOrder;
use Carbon\CarbonImmutable;
use Common\Workspaces\Models\Workspace;
use Illuminate\Support\Str;
use Illuminate\Foundation\Testing\DatabaseTransactions;

uses(DatabaseTransactions::class);

it('schedules commission invoicing on the first day of the month in East Africa time', function (): void {
    $events = app(\Illuminate\Console\Scheduling\Schedule::class)->events();
    $event = collect($events)->first(fn ($scheduled) => str_contains((string) $scheduled->command, 'billing:generate-commission-invoices'));

    expect($event)->not->toBeNull()
        ->and($event->expression)->toBe('1 0 1 * *')
        ->and((string) $event->timezone)->toBe('Africa/Nairobi');
});

test('commission fees roll over below the threshold and settle one invoice exactly once', function () {
    $this->travelTo(CarbonImmutable::parse('2026-11-01 00:01:00', 'Africa/Nairobi'));

    $creator = User::factory()->create();
    $workspace = Workspace::query()->create([
        'owner_id' => $creator->id,
        'name' => 'Commission workspace',
        'is_personal' => true,
    ]);
    $product = DigitalProduct::query()->create([
        'workspace_id' => $workspace->id,
        'user_id' => $creator->id,
        'title' => 'Commission test product',
        'price_cents' => 100000,
        'currency' => 'ETB',
        'status' => 'approved',
        'type' => 'digital',
    ]);
    $createAccrual = function (int $feeCents) use ($creator, $workspace, $product): CommissionAccrual {
        $order = StorefrontOrder::query()->create([
            'uuid' => (string) Str::uuid(),
            'digital_product_id' => $product->id,
            'creator_id' => $creator->id,
            'currency' => 'ETB',
            'gross_amount_cents' => 100000,
            'commission_bps' => 150,
            'commission_plan_id' => 1,
            'platform_fee_cents' => $feeCents,
            'creator_earnings_cents' => 100000,
            'status' => 'paid',
            'paid_at' => CarbonImmutable::parse('2026-10-15 12:00:00', 'Africa/Nairobi'),
        ]);

        return CommissionAccrual::query()->create([
            'storefront_order_id' => $order->id,
            'creator_id' => $creator->id,
            'workspace_id' => $workspace->id,
            'plan_id' => 1,
            'gross_amount_cents' => 100000,
            'fee_bps' => 150,
            'fee_cents' => $feeCents,
            'paid_at' => $order->paid_at,
        ]);
    };

    $rolledOverAccrual = $createAccrual(4999);
    app(GenerateCommissionInvoices::class)->handle();

    expect(CommissionInvoice::query()->where('creator_id', $creator->id)->count())->toBe(0)
        ->and($rolledOverAccrual->fresh()->commission_invoice_id)->toBeNull();

    $thresholdAccrual = $createAccrual(1);
    app(GenerateCommissionInvoices::class)->handle();

    $invoice = CommissionInvoice::query()->where('creator_id', $creator->id)->firstOrFail();
    expect($invoice->commission_fee_cents)->toBe(5000)
        ->and($invoice->sales_count)->toBe(2)
        ->and($invoice->status)->toBe('pending')
        ->and($invoice->due_at->timezone('Africa/Nairobi')->toDateTimeString())->toBe('2026-11-05 23:59:59')
        ->and($rolledOverAccrual->fresh()->commission_invoice_id)->toBe($invoice->id)
        ->and($thresholdAccrual->fresh()->commission_invoice_id)->toBe($invoice->id);

    $verification = DirectPaymentVerification::query()->create([
        'reference' => 'INV' . Str::upper(Str::random(12)),
        'payable_type' => CommissionInvoice::class,
        'payable_id' => $invoice->id,
        'bank_code' => 'cbe',
        'settlement_account' => '1000123456789',
        'amount_cents' => 5000,
        'currency' => 'ETB',
    ]);
    $result = [
        '_http_status' => 200,
        'requestId' => 'req_' . Str::lower(Str::random(12)),
        'verification' => ['processingStatus' => 'completed', 'status' => 'success', 'verified' => true],
        'data' => [[
            'bank' => 'cbe',
            'status' => 'success',
            'verified' => true,
            'amount' => 50,
            'currency' => 'ETB',
            'referenceNumber' => $verification->reference,
            'receiptNumber' => $verification->reference,
            'settlementAccountMatch' => [
                'matched' => true,
                'ambiguous' => false,
                'matchConfidence' => 'high',
                'candidateCount' => 1,
                'matchedSettlementAccount' => '1000123456789',
            ],
        ]],
    ];

    expect(app(VerifyEtGateway::class)->processResult($verification, $result))->toBe('success')
        ->and(app(VerifyEtGateway::class)->processResult($verification, $result))->toBe('success')
        ->and($invoice->fresh()->status)->toBe('paid')
        ->and($invoice->fresh()->paid_at)->not->toBeNull();

    $this->travelBack();
});
