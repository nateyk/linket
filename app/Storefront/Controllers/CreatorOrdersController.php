<?php

namespace App\Storefront\Controllers;

use App\Payments\Models\DirectPaymentVerification;
use App\Storefront\Models\DigitalProduct;
use App\Storefront\Models\StorefrontOrder;
use Common\Workspaces\ActiveWorkspace;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

final class CreatorOrdersController extends Controller
{
    private const ORDER_STATUSES = [
        'pending_payment',
        'verifying',
        'paid',
        'fulfilled',
        'failed_verification',
        'manual_review',
        'expired',
    ];

    private const TRANSACTION_STATUSES = [
        'pending',
        'verifying',
        'success',
        'mismatch',
        'manual_review',
        'manual_approved',
        'failed',
    ];

    private const VERIFIED_ORDER_STATUSES = ['paid', 'fulfilled'];

    public function index(Request $request): array
    {
        $filters = $request->validate([
            'status' => ['nullable', 'in:'.implode(',', self::ORDER_STATUSES)],
            'search' => ['nullable', 'string', 'max:100'],
            'from' => ['nullable', 'date_format:Y-m-d'],
            'to' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:from'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $base = $this->creatorOrdersQuery($request);
        $summary = $this->orderSummary($base);
        $trendQuery = (clone $base)->whereIn('status', self::VERIFIED_ORDER_STATUSES)->where('currency', 'ETB')->whereNotNull('paid_at');
        if (!empty($filters['from'])) {
            $trendQuery->whereDate('paid_at', '>=', $filters['from']);
        }
        if (!empty($filters['to'])) {
            $trendQuery->whereDate('paid_at', '<=', $filters['to']);
        }
        $salesTrend = $trendQuery->selectRaw('DATE(paid_at) as sale_date, SUM(gross_amount_cents) as amount_cents')
            ->groupByRaw('DATE(paid_at)')->orderBy('sale_date')->get()
            ->map(fn ($row): array => ['date' => $row->sale_date, 'amount_cents' => (int) $row->amount_cents]);

        $query = clone $base;
        if (!empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }
        if (!empty($filters['from'])) {
            $query->whereDate('created_at', '>=', $filters['from']);
        }
        if (!empty($filters['to'])) {
            $query->whereDate('created_at', '<=', $filters['to']);
        }
        if (!empty($filters['search'])) {
            $term = '%'.addcslashes($filters['search'], '%_\\').'%';
            $query->where(fn (Builder $q) => $q
                ->where('payment_reference', 'like', $term)
                ->orWhere('chapa_tx_ref', 'like', $term)
                ->orWhere('uuid', 'like', $term)
                ->orWhere('buyer_name', 'like', $term)
                ->orWhere('buyer_email', 'like', $term)
                ->orWhereHas('product', fn (Builder $product) => $product->withTrashed()->where('title', 'like', $term)));
        }

        $totals = [
            'sales_count' => (clone $query)->whereIn('status', self::VERIFIED_ORDER_STATUSES)->count(),
            'sales_cents' => (int) (clone $query)->whereIn('status', self::VERIFIED_ORDER_STATUSES)->sum('gross_amount_cents'),
        ];

        $orders = $query
            ->with([
                'product' => fn ($product) => $product->withTrashed(),
                'latestDirectPaymentVerification',
                'entitlements',
            ])
            ->latest()
            ->paginate($filters['per_page'] ?? 25)
            ->withQueryString()
            ->through(fn (StorefrontOrder $order): array => $this->orderPayload($order));

        return [
            'data' => $orders,
            'totals' => $totals,
            'summary' => $summary,
            'sales_trend' => $salesTrend,
            'verification_allowance' => app(\App\Storefront\Services\CreatorVerificationAllowance::class)->summary($request->user()),
        ];
    }

    public function show(Request $request, string $order): array
    {
        $order = $this->creatorOrdersQuery($request)
            ->where('uuid', $order)
            ->with([
                'product' => fn ($product) => $product->withTrashed(),
                'items',
                'entitlements.file',
                'directPaymentVerifications' => fn ($verification) => $verification->latest('id'),
            ])
            ->firstOrFail();

        $latestVerification = $order->directPaymentVerifications->first();

        return [
            'data' => [
                ...$this->orderPayload($order),
                'buyer_email' => $order->buyer_email,
                'buyer_country' => $order->buyer_country,
                'platform_fee_cents' => (int) $order->platform_fee_cents,
                'creator_earnings_cents' => (int) $order->creator_earnings_cents,
                'payment_gateway' => $order->payment_gateway,
                'verification' => $latestVerification ? [
                    'status' => $latestVerification->status,
                    'provider' => $latestVerification->bank_code,
                    'amount_cents' => (int) $latestVerification->amount_cents,
                    'currency' => $latestVerification->currency,
                    'attempts' => (int) $latestVerification->attempt,
                    'verified_at' => $latestVerification->verified_at?->toIso8601String(),
                    'created_at' => $latestVerification->created_at?->toIso8601String(),
                    'error_code' => $latestVerification->latest_error_code,
                    'history' => $order->directPaymentVerifications->map(fn (DirectPaymentVerification $verification): array => [
                        'reference' => $verification->reference,
                        'status' => $verification->status,
                        'provider' => $verification->bank_code,
                        'amount_cents' => (int) $verification->amount_cents,
                        'currency' => $verification->currency,
                        'attempt' => (int) $verification->attempt,
                        'verified_at' => $verification->verified_at?->toIso8601String(),
                        'created_at' => $verification->created_at?->toIso8601String(),
                        'error_code' => $verification->latest_error_code,
                    ])->values(),
                ] : null,
                'delivery' => [
                    'status' => $this->deliveryStatus($order),
                    'entitlements_count' => $order->entitlements->count(),
                    'downloaded_count' => (int) $order->entitlements->sum('download_count'),
                    'download_limit' => (int) $order->entitlements->sum('download_limit'),
                    'files' => $order->entitlements->map(fn ($entitlement): array => [
                        'name' => $entitlement->file?->getNameWithExtension(),
                        'download_count' => (int) $entitlement->download_count,
                        'download_limit' => (int) $entitlement->download_limit,
                        'expires_at' => $entitlement->expires_at?->toIso8601String(),
                        'revoked_at' => $entitlement->revoked_at?->toIso8601String(),
                    ])->values(),
                ],
                'manual_review' => $order->status === 'manual_review' ? [
                    'reason_code' => $latestVerification?->latest_error_code,
                    'submitted_at' => $latestVerification?->created_at?->toIso8601String(),
                ] : null,
            ],
        ];
    }

    public function transactions(Request $request): array
    {
        $filters = $request->validate([
            'status' => ['nullable', 'in:'.implode(',', self::TRANSACTION_STATUSES)],
            'search' => ['nullable', 'string', 'max:100'],
            'from' => ['nullable', 'date_format:Y-m-d'],
            'to' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:from'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $base = $this->creatorTransactionsQuery($request);
        $counts = (clone $base)
            ->selectRaw('status, COUNT(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status')
            ->map(fn ($count): int => (int) $count)
            ->all();

        $query = clone $base;
        if (!empty($filters['status'])) {
            $query->where('direct_payment_verifications.status', $filters['status']);
        }
        if (!empty($filters['from'])) {
            $query->whereDate('direct_payment_verifications.created_at', '>=', $filters['from']);
        }
        if (!empty($filters['to'])) {
            $query->whereDate('direct_payment_verifications.created_at', '<=', $filters['to']);
        }
        if (!empty($filters['search'])) {
            $term = '%'.addcslashes($filters['search'], '%_\\').'%';
            $query->where(fn (Builder $q) => $q
                ->where('direct_payment_verifications.reference', 'like', $term)
                ->orWhereHasMorph('payable', [StorefrontOrder::class], fn (Builder $payable) => $payable
                    ->where(fn (Builder $order) => $order
                        ->where('uuid', 'like', $term)
                        ->orWhere('payment_reference', 'like', $term)
                        ->orWhere('buyer_name', 'like', $term)
                        ->orWhere('buyer_email', 'like', $term)
                        ->orWhereHas('product', fn (Builder $product) => $product->withTrashed()->where('title', 'like', $term)))));
        }

        $transactions = $query
            ->with(['payable' => fn ($morph) => $morph->morphWith([
                StorefrontOrder::class => ['product' => fn ($product) => $product->withTrashed(), 'items'],
            ])])
            ->latest('direct_payment_verifications.id')
            ->paginate($filters['per_page'] ?? 25)
            ->withQueryString()
            ->through(function (DirectPaymentVerification $verification): array {
                /** @var StorefrontOrder|null $order */
                $order = $verification->payable;

                return [
                    'id' => $verification->id,
                    'attempt_uuid' => $verification->attempt_uuid,
                    'reference' => $verification->reference,
                    'status' => $verification->status,
                    'provider' => $verification->bank_code,
                    'amount_cents' => (int) $verification->amount_cents,
                    'currency' => $verification->currency,
                    'attempt' => (int) $verification->attempt,
                    'error_code' => $verification->latest_error_code,
                    'verified_at' => $verification->verified_at?->toIso8601String(),
                    'created_at' => $verification->created_at?->toIso8601String(),
                    'order_uuid' => $order?->uuid,
                    'order_status' => $order?->status,
                    'product_title' => $order?->product?->title ?? $order?->items->first()?->title,
                    'buyer_name' => $order?->buyer_name,
                ];
            });

        return ['data' => $transactions, 'counts' => $counts];
    }

    public function manualApprove(Request $request, string $order): array
    {
        abort(403, __('Creator receipt confirmation cannot bypass provider verification.'));
    }

    private function creatorOrdersQuery(Request $request): Builder
    {
        $workspace = ActiveWorkspace::get();
        abort_unless($workspace, 403);

        $productIds = DigitalProduct::query()
            ->withTrashed()
            ->where('workspace_id', $workspace->id)
            ->select('id');

        return StorefrontOrder::query()
            ->where('creator_id', $request->user()->id)
            ->whereIn('digital_product_id', $productIds);
    }

    private function creatorTransactionsQuery(Request $request): Builder
    {
        $orderIds = $this->creatorOrdersQuery($request)->select('id');

        return DirectPaymentVerification::query()
            ->where('payable_type', StorefrontOrder::class)
            ->whereIn('payable_id', $orderIds);
    }

    /** @return array<string, mixed> */
    private function orderSummary(Builder $base): array
    {
        $counts = (clone $base)
            ->selectRaw('status, COUNT(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status')
            ->map(fn ($count): int => (int) $count)
            ->all();

        return [
            'verified_sales_count' => (clone $base)->whereIn('status', self::VERIFIED_ORDER_STATUSES)->count(),
            'verified_revenue_cents' => (int) (clone $base)->where('currency', 'ETB')->whereIn('status', self::VERIFIED_ORDER_STATUSES)->sum('gross_amount_cents'),
            'pending_count' => (clone $base)->whereIn('status', ['pending_payment', 'verifying'])->count(),
            'manual_review_count' => (clone $base)->where('status', 'manual_review')->count(),
            'rejected_count' => (clone $base)->where('status', 'failed_verification')->count(),
            'status_counts' => $counts,
            'currency' => 'ETB',
        ];
    }

    /** @return array<string, mixed> */
    private function orderPayload(StorefrontOrder $order): array
    {
        $account = $order->payment_account_snapshot;

        return [
            'uuid' => $order->uuid,
            'status' => $order->status,
            'buyer_name' => $order->buyer_name,
            'transaction_reference' => $order->payment_reference ?: $order->chapa_tx_ref,
            'payment_reference' => $order->payment_reference,
            'chapa_tx_ref' => $order->chapa_tx_ref,
            'gross_amount_cents' => (int) $order->gross_amount_cents,
            'currency' => $order->currency,
            'payment_gateway' => $order->payment_gateway,
            'payment_method' => $order->payment_provider_snapshot ?: $order->payment_gateway,
            'payment_provider' => $order->payment_provider_snapshot,
            'account_ending' => is_string($account) && $account !== '' ? substr($account, -4) : null,
            'verification_status' => $order->latestDirectPaymentVerification?->status,
            'verification_error_code' => $order->latestDirectPaymentVerification?->latest_error_code,
            'delivery_status' => $this->deliveryStatus($order),
            'created_at' => $order->created_at?->toIso8601String(),
            'paid_at' => $order->paid_at?->toIso8601String(),
            'product' => $order->product ? [
                'id' => $order->product->id,
                'title' => $order->product->title,
                'status' => $order->product->status,
            ] : null,
        ];
    }

    private function deliveryStatus(StorefrontOrder $order): string
    {
        if ($order->entitlements->contains(fn ($entitlement): bool => $entitlement->download_count > 0)) {
            return 'downloaded';
        }
        if ($order->entitlements->contains(fn ($entitlement): bool => !$entitlement->revoked_at && $entitlement->expires_at->isFuture())) {
            return 'access_granted';
        }
        return in_array($order->status, self::VERIFIED_ORDER_STATUSES, true) ? 'paid' : 'unknown';
    }
}
