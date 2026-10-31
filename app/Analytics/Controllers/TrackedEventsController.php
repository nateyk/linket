<?php

namespace App\Analytics\Controllers;

use App\Analytics\Actions\BuildTrackedEventsReport;
use App\Analytics\Resources\TrackedEventResource;
use App\Links\Models\Link;
use App\Analytics\QueryBuilder\TrackedEventsQueryBuilder;
use Dedoc\Scramble\Attributes\Group;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Gate;

#[Group('Analytics', weight: 9)]
class TrackedEventsController extends Controller
{
    /**
     * List tracked events.
     *
     * @operationId listTrackedEvents
     */
    public function index(Request $request)
    {
        Gate::authorize('index', Link::class);

        $data = $request->validate([
            'per_page' => 'integer|min:1|max:100',
            'page' => 'integer|min:1',
            'user_id' => 'integer',
            'workspace_id' => 'string',
            'device' => 'string',
            'browser' => 'string',
            'platform' => 'string',
            'country' => 'string',
            'city' => 'string',
            'state' => 'string',
            'domain_id' => 'integer',
            'event_type' => 'string',
            'resource_type' => 'string',
            'created_at' => 'string',
            'link_id' => 'integer',
            'folder_id' => 'integer',
            'biolink_id' => 'integer',
            'qr_code_id' => 'integer',
        ]);

        $pagination = (new TrackedEventsQueryBuilder(
            $data,
            shouldSort: true,
        ))->paginate();

        return TrackedEventResource::collection($pagination);
    }

    /**
     * Generate tracked events report.
     *
     * @operationId generateTrackedEventsReport
     *
     * @return array{
     *     data: array{
     *         events?: array{
     *             granularity: 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year',
     *             total: int,
     *             data: list<array{
     *                 date: string,
     *                 value: float,
     *                 endDate?: string,
     *             }>,
     *         },
     *         devices?: array{
     *             data: list<array{
     *                 label: string,
     *                 value: float,
     *                 percentage: float,
     *             }>,
     *         },
     *         browsers?: array{
     *             data: list<array{
     *                 label: string,
     *                 value: float,
     *                 percentage: float,
     *             }>,
     *         },
     *         platforms?: array{
     *             data: list<array{
     *                 label: string,
     *                 value: float,
     *                 percentage: float,
     *             }>,
     *         },
     *         countries?: array{
     *             data: list<array{
     *                 label: string,
     *                 value: float,
     *                 percentage: float,
     *                 code: string,
     *             }>,
     *         },
     *         cities?: array{
     *             data: list<array{
     *                 label: string,
     *                 value: float,
     *                 percentage: float,
     *             }>,
     *         },
     *         referrers?: array{
     *             data: list<array{
     *                 label: string,
     *                 value: float,
     *                 percentage: float,
     *             }>,
     *         },
     *     },
     * }
     */
    public function report(Request $request)
    {
        Gate::authorize('index', Link::class);

        $validated = $request->validate([
            'metric' => 'string',
            'start_date' => 'date',
            'end_date' => 'date',
            'timezone' => 'string',
            'dashboard' => 'boolean',

            'user_id' => 'integer',
            'workspace_id' => 'string',
            'device' => 'string',
            'browser' => 'string',
            'platform' => 'string',
            'country' => 'string',
            'city' => 'string',
            'state' => 'string',
            'domain_id' => 'integer',
            'event_type' => 'string',
            'resource_type' => 'string',
            'link_id' => 'integer',
            'folder_id' => 'integer',
            'biolink_id' => 'integer',
            'qr_code_id' => 'integer',
        ]);

        $report = (new BuildTrackedEventsReport())->execute($validated);

        return response()->json(['data' => $report]);
    }
}
