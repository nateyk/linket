<?php

namespace App\Storefront\Controllers;

use App\Payments\Models\DirectPaymentVerification;
use App\Payments\VerifyEt\VerifyEtGateway;
use App\Payments\VerifyEt\VerifyEtSettings;
use App\Storefront\Models\CreatorPaymentMethod;
use App\Storefront\Models\DirectPaymentMethod;
use App\Storefront\Models\StorefrontOrder;
use App\Storefront\Resources\PublicStorefrontOrderResource;
use App\Storefront\Services\CheckoutAvailability;
use App\Storefront\Services\CreatorPaymentReviewNotifier;
use App\Storefront\Services\StorefrontVerificationSession;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

final class OrderPaymentController extends Controller
{
    public function instructions(Request $request, string $order): JsonResponse
    {
        $order = StorefrontOrder::query()->with(['creatorPaymentMethod', 'product'])->where('uuid', $order)->firstOrFail();
        $this->assertAccess($request, $order);

        $order = app(StorefrontVerificationSession::class)->expireIfDue($order);

        abort_unless($order->payment_gateway === 'verify_et'
            && in_array($order->status, ['pending_payment', 'pending', 'verifying', 'failed_verification', 'failed', 'expired', 'cancelled'], true)
            && $order->payment_expires_at && !$order->payment_expires_at->isPast(), 404);

        $method = $order->creatorPaymentMethod;
        abort_unless($method && $method->status === 'approved' && $method->is_active
            && $method->user_id === $order->creator_id
            && $method->workspace_id === $order->product->workspace_id
            && $order->payment_account_snapshot && $order->payment_provider_snapshot, 404);

        // Query active receiving accounts configured by the seller for this checkout
        $catalog = DirectPaymentMethod::query()->get()->keyBy('code');
        $eligibleAccounts = app(CheckoutAvailability::class)->eligibleAccounts($order->creator_id, $order->product->workspace_id);
        $availableAccounts = $eligibleAccounts->map(fn (CreatorPaymentMethod $m): array => [
            'id' => $m->id,
            'provider' => $m->provider,
            'bank_name' => $catalog->get($m->provider)?->display_name ?? strtoupper($m->provider),
            'account_number' => $m->account_number,
            'account_ending' => substr($m->account_number, -4),
            'account_name' => $m->account_name_raw,
            'instructions' => $this->bankSpecificInstructions($m->provider),
        ])->values();

        $sessionLocked = $order->maxAttemptsExceeded() || in_array($order->status, ['cancelled', 'expired'], true);

        return response()->json(['data' => [
            'receiving_account_id' => $order->creator_payment_method_id,
            'provider' => $order->payment_provider_snapshot,
            'bank_name' => $catalog->get($order->payment_provider_snapshot)?->display_name ?? strtoupper((string) $order->payment_provider_snapshot),
            'account_number' => $order->payment_account_snapshot,
            'account_name' => $order->payment_account_name_snapshot,
            'amount_cents' => $order->gross_amount_cents,
            'currency' => $order->currency,
            'instructions' => $this->bankSpecificInstructions((string) $order->payment_provider_snapshot),
            'available_accounts' => $availableAccounts,
            'status' => $order->status,
            'status_label' => $order->statusLabel(),
            'verification_attempts' => (int) ($order->verification_attempts ?? 0),
            'attempts_remaining' => $order->attemptsRemaining(),
            'session_locked' => $sessionLocked,
        ]])->header('Cache-Control', 'no-store, private')->header('Pragma', 'no-cache');
    }

    public function selectAccount(Request $request, string $order): JsonResponse
    {
        $order = StorefrontOrder::query()->with(['product'])->where('uuid', $order)->firstOrFail();
        $this->assertAccess($request, $order);
        abort_unless($order->payment_gateway === 'verify_et', 404);
        abort_unless(in_array($order->status, ['pending_payment', 'pending', 'verifying', 'failed_verification', 'failed'], true), 409, __('Receiving account cannot be changed after payment is completed.'));

        $data = $request->validate([
            'receiving_account_id' => ['required', 'integer'],
        ]);

        $method = CreatorPaymentMethod::query()
            ->whereKey($data['receiving_account_id'])
            ->where('user_id', $order->creator_id)
            ->where('workspace_id', $order->product->workspace_id)
            ->where('status', 'approved')
            ->where('is_active', true)
            ->where('is_suspended', false)
            ->firstOrFail();

        $order->update([
            'creator_payment_method_id' => $method->id,
            'payment_provider_snapshot' => $method->provider,
            'payment_account_snapshot' => $method->account_number,
            'payment_account_name_snapshot' => $method->account_name_raw,
        ]);

        return $this->instructions($request, $order->uuid);
    }

