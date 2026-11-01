<?php

namespace App\Payments\Controllers;

use App\Payments\Models\DirectPaymentVerification;
use App\Payments\Models\ProSubscriptionPayment;
use App\Models\User;
use App\Payments\VerifyEt\VerifyEtGateway;
use App\Storefront\Models\CommissionAccrual;
use App\Storefront\Models\CommissionInvoice;
use App\Storefront\Models\PayoutRequest;
use App\Storefront\DigitalProductFinance;
use Common\Workspaces\ActiveWorkspace;
use Carbon\CarbonImmutable;
use Common\Billing\Models\Product;
use Common\Billing\Subscription;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Barryvdh\DomPDF\Facade\Pdf;

final class DirectBillingController extends Controller
{
    public function index(Request $request): \Illuminate\Http\JsonResponse
    {
        $now = CarbonImmutable::now('Africa/Nairobi');
        $start = $now->startOfMonth()->utc();
        $end = $now->addMonth()->startOfMonth()->utc();
        $accruals = CommissionAccrual::query()->where('creator_id', $request->user()->id)
            ->where('paid_at', '>=', $start)->where('paid_at', '<', $end)
            ->where('fee_cents', '>', 0)
            ->whereHas('order', fn ($query) => $query->whereNull('monetization_policy'));
        $invoices = CommissionInvoice::query()->where('creator_id', $request->user()->id)
            ->with('accruals.order:id,uuid')->latest()->paginate(20);
        $workspaceId = ActiveWorkspace::get()->id;
        $legacy = app(DigitalProductFinance::class)->summary($request->user()->id, $workspaceId);
        $outstandingRequests = PayoutRequest::query()
            ->where('creator_id', $request->user()->id)
            ->where('workspace_id', $workspaceId)
            ->whereIn('status', ['pending', 'requested', 'processing'])
            ->exists();
        $proPlan = Product::query()->where('system_key', 'pro')->where('active', true)->first();
        $proPrice = $proPlan
            ? \Common\Billing\Models\Price::query()->where('product_id', $proPlan->id)->where('currency', 'ETB')
                ->where('interval', 'month')->where('interval_count', 1)->orderByDesc('default')->first()
            : null;
        $subscription = Subscription::query()->where('user_id', $request->user()->id)
            ->whereIn('gateway_name', ['verify_et', 'chapa'])->latest('id')->first();
        $pendingProPayment = ProSubscriptionPayment::query()->where('creator_id', $request->user()->id)
            ->where('status', 'pending_payment')->latest('id')->first();
        $creatorProPayments = ProSubscriptionPayment::query()->where('creator_id', $request->user()->id)
            ->latest('id')->get();
        $latestProVerifications = DirectPaymentVerification::query()
            ->where('payable_type', ProSubscriptionPayment::class)
            ->whereIn('payable_id', $creatorProPayments->modelKeys())
            ->latest('id')->get()->unique('payable_id')->keyBy('payable_id');
        $proPayments = $creatorProPayments->map(function (ProSubscriptionPayment $payment) use ($latestProVerifications): array {
                $verification = $latestProVerifications->get($payment->id);

                return [
                    'payment_id' => $payment->uuid,
                    'amount_cents' => $payment->amount_cents,
                    'currency' => 'ETB',
                    'status' => $this->proPaymentStatus($payment, $verification),
                    'transaction_reference' => $verification?->reference,
                    'provider' => $verification?->bank_code,
                    'paid_at' => $payment->paid_at?->toIso8601String(),
                    'created_at' => $payment->created_at?->toIso8601String(),
                    'receipt_number' => $payment->receipt_number,
                    'receipt_url' => $payment->status === 'paid' && $verification?->status === 'success'
                        && $payment->receipt_number && $payment->subscription_period_start && $payment->subscription_period_end
                        ? url('/api/v1/billing/direct/pro/'.$payment->uuid.'/receipt')
                        : null,
                ];
            })->values();

        return response()->json([
            'verification_allowance' => app(\App\Storefront\Services\CreatorVerificationAllowance::class)->summary($request->user()),
            'pro_plan' => [
                'monthly_price_cents' => $proPrice
                    ? app(\App\Payments\VerifyEt\VerifyEtMoney::class)->cents((string) $proPrice->getRawOriginal('amount'))
                    : null,
                'currency' => 'ETB',
            ],
            'pro_subscription' => [
                'status' => $subscription?->gateway_status ?? 'inactive',
                'renews_at' => $subscription?->renews_at?->toIso8601String(),
                'ends_at' => $subscription?->ends_at?->toIso8601String(),
                'can_renew' => $this->canRenewPro($subscription),
                'payments' => $proPayments,
                'pending_payment' => $pendingProPayment ? [
                    'payment_id' => $pendingProPayment->uuid,
                    'status' => $pendingProPayment->status,
                    'amount_cents' => $pendingProPayment->amount_cents,
                ] : null,
            ],
            'estimated_commission' => [
                'gross_sales_cents' => (int) (clone $accruals)->sum('gross_amount_cents'),
                'fee_cents' => (int) (clone $accruals)->sum('fee_cents'),
                'rollover_threshold_cents' => 5000,
                'next_billing_at' => $now->addMonth()->startOfMonth()->addMinute()->toIso8601String(),
            ],
            'invoices' => $invoices,
            'corporate_account' => $this->corporateInstructions(),
            'legacy_access' => $outstandingRequests
                || ($legacy['held_earnings_cents'] ?? 0) > 0
                || ($legacy['available_for_payout_cents'] ?? 0) > 0
                || ($legacy['reserved_payout_cents'] ?? 0) > 0,
        ])->header('Cache-Control', 'no-store, private');
    }

