<?php

namespace App\Payments\Controllers;

use App\Jobs\ProcessVerifyEtWebhook;
use App\Payments\Models\VerifyEtWebhookDelivery;
use App\Payments\VerifyEt\VerifyEtJson;
use Carbon\CarbonImmutable;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Crypt;

final class VerifyEtWebhookController extends Controller
{
    public function handle(Request $request): Response
    {
        if (app()->bound('clockwork')) {
            app('clockwork')->shouldCollect()->except('/billing/verify-et/webhook');
        }
        abort_if(strlen($request->getContent()) > 262144, 413);
        $timestamp = $request->header('X-Webhook-Timestamp');
        $signature = $request->header('X-Webhook-Signature');
        $eventId = $request->header('X-Webhook-Event-Id');
        abort_unless(is_string($timestamp) && is_string($signature) && is_string($eventId) && $this->timestampIsFresh($timestamp) && $this->signatureIsValid($timestamp, $request->getContent(), $signature), 401);
        abort_unless(preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i', $eventId) === 1, 400);
        try {
            $payload = app(VerifyEtJson::class)->decode($request->getContent());
        } catch (\JsonException) {
            abort(400);
        }
        $isTest = filter_var($request->header('X-Webhook-Test'), FILTER_VALIDATE_BOOLEAN);
        $requestId = $payload['requestId'] ?? null;
        abort_if($requestId !== null && (!is_string($requestId) || strlen($requestId) > 255), 400);
        if (!$isTest && ($payload['event'] ?? null) === 'verification.completed') {
            abort_unless(is_string($requestId) && $requestId !== '' && is_array($payload['data'] ?? null)
                && !array_is_list($payload['data']) && ($payload['data']['processingStatus'] ?? null) === 'completed', 400);
            abort_if(isset($payload['id']) && (!is_string($payload['id']) || !hash_equals($eventId, $payload['id'])), 400);
        }
        $safePayload = $this->safePayload($payload);
        try {
            $delivery = VerifyEtWebhookDelivery::query()->create(['event_id' => $eventId, 'provider_request_id' => is_string($requestId) ? $requestId : null, 'event_type' => is_string($payload['event'] ?? null) ? $payload['event'] : null, 'payload' => ['encrypted' => Crypt::encryptString(json_encode($safePayload, JSON_THROW_ON_ERROR))], 'status' => $isTest ? 'test' : 'received', 'is_test' => $isTest, 'received_at' => now()]);
        } catch (UniqueConstraintViolationException) {
            return response()->noContent();
        }
        if ($isTest) {
            return response()->noContent();
        }
        if (($payload['event'] ?? null) !== 'verification.completed' || !is_string($requestId) || $requestId === '') {
            $delivery->update(['status' => 'ignored']);
            return response()->noContent();
        }
        ProcessVerifyEtWebhook::dispatch($delivery->id)->afterCommit();
        return response()->noContent();
    }

    /** @param array<string, mixed> $payload
     * @return array<string, mixed>
     */
    private function safePayload(array $payload): array
    {
        $data = $payload['data'] ?? null;
        $allowed = ['processingStatus', 'status', 'verified', 'bank', 'amount', 'currency', 'transactionNumber', 'referenceNumber', 'receiptNumber', 'settlementAccountMatch', 'confirmationHistory', 'durationMs', 'completedAt'];
        if (is_array($data)) {
            $data = array_intersect_key($data, array_flip($allowed));
            if (is_array($data['settlementAccountMatch'] ?? null)) {
                $data['settlementAccountMatch'] = array_intersect_key($data['settlementAccountMatch'], array_flip([
                    'matched', 'ambiguous', 'matchConfidence', 'matchType', 'matchedSettlementAccount', 'candidateCount', 'reason',
                ]));
            }
            if (is_array($data['confirmationHistory'] ?? null)) {
                $data['confirmationHistory'] = array_intersect_key($data['confirmationHistory'], array_flip([
                    'scope', 'isFirstConfirmation', 'confirmedBefore', 'confirmationCount', 'firstConfirmedAt', 'lastConfirmedAt',
                ]));
            }
        }

        return array_filter([
            'id' => $payload['id'] ?? null,
            'event' => $payload['event'] ?? null,
            'requestId' => $payload['requestId'] ?? null,
            'timestamp' => $payload['timestamp'] ?? null,
            'data' => $data,
        ], static fn (mixed $value): bool => $value !== null);
    }

    private function timestampIsFresh(string $timestamp): bool
    {
        try {
            return abs(now()->diffInSeconds(CarbonImmutable::parse($timestamp), false)) <= 300;
        } catch (\Throwable) {
            return false;
        }
    }

    private function signatureIsValid(string $timestamp, string $rawBody, string $header): bool
    {
        $previousSecret = config('services.verify_et.webhook_previous_secret');
        $previousSecretRotatedAt = config('services.verify_et.webhook_previous_secret_rotated_at');
        $previousSecretExpiresAt = config('services.verify_et.webhook_previous_secret_expires_at');
        try {
            $rotationStartedAt = is_string($previousSecretRotatedAt) && $previousSecretRotatedAt !== ''
                ? \Carbon\CarbonImmutable::parse($previousSecretRotatedAt)
                : null;
            $rotationEndsAt = $rotationStartedAt?->addHours(24);
            $configuredExpiresAt = is_string($previousSecretExpiresAt) && $previousSecretExpiresAt !== ''
                ? \Carbon\CarbonImmutable::parse($previousSecretExpiresAt)
                : null;
            $previousSecretIsInRotationWindow = $rotationStartedAt !== null
                && $rotationEndsAt !== null
                && $configuredExpiresAt !== null
                && now()->gte($rotationStartedAt)
                && now()->lte($rotationEndsAt)
                && $configuredExpiresAt->lte($rotationEndsAt)
                && now()->lte($configuredExpiresAt);
        } catch (\Throwable) {
            $previousSecretIsInRotationWindow = false;
        }
        $secrets = array_filter([
            config('services.verify_et.webhook_secret'),
            $previousSecretIsInRotationWindow ? $previousSecret : null,
        ], static fn (mixed $secret): bool => is_string($secret) && $secret !== '');
        foreach ($secrets as $secret) {
            $expected = hash_hmac('sha256', $timestamp . '.' . $rawBody, $secret);
            foreach (explode(',', $header) as $part) {
                $signature = trim((string) preg_replace('/^sha256=/i', '', trim($part)));
                if (ctype_xdigit($signature) && strlen($signature) === 64 && hash_equals($expected, $signature)) {
                    return true;
                }
            }
        }
        return false;
    }
}
