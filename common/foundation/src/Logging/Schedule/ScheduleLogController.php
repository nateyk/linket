<?php

namespace Common\Logging\Schedule;

use Common\Core\Demo\BlockedOnDemoSite;
use Common\Logging\Schedule\ScheduleLogItem;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Artisan;

/**
 * @tags Logs, Admin
 */
class ScheduleLogController extends Controller
{
    public function __construct()
    {
        $this->middleware('isAdmin');
    }

    /**
     * List schedule log items.
     *
     * @operationId listScheduleLogItems
     */
    public function index(Request $request)
    {
        $data = $request->validate([
            'sort' => 'string',
            'page' => 'integer',
            'per_page' => 'integer',
            'query' => 'string|nullable',
        ]);

        $sort = explode(':', $data['sort'] ?? '');

        $pagination = ScheduleLogItem::query()
            ->orderBy(
                Arr::get($sort, 0) ?: 'ran_at',
                Arr::get($sort, 1) ?: 'desc',
            )
            ->when(
                Arr::get($data, 'query'),
                fn($q) => $q->mysqlSearch($data['query']),
            )
            ->simplePaginate($data['per_page'] ?? 15);

        return ScheduleLogItemResource::collection($pagination);
    }

    /**
     * Download the schedule log.
     *
     * @operationId downloadScheduleLog
     */
    public function download()
    {
        $log = json_encode(
            ScheduleLogItem::limit(1000)->get(),
            JSON_PRETTY_PRINT,
        );

        return response($log)
            ->header('Content-Type', 'application/json')
            ->header(
                'Content-Disposition',
                'attachment; filename="schedule-log.json"',
            );
    }

    /**
     * Rerun a schedule log.
     *
     * @operationId rerunScheduleLog
     */
    #[BlockedOnDemoSite]
    public function rerun(int $id)
    {
        $logItem = ScheduleLogItem::query()->findOrFail($id);

        Artisan::call($logItem->command);

        $logItem->increment('count_in_last_hour');

        return response()->noContent();
    }
}
