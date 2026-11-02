<?php

namespace App\Storefront\Controllers;

use App\Payments\VerifyEt\VerifyEtSettings;
use App\Payments\Models\DirectPaymentVerification;
use App\Payments\VerifyEt\VerifyEtGateway;
use App\Storefront\Models\StorefrontOrder;
use App\Storefront\Services\CreatorPaymentReviewNotifier;
use App\Storefront\Resources\PublicStorefrontOrderResource;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
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
        abort_unless($order->payment_gateway === 'verify_et'
            && in_array($order->status, ['pending_payment', 'verifying', 'failed_verification', 'expired'], true)
            && $order->payment_expires_at && ! $order->payment_expires_at->isPast(), 404);
        $method = $order->creatorPaymentMethod;
        abort_unless($method && $method->status === 'approved' && $method->is_active
            && $method->user_id === $order->creator_id
            && $method->workspace_id === $order->product->workspace_id
            && $order->payment_account_snapshot && $order->payment_provider_snapshot, 404);

        return response()->json(['data' => [
            'provider' => $order->payment_provider_snapshot,
            'account_number' => $order->payment_account_snapshot,
            'account_name' => $order->payment_account_name_snapshot,
            'amount_cents' => $order->gross_amount_cents,
            'currency' => $order->currency,
        ]])->header('Cache-Control', 'no-store, private')->header('Pragma', 'no-cache');
    }

    public function show(Request $request, string $order): PublicStorefrontOrderResource
    {
        $order = StorefrontOrder::query()->where('uuid', $order)->with(['product', 'entitlements.file', 'latestDirectPaymentVerification'])->firstOrFail();
        $this->assertAccess($request, $order);

        return new PublicStorefrontOrderResource($order);
    }

    public function recheck(Request $request, string $order): array
    {
        $order = StorefrontOrder::query()->where('uuid', $order)->with('latestDirectPaymentVerification')->firstOrFail();
        $this->assertAccess($request, $order);
        abort_unless($order->status === 'verifying', 409);

        $verification = $order->latestDirectPaymentVerification;
        if ($verification && in_array($verification->status, ['pending', 'verifying'], true) && $verification->provider_request_id) {
            $status = app(VerifyEtGateway::class)->reconcile($verification);
            if ($status === 'mismatch') {
                $order->update(['status' => 'failed_verification']);
            } elseif ($status === 'manual_review') {
                $order->update(['status' => 'manual_review']);
                app(CreatorPaymentReviewNotifier::class)->notify($order, $verification->id);
            }
        }

        $order->refresh();
        $verification?->refresh();

        return [
            'status' => $order->status,
            'verification_status' => $verification?->status,
            'error_code' => $verification?->latest_error_code,
        ];
    }

    public function cancel(Request $request, string $order): array
    {
        $order = StorefrontOrder::query()->where('uuid', $order)->firstOrFail();
        $this->assertAccess($request, $order);
        return DB::transaction(function () use ($order): array {
            $order = StorefrontOrder::query()->whereKey($order->id)->lockForUpdate()->firstOrFail();
            abort_unless($order->monetization_policy !== null && $order->status === 'pending_payment' && !$order->directPaymentVerifications()->exists(), 409);
            $order->update(['status' => 'expired']);
            app(\App\Storefront\Services\CreatorVerificationAllowance::class)->release($order, 'buyer_cancelled_before_reference');
            return ['status' => 'expired'];
        }, 3);
    }

    public function submit(Request $request, string $order): array
    {
        $data = $request->validate([
            'reference' => ['required', 'string', 'min:6', 'max:255'],
            'account_suffix' => ['nullable', 'string'],
            'phone_number' => ['nullable', 'string', 'max:32', 'regex:/^(?:0\d{9}|\+251\d{9})$/'],
        ]);
        $order = StorefrontOrder::query()->where('uuid', $order)->firstOrFail();
        $this->assertAccess($request, $order);
        abort_unless(VerifyEtSettings::get('enabled') && $order->payment_gateway === 'verify_et', 404);
        $data['reference'] = app(\App\Payments\VerifyEt\ReceiptReference::class)->normalize((string) $order->payment_provider_snapshot, $data['reference']);

        try {
            $verification = DB::transaction(function () use ($order, $data): DirectPaymentVerification {
                $order = StorefrontOrder::query()->whereKey($order->id)->lockForUpdate()->firstOrFail();
                abort_unless(in_array($order->status, ['pending_payment', 'verifying', 'failed_verification', 'expired'], true), 409);


                abort_if($order->status === 'expired' && $order->monetization_policy === null, 410);
                $existing = DirectPaymentVerification::query()
                    ->where('payable_type', StorefrontOrder::class)
                    ->where('payable_id', $order->id)
                    ->latest('id')
                    ->first();
                if ($existing && $existing->reference === $data['reference']) {
                    return $existing;
                }
                if ($existing && !in_array($existing->status, ['mismatch', 'manual_review'], true)) {
                    throw ValidationException::withMessages(['reference' => __('This order already has a reference under verification.')]);
                }
                if (DirectPaymentVerification::query()->where('reference', $data['reference'])->exists()) {
                    throw ValidationException::withMessages(['reference' => __('This payment reference was already used.')]);
                }

                $provider = $order->payment_provider_snapshot;
                $settlementAccount = $order->payment_account_snapshot;
                abort_unless(is_string($provider) && is_string($settlementAccount), 409, __('The receiving account snapshot for this order is unavailable.'));
                $suffixLength = $provider === 'cbe' ? 8 : 5;
                if (in_array($provider, ['boa', 'cbe'], true)) {
                    abort_if(isset($data['account_suffix']) && !preg_match('/^\\d{' . $suffixLength . '}$/', $data['account_suffix']), 422, __('Enter a valid transaction account suffix.'));
                    abort_if($provider === 'boa' && !isset($data['account_suffix']), 422, __('Bank of Abyssinia requires the five-digit transaction account suffix.'));
                    abort_if($provider === 'cbe' && preg_match('/^FT/i', $data['reference']) && !isset($data['account_suffix']), 422, __('Older CBE FT references require the eight-digit transaction account suffix.'));
                    abort_if($provider === 'cbe' && !preg_match('/^FT/i', $data['reference']) && isset($data['account_suffix']), 422, __('CBE receipt IDs do not use an account suffix.'));
                }
                $providerInput = match ($provider) {
                    'boa' => ['accountSuffix' => $data['account_suffix'] ?? null],
                    'cbebirr' => ['phoneNumber' => $data['phone_number'] ?? null],
                    'cbe' => ['accountSuffix' => $data['account_suffix'] ?? null],
                    default => [],
                };
                abort_if($provider === 'cbebirr' && !isset($providerInput['phoneNumber']), 422, __('CBE Birr requires the wallet phone number.'));
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
            $order->update(['status' => 'failed_verification']);
        } elseif ($status === 'manual_review') {
            $order->update(['status' => 'manual_review']);
            app(CreatorPaymentReviewNotifier::class)->notify($order, $verification->id);
        }

        return ['status' => $order->fresh()->status, 'order_id' => $order->uuid];
    }

    private function assertAccess(Request $request, StorefrontOrder $order): void
    {
        $token = $request->header('X-Order-Access-Token');
        abort_unless(is_string($token) && $order->payment_access_token_hash
            && hash_equals($order->payment_access_token_hash, hash('sha256', $token)), 403);
    }
}