    public function downloadProReceipt(Request $request, string $payment): \Illuminate\Http\Response
    {
        $proPayment = ProSubscriptionPayment::query()
            ->where('uuid', $payment)
            ->where('creator_id', $request->user()->id)
            ->where('status', 'paid')
            ->whereNotNull('receipt_number')
            ->whereNotNull('subscription_period_start')
            ->whereNotNull('subscription_period_end')
            ->firstOrFail();

        $verification = DirectPaymentVerification::query()
            ->where('payable_type', ProSubscriptionPayment::class)
            ->where('payable_id', $proPayment->id)
            ->where('status', 'success')
            ->latest('id')
            ->firstOrFail();

        $pdf = Pdf::loadView('payments.pro-payment-receipt', [
            'payment' => $proPayment,
            'verification' => $verification,
            'creator' => $request->user(),
        ]);

        return $pdf->download($proPayment->receipt_number.'.pdf');
    }

    private function proPaymentStatus(ProSubscriptionPayment $payment, ?DirectPaymentVerification $verification): string
    {
        if ($payment->status === 'paid') {
            return 'paid';
        }

        return match ($verification?->status) {
            'pending', 'verifying' => 'pending_verification',
            'manual_review' => 'manual_review',
            'mismatch', 'failed' => 'rejected',
            default => $payment->status === 'expired' ? 'expired' : 'pending_payment',
        };
    }

    public function startPro(Request $request): \Illuminate\Http\JsonResponse
    {
        abort_unless(config('services.verify_et.enabled'), 503);
        $instructions = $this->corporateInstructions();
        abort_unless($instructions['account_number'], 503, __('Linket payment account is unavailable.'));
        $payment = DB::transaction(function () use ($request): ProSubscriptionPayment {
            $creator = User::query()->whereKey($request->user()->id)->lockForUpdate()->firstOrFail();
            $plan = Product::query()->where('system_key', 'pro')->where('active', true)->firstOrFail();
            $currentChapa = Subscription::query()->where('user_id', $creator->id)
                ->where('gateway_name', 'chapa')->whereNull('ends_at')
                ->where('renews_at', '>', now())->first();
            abort_if($currentChapa, 409, __('Your current Pro term remains active. Renew after its paid term.'));
            $currentDirect = Subscription::query()->where('user_id', $creator->id)
                ->where('gateway_name', 'verify_et')->whereNull('ends_at')
                ->where('gateway_status', 'active')->where('renews_at', '>', now()->addDays(7))->first();
            abort_if($currentDirect, 409, __('Your current Pro term remains active. Renew during the final seven days.'));

            $payment = ProSubscriptionPayment::query()
                ->where('creator_id', $creator->id)
                ->where('status', 'pending_payment')
                ->latest('id')->lockForUpdate()->first();

            if ($payment) {
                return $payment;
            }

            $price = \Common\Billing\Models\Price::query()->where('product_id', $plan->id)->where('currency', 'ETB')->where('interval', 'month')->orderByDesc('default')->lockForUpdate()->firstOrFail();
            $amount = app(\App\Payments\VerifyEt\VerifyEtMoney::class)->cents((string) $price->getRawOriginal('amount'));
            abort_unless($amount !== null && $amount > 0, 503, __('Pro pricing is unavailable.'));

            return ProSubscriptionPayment::query()->create([
                'uuid' => (string) Str::uuid(),
                'creator_id' => $creator->id,
                'product_id' => $plan->id,
                'price_id' => $price->id,
                'amount_cents' => $amount,
            ]);
        });

        return response()->json(['payment_id' => $payment->uuid, 'amount_cents' => $payment->amount_cents, 'currency' => 'ETB', 'account' => $instructions])->header('Cache-Control', 'no-store, private');
    }

