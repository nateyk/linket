<?php

namespace App\CreatorAi\Writing;

use Carbon\CarbonImmutable;
use DateTimeImmutable;
use DateTimeZone;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use RuntimeException;

/**
 * Private, READ-ONLY independent OpenAI organization cost and usage audit.
 *
 * A dedicated OpenAI project is mandatory. The official API reports DAILY
 * aggregate cost, even when grouped by billable line item; it does NOT
 * independently attest a charge for each individual creator generation.
 * This class makes no budget changes, does not mark attempts completed, and
 * never treats successful HTTP calls as proof of request-level settlement.
 *
 * No route, job, command or public entry point is registered.
 */
final class CreatorAiOpenAiCostWindowAudit
{
    /**
     * @return array{day:string,project_id:string,provider_cost_microusd:int,provider_cost_line_items:list<array{line_item:string|null,amount_microusd:int}>,cost_line_items_classified:bool,provider_request_count:int,provider_input_tokens:int,provider_output_tokens:int,local_request_count:int,local_checkpoint_count:int,local_input_tokens:int,local_output_tokens:int,coverage_matches:bool,cost_document_sha256:string,usage_document_sha256:string,status:string}
     */
    public function report(string $day): array
    {
        $audit = config('creator_ai.openai_cost_audit', []);
        if (! is_array($audit) || ($audit['enabled'] ?? false) !== true) {
            throw new RuntimeException('Provider cost audit is disabled.');
        }

        $key = $audit['admin_api_key'] ?? null;
        $project = $audit['dedicated_project_id'] ?? null;
        if (! is_string($key) || ! str_starts_with($key, 'sk-') || strlen($key) < 12
            || ! is_string($project)
            || preg_match('/^proj_[A-Za-z0-9_-]{6,96}$/D', $project) !== 1) {
            throw new RuntimeException('Dedicated OpenAI project and separate read-only admin credential are required.');
        }

        $parts = explode('-', $day);
        if (count($parts) !== 3 || preg_match('/^\d{4}-\d{2}-\d{2}$/D', $day) !== 1
            || ! checkdate((int) $parts[1], (int) $parts[2], (int) $parts[0])) {
            throw new RuntimeException('A valid UTC calendar day is required.');
        }

        $start = new DateTimeImmutable($day.' 00:00:00', new DateTimeZone('UTC'));
        $end = $start->modify('+1 day');
        if ($end->getTimestamp() > CarbonImmutable::now('UTC')->subHours(72)->getTimestamp()) {
            throw new RuntimeException('OpenAI billing window is too recent to audit.');
        }

        $params = [
            'start_time' => $start->getTimestamp(),
            'end_time' => $end->getTimestamp(),
            'bucket_width' => '1d',
            'project_ids' => [$project],
            'group_by' => ['project_id'],
            'limit' => 1,
        ];
        // These are separate provider-owned endpoints, not Linket counters.
        // Project alone hides non-generation charges. Preserve source-defined
        // daily line items separately; never infer a creator's per-request
        // cost from them, even if the aggregate usage counts match.
        $costParams = $params;
        $costParams['group_by'] = ['project_id', 'line_item'];
        $costs = $this->readBuckets('organization/costs', $costParams, $key, $project);
        $usage = $this->readBuckets('organization/usage/completions', $params, $key, $project);

        $costMicro = 0;
        $costLineItems = [];
        $classified = count($costs['results']) > 0;
        foreach ($costs['results'] as $item) {
            if (($item['object'] ?? null) !== 'organization.costs.result'
                || ! is_array($item['amount'] ?? null)
                || ($item['amount']['currency'] ?? null) !== 'usd'
                || ! is_numeric($item['amount']['value'] ?? null)) {
                throw new RuntimeException('Malformed or non-USD OpenAI cost result.');
            }

            $amount = (float) $item['amount']['value'];
            if (! is_finite($amount) || $amount < 0 || $amount > 1000000) {
                throw new RuntimeException('Unexpected OpenAI cost amount.');
            }
            $lineMicrousd = (int) round($amount * 1000000);
            if ($lineMicrousd < 0 || $costMicro > PHP_INT_MAX - $lineMicrousd) {
                throw new RuntimeException('OpenAI cost overflow.');
            }
            $costMicro += $lineMicrousd;
            $lineItem = $item['line_item'] ?? null;
            if ($lineItem !== null && (! is_string($lineItem) || strlen($lineItem) > 256
                || $lineItem === '' || preg_match('/[\\x00-\\x1F\\x7F]/', $lineItem))) {
                throw new RuntimeException('Malformed OpenAI cost line item.');
            }
            if ($lineItem === null) {
                $classified = false;
            }
            $costLineItems[] = [
                'line_item' => $lineItem,
                'amount_microusd' => $lineMicrousd,
            ];
        }

        $requestCount = 0;
        $inputTokens = 0;
        $outputTokens = 0;
        foreach ($usage['results'] as $item) {
            if (($item['object'] ?? null) !== 'organization.usage.completions.result') {
                throw new RuntimeException('Unexpected provider usage category.');
            }
            foreach ([
                'num_model_requests' => &$requestCount,
                'input_tokens' => &$inputTokens,
                'output_tokens' => &$outputTokens,
            ] as $field => &$total) {
                $value = $item[$field] ?? null;
                if (! is_int($value) || $value < 0 || $value > 100000000
                    || $total > PHP_INT_MAX - $value) {
                    throw new RuntimeException('Malformed provider usage count.');
                }
                $total += $value;
            }
            unset($total);
        }

        $from = $start->format('Y-m-d H:i:s');
        $to = $end->format('Y-m-d H:i:s');
        $active = DB::table('creator_ai_generation_attempts')
            ->where('provider', 'openai')->where('status', '<>', 'failed')
            ->where('created_at', '>=', $from)->where('created_at', '<', $to);
        $localRequests = (clone $active)->count();
        $observed = DB::table('creator_ai_generation_attempts as a')
            ->join('creator_ai_generation_metering as m', 'a.request_id', '=', 'm.request_id')
            ->where('a.provider', 'openai')->where('a.status', '<>', 'failed')
            ->where('a.created_at', '>=', $from)->where('a.created_at', '<', $to)
            ->selectRaw('COUNT(*) AS observations, COALESCE(SUM(m.input_tokens), 0) AS input_total, COALESCE(SUM(m.output_tokens), 0) AS output_total')
            ->first();

        $checkpointCount = (int) ($observed?->observations ?? 0);
        $localInput = (int) ($observed?->input_total ?? 0);
        $localOutput = (int) ($observed?->output_total ?? 0);
        $coverage = $localRequests === $checkpointCount
            && $localRequests === $requestCount
            && $inputTokens === $localInput
            && $outputTokens === $localOutput;

        return [
            'day' => $day,
            'project_id' => $project,
            'provider_cost_microusd' => $costMicro,
            'provider_cost_line_items' => $costLineItems,
            'cost_line_items_classified' => $classified,
            'provider_request_count' => $requestCount,
            'provider_input_tokens' => $inputTokens,
            'provider_output_tokens' => $outputTokens,
            'local_request_count' => $localRequests,
            'local_checkpoint_count' => $checkpointCount,
            'local_input_tokens' => $localInput,
            'local_output_tokens' => $localOutput,
            'coverage_matches' => $coverage,
            'cost_document_sha256' => $costs['sha256'],
            'usage_document_sha256' => $usage['sha256'],
            'status' => $coverage ? 'aggregate_matches_pending_invoice_review' : 'reconciliation_gap',
        ];
    }

