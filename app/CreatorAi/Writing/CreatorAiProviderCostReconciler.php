<?php

namespace App\CreatorAi\Writing;

use Carbon\CarbonImmutable;
use DateTimeImmutable;
use DateTimeZone;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use RuntimeException;

/**
 * Evidence-backed, DAY-AGGREGATE settlement for Linket's provider budget.
 *
 * OpenAI does not expose a provider-invoiced price for each request. Never
 * invent one from model pricing or divide the daily cost across creators.
 * Settle only the TOTAL day cost, after two matching independent provider
 * observations at least 24 hours apart, and mark each covered attempt as
 * aggregate_reconciled (not individually charged).
 *
 * Private operator-only service: no HTTP route, automation or live default.
 */
final class CreatorAiProviderCostReconciler
{
    public function __construct(private readonly CreatorAiOpenAiCostWindowAudit $audit) {}

    /**
     * Observe once, then optionally settle after a second unchanged snapshot.
     *
     * @return array{status:string,day:string,request_count:int,cost_microusd:int}
     */
    public function reconcile(string $day, bool $settle = false): array
    {
        $config = config('creator_ai.openai_cost_audit', []);
        if (! is_array($config)
            || ($config['enabled'] ?? false) !== true
            || ($config['settlement_enabled'] ?? false) !== true
            || ($config['exclusive_project'] ?? false) !== true) {
            throw new RuntimeException('Provider settlement is disabled or exclusive project attestation is missing.');
        }

        $project = $config['dedicated_project_id'] ?? null;
        $keyId = $config['generation_api_key_id'] ?? null;
        $adminKey = $config['admin_api_key'] ?? null;
        if (! is_string($project)
            || preg_match('/^proj_[A-Za-z0-9_-]{6,96}$/D', $project) !== 1
            || ! is_string($keyId)
            || preg_match('/^key_[A-Za-z0-9_-]{6,96}$/D', $keyId) !== 1
            || ! is_string($adminKey)
            || ! str_starts_with($adminKey, 'sk-') || strlen($adminKey) < 12) {
            throw new RuntimeException('Independent billing project, key ID and admin credential are required.');
        }

        // Network I/O must never occur while holding financial ledger locks.
        // report() validates UTC day closure, project, pagination and local
        // token/request coverage before we even consider a ledger mutation.
        $report = $this->audit->report($day);
        if (! $report['coverage_matches'] || $report['local_request_count'] < 1) {
            throw new RuntimeException('Independent provider usage does not cover all local generation attempts.');
        }
        if ($report['project_id'] !== $project) {
            throw new RuntimeException('Provider project changed during reconciliation.');
        }

        // The project-only cost may contain other API keys. A second official
        // grouped source must show that ALL costs and completions belong to
        // the configured exclusive generation key; otherwise refuse.
        $grouped = $this->keyEvidence($day, $project, $keyId, $adminKey);
        foreach ([
            'provider_cost_microusd' => 'cost',
            'provider_request_count' => 'requests',
            'provider_input_tokens' => 'input',
            'provider_output_tokens' => 'output',
        ] as $reportField => $groupField) {
            if ($report[$reportField] !== $grouped[$groupField]) {
                throw new RuntimeException('Project totals disagree with independently grouped provider key evidence.');
            }
        }

        $evidenceHash = hash('sha256', json_encode([
            'day' => $day,
            'project' => $project,
            'generation_api_key_id' => $keyId,
            'cost' => $report['provider_cost_microusd'],
            'request_count' => $report['provider_request_count'],
            'input_tokens' => $report['provider_input_tokens'],
            'output_tokens' => $report['provider_output_tokens'],
            'cost_document_sha256' => $report['cost_document_sha256'],
            'usage_document_sha256' => $report['usage_document_sha256'],
            'key_cost_document_sha256' => $grouped['cost_sha256'],
            'key_usage_document_sha256' => $grouped['usage_sha256'],
        ], JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES));
        $start = $day.' 00:00:00';
        $end = (new DateTimeImmutable($day, new DateTimeZone('UTC')))
            ->modify('+1 day')->format('Y-m-d').' 00:00:00';
        $month = substr($day, 0, 7).'-01';

        return DB::transaction(function () use (
            $day, $start, $end, $month, $project, $keyId, $report,
            $evidenceHash, $settle
        ): array {
            $scope = static fn () => DB::table('creator_ai_generation_attempts')
                ->where('provider', 'openai')
                ->where('created_at', '>=', $start)
                ->where('created_at', '<', $end);

            // Same users -> attempts -> per-creator months -> provider month
            // lock order as CreatorAiUsageService. Sorted user locks avoid
            // cross-creator deadlock when two reconciliation workers race.
            $before = $scope()->orderBy('creator_id')->orderBy('request_id')->get();
            if ($before->isEmpty()) {
                throw new RuntimeException('No local attempts for the audited day.');
            }
            $creators = $before->pluck('creator_id')->unique()->sort()->values();
            foreach ($creators as $creatorId) {
                if (! DB::table('users')->where('id', $creatorId)->lockForUpdate()->first(['id'])) {
                    throw new RuntimeException('A creator was removed during reconciliation.');
                }
            }
            $attempts = $scope()->orderBy('creator_id')->orderBy('request_id')
                ->lockForUpdate()->get();
            if ($before->pluck('request_id')->all() !== $attempts->pluck('request_id')->all()
                || $attempts->count() !== (int) $report['local_request_count']) {
                throw new RuntimeException('Generation attempts changed while provider evidence was checked.');
            }
            $ids = $attempts->pluck('request_id')->all();
            $metering = DB::table('creator_ai_generation_metering')
                ->whereIn('request_id', $ids)->get()->keyBy('request_id');
            if ($metering->count() !== count($ids)) {
                throw new RuntimeException('Provider token evidence is incomplete.');
            }

            $input = 0;
            $output = 0;
            $held = 0;
            $counts = [];
            $hashRows = [];
            foreach ($attempts as $attempt) {
                $checkpoint = $metering->get($attempt->request_id);
                if (! $checkpoint || $attempt->month !== $month) {
                    throw new RuntimeException('Incomplete metering or mismatched UTC reservation month.');
                }
                $input += (int) $checkpoint->input_tokens;
                $output += (int) $checkpoint->output_tokens;
                $held += (int) $attempt->reserved_microusd;
                $owner = (int) $attempt->creator_id;
                $counts[$owner] = ($counts[$owner] ?? 0) + 1;
                $hashRows[] = [
                    $attempt->request_id, $owner, (int) $attempt->workspace_id,
                    $attempt->feature, $attempt->month,
                    (int) $attempt->reserved_microusd, $checkpoint->provider_model,
                    (int) $checkpoint->input_tokens, (int) $checkpoint->output_tokens,
                ];
            }
            if ($input !== $report['provider_input_tokens']
                || $output !== $report['provider_output_tokens']
                || count($ids) !== $report['provider_request_count']) {
                throw new RuntimeException('Locked local token totals do not match the provider.');
            }
            $localHash = hash('sha256', json_encode($hashRows, JSON_THROW_ON_ERROR));

            $window = DB::table('creator_ai_provider_cost_windows')
                ->where('provider', 'openai')->where('day', $day)
                ->lockForUpdate()->first();

            if ($window && ($window->project_id !== $project
                || $window->generation_api_key_id !== $keyId)) {
                throw new RuntimeException('Provider billing source identity changed for this closed day.');
            }

            $same = $window
                && hash_equals($window->provider_evidence_sha256, $evidenceHash)
                && hash_equals($window->local_attempts_sha256, $localHash)
                && (int) $window->cost_microusd === $report['provider_cost_microusd']
                && (int) $window->request_count === count($ids);

            if ($window && $window->status === 'settled') {
                if (! $same || $attempts->contains(fn ($a) =>
                    $a->status !== 'aggregate_reconciled'
                    || (int) $a->cost_window_id !== (int) $window->id)) {
                    throw new RuntimeException('Provider evidence drift or inconsistent already-settled ledger.');
                }

                return $this->result('settled', $day, count($ids), (int) $window->cost_microusd);
            }

            if ($attempts->contains(fn ($a) => $a->status !== 'reserved')) {
                throw new RuntimeException('Mixed or previously settled generation attempts; refusing aggregate allocation.');
            }
            if ($report['provider_cost_microusd'] > $held) {
                // No silent over-reservation. A confirmed provider overage
                // needs an explicit budget decision; retain every hold.
                throw new RuntimeException('Actual provider aggregate charge exceeds held budget.');
            }

            $snapshot = [
                'project_id' => $project,
                'generation_api_key_id' => $keyId,
                'cost_microusd' => $report['provider_cost_microusd'],
                'request_count' => count($ids),
                'provider_evidence_sha256' => $evidenceHash,
                'local_attempts_sha256' => $localHash,
                'first_observed_at' => now('UTC'),
                'updated_at' => now('UTC'),
            ];

            if (! $window) {
                DB::table('creator_ai_provider_cost_windows')->insert([
                    'provider' => 'openai',
                    'day' => $day,
                    'status' => 'observed',
                    ...$snapshot,
                    'created_at' => now('UTC'),
                ]);

                return $this->result('observation_recorded', $day, count($ids), $report['provider_cost_microusd']);
            }
            if (! $same) {
                // A changed provider invoice/export resets the 24-hour
                // stability period. The old hold is not refunded.
                DB::table('creator_ai_provider_cost_windows')
                    ->where('id', $window->id)->update([...$snapshot, 'status' => 'observed']);

                return $this->result('provider_snapshot_changed', $day, count($ids), $report['provider_cost_microusd']);
            }

            if (CarbonImmutable::parse($window->first_observed_at, 'UTC')
                ->addDay()->greaterThan(CarbonImmutable::now('UTC'))) {
                return $this->result('awaiting_second_observation', $day, count($ids), $report['provider_cost_microusd']);
            }
            if (! $settle) {
                return $this->result('ready_for_operator_settlement', $day, count($ids), $report['provider_cost_microusd']);
            }

            foreach ($counts as $creatorId => $count) {
                $usage = DB::table('creator_ai_usage_months')
                    ->where('creator_id', $creatorId)->where('month', $month)
                    ->lockForUpdate()->first();
                if (! $usage || (int) $usage->reserved_requests < $count) {
                    throw new RuntimeException('Inconsistent monthly creator quota; settlement refused.');
                }
                DB::table('creator_ai_usage_months')->where('id', $usage->id)->update([
                    'reserved_requests' => (int) $usage->reserved_requests - $count,
                    'completed_requests' => (int) $usage->completed_requests + $count,
                    'updated_at' => now('UTC'),
                ]);
            }

            $provider = DB::table('creator_ai_provider_usage_months')
                ->where('provider', 'openai')->where('month', $month)
                ->lockForUpdate()->first();
            if (! $provider || (int) $provider->reserved_microusd < $held
                || (int) $provider->spent_microusd > PHP_INT_MAX - $report['provider_cost_microusd']) {
                throw new RuntimeException('Inconsistent provider budget; settlement refused.');
            }
            DB::table('creator_ai_provider_usage_months')->where('id', $provider->id)->update([
                'reserved_microusd' => (int) $provider->reserved_microusd - $held,
                'spent_microusd' => (int) $provider->spent_microusd + $report['provider_cost_microusd'],
                'updated_at' => now('UTC'),
            ]);

            $changed = DB::table('creator_ai_generation_attempts')
                ->whereIn('request_id', $ids)->where('status', 'reserved')->update([
                    'status' => 'aggregate_reconciled',
                    'cost_window_id' => $window->id,
                    // Aggregate cost is real, but there is NO independently
                    // verified per-request cost. NULL is not a $0 charge.
                    'charged_microusd' => null,
                    'updated_at' => now('UTC'),
                ]);
            if ($changed !== count($ids)) {
                throw new RuntimeException('Concurrent attempt settlement changed the batch; transaction rolled back.');
            }

            DB::table('creator_ai_provider_cost_windows')->where('id', $window->id)->update([
                'status' => 'settled',
                'settled_at' => now('UTC'),
                'updated_at' => now('UTC'),
            ]);

            return $this->result('settled', $day, count($ids), $report['provider_cost_microusd']);
        }, 3);
    }

