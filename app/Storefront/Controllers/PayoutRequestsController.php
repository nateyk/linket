<?php

namespace App\Storefront\Controllers;

use App\Storefront\Models\PayoutRequest;
use App\Storefront\Models\DigitalProductPayoutMethod;
use App\Storefront\Resources\PayoutRequestResource;
use App\Storefront\StorefrontEarnings;
use Common\Workspaces\ActiveWorkspace;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;

class PayoutRequestsController extends Controller
{
    public function index(Request $request) { return PayoutRequestResource::collection(PayoutRequest::query()->where('workspace_id', ActiveWorkspace::get()->id)->where('creator_id', $request->user()->id)->latest()->paginate()); }
    public function store(Request $request)
    {
        $data = $request->validate(['amount_cents' => 'required|integer|min:1']);
        $workspaceId = ActiveWorkspace::get()->id;
        $payoutMethod = DigitalProductPayoutMethod::query()
            ->where('workspace_id', $workspaceId)
            ->where('creator_id', $request->user()->id)
            ->first();
        abort_unless($payoutMethod, 422, __('Add a withdrawal method before requesting a payout.'));

        return DB::transaction(function () use ($data, $request, $workspaceId, $payoutMethod) {
            $available = app(StorefrontEarnings::class)->forCreator($request->user()->id, $workspaceId, true)['available_for_payout_cents'];
            abort_if($data['amount_cents'] > $available, 422, __('The requested payout exceeds your available balance.'));

            return new PayoutRequestResource(PayoutRequest::create([
                ...$data,
                'workspace_id' => $workspaceId,
                'creator_id' => $request->user()->id,
                'digital_product_payout_method_id' => $payoutMethod->id,
                'payout_method_label' => $payoutMethod->display_label,
                'currency' => config('storefront.currency'),
            ]));
        });
    }
    public function adminIndex() { Gate::authorize('admin.access'); return PayoutRequestResource::collection(PayoutRequest::query()->with('creator')->latest()->paginate()); }
    public function markPaid(Request $request, PayoutRequest $payoutRequest)
    {
        Gate::authorize('admin.access');
        abort_unless($payoutRequest->status === 'pending', 422);
        $payoutRequest->update(['status' => 'paid', 'processed_by' => $request->user()->id, 'paid_at' => now()]);
        return new PayoutRequestResource($payoutRequest->fresh());
    }
}