    public function submitProReference(Request $request, string $payment): array
    {
        $payment = ProSubscriptionPayment::query()->where('uuid', $payment)
            ->where('creator_id', $request->user()->id)->firstOrFail();
        abort_unless($payment->status !== 'paid', 409);

        return $this->submitReference($request, $payment, $payment->amount_cents);
    }

    public function submitInvoiceReference(Request $request, string $invoice): array
    {
        $invoice = CommissionInvoice::query()->where('uuid', $invoice)
            ->where('creator_id', $request->user()->id)->firstOrFail();
        abort_unless(in_array($invoice->status, ['pending', 'overdue'], true), 409);

        return $this->submitReference($request, $invoice, $invoice->commission_fee_cents);
    }

    /** @return array<string, mixed> */
    private function submitReference(Request $request, CommissionInvoice|ProSubscriptionPayment $payable, int $amountCents): array
    {
        abort_unless(config('services.verify_et.enabled'), 503);
        $data = $request->validate(['reference' => ['required', 'string', 'min:6', 'max:150', 'regex:/^[A-Za-z0-9._-]+$/']]);
        $instructions = $this->corporateInstructions();
        abort_unless($instructions['account_number'], 503);

        try {
            $verification = DB::transaction(function () use ($payable, $data, $instructions, $amountCents): DirectPaymentVerification {
                $existing = DirectPaymentVerification::query()
                    ->where('payable_type', $payable::class)->where('payable_id', $payable->id)
                    ->latest('id')->lockForUpdate()->first();
                if ($existing && $existing->reference === $data['reference']) {
                    return $existing;
                }
                if ($existing && !in_array($existing->status, ['mismatch', 'manual_review'], true)) {
                    throw ValidationException::withMessages(['reference' => __('A payment reference is already being verified.')]);
                }
                if (DirectPaymentVerification::query()->where('reference', $data['reference'])->exists()) {
                    throw ValidationException::withMessages(['reference' => __('This payment reference was already used.')]);
                }

                return DirectPaymentVerification::query()->create([
                    'reference' => $data['reference'],
                    'payable_type' => $payable::class,
                    'payable_id' => $payable->id,
                    'bank_code' => $instructions['provider'],
                    'settlement_account' => $instructions['account_number'],
                    'amount_cents' => $amountCents,
                    'currency' => 'ETB',
                    'attempt' => ($existing?->attempt ?? 0) + 1,
                    'attempt_uuid' => (string) Str::uuid(),
                    'idempotency_key' => 'linket_billing_' . $payable->uuid . '_attempt_' . Str::uuid(),
                ]);
            });
        } catch (QueryException) {
            throw ValidationException::withMessages(['reference' => __('This payment reference was already used.')]);
        }

        return ['status' => app(VerifyEtGateway::class)->submit($verification), 'payment_id' => $payable->uuid];
    }

    private function canRenewPro(?Subscription $subscription): bool
    {
        if (!$subscription) {
            return true;
        }

        if ($subscription->gateway_name === 'chapa') {
            return $subscription->ends_at !== null
                || !($subscription->renews_at?->isFuture() ?? false);
        }

        if ($subscription->ends_at !== null || in_array($subscription->gateway_status, ['expired', 'past_due'], true)) {
            return true;
        }

        return $subscription->renews_at === null || $subscription->renews_at->lte(now()->addDays(7));
    }

    /** @return array{provider: string, account_number: ?string} */
    private function corporateInstructions(): array
    {
        return [
            'provider' => (string) config('services.verify_et.corporate_bank_code', 'cbe'),
            'account_number' => config('services.verify_et.corporate_account'),
        ];
    }
}
