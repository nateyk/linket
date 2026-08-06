<?php

namespace App\Storefront\Controllers;

use App\Storefront\Models\PayoutRequest;
use App\Storefront\Resources\PayoutRequestResource;
use App\Storefront\PayoutRequestService;
use Common\Workspaces\ActiveWorkspace;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;

class PayoutRequestsController extends Controller
{
    public function index(Request $request) { return PayoutRequestResource::collection(PayoutRequest::query()->with('activities.actor')->where('workspace_id', ActiveWorkspace::get()->id)->where('creator_id', $request->user()->id)->latest()->paginate()); }
    public function store(Request $request)
    {
        $data = $request->validate(['amount_cents' => 'required|integer|min:1']);
        return new PayoutRequestResource(app(PayoutRequestService::class)->create($request->user()->id, ActiveWorkspace::get()->id, $data['amount_cents']));
    }
    public function adminIndex() { Gate::authorize('admin.access'); return PayoutRequestResource::collection(PayoutRequest::query()->with(['creator', 'withdrawalMethod', 'activities.actor'])->latest()->paginate()); }
    public function markPaid(Request $request, PayoutRequest $payoutRequest)
    {
        Gate::authorize('admin.access');
        return new PayoutRequestResource(app(PayoutRequestService::class)->transition($payoutRequest, 'mark_paid', $request->user()->id, $request->validate([
            'transfer_reference' => 'required_without:auto_transfer|string|max:190',
            'note' => 'nullable|string|max:2000',
            'auto_transfer' => 'sometimes|boolean',
        ])));
    }

    public function cancel(Request $request, PayoutRequest $payoutRequest): PayoutRequestResource { abort_unless($payoutRequest->creator_id === $request->user()->id && $payoutRequest->workspace_id === ActiveWorkspace::get()->id, 404); return new PayoutRequestResource(app(PayoutRequestService::class)->transition($payoutRequest, 'cancel', $request->user()->id)); }
    public function startProcessing(Request $request, PayoutRequest $payoutRequest): PayoutRequestResource { Gate::authorize('admin.access'); return new PayoutRequestResource(app(PayoutRequestService::class)->transition($payoutRequest, 'start_processing', $request->user()->id, $request->validate(['note' => 'nullable|string|max:2000']))); }
    public function reject(Request $request, PayoutRequest $payoutRequest): PayoutRequestResource { Gate::authorize('admin.access'); return new PayoutRequestResource(app(PayoutRequestService::class)->transition($payoutRequest, 'reject', $request->user()->id, $request->validate(['reason' => 'required|string|max:2000']))); }
    public function revealDestination(Request $request, PayoutRequest $payoutRequest): array { Gate::authorize('admin.access'); return ['destination' => app(PayoutRequestService::class)->revealDestination($payoutRequest, $request->user()->id, $request->validate(['reason' => 'nullable|string|max:500'])['reason'] ?? null)]; }
}
