<?php

namespace App\Payments\VerifyEt;

use App\Payments\Models\DirectPaymentVerification;
use App\Storefront\Models\StorefrontOrder;
use App\Storefront\Services\CreatorVerificationAllowance;
use App\Storefront\Services\StorefrontVerificationSession;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;

final class VerifyEtGateway
{
    public function __construct(
        private readonly VerifyEtClient $client,
        private readonly VerifyEtHealth $health,
        private readonly VerifyEtPayloadBuilder $payloadBuilder,
        private readonly VerifyEtEvidenceValidator $evidenceValidator,
        private readonly VerifyEtIdentityResolver $identityResolver,
        private readonly VerifyEtSettlementHandler $settlementHandler,
        private readonly VerifyEtOutcomeNotifier $outcomeNotifier,
        private readonly VerifyEtFailureHandler $failureHandler,
    ) {}

    public function submit(DirectPaymentVerification $verification): string
    {
        $verification->refresh();
        if ($verification->provider_request_id) {
            return $this->reconcile($verification);
        }

        return $this->executeRequest(
            $verification,
            fn () => $this->client->submitVerification(
                $this->payloadBuilder->build($verification),
                $verification->idempotency_key,
            ),
        );
    }

    public function reconcile(DirectPaymentVerification $verification): string
    {
        if (!$verification->provider_request_id || !in_array($verification->status, ['pending', 'verifying'], true)) {
            return $verification->status;
        }

        return $this->executeRequest(
            $verification,
            fn () => $this->client->getVerification($verification->provider_request_id),
        );
    }

    /**
     * Process verification result payload and transition lifecycle states.
     *
     * @param array<string, mixed> $result
     */
    public function processResult(DirectPaymentVerification $verification, array $result): string
    {
        $proLifecycle = null;
        try {
            $outcome = DB::transaction(
                fn (): string => $this->evaluateResultTransaction($verification, $result, $proLifecycle),
                3,
            );

            $this->handlePostTransactionOutcome($verification, $outcome, $proLifecycle);

            return $outcome;
        } catch (UniqueConstraintViolationException) {
            DirectPaymentVerification::query()->whereKey($verification->id)->update([
                'status' => 'mismatch',
                'latest_error_code' => 'duplicate_transaction_identity',
            ]);
            $verification->refresh();
            $this->recordStorefrontMismatch($verification);

            return 'mismatch';
        }
    }

    /**
     * @param callable(): array<string, mixed> $action
     */
    private function executeRequest(DirectPaymentVerification $verification, callable $action): string
    {
        try {
            $result = $action();
            $this->health->reportSuccess();
        } catch (VerifyEtException $exception) {
            return $this->failureHandler->handle($verification, $exception);
        }

        return $this->processResult($verification, $result);
    }

    /**
     * @param array<string, mixed> $result
     * @param array{creator_id: int, subscription_id: int, payment_id: int, event: string}|null $proLifecycle
     */
    private function evaluateResultTransaction(DirectPaymentVerification $verification, array $result, ?array &$proLifecycle): string
    {
        $verification = DirectPaymentVerification::query()->whereKey($verification->id)->lockForUpdate()->firstOrFail();
        if (in_array($verification->status, ['success', 'manual_approved'], true)) {
            return $verification->status;
        }

        $requestId = $this->evidenceValidator->extractRequestId($result);
        $envelopeError = $this->evidenceValidator->validateEnvelope($verification, $result, $requestId);
        if ($envelopeError !== null) {
            return $this->holdForManualReview($verification, $envelopeError);
        }

        $this->persistProviderEnvelopeMeta($verification, $result, $requestId);

        $item = $this->evidenceValidator->completedItem($result);
        if (!$this->evidenceValidator->isFinishedResult($result) || $item === null) {
            $status = $this->evidenceValidator->resolveUnfinishedStatus($result, $requestId, $item);
            $verification->update(['status' => $status]);
            if ($status === 'manual_review') {
                $this->markStorefrontOrderManualReview($verification);
            }

            return $status;
        }

        $matchError = $this->evidenceValidator->validateSettlementAccountMatch($item['settlementAccountMatch'] ?? null);
        if ($matchError !== null) {
            return $this->holdForManualReview($verification, $matchError);
        }

        $identity = $this->identityResolver->canonicalIdentity($item, $verification->bank_code);
        if ($identity === null) {
            return $this->holdForManualReview($verification, 'conflicting_or_missing_transaction_identity');
        }

        if (!$this->evidenceValidator->validCompletedTransaction($verification, $item)) {
            $verification->update(['status' => 'mismatch', 'latest_error_code' => 'verification_evidence_mismatch']);
            return 'mismatch';
        }

        if (!$this->settlementHandler->canBeSettled($verification)) {
            $verification->update(['status' => 'mismatch', 'latest_error_code' => 'payable_not_eligible']);
            return 'mismatch';
        }

        if ($this->isDuplicateIdentityClaimed($verification, $identity)) {
            $verification->update(['status' => 'mismatch', 'latest_error_code' => 'duplicate_transaction_identity']);
            return 'mismatch';
        }

        $historyError = $this->evidenceValidator->validateConfirmationHistory($item['confirmationHistory'] ?? null, $verification, $identity);
        if ($historyError !== null) {
            return $this->holdForManualReview($verification, $historyError);
        }

        if ($this->shouldHoldForCreatorAllowance($verification, $identity)) {
            return 'manual_review';
        }

        $verification->update([
            'canonical_transaction_identity' => $identity,
            'verified_at' => now(),
            'latest_error' => null,
            'latest_error_code' => null,
        ]);

        if (!$this->settlementHandler->settle($verification, $proLifecycle)) {
            $verification->update(['status' => 'mismatch', 'latest_error_code' => 'payable_already_settled']);
            return 'mismatch';
        }

        $verification->update(['status' => 'success']);

        return 'success';
    }

