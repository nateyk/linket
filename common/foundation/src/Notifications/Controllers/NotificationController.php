<?php

namespace Common\Notifications\Controllers;

use Common\Notifications\Resources\NotificationResource;
use Common\API\ExcludeRoutesFromPublicDocs;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Auth;

/**
 * @tags Notifications
 */
#[ExcludeRoutesFromPublicDocs]
class NotificationController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth');
    }

    /**
     * List user notifications.
     *
     * @operationId listNotifications
     */
    public function index(Request $request)
    {
        $request->validate([
            'perPage' => 'integer|min:1|max:100',
            'page' => 'integer|min:1',
        ]);

        $pagination = Auth::user()
            ->notifications()
            ->simplePaginate($request->integer('perPage') ?: 10);

        return NotificationResource::collection($pagination);
    }

    /**
     * Mark notifications as read.
     *
     * @operationId markNotificationsAsRead
     */
    public function markAsRead(Request $request)
    {
        $data = $request->validate([
            'ids' => 'array|required_without:markAllAsUnread',
            'ids.*' => 'string',
            'markAllAsUnread' => 'boolean|required_without:ids',
        ]);

        Auth::user()
            ->unreadNotifications()
            ->when(
                isset($data['ids']),
                fn($q) => $q->whereIn('id', $data['ids']),
            )
            ->update(['read_at' => now()]);

        $unreadCount = Auth::user()->unreadNotifications()->count();

        return response()->json([
            /** @var int<0, max> */
            'unreadCount' => $unreadCount,
            'date' => now(),
        ]);
    }

    /**
     * Bulk delete notifications.
     *
     * @operationId deleteNotifications
     */
    public function bulkDelete(Request $request)
    {
        $data = $request->validate([
            // Comma-separated list of notification IDs to delete. Maximum of 100 IDs. Non-existing IDs will be ignored.
            'ids' => 'required|string',
        ]);

        $ids = array_slice(explode(',', $data['ids']), 0, 100);

        Auth::user()->notifications()->whereIn('id', $ids)->delete();

        return response()->noContent();
    }
}
