<?php

namespace App\Payments\VerifyEt;

use App\Payments\Models\DirectPaymentVerification;
use App\Payments\Models\ProSubscriptionPayment;
use App\Payments\Notifications\DirectProLifecycleNotification;
use App\Models\User;
use App\Telegram\Support\TelegramNotificationChannels;
use App\Telegram\Support\TelegramNotificationPreferences;
use App\Storefront\Models\CommissionInvoice;
use App\Storefront\Models\CreatorPaymentMethod;
use App\Storefront\Models\StorefrontOrder;
use App\Storefront\Services\DirectStorefrontFulfillment;
use Common\Billing\Models\Price;
use Common\Billing\Subscription;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Mail;
use Illuminate\Database\UniqueConstraintViolationException;

final class VerifyEtGateway
{
    public function submit(DirectPaymentVerification $verification): string
    {
        $verification->refresh();
        if ($verification->provider_request_id) {
            return $this->reconcile($verification);
        }

        try {
            $result = app(VerifyEtClient::class)->submitVerification($this->payloadFor($verification), $verification->idempotency_key);
            app(VerifyEtHealth::class)->reportSuccess();
        } catch (VerifyEtException $exception) {
            return $this->handleProviderFailure($verification, $exception);
        }

        return $this->processResult($verification, $result);
    }

    public function reconcile(DirectPaymentVerification $verification): string
    {
        if (!$verification->provider_request_id || !in_array($verification->status, ['pending', 'verifying'], true)) {
            return $verification->status;
        }
        try {
            $result = app(VerifyEtClient::class)->getVerification($verification->provider_request_id);
            app(VerifyEtHealth::class)->reportSuccess();
        } catch (VerifyEtException $exception) {
            return $this->handleProviderFailure($verification, $exception);
        }
        return $this->processResult($verification, $result);
    }

