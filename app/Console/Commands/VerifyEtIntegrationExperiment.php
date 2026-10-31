<?php

namespace App\Console\Commands;

use App\Payments\VerifyEt\VerifyEtExperiment;
use App\Payments\VerifyEt\VerifyEtExperimentHttp;
use App\Payments\VerifyEt\VerifyEtJson;
use Dotenv\Dotenv;
use Illuminate\Console\Command;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Storage;
use Carbon\CarbonImmutable;
use Throwable;

final class VerifyEtIntegrationExperiment extends Command
{
    protected $signature = 'verify-et:experiment
        {--live : Allow requests to Verify.et}
        {--rotated-key-confirmed : Confirm the key is freshly rotated and has verification read and write permissions}
        {--receiving-accounts-registered : Confirm both test receiving accounts are registered in the Verify.et dashboard}
        {--status : Poll already submitted requests without resubmitting}';

    protected $description = 'Run isolated Verify.et receipt verification experiments';

    public function handle(): int
    {
        $envPath = base_path('.env.verify-et-integration');
        try {
            $values = is_file($envPath) ? Dotenv::parse((string) file_get_contents($envPath)) : [];
        } catch (Throwable) {
            $this->error('The isolated environment file is invalid.');
            return self::FAILURE;
        }
        $cases = [
            'telebirr' => [
                'field' => 'transactionNumber',
                'reference' => $values['VERIFY_ET_TELEBIRR_REFERENCE'] ?? '',
                'settlement_account' => $values['VERIFY_ET_TELEBIRR_SETTLEMENT_ACCOUNT'] ?? '',
                'amount' => 247000,
            ],
            'dashen' => [
                'field' => 'referenceNumber',
                'reference' => $values['VERIFY_ET_DASHEN_REFERENCE'] ?? '',
                'settlement_account' => $values['VERIFY_ET_DASHEN_SETTLEMENT_ACCOUNT'] ?? '',
                'amount' => 560000,
            ],
        ];

        foreach ($cases as $bank => $case) {
            if (!is_string($case['reference']) || $case['reference'] === '' || !preg_match('/^[A-Za-z0-9]+$/', $case['reference'])) {
                $this->error("Missing or invalid local reference for {$bank}.");
                return self::FAILURE;
            }
            $accountPattern = $bank === 'telebirr' ? '/^(?:0\d{9}|\+251\d{9})$/' : '/^\d{8,20}$/';
            if (!is_string($case['settlement_account']) || !preg_match($accountPattern, $case['settlement_account'])) {
                $this->error("Missing or invalid local settlement account for {$bank}.");
                return self::FAILURE;
            }
        }

        if (!$this->option('live')) {
            $this->line('DRY RUN: no HTTP requests will be sent.');
            foreach ($cases as $bank => $case) {
                $this->line(json_encode([
                    'method' => 'POST',
                    'url' => 'https://verify.et/api/verify',
                    'body' => ['bank' => $bank, $case['field'] => $this->mask($case['reference']), 'settlementAccount' => $this->mask($case['settlement_account'])],
                    'expected_amount_etb' => sprintf('%d.%02d', intdiv($case['amount'], 100), $case['amount'] % 100),
                    'idempotency' => 'stable per receipt',
                ], JSON_THROW_ON_ERROR));
            }
            $this->line('The live preflight reads GET https://verify.et/api/webhook-endpoints; pending requests may later be checked with GET /api/verify/{requestId}.');
            return self::SUCCESS;
        }

        if (!$this->option('rotated-key-confirmed') || (!$this->option('status') && !$this->option('receiving-accounts-registered')) || app()->environment('production')) {
            $this->error('Live mode requires a confirmed rotated key, registered receiving accounts for new submissions, and a non-production application environment.');
            return self::FAILURE;
        }

        $apiKey = $values['VERIFY_ET_API_KEY'] ?? getenv('VERIFY_ET_API_KEY');
        if (!is_string($apiKey) || $apiKey === '') {
            $this->error('Set the rotated VERIFY_ET_API_KEY in the ignored .env.verify-et-integration file or the process environment.');
            return self::FAILURE;
        }

        $statePath = base_path('.env.verify-et-integration-state.json');
        $stateFile = fopen($statePath, 'c+');
        if ($stateFile === false || !flock($stateFile, LOCK_EX | LOCK_NB)) {
            $this->error('Unable to lock the isolated experiment state.');
            return self::FAILURE;
        }
        chmod($statePath, 0600);
        $hadFailure = false;
        try {
            $raw = stream_get_contents($stateFile);
            $state = $raw === '' ? [] : json_decode($raw, true, 512, JSON_THROW_ON_ERROR);
            if (!is_array($state)) {
                throw new \RuntimeException('Invalid experiment state.');
            }
            $request = app(VerifyEtExperimentHttp::class)->request($apiKey);

            if (!$this->option('status')) {
                $endpoints = $request->get('/api/webhook-endpoints');
                $endpointEnvelope = $endpoints->json();
                $endpointData = is_array($endpointEnvelope) ? ($endpointEnvelope['data'] ?? null) : null;
                $endpointList = is_array($endpointData) && array_is_list($endpointData)
                    ? $endpointData
                    : (is_array($endpointData) ? ($endpointData['endpoints'] ?? null) : null);
                $nextCursor = data_get($endpointEnvelope, 'meta.nextCursor') ?? data_get($endpointEnvelope, 'data.nextCursor') ?? data_get($endpointEnvelope, 'links.next');
                $hasMore = data_get($endpointEnvelope, 'meta.hasMore') ?? data_get($endpointEnvelope, 'data.hasMore');
                $total = data_get($endpointEnvelope, 'meta.total') ?? data_get($endpointEnvelope, 'data.total');
                if (!$endpoints->successful() || !is_array($endpointEnvelope) || ($endpointEnvelope['success'] ?? null) !== true
                    || !is_array($endpointList) || !array_is_list($endpointList)
                    || ($nextCursor !== null && $nextCursor !== '') || ($hasMore !== null && $hasMore !== false)
                    || ($total !== null && (!is_int($total) || $total < 0 || $total > count($endpointList)))) {
                    $this->error('Webhook preflight failed or returned an unrecognized shape; no receipt was submitted.');
                    return self::FAILURE;
                }
                foreach ($endpointList as $endpoint) {
                    if (is_array($endpoint) && ($endpoint['status'] ?? null) === 'active' && $this->isIsolatedEndpoint($endpoint)) {
                        continue;
                    }
                    if (!is_array($endpoint) || !in_array($endpoint['status'] ?? null, ['paused', 'pending_verification', 'disabled'], true)) {
                        $this->error('An active or unrecognized account webhook could write to production; no receipt was submitted.');
                        return self::FAILURE;
                    }
                }
            }

            foreach ($cases as $bank => $case) {
                $fingerprint = hash('sha256', json_encode([
                    'bank' => $bank,
                    $case['field'] => $case['reference'],
                    'settlementAccount' => $case['settlement_account'],
                    'amountCents' => $case['amount'],
                    'currency' => 'ETB',
                ], JSON_THROW_ON_ERROR));
                if ($this->option('status')) {
                    $saved = $state[$bank] ?? null;
                    if (!is_array($saved) || ($saved['fingerprint'] ?? null) !== $fingerprint || !is_string($saved['request_id'] ?? null)) {
                        $this->line("{$bank}: no recorded request ID to poll.");
                        continue;
                    }
                    $response = $request->get('/api/verify/' . rawurlencode($saved['request_id']));
                } else {
                    if (isset($state[$bank])) {
                        $this->line("{$bank}: an attempt is already recorded; no submission made.");
                        continue;
                    }
                    $markerPath = base_path('.env.verify-et-integration-attempt-' . $bank);
                    $marker = @fopen($markerPath, 'x');
                    if ($marker === false) {
                        $this->line("{$bank}: the attempt marker already exists or cannot be created; no submission made.");
                        continue;
                    }
                    chmod($markerPath, 0600);
                    if (fwrite($marker, $fingerprint) !== strlen($fingerprint) || !fflush($marker) || !fsync($marker)) {
                        fclose($marker);
                        throw new \RuntimeException('Unable to persist attempt marker.');
                    }
                    fclose($marker);
                    $idempotencyKey = 'linket-experiment-' . $fingerprint;
                    $state[$bank] = ['fingerprint' => $fingerprint, 'idempotency_key' => $idempotencyKey, 'phase' => 'started'];
                    $this->saveState($stateFile, $state);
                    try {
                        $response = (clone $request)->withHeaders(['Idempotency-Key' => $idempotencyKey])->post('/api/verify?waitMs=5000', [
                            'bank' => $bank,
                            $case['field'] => $case['reference'],
                            'settlementAccount' => $case['settlement_account'],
                        ]);
                    } catch (ConnectionException) {
                        $state[$bank]['phase'] = 'outcome_unknown';
                        $this->saveState($stateFile, $state);
                        $this->error("{$bank}: connection failed; the outcome is unknown and will not be resubmitted.");
                        $hadFailure = true;
                        continue;
                    }
                }

                try {
                    $body = app(VerifyEtJson::class)->decode($response->body());
                } catch (\JsonException) {
                    $body = [];
                }
                $summary = app(VerifyEtExperiment::class)->summarize(is_array($body) ? $body : [], $response->status(), $bank, $case['reference'], $case['amount']);
                $errorCode = is_array($body) ? ($body['error']['code'] ?? null) : null;
                $summary['provider_error_code'] = is_string($errorCode) && preg_match('/^[A-Za-z0-9_-]{1,80}$/', $errorCode) ? $errorCode : null;
                $httpRequestId = $response->header('x-request-id');
                $summary['http_request_id'] = is_string($httpRequestId) && preg_match('/^[A-Za-z0-9_-]{1,100}$/', $httpRequestId) ? $httpRequestId : null;
                $state[$bank]['phase'] = 'responded';
                $state[$bank][$this->option('status') ? 'status_http_status' : 'submission_http_status'] = $response->status();
                $state[$bank]['request_id'] = $summary['request_id'] ?? $state[$bank]['request_id'] ?? null;
                $state[$bank]['summary'] = $summary;
                $this->saveState($stateFile, $state);
                $this->line($bank . ': ' . json_encode($summary, JSON_THROW_ON_ERROR));
                if (!in_array($response->status(), [200, 202], true) || ($response->status() === 202 && $summary['request_id'] === null)) {
                    $hadFailure = true;
                }
            }
        } catch (Throwable) {
            $this->error('Experiment stopped safely. Check local configuration and isolated state; no automatic retry will occur.');
            return self::FAILURE;
        } finally {
            flock($stateFile, LOCK_UN);
            fclose($stateFile);
        }

        return $hadFailure ? self::FAILURE : self::SUCCESS;
    }

