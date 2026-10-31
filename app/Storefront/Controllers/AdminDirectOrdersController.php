<?php

namespace App\Storefront\Controllers;

use App\Payments\Models\DirectPaymentVerification;
use App\Storefront\Models\OrderManualApproval;
use App\Storefront\Models\StorefrontOrder;
use App\Storefront\Services\DirectStorefrontFulfillment;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;

final class AdminDirectOrdersController extends Controller
{
    public function index(Request $request): array
    {
        Gate::authorize('admin.access');

        $data = $request->validate(['status' => ['nullable', 'in:pending_payment,verifying,paid,fulfilled,failed_verification,manual_review']]);

        return ['data' => StorefrontOrder::query()
            ->where('payment_gateway', 'verify_et')
            ->where('status', $data['status'] ?? 'failed_verification')
            ->with([
                'creator:id,name,email',
                'creator.subscriptions',
                'product:id,title',
                'creatorPaymentMethod',
                'directPaymentVerifications' => fn ($query) => $query->latest('id')->limit(1),
            ])
            ->latest()->paginate(25)->through(function (StorefrontOrder $order): StorefrontOrder {
                $order->setAttribute('verification_allowance', app(\App\Storefront\Services\CreatorVerificationAllowance::class)->summary($order->creator));
                $order->setAttribute('allowance_record', DB::table('creator_verification_allowances')->where('storefront_order_id', $order->id)->first(['status', 'consumed_at', 'released_at', 'release_reason']));
                return $order;
            })];
    }

    public function approve(Request $request, string $order): array
    {
        Gate::authorize('admin.access');
        abort(409, __('Provider mismatches cannot be approved for fulfillment. A corrected provider verification is required.'));
    }
}
