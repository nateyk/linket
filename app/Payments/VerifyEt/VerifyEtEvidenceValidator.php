<?php

namespace App\Payments\VerifyEt;

use App\Payments\Models\DirectPaymentVerification;

final class VerifyEtEvidenceValidator
{
    public function __construct(
        private readonly VerifyEtIdentityResolver $identityResolver,
        private readonly VerifyEtMoney $money,
    ) {}

    /**
     * Extract the requestId from result payload.
     *
     * @param array<string, mixed> $result
     */
    public function extractRequestId(array $result): ?string
    {
        $id = data_get($result, 'requestId') ?? data_get($result, 'verification.requestId') ?? data_get($result, 'data.requestId');
        return is_string($id) && $id !== '' ? $id : null;
    }

    /**
     * Validate the provider result envelope and correlate request IDs.
     * Returns an error code string if invalid, or null if valid.
     *
     * @param array<string, mixed> $result
     */
    public function validateEnvelope(DirectPaymentVerification $verification, array $result, ?string $requestId): ?string
    {
        if ($this->isExplicitFailureEnvelope($result, $requestId)) {
            return 'provider_envelope_invalid';
        }

        if ($this->hasWebhookRequestIdConflict($verification, $result, $requestId)) {
            return 'webhook_request_id_conflict';
        }

        if ($requestId !== null && $verification->provider_request_id && $verification->provider_request_id !== $requestId) {
            return 'request_id_conflict';
        }

        return null;
    }

    /**
     * Extract the single completed item payload.
     *
     * @param array<string, mixed> $result
     * @return array<string, mixed>|null
     */
    public function completedItem(array $result): ?array
    {
        $items = $result['data'] ?? null;
        if (($result['event'] ?? null) === 'verification.completed') {
            return is_array($items) && !array_is_list($items) ? $items : null;
        }

        if (is_array($items) && !array_is_list($items) && is_array($items['result'] ?? null) && !array_is_list($items['result'])) {
            return $items['result'];
        }

        return is_array($items) && array_is_list($items) && count($items) === 1 && is_array($items[0] ?? null)
            ? $items[0]
            : null;
    }

    /**
     * Determine whether the result represents a finished verification cycle.
     *
     * @param array<string, mixed> $result
     */
    public function isFinishedResult(array $result): bool
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

    /**
     * Resolve status when verification is still pending or asynchronous.
     *
     * @param array<string, mixed> $result
     */
    public function resolveUnfinishedStatus(array $result, ?string $requestId, ?array $item): string
    {
        $httpStatus = (int) ($result['_http_status'] ?? 0);
        $processing = data_get($result, 'verification.processingStatus') ?? data_get($result, 'data.processingStatus');

        if (!$this->isFinishedResult($result)) {
            if ($httpStatus === 202 && $requestId === null) {
                return 'manual_review';
            }

            return ($httpStatus === 202 || in_array($processing, ['queued', 'running', 'pending'], true))
                ? 'verifying'
                : 'manual_review';
        }

        if ($item === null) {
            $status = data_get($result, 'verification.status') ?? data_get($result, 'data.status');
            return in_array($processing, ['queued', 'running'], true) || $status === 'pending'
                ? 'verifying'
                : 'manual_review';
        }

        return 'verifying';
    }

    /**
     * Validate settlement account match evidence. Returns null on success or error code string on failure.
     */
    public function validateSettlementAccountMatch(mixed $match): ?string
    {
        if (!is_array($match) || !is_bool($match['matched'] ?? null) || !is_bool($match['ambiguous'] ?? null)) {
            return 'recipient_evidence_missing';
        }

        if ($match['ambiguous'] || ($match['candidateCount'] ?? null) !== 1) {
            return 'recipient_evidence_missing';
        }

        if (in_array($match['reason'] ?? null, ['no_registered_accounts', 'missing_receiver_account'], true)) {
            return 'recipient_evidence_missing';
        }

        if ($match['matched'] && (!is_string($match['matchedSettlementAccount'] ?? null)
            || !in_array($match['matchConfidence'] ?? null, ['high', 'exact'], true))) {
            return 'recipient_evidence_missing';
        }

        return null;
    }

    /**
     * Verify that the completed item strictly matches expected verification details.
     *
     * @param array<string, mixed> $item
     */
    public function validCompletedTransaction(DirectPaymentVerification $verification, array $item): bool
    {
        if (($item['status'] ?? null) !== 'success' || ($item['verified'] ?? false) !== true) {
            return false;
        }

        if (strtolower((string) ($item['bank'] ?? '')) !== strtolower($verification->bank_code)) {
            return false;
        }

        if ($this->money->cents($item['amount'] ?? null) !== $verification->amount_cents) {
            return false;
        }

        if (strtoupper((string) ($item['currency'] ?? '')) !== strtoupper($verification->currency)) {
            return false;
        }

        $match = $item['settlementAccountMatch'] ?? null;
        if (!$this->isSettlementAccountEvidenceValid($verification, $match)) {
            return false;
        }

        return $this->hasMatchingTransactionReference($verification->reference, $item);
    }