    /** @param array<string, mixed> $result */
    public function processResult(DirectPaymentVerification $verification, array $result): string
    {
        $proLifecycle = null;
        try {
            $outcome = DB::transaction(function () use ($verification, $result, &$proLifecycle): string {
            $verification = DirectPaymentVerification::query()->whereKey($verification->id)->lockForUpdate()->firstOrFail();
            if (in_array($verification->status, ['success', 'manual_approved'], true)) {
                return $verification->status;
            }
            $requestId = data_get($result, 'requestId') ?? data_get($result, 'verification.requestId') ?? data_get($result, 'data.requestId');
            if ((array_key_exists('success', $result) && $result['success'] !== true)
                || ((int) ($result['_http_status'] ?? 0) === 200 && (!is_string($requestId) || $requestId === ''))) {
                $verification->update(['status' => 'manual_review', 'latest_error_code' => 'provider_envelope_invalid']);
                return 'manual_review';
            }
            if (($result['event'] ?? null) === 'verification.completed'
                && (!is_string($requestId) || !is_string($verification->provider_request_id)
                    || !hash_equals($verification->provider_request_id, $requestId))) {
                $verification->update(['status' => 'manual_review', 'latest_error_code' => 'webhook_request_id_conflict']);
                return 'manual_review';
            }
            if (is_string($requestId) && $requestId !== '') {
                if ($verification->provider_request_id && $verification->provider_request_id !== $requestId) {
                    $verification->update(['status' => 'manual_review', 'latest_error_code' => 'request_id_conflict']);
                    return 'manual_review';
                }
                $verification->provider_request_id = $requestId;
            }
            $verification->provider_status_url = is_string(data_get($result, 'links.statusUrl')) ? data_get($result, 'links.statusUrl') : (is_string(data_get($result, 'statusUrl')) ? data_get($result, 'statusUrl') : $verification->provider_status_url);
            $verification->provider_processing_status = data_get($result, 'verification.processingStatus') ?? data_get($result, 'data.processingStatus');
            $verification->provider_result = $this->safeProviderResult($result);

            $item = $this->completedItem($result);
            if (!$this->isFinishedResult($result)) {
                $processing = data_get($result, 'verification.processingStatus') ?? data_get($result, 'data.processingStatus');
                $hasPendingRequestId = is_string($requestId) && $requestId !== '';
                $verification->status = ((int) ($result['_http_status'] ?? 0) === 202 && !$hasPendingRequestId)
                    ? 'manual_review'
                    : (((int) ($result['_http_status'] ?? 0) === 202 || in_array($processing, ['queued', 'running', 'pending'], true))
                    ? 'verifying'
                    : 'manual_review');
                $verification->save();
                return $verification->status;
            }
            if (!$item) {
                $status = data_get($result, 'verification.status') ?? data_get($result, 'data.status');
                $processing = data_get($result, 'verification.processingStatus') ?? data_get($result, 'data.processingStatus');
                $verification->status = in_array($processing, ['queued', 'running'], true) || $status === 'pending' ? 'verifying' : 'manual_review';
                $verification->save();
                return $verification->status;
            }
            $match = $item['settlementAccountMatch'] ?? null;
            if (!is_array($match) || !is_bool($match['matched'] ?? null) || !is_bool($match['ambiguous'] ?? null)
                || $match['ambiguous']
                || ($match['candidateCount'] ?? null) !== 1
                || in_array($match['reason'] ?? null, ['no_registered_accounts', 'missing_receiver_account'], true)
                || ($match['matched'] && (!is_string($match['matchedSettlementAccount'] ?? null)
                    || !in_array($match['matchConfidence'] ?? null, ['high', 'exact'], true)))) {
                $verification->update(['status' => 'manual_review', 'latest_error_code' => 'recipient_evidence_missing']);
                return 'manual_review';
            }
            $identity = $this->canonicalIdentity($item, $verification->bank_code);
            if ($identity === null) {
                $verification->update(['status' => 'manual_review', 'latest_error_code' => 'conflicting_or_missing_transaction_identity']);
                return 'manual_review';
            }
            if (!$this->validCompletedTransaction($verification, $item)) {
                $verification->update(['status' => 'mismatch', 'latest_error_code' => 'verification_evidence_mismatch']);
                return 'mismatch';
            }
            if (!$this->payableCanBeSettled($verification)) {
                $verification->update(['status' => 'mismatch', 'latest_error_code' => 'payable_not_eligible']);
                return 'mismatch';
            }
            $claimed = DirectPaymentVerification::query()->where('bank_code', $verification->bank_code)->where('canonical_transaction_identity', $identity)->whereKeyNot($verification->id)->exists();
            if ($claimed) {
                $verification->update(['status' => 'mismatch', 'latest_error_code' => 'duplicate_transaction_identity']);
                return 'mismatch';
            }
            $history = $item['confirmationHistory'] ?? null;
            if (($history !== null && !is_array($history)) || (is_array($history) && (($history['confirmedBefore'] ?? null) === true
                    && $verification->canonical_transaction_identity !== $identity
                    || (($history['confirmedBefore'] ?? null) === true && ($history['isFirstConfirmation'] ?? null) === true)
                    || (isset($history['confirmationCount']) && (!is_int($history['confirmationCount']) || $history['confirmationCount'] < 1))
                    || (isset($history['confirmedBefore']) && !is_bool($history['confirmedBefore']))
                    || (isset($history['isFirstConfirmation']) && !is_bool($history['isFirstConfirmation']))))) {
                $verification->update(['status' => 'manual_review', 'latest_error_code' => 'confirmation_history_review']);
                return 'manual_review';
            }
            // The payment itself is verified, but a previously released free-sale
            // slot cannot displace a newer reservation. Keep canonical evidence
            // for safe review and retry; never label a real transfer a mismatch.
            if ($verification->payable_type === StorefrontOrder::class) {
                $order = StorefrontOrder::query()->whereKey($verification->payable_id)->lockForUpdate()->firstOrFail();
                if (!app(\App\Storefront\Services\CreatorVerificationAllowance::class)->acquireForVerifiedPayment($order)) {
                    $verification->update([
                        'canonical_transaction_identity' => $identity,
                        'verified_at' => now(),
                        'status' => 'manual_review',
                        'latest_error' => null,
                        'latest_error_code' => 'free_allowance_exhausted',
                    ]);
                    $order->update(['status' => 'manual_review']);
                    return 'manual_review';
                }
            }
            $verification->update(['canonical_transaction_identity' => $identity, 'verified_at' => now(), 'latest_error' => null, 'latest_error_code' => null]);
            if (!$this->settle($verification, $proLifecycle)) {
                $verification->update(['status' => 'mismatch', 'latest_error_code' => 'payable_already_settled']);
                return 'mismatch';
            }
            $verification->update(['status' => 'success']);
                return 'success';
            }, 3);
            if ($outcome === 'mismatch' && $verification->payable_type === StorefrontOrder::class && $verification->payable) {
                app(\App\Storefront\Services\CreatorVerificationAllowance::class)->release($verification->payable, 'definitive_verification_mismatch');
            }
            if ($outcome === 'success' && is_array($proLifecycle)) {
                $this->notifyProLifecycle($proLifecycle);
            }

            return $outcome;
        } catch (UniqueConstraintViolationException) {
            DirectPaymentVerification::query()->whereKey($verification->id)->update([
                'status' => 'mismatch',
                'latest_error_code' => 'duplicate_transaction_identity',
            ]);

            return 'mismatch';
        }
    }