    public function show(Request $request, string $order): PublicStorefrontOrderResource
    {
        $order = StorefrontOrder::query()->where('uuid', $order)->with(['product', 'entitlements.file', 'latestDirectPaymentVerification'])->firstOrFail();
        $this->assertAccess($request, $order);

        app(StorefrontVerificationSession::class)->expireIfDue($order);

        return new PublicStorefrontOrderResource($order);
    }

    public function recheck(Request $request, string $order): array
    {
        $order = StorefrontOrder::query()->where('uuid', $order)->with('latestDirectPaymentVerification')->firstOrFail();
        $this->assertAccess($request, $order);
        abort_unless(in_array($order->status, ['verifying', 'pending_payment', 'failed_verification'], true), 409);

        $verification = $order->latestDirectPaymentVerification;
        if ($verification && in_array($verification->status, ['pending', 'verifying'], true) && $verification->provider_request_id) {
            $status = app(VerifyEtGateway::class)->reconcile($verification);
            if ($status === 'manual_review') {
                $order->refresh();
                if ($order->status === 'manual_review') {
                    app(CreatorPaymentReviewNotifier::class)->notify($order, $verification->id);
                }
            }
        }

        $order->refresh();
        $verification?->refresh();

        return [
            'status' => $order->status,
            'status_label' => $order->statusLabel(),
            'delivery_status' => $order->delivery_status ?? ($order->isCompleted() ? 'delivered' : 'awaiting_payment'),
            'verification_status' => $verification?->status,
            'error_code' => $verification?->latest_error_code,
            'verification_attempts' => (int) ($order->verification_attempts ?? 0),
            'attempts_remaining' => $order->attemptsRemaining(),
            'session_locked' => $order->maxAttemptsExceeded() || in_array($order->status, ['cancelled', 'expired'], true),
        ];
    }

    public function cancel(Request $request, string $order): array
    {
        $order = StorefrontOrder::query()->where('uuid', $order)->firstOrFail();
        $this->assertAccess($request, $order);
        return DB::transaction(function () use ($order): array {
            $order = StorefrontOrder::query()->whereKey($order->id)->lockForUpdate()->firstOrFail();
            abort_unless($order->monetization_policy !== null && in_array($order->status, ['pending_payment', 'pending', 'failed_verification'], true) && !$order->directPaymentVerifications()->exists(), 409);
            $order->update(['status' => 'expired']);
            app(\App\Storefront\Services\CreatorVerificationAllowance::class)->release($order, 'buyer_cancelled_before_reference');
            return ['status' => 'expired', 'status_label' => 'cancelled', 'session_locked' => true];
        }, 3);
    }