    private function holdForManualReview(DirectPaymentVerification $verification, string $errorCode): string
    {
        $verification->update([
            'status' => 'manual_review',
            'latest_error_code' => $errorCode,
        ]);
        $this->markStorefrontOrderManualReview($verification);

        return 'manual_review';
    }

    private function markStorefrontOrderManualReview(DirectPaymentVerification $verification): void
    {
        if ($verification->payable_type !== StorefrontOrder::class) {
            return;
        }

        $order = StorefrontOrder::query()->whereKey($verification->payable_id)->lockForUpdate()->first();
        if ($order === null || in_array($order->status, ['paid', 'completed', 'manual_review'], true)) {
            return;
        }

        $order->update(['status' => 'manual_review']);
    }

    private function shouldHoldForCreatorAllowance(DirectPaymentVerification $verification, string $identity): bool
    {
        if ($verification->payable_type !== StorefrontOrder::class) {
            return false;
        }

        $order = StorefrontOrder::query()->whereKey($verification->payable_id)->lockForUpdate()->firstOrFail();
        if (!app(CreatorVerificationAllowance::class)->acquireForVerifiedPayment($order)) {
            $verification->update([
                'canonical_transaction_identity' => $identity,
                'verified_at' => now(),
                'status' => 'manual_review',
                'latest_error' => null,
                'latest_error_code' => 'free_allowance_exhausted',
            ]);
            $order->update(['status' => 'manual_review']);

            return true;
        }

        return false;
    }

    /**
     * @param array<string, mixed> $result
     */
    private function persistProviderEnvelopeMeta(DirectPaymentVerification $verification, array $result, ?string $requestId): void
    {
        if ($requestId !== null && !$verification->provider_request_id) {
            $verification->provider_request_id = $requestId;
        }

        $statusUrl = data_get($result, 'links.statusUrl') ?? data_get($result, 'statusUrl');
        if (is_string($statusUrl)) {
            $verification->provider_status_url = $statusUrl;
        }

        $verification->provider_processing_status = data_get($result, 'verification.processingStatus') ?? data_get($result, 'data.processingStatus');
        $verification->provider_result = $this->evidenceValidator->safeProviderResult($result);
    }

    private function isDuplicateIdentityClaimed(DirectPaymentVerification $verification, string $identity): bool
    {
        return DirectPaymentVerification::query()
            ->where('bank_code', $verification->bank_code)
            ->where('canonical_transaction_identity', $identity)
            ->whereKeyNot($verification->id)
            ->exists();
    }

    /**
     * @param array{creator_id: int, subscription_id: int, payment_id: int, event: string}|null $proLifecycle
     */
    private function handlePostTransactionOutcome(DirectPaymentVerification $verification, string $outcome, ?array $proLifecycle): void
    {
        if ($verification->payable_type === StorefrontOrder::class) {
            $this->syncStorefrontOrderStatus($verification, $outcome);

            if (in_array($outcome, ['success', 'manual_review'], true)) {
                $this->outcomeNotifier->notifyOrderOutcome($verification, $outcome);
            }
        }

        if ($outcome === 'success' && is_array($proLifecycle)) {
            $this->outcomeNotifier->notifyProLifecycle($proLifecycle);
        }
    }

    private function syncStorefrontOrderStatus(DirectPaymentVerification $verification, string $outcome): void
    {
        if ($verification->payable_type !== StorefrontOrder::class) {
            return;
        }

        $order = StorefrontOrder::query()->whereKey($verification->payable_id)->first();
        if (!$order || $order->isCompleted()) {
            return;
        }

        if ($outcome === 'manual_review' && $order->status !== 'manual_review') {
            $order->update(['status' => StorefrontOrder::STATUS_MANUAL_REVIEW]);
        } elseif ($outcome === 'mismatch') {
            app(StorefrontVerificationSession::class)->recordMismatch($order, $verification);
        }
    }

    private function recordStorefrontMismatch(DirectPaymentVerification $verification): void
    {
        if ($verification->payable_type !== StorefrontOrder::class) {
            return;
        }

        $order = StorefrontOrder::query()->find($verification->payable_id);
        if ($order) {
            app(StorefrontVerificationSession::class)->recordMismatch($order, $verification);
        }
    }

    /**
     * Public proxies for backward compatibility and test convenience.
     *
     * @param array<string, mixed> $result
     * @return array<string, mixed>
     */
    public function safeProviderResult(array $result): array
    {
        return $this->evidenceValidator->safeProviderResult($result);
    }

    /**
     * @param array<string, mixed> $item
     */
    public function canonicalIdentity(array $item, string $bank): ?string
    {
        return $this->identityResolver->canonicalIdentity($item, $bank);
    }

    public function canonical(string $value): string
    {
        return $this->identityResolver->canonical($value);
    }

    public function accountMatches(string $expected, string $actual, string $bank): bool
    {
        return $this->identityResolver->accountMatches($expected, $actual, $bank);
    }

    public function normalizeSettlementAccount(string $account, string $bank): string
    {
        return $this->identityResolver->normalizeSettlementAccount($account, $bank);
    }
}
