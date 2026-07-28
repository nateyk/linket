<?php

namespace Common\Logging\Mail;

use Common\Logging\Mail\OutgoingEmailLogItem;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Arr;
use ZBateson\MailMimeParser\Message;

/**
 * @tags Logs, Admin
 */
class OutgoingEmailLogController extends Controller
{
    public function __construct()
    {
        $this->middleware('isAdmin');
    }

    /**
     * List email log items.
     *
     * @operationId listOutgoingEmailLogItems
     */
    public function index(Request $request)
    {
        $data = $request->validate([
            'sort' => 'string',
            'page' => 'integer',
            'per_page' => 'integer',
            'query' => 'string|nullable',
            'status' => 'string|nullable',
            'created_at' => 'date_range|nullable',
        ]);

        $sort = explode(':', $data['sort'] ?? '');

        $pagination = OutgoingEmailLogItem::query()
            ->orderBy(Arr::get($sort, 0) ?: 'id', Arr::get($sort, 1) ?: 'desc')
            ->when(
                Arr::get($data, 'query'),
                fn($q) => $q->mysqlSearch($data['query']),
            )
            ->when(
                Arr::get($data, 'status'),
                fn($q) => $q->where('status', $data['status']),
            )
            ->when(
                Arr::get($data, 'created_at'),
                fn($q) => $q->whereBetween('created_at', $data['created_at']),
            )
            ->simplePaginate($data['per_page'] ?? 15);

        return OutgoingEmailLogItemResource::collection($pagination);
    }

    /**
     * Retrieve email log item.
     *
     * @operationId retrieveOutgoingEmailLogItem
     */
    public function show(int $id)
    {
        $logItem = OutgoingEmailLogItem::query()->findOrFail($id);

        return new OutgoingEmailLogItemResource(
            $logItem,
            includesPreset: 'show',
        );
    }

    /**
     * Download the email log.
     *
     * @operationId downloadEmailLog
     */
    public function downloadLog()
    {
        $log = json_encode(
            OutgoingEmailLogItem::limit(1000)->get(),
            JSON_PRETTY_PRINT,
        );

        return response($log)
            ->header('Content-Type', 'application/json')
            ->header(
                'Content-Disposition',
                'attachment; filename="outgoing-email-log.json"',
            );
    }

    /**
     * Download an email log item.
     *
     * @operationId downloadEmailLogItem
     */
    public function downloadLogItem(int $id)
    {
        $logItem = OutgoingEmailLogItem::findOrFail($id);

        return response($logItem->mime)
            ->header('Content-Type', 'message/rfc822')
            ->header(
                'Content-Disposition',
                "attachment; filename=\"{$logItem->subject}.eml\"",
            );
    }
}