    public function submit(Request $request, string $order): JsonResponse|array
    {
        $data = $request->validate([
            'reference' => ['required', 'string', 'min:6', 'max:255'],
            'account_suffix' => ['nullable', 'string'],
            'phone_number' => ['nullable', 'string', 'max:32', 'regex:/^(?:0[79]\d{8}|\+?251[79]\d{8})$/'],
        ]);

        $order = StorefrontOrder::query()->where('uuid', $order)->firstOrFail();
        $this->assertAccess($request, $order);
        abort_unless(VerifyEtSettings::get('enabled') && $order->payment_gateway === 'verify_et', 404);
        abort_if($order->status === 'manual_review', 409, __('Your payment is currently under manual review and cannot accept new references.'));

        $order = app(StorefrontVerificationSession::class)->expireIfDue($order);
        if ($order->isCancelled() && $order->payment_expires_at && $order->payment_expires_at->isPast()) {
            return response()->json([
                'status' => 'expired',
                'status_label' => 'cancelled',
                'message' => __('This checkout session has expired. Please start a new checkout.'),
                'order_id' => $order->uuid,
                'verification_attempts' => (int) ($order->verification_attempts ?? 0),
                'attempts_remaining' => 0,
                'session_locked' => true,
            ], 410);
        }

        if ($order->maxAttemptsExceeded() || $order->isCancelled()) {
            $order->update(['status' => 'expired']);
            $order->refresh();
            $message = $order->maxAttemptsExceeded()
                ? __('Maximum verification attempts (5) exceeded. This checkout session has been cancelled.')
                : __('This checkout session has been cancelled.');

            return response()->json($this->attemptPayload($order, $message), 422);
        }

        $provider = (string) $order->payment_provider_snapshot;
        $data['reference'] = app(StorefrontVerificationSession::class)->prepareReference(
            $provider,
            $data['reference'],
            $data['account_suffix'] ?? null,
            $data['phone_number'] ?? null,
        );

        // Pre-Verification 4: Reject duplicate references immediately if already completed or under review
        $alreadyClaimed = DirectPaymentVerification::query()
            ->where('reference', $data['reference'])
            ->where('payable_id', '!=', $order->id)
            ->where(function ($q): void {
                $q->whereIn('status', ['success', 'manual_approved', 'manual_review', 'verifying'])
                  ->orWhereNotNull('canonical_transaction_identity');
            })
            ->exists();

        if ($alreadyClaimed) {
            throw ValidationException::withMessages([
                'reference' => __('This payment reference is already under review or has already been used for another purchase.'),
            ]);
        }

        try {
            $verification = DB::transaction(function () use ($order, $data, $provider): DirectPaymentVerification {
                $order = StorefrontOrder::query()->whereKey($order->id)->lockForUpdate()->firstOrFail();
                abort_unless(in_array($order->status, ['pending_payment', 'pending', 'verifying', 'failed_verification', 'failed', 'expired'], true), 409);
                abort_if($order->status === 'expired' && $order->monetization_policy === null, 410);

                $existing = DirectPaymentVerification::query()
                    ->where('payable_type', StorefrontOrder::class)
                    ->where('payable_id', $order->id)
                    ->latest('id')
                    ->first();

                if ($existing && $existing->reference === $data['reference'] && in_array($existing->status, ['verifying', 'pending'], true)) {
                    return $existing;
                }

                $settlementAccount = $order->payment_account_snapshot;
                abort_unless(is_string($provider) && is_string($settlementAccount), 409, __('The receiving account snapshot for this order is unavailable.'));

                $suffixLength = $provider === 'cbe' ? 8 : 5;
                if (in_array($provider, ['boa', 'cbe'], true)) {
                    $legacyCbeFt = $provider === 'cbe' && preg_match('/^FT[0-9A-Z]{8,12}$/i', $data['reference']) === 1;
                    abort_if(isset($data['account_suffix']) && $data['account_suffix'] !== '' && !preg_match('/^\\d{' . $suffixLength . '}$/', $data['account_suffix']), 422, __('Enter a valid transaction account suffix.'));
                    abort_if($provider === 'boa' && !isset($data['account_suffix']), 422, __('Bank of Abyssinia requires the five-digit transaction account suffix.'));
                    abort_if($legacyCbeFt && !isset($data['account_suffix']), 422, __('Older CBE FT references require the eight-digit transaction account suffix.'));
                    abort_if($provider === 'cbe' && !$legacyCbeFt && !preg_match('/^FT/i', $data['reference']) && isset($data['account_suffix']) && $data['account_suffix'] !== '', 422, __('CBE receipt IDs do not use an account suffix.'));
                }

                $providerInput = match ($provider) {
                    'boa' => ['accountSuffix' => $data['account_suffix'] ?? null],
                    'cbebirr' => ['phoneNumber' => $data['phone_number'] ?? null],
                    'cbe' => ['accountSuffix' => $data['account_suffix'] ?? null],
                    default => [],
                };
                abort_if($provider === 'cbebirr' && !isset($providerInput['phoneNumber']), 422, __('CBE Birr requires the wallet phone number.'));

                if ($existing && $existing->reference === $data['reference'] && $existing->status === 'mismatch') {
                    $existing = DirectPaymentVerification::query()->whereKey($existing->id)->lockForUpdate()->firstOrFail();
                    $existing->update([
                        'status' => 'pending',
                        'provider_input' => array_filter($providerInput),
                        'provider_request_id' => null,
                        'provider_status_url' => null,
                        'provider_processing_status' => null,
                        'provider_result' => null,
                        'latest_error' => null,
                        'latest_error_code' => null,
                        'canonical_transaction_identity' => null,
                        'verified_at' => null,
                        'attempt' => ((int) $existing->attempt) + 1,
                        'idempotency_key' => 'linket_order_'.$order->uuid.'_attempt_'.Str::uuid(),
                    ]);
                    $order->update(['payment_reference' => $data['reference'], 'status' => 'verifying']);

                    return $existing;
                }

                $verification = DirectPaymentVerification::query()->create([
                    'reference' => $data['reference'],
                    'payable_type' => StorefrontOrder::class,
                    'payable_id' => $order->id,
                    'bank_code' => $provider,
                    'settlement_account' => $settlementAccount,
                    'amount_cents' => $order->gross_amount_cents,
                    'currency' => 'ETB',
                    'attempt' => ($existing?->attempt ?? 0) + 1,
                    'attempt_uuid' => (string) Str::uuid(),
                    'idempotency_key' => 'linket_order_' . $order->uuid . '_attempt_' . Str::uuid(),
                    'provider_input' => array_filter($providerInput),
                ]);

                $order->update(['payment_reference' => $data['reference'], 'status' => 'verifying']);

                return $verification;
            });
        } catch (QueryException) {
            throw ValidationException::withMessages(['reference' => __('This payment reference was already used.')]);
        }

        $status = app(VerifyEtGateway::class)->submit($verification);
        $order->refresh();

        if ($status === 'mismatch') {
            $remaining = $order->attemptsRemaining();
            $message = $order->isCancelled()
                ? __('Payment verification failed. Maximum attempts (5) reached. Checkout cancelled.')
                : __('Payment could not be verified. Please check reference and details. You have :count attempts remaining.', ['count' => $remaining]);

            return response()->json($this->attemptPayload($order, $message), 422);
        }

        if ($status === 'manual_review') {
            $order->update(['status' => 'manual_review']);
            app(CreatorPaymentReviewNotifier::class)->notify($order, $verification->id);

            return response()->json([
                'status' => 'manual_review',
                'status_label' => 'manual_review',
                'message' => __('Your payment details have been submitted and are under manual review by the creator.'),
                'order_id' => $order->uuid,
                'verification_attempts' => (int) $order->verification_attempts,
                'attempts_remaining' => $order->attemptsRemaining(),
                'session_locked' => false,
            ]);
        }

        if ($status === 'success') {
            return response()->json([
                'status' => 'paid',
                'status_label' => 'completed',
                'order_id' => $order->uuid,
                'delivery_status' => $order->delivery_status ?? StorefrontOrder::DELIVERY_DELIVERING,
                'verification_attempts' => (int) $order->verification_attempts,
                'attempts_remaining' => $order->attemptsRemaining(),
                'session_locked' => false,
            ]);
        }

        $fresh = $order->fresh();

        return [
            'status' => $fresh->status,
            'status_label' => $fresh->statusLabel(),
            'order_id' => $order->uuid,
            'verification_attempts' => (int) $fresh->verification_attempts,
            'attempts_remaining' => $fresh->attemptsRemaining(),
            'session_locked' => false,
        ];
    }