    /** @return array<string, mixed> */
    private function payloadFor(DirectPaymentVerification $verification): array
    {
        $input = $verification->provider_input ?? [];
        $supportedBanks = ['cbe', 'boa', 'telebirr', 'mpesa', 'cbebirr', 'dashen', 'awash', 'siinqee', 'kaafiebirr', 'coopayebirr'];
        if (!in_array($verification->bank_code, $supportedBanks, true)) {
            throw new VerifyEtException(422, 'unsupported_bank');
        }
        $payload = ['bank' => $verification->bank_code, 'settlementAccount' => $verification->settlement_account];
        if ($verification->bank_code === 'boa' && !preg_match('/^\d{5}$/', (string) ($input['accountSuffix'] ?? ''))) {
            throw new VerifyEtException(422, 'invalid_bank_fields', 'INVALID_BOA_SUFFIX');
        }
        if ($verification->bank_code === 'cbe') {
            $suffix = $input['accountSuffix'] ?? null;
            if ((preg_match('/^FT/i', $verification->reference) && !preg_match('/^\d{8}$/', (string) $suffix))
                || (!preg_match('/^FT/i', $verification->reference) && $suffix !== null)) {
                throw new VerifyEtException(422, 'invalid_bank_fields', 'INVALID_CBE_SUFFIX');
            }
        }
        if ($verification->bank_code === 'cbebirr' && !preg_match('/^(?:0\d{9}|\+251\d{9})$/', (string) ($input['phoneNumber'] ?? ''))) {
            throw new VerifyEtException(422, 'invalid_bank_fields', 'INVALID_CBEBIRR_PHONE');
        }
        match ($verification->bank_code) {
            'telebirr', 'mpesa' => $payload['transactionNumber'] = $verification->reference,
            'cbebirr' => $payload += ['receiptNumber' => $verification->reference, 'phoneNumber' => $input['phoneNumber']],
            'boa' => $payload += ['referenceNumber' => $verification->reference, 'accountSuffix' => $input['accountSuffix']],
            'cbe' => $payload += ['reference' => $verification->reference, ...(($input['accountSuffix'] ?? null) ? ['accountSuffix' => $input['accountSuffix']] : [])],
            default => $payload['referenceNumber'] = $verification->reference,
        };
        return array_filter($payload, static fn (mixed $value): bool => $value !== null && $value !== '');
    }

    /** @param array<string, mixed> $result
     * @return array<string, mixed>|null
     */
    private function completedItem(array $result): ?array
    {
        $items = $result['data'] ?? null;
        if (($result['event'] ?? null) === 'verification.completed') {
            return is_array($items) && !array_is_list($items) ? $items : null;
        }
        if (is_array($items) && !array_is_list($items) && is_array($items['result'] ?? null) && !array_is_list($items['result'])) {
            return $items['result'];
        }
        return is_array($items) && array_is_list($items) && count($items) === 1 && is_array($items[0] ?? null) ? $items[0] : null;
    }

    /** @param array<string, mixed> $result */
    private function isFinishedResult(array $result): bool
    {
        if ((int) ($result['_http_status'] ?? 0) === 202) {
            return false;
        }

        $processing = data_get($result, 'verification.processingStatus') ?? data_get($result, 'data.processingStatus');
        if (($result['event'] ?? null) === 'verification.completed') {
            return $processing === 'completed';
        }
        if ($processing === 'completed') {
            return true;
        }

        return (int) ($result['_http_status'] ?? 0) === 200
            && !in_array($processing, ['queued', 'running', 'pending'], true);
    }

