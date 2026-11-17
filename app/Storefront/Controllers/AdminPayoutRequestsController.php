<?php

declare(strict_types=1);

namespace App\Storefront\Controllers;

use App\Storefront\Models\DigitalProductWithdrawalMethod;
use App\Storefront\Models\PayoutRequest;
use App\Storefront\PayoutRequestService;
use App\Storefront\Resources\AdminPayoutRequestResource;
use App\Storefront\Services\AdminPayoutTransferStatusFilter;
use App\Storefront\Services\StorefrontPayoutProcessingService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\ValidationException;

class AdminPayoutRequestsController extends Controller
{
    public function index()
    {
        Gate::authorize('admin.access');

        $withdrawalMethods = DigitalProductWithdrawalMethod::all();

        $payouts = PayoutRequest::query()
            ->with(['creator', 'withdrawalMethod', 'activities.actor', 'latestPayoutIntent', 'payoutMethod'])
            ->latest('id');

        if (request()->filled('search')) {
            $searchTerm = '%' . request('search') . '%';
            $payouts->where(function ($query) use ($searchTerm) {
                $query->where('id', 'like', $searchTerm)
                    ->orWhere('creator_id', 'like', $searchTerm)
                    ->orWhere('payout_method_label', 'like', $searchTerm)
                    ->orWhere('withdrawal_method_name', 'like', $searchTerm)
                    ->orWhere('payout_destination', 'like', $searchTerm);
            });
        }

        if (request()->filled('date_from')) {
            $dateFrom = Carbon::parse((string) request('date_from'))->startOfDay();
            $payouts->where('created_at', '>=', $dateFrom);
        }

        if (request()->filled('date_to')) {
            $dateTo = Carbon::parse((string) request('date_to'))->endOfDay();
            $payouts->where('created_at', '<=', $dateTo);
        }

        if (request()->filled('creator')) {
            $payouts->where('creator_id', request('creator'));
        }

        if (request()->filled('status')) {
            $payouts->where('status', request('status'));
        }

        if (request()->filled('withdrawal_method')) {
            $payouts->where('withdrawal_method_name', request('withdrawal_method'));
        }

        if (request()->filled('transfer_status')) {
            AdminPayoutTransferStatusFilter::apply($payouts, (string) request('transfer_status'));
        }

        $filteredPayouts = $payouts->get();

        $counters = [
            'requested' => [
                'total' => $filteredPayouts->where('status', 'requested')->count(),
                'amount' => $filteredPayouts->where('status', 'requested')->sum('amount_cents'),
            ],
            'processing' => [
                'total' => $filteredPayouts->where('status', 'processing')->count(),
                'amount' => $filteredPayouts->where('status', 'processing')->sum('amount_cents'),
            ],
            'paid' => [
                'total' => $filteredPayouts->where('status', 'paid')->count(),
                'amount' => $filteredPayouts->where('status', 'paid')->sum('amount_cents'),
            ],
            'rejected' => [
                'total' => $filteredPayouts->where('status', 'rejected')->count(),
                'amount' => $filteredPayouts->where('status', 'rejected')->sum('amount_cents'),
            ],
            'cancelled' => [
                'total' => $filteredPayouts->where('status', 'cancelled')->count(),
                'amount' => $filteredPayouts->where('status', 'cancelled')->sum('amount_cents'),
            ],
        ];

        $paginated = $payouts->paginate((int) request('perPage', 50));
        $paginated->appends(request()->only(['search', 'date_from', 'date_to', 'creator', 'status', 'withdrawal_method', 'transfer_status']));

        return AdminPayoutRequestResource::collection($paginated)->additional([
            'meta' => [
                'counters' => $counters,
                'withdrawal_methods' => $withdrawalMethods,
            ],
        ]);
    }

    public function review(PayoutRequest $payoutRequest): AdminPayoutRequestResource
    {
        Gate::authorize('admin.access');

        return new AdminPayoutRequestResource(
            $payoutRequest->load(['creator', 'withdrawalMethod', 'activities.actor', 'latestPayoutIntent', 'payoutMethod'])
        );
    }

    public function update(Request $request, PayoutRequest $payoutRequest)
    {
        Gate::authorize('admin.access');

        $request->validate([
            'status' => ['required', 'string', 'in:requested,processing,paid,rejected,cancelled'],
        ]);

        if ($request->status === $payoutRequest->status) {
            return response()->json(['message' => __('The status is not changed')], 422);
        }

        try {
            $action = match ($request->status) {
                'processing' => 'start_processing',
                'paid' => 'mark_paid',
                'rejected' => 'reject',
                'cancelled' => 'cancel',
                default => throw ValidationException::withMessages(['status' => __('Unsupported payout action.')]),
            };

            $data = [
                'note' => $request->input('note'),
            ];

            if ($request->status === 'paid') {
                $data['transfer_reference'] = $request->validate(['transfer_reference' => 'required|string|max:190'])['transfer_reference'];
            } elseif ($request->status === 'rejected') {
                $data['reason'] = $request->validate(['reason' => 'required|string|max:2000'])['reason'];
            }

            $payoutRequest = app(PayoutRequestService::class)->transition($payoutRequest, $action, $request->user()->id, $data);
        } catch (\Throwable $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return new AdminPayoutRequestResource($payoutRequest->fresh(['creator', 'withdrawalMethod', 'activities.actor', 'latestPayoutIntent', 'payoutMethod']));
    }

    public function submitTransfer(Request $request, PayoutRequest $payoutRequest): JsonResponse
    {
        Gate::authorize('admin.access');

        try {
            $intent = app(PayoutRequestService::class)->submitChapaPayout($payoutRequest, $request->user()->id);

            return response()->json([
                'message' => match ($intent->status) {
                    'provider_pending' => __('Chapa queued the transfer; verify settlement before marking it paid.'),
                    'submitted' => __('Transfer submission is uncertain. Verify this reference with Chapa; do not resend.'),
                    default => __('Payout transfer status requires administrator review.'),
                },
                'data' => new AdminPayoutRequestResource($payoutRequest->fresh(['creator', 'withdrawalMethod', 'activities.actor', 'latestPayoutIntent', 'payoutMethod'])),
                'intent_id' => $intent->id,
                'merchant_reference' => $intent->merchant_reference,
            ]);
        } catch (\Throwable $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    public function verifySettlement(Request $request, PayoutRequest $payoutRequest): JsonResponse
    {
        Gate::authorize('admin.access');

        $intent = $payoutRequest->latestPayoutIntent;
        if (!$intent) {
            return response()->json(['message' => __('No payout transfer found to verify.')], 422);
        }

        try {
            $intent = app(StorefrontPayoutProcessingService::class)->verifyPayout($intent);

            return response()->json([
                'message' => __('Payout settlement checked.'),
                'data' => new AdminPayoutRequestResource($payoutRequest->fresh(['creator', 'withdrawalMethod', 'activities.actor', 'latestPayoutIntent', 'payoutMethod'])),
                'intent_status' => $intent->status,
            ]);
        } catch (\Throwable $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    public function destroy(PayoutRequest $payoutRequest)
    {
        Gate::authorize('admin.access');

        abort(403, __('Payout requests cannot be deleted to preserve financial audit records.'));
    }
}