    /** @return array<string, mixed> */
    private function attemptPayload(StorefrontOrder $order, string $message): array
    {
        return [
            'status' => $order->status,
            'status_label' => $order->statusLabel(),
            'message' => $message,
            'order_id' => $order->uuid,
            'verification_attempts' => (int) $order->verification_attempts,
            'attempts_remaining' => $order->attemptsRemaining(),
            'session_locked' => $order->maxAttemptsExceeded() || $order->isCancelled(),
        ];
    }

    private function bankSpecificInstructions(string $provider): string
    {
        return match (strtolower($provider)) {
            'cbe' => __('Transfer the exact amount to Commercial Bank of Ethiopia. Submit your CBE Receipt ID (or older FT reference with 8-digit suffix).'),
            'telebirr' => __('Transfer the exact amount via Telebirr. Submit your 10-character transaction number.'),
            'boa' => __('Transfer the exact amount to Bank of Abyssinia. Submit your reference and 5-digit transaction account suffix.'),
            'dashen' => __('Transfer the exact amount to Dashen Bank. Submit your transaction reference.'),
            'cbebirr' => __('Transfer the exact amount via CBE Birr. Submit your receipt number and wallet phone number.'),
            'mpesa' => __('Transfer the exact amount via M-Pesa. Submit your transaction number.'),
            'awash' => __('Transfer the exact amount to Awash Bank. Submit your receipt reference or receipt URL.'),
            'siinqee' => __('Transfer the exact amount to Siinqee Bank. Submit your receipt reference.'),
            'kaafiebirr' => __('Transfer the exact amount to Kaafie Birr. Submit your receipt reference or receipt URL.'),
            default => __('Transfer the exact amount to the account shown, then submit your transaction reference.'),
        };
    }

    private function assertAccess(Request $request, StorefrontOrder $order): void
    {
        $token = $request->header('X-Order-Access-Token');
        abort_unless(is_string($token) && $order->payment_access_token_hash
            && hash_equals($order->payment_access_token_hash, hash('sha256', $token)), 403);
    }
}