    /** @param array<string, mixed> $item */
    private function validCompletedTransaction(DirectPaymentVerification $verification, array $item): bool
    {
        $match = $item['settlementAccountMatch'] ?? null;
        $references = array_filter([$item['transactionNumber'] ?? null, $item['referenceNumber'] ?? null, $item['receiptNumber'] ?? null, $item['reference'] ?? null], 'is_string');
        return ($item['status'] ?? null) === 'success'
            && ($item['verified'] ?? false) === true
            && strtolower((string) ($item['bank'] ?? '')) === strtolower($verification->bank_code)
            && app(VerifyEtMoney::class)->cents($item['amount'] ?? null) === $verification->amount_cents
            && strtoupper((string) ($item['currency'] ?? '')) === strtoupper($verification->currency)
            && is_array($match) && ($match['matched'] ?? false) === true && ($match['ambiguous'] ?? true) === false
            && in_array($match['matchConfidence'] ?? null, ['high', 'exact'], true)
            && is_string($match['matchedSettlementAccount'] ?? null)
            && $this->accountMatches($verification->settlement_account, $match['matchedSettlementAccount'], $verification->bank_code)
            && in_array($this->canonical($verification->reference), array_map($this->canonical(...), $references), true);
    }

    /** @param array<string, mixed> $item */
    private function canonicalIdentity(array $item, string $bank): ?string
    {
        $bank = strtolower($bank);
        if ($bank === 'cbe' && (!is_string($item['receiptNumber'] ?? null) || $item['receiptNumber'] === '')) {
            $receiptId = $item['referenceNumber'] ?? $item['reference'] ?? null;
            if (!is_string($receiptId) || $receiptId === '' || preg_match('/^FT/i', $receiptId)) {
                return null;
            }
        }
        $fields = match ($bank) {
            'telebirr', 'mpesa' => ['transactionNumber', 'referenceNumber', 'receiptNumber', 'reference'],
            'cbe', 'cbebirr' => ['receiptNumber', 'referenceNumber', 'transactionNumber', 'reference'],
            default => ['referenceNumber', 'receiptNumber', 'transactionNumber', 'reference'],
        };
        $identities = [];
        foreach ($fields as $field) {
            if (is_string($item[$field] ?? null) && $item[$field] !== '') {
                $identity = $this->canonical($item[$field]);
                if ($identity === '') {
                    return null;
                }
                $identities[] = $identity;
            }
        }
        if ($bank !== 'cbe' && count(array_unique($identities)) > 1) {
            return null;
        }
        return $identities[0] ?? null;
    }

    private function canonical(string $value): string
    {
        return strtoupper((string) preg_replace('/[^A-Za-z0-9]/', '', $value));
    }

    private function accountMatches(string $expected, string $actual, string $bank): bool
    {
        if (str_contains($actual, '*') || str_contains($actual, '•')
            || str_contains($expected, '*') || str_contains($expected, '•')) {
            return false;
        }
        $expected = $this->normalizeSettlementAccount($expected, $bank);
        return $expected !== '' && hash_equals($expected, $this->normalizeSettlementAccount($actual, $bank));
    }

    private function normalizeSettlementAccount(string $account, string $bank): string
    {
        $account = strtoupper((string) preg_replace('/[^A-Za-z0-9]/', '', $account));
        if (in_array(strtolower($bank), ['telebirr', 'mpesa'], true) && preg_match('/^0(9[0-9]{8})$/', $account, $parts)) {
            return '251' . $parts[1];
        }

        return $account;
    }

    private function payableCanBeSettled(DirectPaymentVerification $verification): bool
    {
        if (strtoupper($verification->currency) !== 'ETB') {
            return false;
        }
        return match ($verification->payable_type) {
            StorefrontOrder::class => $this->eligibleOrder($verification),
            CommissionInvoice::class => CommissionInvoice::query()->whereKey($verification->payable_id)->whereIn('status', ['pending', 'overdue'])->where('commission_fee_cents', $verification->amount_cents)->lockForUpdate()->first() !== null,
            ProSubscriptionPayment::class => ProSubscriptionPayment::query()->whereKey($verification->payable_id)->where('status', 'pending_payment')->where('amount_cents', $verification->amount_cents)->lockForUpdate()->first() !== null,
            default => false,
        };
    }

