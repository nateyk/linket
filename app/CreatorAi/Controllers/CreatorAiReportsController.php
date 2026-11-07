<?php

namespace App\CreatorAi\Controllers;

use App\CreatorAi\Services\OrderInsightsService;
use App\CreatorAi\Services\ProductPerformanceService;
use App\CreatorAi\Services\SalesSummaryService;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Validation\ValidationException;

/**
 * Authenticated Linket dashboard reporting. The public MCP server will use
 * the same trusted services with an independently validated OAuth subject.
 */
final class CreatorAiReportsController extends Controller
{
    public function __construct(
        private readonly SalesSummaryService $sales,
        private readonly OrderInsightsService $orders,
        private readonly ProductPerformanceService $products,
    ) {}

    public function salesSummary(Request $request): JsonResponse
    {
        [$creator, $data, $from, $to] = $this->validatedPeriod($request);

        $summary = $this->sales->summary($creator, (int) $data['workspace_id'], $from, $to);

        return $this->privateJson([
            ...$summary,
            'revenue_basis' => 'gross',
            'timezone' => 'UTC',
            'as_of' => now()->toIso8601String(),
        ]);
    }

    public function orderInsights(Request $request): JsonResponse
    {
        [$creator, $data, $from, $to] = $this->validatedPeriod($request, [
            'page' => ['sometimes', 'integer', 'min:1', 'max:100'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:'.(int) config('creator_ai.max_orders_per_page', 20)],
        ]);

        return $this->privateJson($this->orders->insights(
            $creator,
            (int) $data['workspace_id'],
            $from,
            $to,
            (int) ($data['page'] ?? 1),
            (int) ($data['per_page'] ?? 10),
        ));
    }

    public function productPerformance(Request $request): JsonResponse
    {
        [$creator, $data, $from, $to] = $this->validatedPeriod($request, [
            'limit' => ['sometimes', 'integer', 'min:1', 'max:'.(int) config('creator_ai.max_product_results', 20)],
        ]);

        return $this->privateJson($this->products->performance(
            $creator,
            (int) $data['workspace_id'],
            $from,
            $to,
            (int) ($data['limit'] ?? 10),
        ));
    }

    /**
     * @param array<string, array<int, string>> $extraRules
     * @return array{0: User, 1: array<string, mixed>, 2: CarbonImmutable, 3: CarbonImmutable}
     */
    private function validatedPeriod(Request $request, array $extraRules = []): array
    {
        $creator = $request->user();
        abort_unless($creator instanceof User, 401);

        $data = $request->validate([
            'workspace_id' => ['required', 'integer', 'min:1'],
            'from' => ['required', 'date_format:Y-m-d'],
            'to' => ['required', 'date_format:Y-m-d', 'after_or_equal:from'],
            ...$extraRules,
        ]);

        $from = CarbonImmutable::parse($data['from'], 'UTC');
        $to = CarbonImmutable::parse($data['to'], 'UTC');

        if ($from->diffInDays($to) > (int) config('creator_ai.max_report_days', 366)) {
            throw ValidationException::withMessages([
                'to' => 'The AI reporting period exceeds the permitted range.',
            ]);
        }

        return [$creator, $data, $from, $to];
    }

    /** @param array<string, mixed> $data */
    private function privateJson(array $data): JsonResponse
    {
        return response()->json(['data' => $data])
            ->header('Cache-Control', 'private, no-store');
    }
}
