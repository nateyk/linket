<?php

namespace Livechat\Widget\Controllers;

use Common\Core\BaseController;
use Illuminate\Support\Facades\Auth;
use Livechat\Events\PageVisitCreated;
use App\Contacts\Models\PageVisit;

class WidgetVisitsController extends BaseController
{
    public function store()
    {
        $user = Auth::user();

        $data = request()->validate([
            'url' => 'required',
            'title' => 'required',
            'referrer' => 'nullable|string',
            'session_id' => 'required|string',
            'started_at' => 'required|date',
        ]);

        $lastVisit = PageVisit::forUser($user)->latest()->first();

        // if it's a visit for the same url, and it's less than 5
        // seconds since the last visit, don't create a new visit
        if (
            $lastVisit &&
            $lastVisit->url === $data['url'] &&
            $lastVisit->created_at->diffInSeconds(now()) < 5
        ) {
            return $this->success(['visit' => $lastVisit]);
        }

        $visit = PageVisit::create([
            'url' => $data['url'],
            'title' => $data['title'] ?? null,
            'user_id' => $user->id,
            'referrer' => $data['referrer'] ?? ($lastVisit['url'] ?? null),
            'session_id' => $data['session_id'],
            'created_at' => $data['started_at'],
        ]);

        event(new PageVisitCreated($visit));

        $user->touchLastActiveAt();

        return $this->success(['visit' => $visit]);
    }

    public function changeStatus(int $visitId)
    {
        $visit = PageVisit::forUser(Auth::user())->findOrFail($visitId);

        // data will be sent via beacon API, need get it from raw post data
        $data = json_decode(request()->getContent(), true);

        if ($data['status'] === 'ended') {
            $visit->update([
                'ended_at' => now(),
            ]);
        } else {
            $visit->update([
                'ended_at' => null,
            ]);
        }

        Auth::user()->touchLastActiveAt();

        return $this->success();
    }
}