    private function eligibleOrder(DirectPaymentVerification $verification): bool
    {
        $order = StorefrontOrder::query()->whereKey($verification->payable_id)
            ->whereIn('status', ['pending_payment', 'verifying', 'failed_verification', 'manual_review', 'expired'])
            ->lockForUpdate()->first();
        return $order !== null
            && ($order->status !== 'expired' || $order->monetization_policy !== null)
            && $order->payment_gateway === 'verify_et'
            && $order->gross_amount_cents === $verification->amount_cents
            && strtoupper((string) $order->currency) === strtoupper($verification->currency)
            && strtolower((string) $order->payment_provider_snapshot) === strtolower($verification->bank_code)
            && is_string($order->payment_account_snapshot)
            && $order->creator_payment_method_id !== null
            && !CreatorPaymentMethod::query()->whereKey($order->creator_payment_method_id)->where('is_suspended', true)->exists()
            && $this->accountMatches($order->payment_account_snapshot, $verification->settlement_account, $verification->bank_code);
    }

    /** @param array<string, mixed> $result
     * @return array<string, mixed>
     */
    private function safeProviderResult(array $result): array
    {
        $item = $this->completedItem($result);
        $match = is_array($item['settlementAccountMatch'] ?? null) ? $item['settlementAccountMatch'] : [];
        $evidence = $item ? array_filter([
            'bank' => $item['bank'] ?? null,
            'status' => $item['status'] ?? null,
            'verified' => $item['verified'] ?? null,
            'amount' => $item['amount'] ?? null,
            'currency' => $item['currency'] ?? null,
            'canonicalTransactionIdentity' => $this->canonicalIdentity($item, (string) ($item['bank'] ?? '')),
            'settlementAccountMatched' => $match['matched'] ?? null,
            'settlementAccountAmbiguous' => $match['ambiguous'] ?? null,
            'settlementAccountConfidence' => $match['matchConfidence'] ?? null,
            'settlementAccountMatchType' => $match['matchType'] ?? null,
            'matchedSettlementAccountFingerprint' => is_string($match['matchedSettlementAccount'] ?? null)
                ? hash_hmac('sha256', $this->normalizeSettlementAccount($match['matchedSettlementAccount'], (string) ($item['bank'] ?? '')), (string) config('app.key'))
                : null,
            'settlementAccountMatchReason' => $match['reason'] ?? null,
            'confirmationHistory' => is_array($item['confirmationHistory'] ?? null)
                ? array_intersect_key($item['confirmationHistory'], array_flip(['scope', 'isFirstConfirmation', 'confirmedBefore', 'confirmationCount']))
                : null,
        ], static fn (mixed $value): bool => $value !== null) : null;

        return array_filter([
            'requestId' => data_get($result, 'requestId') ?? data_get($result, 'verification.requestId'),
            'status' => data_get($result, 'verification.status') ?? data_get($result, 'data.status'),
            'processingStatus' => data_get($result, 'verification.processingStatus') ?? data_get($result, 'data.processingStatus'),
            'errorCode' => data_get($result, 'error.code') ?? data_get($result, 'data.error.code'),
            'transactionEvidence' => $evidence,
        ], static fn (mixed $value): bool => $value !== null);
    }

