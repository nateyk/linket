<?php

namespace App\CreatorAi\Forecasting;

use Carbon\CarbonImmutable;
use GuzzleHttp\Client;
use GuzzleHttp\ClientInterface;
use InvalidArgumentException;
use RuntimeException;

/**
 * Independent READ-ONLY reconciliation source adapter for Verify.et's
 * verification:read-scoped GET /api/verify/history endpoint.
 *
 * It NEVER submits a verification, creates a payment, calls a webhook,
 * signs a source-completeness certificate or supplies a revenue forecast.
 * Pagination completeness is NOT provider-wide transaction completeness.
 */
final class VerifyEtHistorySnapshotReader
{
    private const URI = '/api/verify/history';

    public function __construct(private readonly ?ClientInterface $http = null) {}

    /**
     * Key must be scoped to verification:read and managed by the independent
     * producer operator, not passed through a buyer route or stored in Linket.
     *
     * @return array{requests_in_scope:int,successful_requests:int,unresolved_requests:int,pages_read:int,request_id_hashes:list<string>,page_set_complete:bool,provider_account_scope_attested:bool,upstream_event_completeness_verified:bool,reason:string}
     */
    public function snapshot(string $readOnlyApiKey, CarbonImmutable $from, CarbonImmutable $to): array
    {
        if (! (bool) config('creator_ai.forecast_verify_et_history.enabled', false)) {
            throw new RuntimeException('Independent provider history collection is disabled.');
        }
        if ($from->getTimezone()->getName() !== 'UTC'
            || $to->getTimezone()->getName() !== 'UTC') {
            throw new InvalidArgumentException('Verification history window must use UTC.');
        }
        $from = $from->startOfDay();
        $to = $to->startOfDay();
        if ($from->greaterThan($to) || $from->diffInDays($to) > 30
            || $to->greaterThanOrEqualTo(CarbonImmutable::now('UTC')->startOfDay())) {
            throw new InvalidArgumentException('Provider history collection requires a bounded closed window.');
        }

        if (! str_starts_with($readOnlyApiKey, 'VERIFY_BANK_ET_')
            || strlen($readOnlyApiKey) < 24 || strlen($readOnlyApiKey) > 512
            || preg_match('/[[:space:]]/', $readOnlyApiKey)) {
            throw new InvalidArgumentException('A separately managed verification:read API key is required.');
        }

        $pageSize = (int) config('creator_ai.forecast_verify_et_history.page_size', 50);
        $cap = (int) config('creator_ai.forecast_verify_et_history.max_snapshot_requests', 10000);
        if ($pageSize !== 50 || $cap < 50 || $cap > 10000) {
            throw new InvalidArgumentException('Unsafe provider history pagination configuration.');
        }

        $client = $this->http ?? new Client([
            'base_uri' => 'https://verify.et',
            'timeout' => 20,
            'connect_timeout' => 5,
            'allow_redirects' => false,
            'http_errors' => false,
            'verify' => true,
        ]);

        $offset = 0;
        $total = null;
        $pages = 0;
        $successful = 0;
        $pending = 0;
        $ids = [];
        do {
            if ($pages >= 200) {
                throw new RuntimeException('Provider history exceeds bounded pagination.');
            }
            // Absolute, pinned provider URL. No caller-supplied host or route.
            $response = $client->request('GET', 'https://verify.et'.self::URI, [
                'headers' => [
                    'x-api-key' => $readOnlyApiKey,
                    'accept' => 'application/json',
                ],
                'query' => [
                    'startDate' => $from->toDateString(),
                    'endDate' => $to->toDateString(),
                    'limit' => $pageSize,
                    'offset' => $offset,
                ],
                'allow_redirects' => false,
                'http_errors' => false,
                'timeout' => 20,
            ]);

            if ($response->getStatusCode() !== 200) {
                throw new RuntimeException('Provider history is unavailable or access is denied.');
            }
            $body = (string) $response->getBody();
            if (strlen($body) > 131072) {
                throw new RuntimeException('Provider history page exceeds the response size limit.');
            }
            try {
                $data = json_decode($body, true, 32, JSON_THROW_ON_ERROR);
            } catch (\JsonException) {
                throw new RuntimeException('Provider history returned invalid JSON.');
            }
            $page = $data['data'] ?? null;
            $meta = $data['meta'] ?? null;
            if (! is_array($data) || ($data['success'] ?? false) !== true
                || ! is_array($page) || ! array_is_list($page)
                || ! is_array($meta)
                || ! is_int($meta['total'] ?? null) || ($meta['total'] ?? 0) < 0
                || ! is_int($meta['limit'] ?? null) || ($meta['limit'] ?? 0) !== $pageSize
                || ! is_int($meta['offset'] ?? null) || $meta['offset'] !== $offset) {
                throw new RuntimeException('Provider history lacks a consistent pagination envelope.');
            }

            if ($total === null) {
                $total = $meta['total'];
                if ($total > $cap) {
                    throw new RuntimeException('Provider history scope exceeds the safe snapshot limit.');
                }
            } elseif ($total !== $meta['total']) {
                throw new RuntimeException('Provider history changed during pagination.');
            }

            $expectedCount = min($pageSize, $total - $offset);
            if ($expectedCount < 0 || count($page) !== $expectedCount) {
                throw new RuntimeException('Provider history is missing a pagination segment.');
            }

            foreach ($page as $item) {
                if (! is_array($item)
                    || ! is_string($item['requestId'] ?? null)
                    || preg_match('/^[A-Za-z0-9_-]{8,100}$/D', $item['requestId']) !== 1
                    || ! is_string($item['processingStatus'] ?? null)
                    || ! in_array($item['processingStatus'], ['queued', 'pending', 'running', 'completed', 'failed'], true)
                    || ! is_string($item['status'] ?? null)
                    || ! is_bool($item['verified'] ?? null)
                    || ! is_string($item['createdAt'] ?? null)) {
                    throw new RuntimeException('Provider history has malformed or incomplete verification entries.');
                }

                try {
                    $created = CarbonImmutable::parse($item['createdAt'])->utc();
                } catch (\Throwable) {
                    throw new RuntimeException('Provider history has an invalid request timestamp.');
                }
                if ($created->lessThan($from)
                    || $created->greaterThanOrEqualTo($to->addDay())) {
                    throw new RuntimeException('Provider history returned a request outside the closed window.');
                }

                if (($item['verified'] === true)
                    !== ($item['status'] === 'success' && $item['processingStatus'] === 'completed')) {
                    throw new RuntimeException('Provider history has contradictory success fields.');
                }

                $fingerprint = hash('sha256', $item['requestId']);
                if (isset($ids[$fingerprint])) {
                    throw new RuntimeException('Provider history repeated a request across pages.');
                }

                $ids[$fingerprint] = true;
                $successful += (int) $item['verified'];
                $pending += (int) ($item['processingStatus'] !== 'completed');
            }
            $offset += count($page);
            $pages++;
        } while ($offset < $total);

        $hashes = array_keys($ids);
        sort($hashes);

        return [
            'requests_in_scope' => (int) $total,
            'successful_requests' => $successful,
            'unresolved_requests' => $pending,
            'pages_read' => $pages,
            'request_id_hashes' => $hashes,
            'page_set_complete' => true,
            'provider_account_scope_attested' => false,
            'upstream_event_completeness_verified' => false,
            'reason' => 'provider_history_scope_and_delivery_not_independently_attested',
        ];
    }
}