    /**
     * @param array<string,mixed> $params
     * @return array{results:list<array<string,mixed>>,sha256:string}
     */
    private function readBuckets(string $endpoint, array $params, string $adminKey, string $projectId): array
    {
        $seen = [];
        $pages = [];
        $combined = [];
        $start = $params['start_time'];
        $end = $params['end_time'];

        for ($index = 0; $index < 20; $index++) {
            try {
                $response = Http::withToken($adminKey)->acceptJson()->timeout(15)
                    ->get('https://api.openai.com/v1/'.$endpoint, $params);
            } catch (\Throwable) {
                throw new RuntimeException('OpenAI read-only billing source unavailable.');
            }
            if (! $response->successful()) {
                throw new RuntimeException('OpenAI billing source rejected the request.');
            }
            $page = $response->json();
            if (! is_array($page) || ($page['object'] ?? null) !== 'page'
                || ! is_array($page['data'] ?? null) || count($page['data']) !== 1
                || ! is_bool($page['has_more'] ?? null)) {
                throw new RuntimeException('Incomplete provider billing page.');
            }
            $bucket = $page['data'][0];
            if (! is_array($bucket) || ($bucket['object'] ?? null) !== 'bucket'
                || ($bucket['start_time'] ?? null) !== $start
                || ($bucket['end_time'] ?? null) !== $end
                || ! is_array($bucket['results'] ?? null) || count($bucket['results']) > 1000) {
                throw new RuntimeException('Unexpected billing bucket or time range.');
            }
            foreach ($bucket['results'] as $row) {
                if (! is_array($row) || ($row['project_id'] ?? null) !== $projectId) {
                    throw new RuntimeException('Billing source mixed data from another OpenAI project.');
                }
                $combined[] = $row;
            }
            $pages[] = $page;
            if ($page['has_more'] === false) {
                if (($page['next_page'] ?? null) !== null) {
                    throw new RuntimeException('Provider billing pagination inconsistent.');
                }
                return [
                    'results' => $combined,
                    'sha256' => hash('sha256', json_encode($pages, JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES)),
                ];
            }

            $cursor = $page['next_page'] ?? null;
            if (! is_string($cursor) || strlen($cursor) > 512 || strlen($cursor) < 1
                || isset($seen[$cursor])) {
                throw new RuntimeException('Provider billing pagination cursor invalid or repeated.');
            }
            $seen[$cursor] = true;
            $params['page'] = $cursor;
        }

        throw new RuntimeException('Provider billing pagination limit exceeded.');
    }
}
