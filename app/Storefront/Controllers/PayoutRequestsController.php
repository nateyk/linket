<?php

declare(strict_types=1);

namespace App\Storefront\Controllers;

use App\Storefront\Models\PayoutRequest;
use App\Storefront\PayoutRequestService;
use App\Storefront\Resources\PayoutRequestResource;
use Common\Workspaces\ActiveWorkspace;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Gate;

class PayoutRequestsController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $workspaceId = ActiveWorkspace::get()?->id ?? 1;

        $payouts = PayoutRequest::query()
            ->with(['withdrawalMethod', 'activities.actor'])
            ->where('workspace_id', $workspaceId)
            ->where('creator_id', $request->user()->id)
            ->latest('id')
            ->paginate();

        return PayoutRequestResource::collection($payouts);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'amount_cents' => 'required|integer|min:1',
            'payout_method_id' => 'nullable|integer|exists:digital_product_payout_methods,id',
        ]);

        $workspaceId = ActiveWorkspace::get()?->id ?? 1;

        $payout = app(PayoutRequestService::class)->create(
            $request->user()->id,
            $workspaceId,
            $data['amount_cents'],
            $data['payout_method_id'] ?? null
        );

        return (new PayoutRequestResource($payout->load(['withdrawalMethod', 'activities.actor'])))
            ->response()
            ->setStatusCode(201);
    }

    public function cancel(Request $request, PayoutRequest $payoutRequest): PayoutRequestResource
    {
        abort_unless($payoutRequest->creator_id === $request->user()->id, 404);

        $updated = app(PayoutRequestService::class)->transition(
            $payoutRequest,
            'cancel',
            $request->user()->id
        );

        return new PayoutRequestResource($updated);
    }

    public function adminIndex(): AnonymousResourceCollection
    {
        Gate::authorize('admin.access');

        $payouts = PayoutRequest::query()
            ->with(['creator', 'withdrawalMethod', 'activities.actor'])
            ->latest('id')
            ->paginate();

        return PayoutRequestResource::collection($payouts);
    }

    public function startProcessing(Request $request, PayoutRequest $payoutRequest): PayoutRequestResource
    {
        Gate::authorize('admin.access');

        $data = $request->validate([
            'note' => 'nullable|string|max:2000',
        ]);

        $updated = app(PayoutRequestService::class)->transition(
            $payoutRequest,
            'start_processing',
            $request->user()->id,
            $data
        );

        return new PayoutRequestResource($updated);
    }

    public function markPaid(Request $request, PayoutRequest $payoutRequest): PayoutRequestResource
    {
        Gate::authorize('admin.access');

        $data = $request->validate([
            'transfer_reference' => 'required|string|max:190',
            'note' => 'nullable|string|max:2000',
        ]);

        $updated = app(PayoutRequestService::class)->transition(
            $payoutRequest,
            'mark_paid',
            $request->user()->id,
            $data
        );

        return new PayoutRequestResource($updated);
    }

    public function submitChapaPayout(Request $request, PayoutRequest $payoutRequest): JsonResponse
    {
        Gate::authorize('admin.access');

        $intent = app(PayoutRequestService::class)->submitChapaPayout($payoutRequest, $request->user()->id);

        return response()->json([
            'data' => [
                'payout' => new PayoutRequestResource($payoutRequest->fresh(['creator', 'withdrawalMethod', 'activities.actor'])),
                'intent_id' => $intent->id,
                'merchant_reference' => $intent->merchant_reference,
                'status' => $intent->status,
            ],
        ]);
    }

    public function reject(Request $request, PayoutRequest $payoutRequest): PayoutRequestResource
    {
        Gate::authorize('admin.access');

        $data = $request->validate([
            'reason' => 'required|string|max:2000',
        ]);

        $updated = app(PayoutRequestService::class)->transition(
            $payoutRequest,
            'reject',
            $request->user()->id,
            $data
        );

        return new PayoutRequestResource($updated);
    }

    /**
     * @return array{destination: string}
     */
    public function revealDestination(Request $request, PayoutRequest $payoutRequest): array
    {
        Gate::authorize('admin.access');

        $data = $request->validate([
            'reason' => 'nullable|string|max:500',
        ]);

        $destination = app(PayoutRequestService::class)->revealDestination(
            $payoutRequest,
            $request->user()->id,
            $data['reason'] ?? null
        );

        return ['destination' => $destination];
    }
}