    private function isIsolatedEndpoint(array $endpoint): bool
    {
        $url = config('services.verify_et.experiment_webhook_url');
        $eventId = config('services.verify_et.experiment_webhook_test_event_id');
        $receiverId = config('services.verify_et.experiment_receiver_id');
        $secret = config('services.verify_et.experiment_webhook_secret');
        if (app()->environment('production') || !config('services.verify_et.experiment_webhook_enabled')
            || !config('services.verify_et.experiment_destination_confirmed') || !config('services.verify_et.experiment_public_reachability_confirmed')
            || !is_string($secret) || $secret === '' || !is_string($receiverId) || !preg_match('/^[a-f0-9]{64}$/', $receiverId)
            || !is_string($eventId) || !preg_match('/^[a-f0-9-]{36}$/i', $eventId)
            || !is_string($url) || !str_starts_with($url, 'https://')
            || $url !== rtrim((string) config('app.url'), '/') . '/billing/verify-et/experiment-webhook'
            || ($endpoint['url'] ?? null) !== $url) {
            return false;
        }
        try {
            $evidence = json_decode(Crypt::decryptString(Storage::disk('local')->get('verify-et-experiment-evidence/' . strtolower($eventId) . '.json')), true, 512, JSON_THROW_ON_ERROR);
            $proof = $evidence['proof'] ?? '';
            unset($evidence['proof']);
            return is_string($proof) && hash_equals(hash_hmac('sha256', json_encode($evidence, JSON_THROW_ON_ERROR), $secret), $proof)
                && ($evidence['receiver_id'] ?? null) === $receiverId && ($evidence['event_id'] ?? null) === strtolower($eventId)
                && ($evidence['event'] ?? null) === 'webhook.test' && ($evidence['signature_valid'] ?? null) === true
                && abs(now()->diffInSeconds(CarbonImmutable::parse($evidence['created_at']), false)) <= 86400;
        } catch (Throwable) {
            return false;
        }
    }

    /** @param resource $file
     * @param array<string, mixed> $state
     */
    private function saveState($file, array $state): void
    {
        $json = json_encode($state, JSON_THROW_ON_ERROR | JSON_PRETTY_PRINT);
        rewind($file);
        if (!ftruncate($file, 0) || fwrite($file, $json) !== strlen($json) || !fflush($file) || !fsync($file)) {
            throw new \RuntimeException('Unable to persist experiment state.');
        }
    }

    private function mask(string $value): string
    {
        return str_repeat('*', max(0, strlen($value) - 4)) . substr($value, -4);
    }
}
