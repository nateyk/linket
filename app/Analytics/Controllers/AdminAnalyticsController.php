<?php

namespace App\Analytics\Controllers;

use App\Analytics\Actions\GetAnalyticsCardsData;
use Common\Admin\Analytics\Actions\BuildDemoAnalyticsReport;
use Common\Admin\Analytics\Actions\BuildGoogleAnalyticsReport;
use Common\Admin\Analytics\Actions\BuildNullAnalyticsReport;
use Common\API\ExcludeRoutesFromPublicDocs;
use Exception;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Cache;

/**
 * @tags Analytics
 */
#[ExcludeRoutesFromPublicDocs]
class AdminAnalyticsController extends Controller
{
    /**
     * Get analytics cards data.
     *
     * @operationId getAnalyticsCardsData
     *
     * @response array{data: list<array{name: string, previousValue: float, currentValue: float, percentageChange: float}>}
     */
    public function cardsData(Request $request)
    {
        if (
            !$request->user()?->hasPermission('admin.access') &&
            !$request->user()?->hasPermission('reports.view')
        ) {
            abort(403);
        }

        $validatedData = $request->validate([
            'workspace_id' => 'string',
            'start_date' => 'date',
            'end_date' => 'date',
            'compare_start_date' => 'date',
            'compare_end_date' => 'date',
            'timezone' => 'string',
        ]);

        $cacheKey = json_encode(
            $request->only(
                'start_date',
                'end_date',
                'compare_start_date',
                'compare_end_date',
                'timezone',
            ),
        );

        $data = Cache::remember(
            "adminReport.header.$cacheKey",
            now()->addDay(),
            fn() => (new GetAnalyticsCardsData())->execute($validatedData),
        );

        return response()->json(['data' => $data]);
    }

    /**
     * Generate visitors report.
     *
     * @operationId generateVisitorsReport
     *
     * @response array{
     *     data: array{
     *         page_views: array{
     *             granularity: 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year',
     *             total: int,
     *             data: list<array{
     *                 date: string,
     *                 value: float,
     *                 previousValue?: float,
     *             }>,
     *         },
     *         browsers: array{
     *             data: list<array{
     *                 label: string,
     *                 value: float,
     *                 previousValue?: float,
     *             }>,
     *         },
     *         locations: array{
     *             data: list<array{
     *                 label: string,
     *                 value: float,
     *                 code: string,
     *                 percentage: float,
     *                 previousValue?: float,
     *             }>,
     *         },
     *         devices: array{
     *             data: list<array{
     *                 label: string,
     *                 value: float,
     *                 previousValue?: float,
     *             }>,
     *         },
     *         platforms: array{
     *             data: list<array{
     *                 label: string,
     *                 value: float,
     *                 previousValue: float,
     *             }>,
     *         },
     *     },
     * }
     */
    public function report(Request $request)
    {
        if (
            !$request->user()?->hasPermission('admin.access') &&
            !$request->user()?->hasPermission('reports.view')
        ) {
            abort(403);
        }

        $validated = $request->validate([
            'metric' => 'string',
            'start_date' => 'date',
            'end_date' => 'date',
            'compare_start_date' => 'date',
            'compare_end_date' => 'date',
            'timezone' => 'string',
        ]);

        $cacheKey = json_encode(
            $request->only(
                'start_date',
                'end_date',
                'compare_start_date',
                'compare_end_date',
                'timezone',
            ),
        );

        try {
            $builder = config('app.demo')
                ? BuildDemoAnalyticsReport::class
                : BuildGoogleAnalyticsReport::class;
            $data = Cache::remember(
                "adminReport.main.$cacheKey",
                now()->addDay(),
                fn() => (new $builder($validated))->execute(),
            );
        } catch (Exception $e) {
            $data = (new BuildNullAnalyticsReport($validated))->execute();
        }

        return response()->json(['data' => $data]);
    }
}
