<?php

namespace App\CreatorAi\Services;

use App\Models\User;
use Carbon\CarbonImmutable;

/**
 * Internal read-only dispatcher for future OAuth-authenticated Laravel MCP tools.
 *
 * This is NOT a public route or a bearer-token validator. Callers must first
 * authenticate a real OAuth token and derive User, connection ID and OAuth
 * client ID from that validated token/consent context, NOT from tool input.
 *
 * Every invocation resolves the authorized workspace from the existing grant,
 * rechecks verified Pro access, rejects unexpected fields, and then delegates
 * to sanitized deterministic reporting services. No writes or LLM calls.
 */
final class CreatorMcpToolGateway
{
    private const READ_TOOLS = [
        'sales_summary',
        'sales_trends',
        'order_insights',
        'list_orders',
        'product_performance',
    ];

    public function __construct(
        private readonly CreatorMcpConnectionRegistry $connections,
        private readonly CreatorMcpReportFacade $reports,
    ) {}

    /** @return list<string> */
    public function availableTools(): array
    {
        // The forecast engine has not passed reliability tests, so it must
        // not be advertised even if an unrelated feature flag is set.
        return self::READ_TOOLS;
    }

    /**
     * @param array<string, mixed> $arguments Strict MCP tool-input allowlist.
     * @return array<string, mixed>
     */
    public function invoke(
        User $creator,
        string $connectionId,
        string $clientId,
        string $tool,
        array $arguments,
    ): array {
        // This lookup must happen for every invocation: revoked grants,
        // membership changes and Pro downgrades take effect immediately.
        // No caller-supplied workspace ID or tier can influence the lookup.
        $workspaceId = $this->connections->authorize(
            $creator, $connectionId, $clientId
        );

        if ($tool === 'sales_forecast') {
            abort(503, 'Sales forecasts are unavailable until the validated forecast engine is enabled.');
        }

        abort_unless(in_array($tool, self::READ_TOOLS, true), 422, 'Unsupported MCP tool.');

        $allowedFields = ['from', 'to'];
        if ($tool === 'list_orders') {
            $allowedFields = [...$allowedFields, 'page', 'per_page'];
        }
        if ($tool === 'product_performance') {
            $allowedFields[] = 'limit';
        }

        abort_if(
            array_diff(array_keys($arguments), $allowedFields) !== [],
            422,
            'Unsupported MCP tool arguments.'
        );

        $from = $this->date($arguments['from'] ?? null);
        $to = $this->date($arguments['to'] ?? null);

        abort_if(
            $from->greaterThan($to)
                || $from->diffInDays($to) > (int) config('creator_ai.max_report_days', 366),
            422,
            'Invalid or excessive MCP report date range.'
        );

        return match ($tool) {
            'sales_summary' => $this->reports->salesSummary(
                $creator, $workspaceId, $from, $to
            ),
            'sales_trends' => $this->reports->salesTrends(
                $creator, $workspaceId, $from, $to
            ),
            'order_insights' => $this->reports->orderInsights(
                $creator, $workspaceId, $from, $to
            ),
            'list_orders' => $this->reports->listOrders(
                $creator, $workspaceId, $from, $to,
                $this->positiveInt($arguments['page'] ?? 1, 100),
                $this->positiveInt(
                    $arguments['per_page'] ?? 10,
                    (int) config('creator_ai.max_orders_per_page', 20)
                ),
            ),
            'product_performance' => $this->reports->productPerformance(
                $creator, $workspaceId, $from, $to,
                $this->positiveInt(
                    $arguments['limit'] ?? 10,
                    (int) config('creator_ai.max_product_results', 20)
                ),
            ),
        };
    }

    private function date(mixed $value): CarbonImmutable
    {
        if (! is_string($value)
            || preg_match('/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/D', $value) !== 1) {
            abort(422, 'MCP dates must use YYYY-MM-DD.');
        }

        [$year, $month, $day] = array_map('intval', explode('-', $value));
        abort_unless(checkdate($month, $day, $year), 422, 'Invalid calendar date.');

        return CarbonImmutable::createFromFormat('!Y-m-d', $value, 'UTC');
    }

    private function positiveInt(mixed $value, int $maximum): int
    {
        abort_unless(
            is_int($value) && $value >= 1 && $value <= $maximum,
            422,
            'MCP pagination or limit must be a bounded integer.'
        );

        return $value;
    }
}