    /**
     * Validate confirmation history rules. Returns null on success or error code on review needed.
     */
    public function validateConfirmationHistory(mixed $history, DirectPaymentVerification $verification, string $identity): ?string
    {
        if ($history === null) {
            return null;
        }

        if (!is_array($history)) {
            return 'confirmation_history_review';
        }

        $confirmedBefore = $history['confirmedBefore'] ?? null;
        $isFirstConfirmation = $history['isFirstConfirmation'] ?? null;
        $count = $history['confirmationCount'] ?? null;

        if (isset($history['confirmedBefore']) && !is_bool($confirmedBefore)) {
            return 'confirmation_history_review';
        }

        if (isset($history['isFirstConfirmation']) && !is_bool($isFirstConfirmation)) {
            return 'confirmation_history_review';
        }

        if ($count !== null && (!is_int($count) || $count < 1)) {
            return 'confirmation_history_review';
        }

        if ($confirmedBefore === true && $verification->canonical_transaction_identity !== $identity) {
            return 'confirmation_history_review';
        }

        if ($confirmedBefore === true && $isFirstConfirmation === true) {
            return 'confirmation_history_review';
        }

        return null;
    }

    /**
     * Build scrubbed, safe provider result for audit persistence.
     *
     * @param array<string, mixed> $result
     * @return array<string, mixed>
     */
    public function safeProviderResult(array $result): array
    {
        $item = $this->completedItem($result);
        $match = is_array($item['settlementAccountMatch'] ?? null) ? $item['settlementAccountMatch'] : [];
        $evidence = $item ? $this->buildTransactionEvidence($item, $match) : null;

        return array_filter([
            'requestId' => data_get($result, 'requestId') ?? data_get($result, 'verification.requestId'),
            'status' => data_get($result, 'verification.status') ?? data_get($result, 'data.status'),
            'processingStatus' => data_get($result, 'verification.processingStatus') ?? data_get($result, 'data.processingStatus'),
            'errorCode' => data_get($result, 'error.code') ?? data_get($result, 'data.error.code'),
            'transactionEvidence' => $evidence,
        ], static fn (mixed $value): bool => $value !== null);
    }

    private function isExplicitFailureEnvelope(array $result, ?string $requestId): bool
    {
        if (array_key_exists('success', $result) && $result['success'] !== true) {
            return true;
        }

        $httpStatus = (int) ($result['_http_status'] ?? 0);
        return $httpStatus === 200 && ($requestId === null || $requestId === '');
    }

    private function hasWebhookRequestIdConflict(DirectPaymentVerification $verification, array $result, ?string $requestId): bool
    {
        if (($result['event'] ?? null) !== 'verification.completed') {
            return false;
        }

        if ($requestId === null || !is_string($verification->provider_request_id)) {
            return true;
        }

        return !hash_equals($verification->provider_request_id, $requestId);
    }

    private function isSettlementAccountEvidenceValid(DirectPaymentVerification $verification, mixed $match): bool
    {
        if (!is_array($match) || ($match['matched'] ?? false) !== true || ($match['ambiguous'] ?? true) === true) {
            return false;
        }

        if (!in_array($match['matchConfidence'] ?? null, ['high', 'exact'], true)) {
            return false;
        }

        $matchedAccount = $match['matchedSettlementAccount'] ?? null;
        if (!is_string($matchedAccount)) {
            return false;
        }

        return $this->identityResolver->accountMatches($verification->settlement_account, $matchedAccount, $verification->bank_code);
    }

    /**
     * @param array<string, mixed> $item
     */
    private function hasMatchingTransactionReference(string $expectedReference, array $item): bool
    {
        $references = array_filter([
            $item['transactionNumber'] ?? null,
            $item['referenceNumber'] ?? null,
            $item['receiptNumber'] ?? null,
            $item['reference'] ?? null,
        ], 'is_string');

        $canonicalExpected = $this->identityResolver->canonical($expectedReference);
        $canonicalCandidates = array_map($this->identityResolver->canonical(...), $references);

        return in_array($canonicalExpected, $canonicalCandidates, true);
    }

    /**
     * @param array<string, mixed> $item
     * @param array<string, mixed> $match
     * @return array<string, mixed>
     */
    private function buildTransactionEvidence(array $item, array $match): array
    {
        $bank = (string) ($item['bank'] ?? '');
        $matchedAccount = $match['matchedSettlementAccount'] ?? null;
        $fingerprint = is_string($matchedAccount)
            ? hash_hmac('sha256', $this->identityResolver->normalizeSettlementAccount($matchedAccount, $bank), (string) config('app.key'))
            : null;

        return array_filter([
            'bank' => $item['bank'] ?? null,
            'status' => $item['status'] ?? null,
            'verified' => $item['verified'] ?? null,
            'amount' => $item['amount'] ?? null,
            'currency' => $item['currency'] ?? null,
            'canonicalTransactionIdentity' => $this->identityResolver->canonicalIdentity($item, $bank),
            'settlementAccountMatched' => $match['matched'] ?? null,
            'settlementAccountAmbiguous' => $match['ambiguous'] ?? null,
            'settlementAccountConfidence' => $match['matchConfidence'] ?? null,
            'settlementAccountMatchType' => $match['matchType'] ?? null,
            'matchedSettlementAccountFingerprint' => $fingerprint,
            'settlementAccountMatchReason' => $match['reason'] ?? null,
            'confirmationHistory' => is_array($item['confirmationHistory'] ?? null)
                ? array_intersect_key($item['confirmationHistory'], array_flip(['scope', 'isFirstConfirmation', 'confirmedBefore', 'confirmationCount']))
                : null,
        ], static fn (mixed $value): bool => $value !== null);
    }
}
