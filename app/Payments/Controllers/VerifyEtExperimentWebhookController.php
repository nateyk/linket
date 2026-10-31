<?php

namespace App\Payments\Controllers;

use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Storage;

final class VerifyEtExperimentWebhookController extends Controller
{
    public function handle(Request $request): Response
    {
        if (app()->bound('clockwork')) {
            app('clockwork')->shouldCollect()->except('/billing/verify-et/experiment-webhook');
        }
        abort_if(app()->environment('production') || !config('services.verify_et.experiment_webhook_enabled', false), 404);
        $body = $request->getContent();
        abort_if(strlen($body) > 262144, 413);
        $timestamp = $request->header('X-Webhook-Timestamp');
        $eventId = $request->header('X-Webhook-Event-Id');
        $header = $request->header('X-Webhook-Signature');
        abort_unless(is_string($timestamp) && is_string($eventId) && is_string($header), 401);
        try {
            $fresh = abs(now()->diffInSeconds(CarbonImmutable::parse($timestamp), false)) <= 300;
        } catch (\Throwable) {
            $fresh = false;
        }
        $secrets = [config('services.verify_et.experiment_webhook_secret')];
        try {
            $rotatedAt = CarbonImmutable::parse(config('services.verify_et.experiment_webhook_rotated_at'));
            if (config('services.verify_et.experiment_webhook_rotated_at') && now()->betweenIncluded($rotatedAt, $rotatedAt->addHours(24))) {
                $secrets[] = config('services.verify_et.experiment_webhook_previous_secret');
            }
        } catch (\Throwable) {
        }
        $valid = false;
        foreach ($secrets as $secret) {
            if (!is_string($secret) || $secret === '') {
                continue;
            }
            $expected = hash_hmac('sha256', $timestamp . '.' . $body, $secret);
            foreach (explode(',', $header) as $signature) {
                $signature = trim($signature);
                if (preg_match('/^sha256=([a-f0-9]{64})$/i', $signature, $matches) && hash_equals($expected, strtolower($matches[1]))) {
                    $valid = true;
                }
            }
        }
        abort_unless($fresh && $valid, 401);
        abort_unless(preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i', $eventId) === 1, 400);
        try {
            $payload = json_decode($body, true, 512, JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            abort(400);
        }
        abort_unless(is_array($payload), 400);
        $disk = Storage::disk('local');
        try {
            $disk->makeDirectory('verify-et-experiment-events');
        } catch (\League\Flysystem\UnableToCreateDirectory $exception) {
            if (!is_dir($disk->path('verify-et-experiment-events'))) {
                throw $exception;
            }
        }
        $path = $disk->path('verify-et-experiment-events/' . strtolower($eventId) . '.json');
        $lock = @fopen($path . '.lock', 'c');
        abort_unless($lock !== false && flock($lock, LOCK_EX), 500);
        try {
            if (is_file($path)) {
                try {
                    $stored = Crypt::decryptString((string) file_get_contents($path));
                } catch (\Throwable) {
                    abort(500);
                }
                abort_unless(hash_equals($stored, $body), 409);
                $this->storeEvidence($request, $payload, $eventId, $timestamp, $body);
                return response()->noContent();
            }
            $temporary = tempnam(dirname($path), '.event-');
            abort_unless($temporary !== false, 500);
            chmod($temporary, 0600);
            $file = fopen($temporary, 'wb');
            $encrypted = Crypt::encryptString($body);
            $written = $file !== false && fwrite($file, $encrypted) === strlen($encrypted) && fflush($file) && fsync($file);
            if ($file !== false) {
                fclose($file);
            }
            if (!$written || !rename($temporary, $path)) {
                @unlink($temporary);
                abort(500);
            }
            $this->storeEvidence($request, $payload, $eventId, $timestamp, $body);
        } finally {
            flock($lock, LOCK_UN);
            fclose($lock);
        }
        return response()->noContent();
    }

    private function storeEvidence(Request $request, array $payload, string $eventId, string $timestamp, string $body): void
    {
        $receiverId = config('services.verify_et.experiment_receiver_id');
        $secret = config('services.verify_et.experiment_webhook_secret');
        if (($payload['event'] ?? null) !== 'webhook.test' || $request->header('X-Webhook-Test') !== 'true'
            || !is_string($receiverId) || !preg_match('/^[a-f0-9]{64}$/', $receiverId) || !is_string($secret) || $secret === '') {
            return;
        }
        $evidence = ['receiver_id' => $receiverId, 'event_id' => strtolower($eventId), 'event' => 'webhook.test', 'timestamp' => $timestamp, 'created_at' => now()->toIso8601String(), 'fingerprint' => hash('sha256', $body), 'signature_valid' => true];
        $evidence['proof'] = hash_hmac('sha256', json_encode($evidence, JSON_THROW_ON_ERROR), $secret);
        abort_unless(Storage::disk('local')->put('verify-et-experiment-evidence/' . strtolower($eventId) . '.json', Crypt::encryptString(json_encode($evidence, JSON_THROW_ON_ERROR))), 500);
    }
}