    /** @return array{status:string,day:string,request_count:int,cost_microusd:int} */
    private function result(string $status, string $day, int $count, int $cost): array
    {
        return [
            'status' => $status, 'day' => $day,
            'request_count' => $count, 'cost_microusd' => $cost,
        ];
    }

    /**
     * Official project + api_key_id grouped bucket verification, with
     * independent pagination and exact project/key isolation.
     *
     * @return array{cost:int,requests:int,input:int,output:int,cost_sha256:string,usage_sha256:string}
     */
    private function keyEvidence(string $day, string $project, string $keyId, string $adminKey): array
    {
        $start = (new DateTimeImmutable($day.' 00:00:00', new DateTimeZone('UTC')))->getTimestamp();
        $params = [
            'start_time' => $start, 'end_time' => $start + 86400,
            'project_ids' => [$project], 'bucket_width' => '1d',
            'group_by' => ['project_id', 'api_key_id'], 'limit' => 1,
        ];
        $costs = $this->readGroupedBucket('organization/costs', $params, $adminKey, $project, $keyId);
        $usage = $this->readGroupedBucket('organization/usage/completions', $params, $adminKey, $project, $keyId);

        $cost = 0;
        foreach ($costs['results'] as $entry) {
            if (($entry['object'] ?? null) !== 'organization.costs.result'
                || ($entry['amount']['currency'] ?? null) !== 'usd'
                || ! is_numeric($entry['amount']['value'] ?? null)) {
                throw new RuntimeException('Malformed provider key cost evidence.');
            }
            $value = (float) $entry['amount']['value'];
            if (! is_finite($value) || $value < 0 || $value > 1000000) {
                throw new RuntimeException('Invalid provider key cost.');
            }
            $line = (int) round($value * 1000000);
            if ($cost > PHP_INT_MAX - $line) {
                throw new RuntimeException('Provider cost overflow.');
            }
            $cost += $line;
        }
        $requests = $input = $output = 0;
        foreach ($usage['results'] as $entry) {
            if (($entry['object'] ?? null) !== 'organization.usage.completions.result') {
                throw new RuntimeException('Unexpected provider key usage category.');
            }
            foreach (['num_model_requests' => &$requests, 'input_tokens' => &$input, 'output_tokens' => &$output] as $field => &$total) {
                $value = $entry[$field] ?? null;
                if (! is_int($value) || $value < 0 || $value > 100000000
                    || $total > PHP_INT_MAX - $value) {
                    throw new RuntimeException('Invalid provider key usage totals.');
                }
                $total += $value;
            }
            unset($total);
        }

        return [
            'cost' => $cost, 'requests' => $requests,
            'input' => $input, 'output' => $output,
            'cost_sha256' => $costs['sha256'], 'usage_sha256' => $usage['sha256'],
        ];
    }

