<?php

namespace App\Payments\VerifyEt;

final class VerifyEtExperiment
{
    /**
     * Interpret only fields needed for the experiment. Account numbers and
     * transaction identifiers are never copied into the persisted summary.
     *
     * @param array<string, mixed> $body
     * @return array<string, mixed>
     */
    public function summarize(array $body, int $httpStatus, string $bank, string $reference, int $expectedCents): array
    {
        $data = $body['data'] ?? null;
        $items = is_array($data) && array_is_list($data) ? array_values(array_filter($data, 'is_array')) : [];
        $matchingItems = array_values(array_filter($items, fn (array $candidate): bool => in_array(
            $this->canonical($reference),
            array_map($this->canonical(...), $this->identifiers($candidate)),
            true,
        )));
        $item = count($matchingItems) === 1 ? $matchingItems[0] : (count($items) === 1 ? $items[0] : null);
        if (!is_array($item) && is_array($data) && is_array($data['result'] ?? null)) {
            $result = $data['result'];
            $item = array_is_list($result) ? ($result[0] ?? null) : $result;
        }
        if (!is_array($item) && ($body['event'] ?? null) === 'verification.completed' && is_array($data) && !array_is_list($data)) {
            $item = $data;
        }
        $item = is_array($item) ? $item : null;
        $match = is_array($item['settlementAccountMatch'] ?? null) ? $item['settlementAccountMatch'] : null;
        $identities = $item === null ? [] : $this->identifiers($item);
        $amountCents = $this->cents($item['amount'] ?? null);
        $currency = $item['currency'] ?? null;
        $returnedBank = $item['bank'] ?? null;
        $receiver = $item['receiverAccount'] ?? null;
        $history = is_array($item['confirmationHistory'] ?? null) ? $item['confirmationHistory'] : [];
        $requestId = $body['requestId'] ?? $body['verification']['requestId'] ?? (is_array($data) ? ($data['requestId'] ?? null) : null);

        return [
            'http_status' => $httpStatus,
            'envelope_success' => is_bool($body['success'] ?? null) ? $body['success'] : null,
            'result_item_count' => count($items),
            'matching_item_count' => count($matchingItems),
            'request_id' => is_string($requestId) ? $requestId : null,
            'processing_status' => $body['verification']['processingStatus'] ?? (is_array($data) ? ($data['processingStatus'] ?? null) : null),
            'transaction_status' => $item['status'] ?? $body['verification']['status'] ?? (is_array($data) ? ($data['status'] ?? null) : null),
            'verified' => $item['verified'] ?? $body['verification']['verified'] ?? (is_array($data) ? ($data['verified'] ?? null) : null),
            'bank' => is_string($returnedBank) ? $returnedBank : null,
            'bank_matches' => is_string($returnedBank) ? strtolower($returnedBank) === $bank : null,
            'amount' => $amountCents === null ? null : sprintf('%d.%02d', intdiv($amountCents, 100), $amountCents % 100),
            'amount_matches' => $amountCents === null ? null : $amountCents === $expectedCents,
            'currency' => is_string($currency) ? $currency : null,
            'currency_matches' => is_string($currency) ? strtoupper($currency) === 'ETB' : null,
            'identity_matches' => $identities === [] ? null : in_array($this->canonical($reference), array_map($this->canonical(...), $identities), true),
            'transaction_timestamp' => is_string($item['timestamp'] ?? null) ? $item['timestamp'] : null,
            'receiver_available' => $item === null ? null : (is_string($receiver) && $receiver !== ''),
            'settlement_match_present' => $item === null ? null : $match !== null,
            'recipient_match_state' => match (true) {
                $item === null => 'unknown',
                $match === null => 'not_provided',
                ($match['reason'] ?? null) === 'no_registered_accounts' => 'no_registered_accounts',
                ($match['reason'] ?? null) === 'missing_receiver_account' => 'missing_receiver_account',
                ($match['ambiguous'] ?? null) === true => 'ambiguous',
                ($match['matched'] ?? null) === true && ($match['ambiguous'] ?? null) === false => 'provider_matched',
                ($match['matched'] ?? null) === false => 'unmatched',
                default => 'unknown',
            },
            'settlement_match' => $match === null ? null : [
                'matched' => $match['matched'] ?? null,
                'match_type' => $match['matchType'] ?? null,
                'confidence' => $match['matchConfidence'] ?? null,
                'matched_account_available' => is_string($match['matchedSettlementAccount'] ?? null) && $match['matchedSettlementAccount'] !== '',
                'candidate_count' => $match['candidateCount'] ?? null,
                'ambiguous' => $match['ambiguous'] ?? null,
                'reason' => $match['reason'] ?? null,
            ],
            'confirmed_before' => $history['confirmedBefore'] ?? null,
            'confirmation_count' => $history['confirmationCount'] ?? null,
            'first_confirmed_at' => $history['firstConfirmedAt'] ?? null,
            'last_confirmed_at' => $history['lastConfirmedAt'] ?? null,
            'webhook_received' => null,
            'automatic_fulfillment_sufficient' => false,
        ];
    }

    private function canonical(string $value): string
    {
        return strtoupper((string) preg_replace('/[^A-Za-z0-9]/', '', $value));
    }

    /** @param array<string, mixed> $item
     * @return list<string>
     */
    private function identifiers(array $item): array
    {
        return array_values(array_filter([
            $item['transactionNumber'] ?? null,
            $item['referenceNumber'] ?? null,
            $item['receiptNumber'] ?? null,
        ], static fn (mixed $value): bool => is_string($value) && $value !== ''));
    }

    private function cents(mixed $value): ?int
    {
        return app(VerifyEtMoney::class)->cents($value);
    }
}