    private function settle(DirectPaymentVerification $verification, ?array &$proLifecycle = null): bool
    {
        if ($verification->payable_type === StorefrontOrder::class) {
            return app(DirectStorefrontFulfillment::class)->fulfill($verification->payable);
        }
        if ($verification->payable_type === CommissionInvoice::class) {
            return CommissionInvoice::query()->whereKey($verification->payable_id)->lockForUpdate()->whereIn('status', ['pending', 'overdue'])->update(['status' => 'paid', 'paid_at' => now()]) === 1;
        }
        if ($verification->payable_type !== ProSubscriptionPayment::class) {
            return false;
        }
        $payment = ProSubscriptionPayment::query()->whereKey($verification->payable_id)->lockForUpdate()->firstOrFail();
        if ($payment->status === 'paid') { return false; }
        $periodStart = $payment->subscription_period_end?->isFuture()
            ? $payment->subscription_period_end->copy()
            : now();
        $periodEnd = $periodStart->copy()->addMonthNoOverflow();
        $price = $payment->price_id
            ? Price::query()->where('product_id', $payment->product_id)->findOrFail($payment->price_id)
            : Price::query()->where('product_id', $payment->product_id)->where('currency', 'ETB')
                ->whereRaw('ROUND(amount * 100) = ?', [$payment->amount_cents])->orderByDesc('default')->firstOrFail();
        $subscription = Subscription::query()->where('user_id', $payment->creator_id)->where('gateway_name', 'verify_et')->whereNull('ends_at')->lockForUpdate()->latest('id')->first();
        $wasRenewal = $subscription !== null;
        if ($subscription) {
            $periodStart = $subscription->renews_at?->isFuture() ? $subscription->renews_at->copy() : now();
            $periodEnd = $periodStart->copy()->addMonthNoOverflow();
            $subscription->update(['product_id' => $payment->product_id, 'price_id' => $price->id, 'gateway_status' => 'active', 'renews_at' => $periodEnd]);
        } else {
            $subscription = Subscription::query()->create(['user_id' => $payment->creator_id, 'product_id' => $payment->product_id, 'price_id' => $price->id, 'gateway_name' => 'verify_et', 'gateway_id' => $payment->uuid, 'gateway_status' => 'active', 'renews_at' => $periodEnd]);
        }
        $payment->update([
            'status' => 'paid',
            'paid_at' => now(),
            'receipt_number' => $payment->receipt_number ?? 'LINKET-' . Str::upper((string) Str::ulid()),
            'subscription_period_start' => $periodStart,
            'subscription_period_end' => $periodEnd,
        ]);

        $proLifecycle = [
            'creator_id' => $payment->creator_id,
            'subscription_id' => $subscription->id,
            'payment_id' => $payment->id,
            'event' => $wasRenewal ? 'renewed' : 'activated',
        ];

        return true;
    }

    /**
     * @param array{creator_id: int, subscription_id: int, payment_id: int, event: string} $lifecycle
     */
    private function notifyProLifecycle(array $lifecycle): void
    {
        try {
            $creator = User::query()->find($lifecycle['creator_id']);
            if ($creator && TelegramNotificationChannels::isAvailableFor(
                $creator, TelegramNotificationPreferences::PRO_BILLING,
            )) {
                $creator->notify(new DirectProLifecycleNotification(
                    $lifecycle['subscription_id'],
                    $lifecycle['event'],
                    $lifecycle['payment_id'],
                ));
            }
        } catch (\Throwable) {
            // A Telegram queue outage must not affect a successfully verified Pro payment.
            Log::warning('telegram.pro_lifecycle_alert_enqueue_failed', [
                'subscription_id' => $lifecycle['subscription_id'],
            ]);
        }
    }

    private function handleProviderFailure(DirectPaymentVerification $verification, VerifyEtException $exception): string
    {
        app(VerifyEtHealth::class)->reportFailure();
        $status = in_array($exception->httpStatus, [400, 422], true)
            ? 'mismatch'
            : ($exception->httpStatus === 409 ? 'manual_review' : 'verifying');
        $verification->update(['status' => $status, 'latest_error_code' => $exception->providerCode, 'latest_error' => $exception->getMessage()]);
        if ($exception->httpStatus === 402) {
            Log::critical('verify_et.credits_exhausted', ['verification_id' => $verification->id, 'code' => $exception->providerCode]);
            if ($email = VerifyEtSettings::get('alert_email')) {
                Mail::raw('Verify.et verification credits require attention.', fn ($message) => $message->to($email)->subject('Verify.et credits require attention'));
            }
        }
        if (in_array($exception->httpStatus, [401, 403], true)) {
            Log::critical('verify_et.credentials_or_permissions_invalid', [
                'verification_id' => $verification->id,
                'http_status' => $exception->httpStatus,
                'code' => $exception->providerCode,
            ]);
            if ($email = VerifyEtSettings::get('alert_email')) {
                \Illuminate\Support\Facades\RateLimiter::attempt(
                    'verify-et:authentication-alert',
                    fn () => Mail::raw('Verify.et rejected Linket credentials or scoped API permissions.', fn ($message) => $message->to($email)->subject('Verify.et integration configuration requires attention')),
                    1,
                    300,
                );
            }
        }
        return $status;
    }
}