    /**
     * @param array<string,mixed> $params
     * @return array{results:list<array<string,mixed>>,sha256:string}
     */
    private function readGroupedBucket(
        string $endpoint, array $params, string $adminKey, string $project, string $keyId
    ): array {
        $seen = [];
        $pages = [];
        $combined = [];
        for ($index = 0; $index < 20; $index++) {
            try {
                $response = Http::withToken($adminKey)->acceptJson()->timeout(15)
                    ->get('https://api.openai.com/v1/'.$endpoint, $params);
            } catch (\Throwable) {
                throw new RuntimeException('Independent provider grouped billing source unavailable.');
            }
            if (! $response->successful()) {
                throw new RuntimeException('Provider grouped billing source refused the request.');
            }
            $page = $response->json();
            if (! is_array($page) || ($page['object'] ?? null) !== 'page'
                || ! is_array($page['data'] ?? null)
                || count($page['data']) !== 1
                || ! is_bool($page['has_more'] ?? null)) {
                throw new RuntimeException('Malformed grouped provider billing page.');
            }
            $bucket = $page['data'][0];
            if (! is_array($bucket) || ($bucket['object'] ?? null) !== 'bucket'
                || ($bucket['start_time'] ?? null) !== $params['start_time']
                || ($bucket['end_time'] ?? null) !== $params['end_time']
                || ! is_array($bucket['results'] ?? null)
                || count($bucket['results']) > 1000) {
                throw new RuntimeException('Grouped provider billing time range incomplete.');
            }
            foreach ($bucket['results'] as $entry) {
                if (! is_array($entry)
                    || ($entry['project_id'] ?? null) !== $project
                    || ($entry['api_key_id'] ?? null) !== $keyId) {
                    throw new RuntimeException('Billing project includes missing or foreign API key attribution.');
                }
                $combined[] = $entry;
            }
            $pages[] = $page;
            if ($page['has_more'] === false) {
                if (($page['next_page'] ?? null) !== null) {
                    throw new RuntimeException('Grouped billing pagination inconsistent.');
                }
                return [
                    'results' => $combined,
                    'sha256' => hash('sha256', json_encode($pages, JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES)),
                ];
            }
            $next = $page['next_page'] ?? null;
            if (! is_string($next) || $next === '' || strlen($next) > 512 || isset($seen[$next])) {
                throw new RuntimeException('Grouped provider billing cursor invalid or repeated.');
            }
            $seen[$next] = true;
            $params['page'] = $next;
        }
        throw new RuntimeException('Grouped provider billing pagination limit exceeded.');
    }
}
