<?php

namespace App\Payments\Controllers;

use App\Payments\Models\PaymentTransaction;
use App\Storefront\Models\StorefrontOrder;
use Common\Billing\Subscription;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Gate;

class AdminPaymentTransactionsController extends Controller
{
    public function index(Request $request)
    {
        Gate::authorize('admin.access');

        $filters = $request->validate([
            'status' => 'nullable|in:pending,paid,failed',
            'purpose' => 'nullable|in:digital_product,subscription',
            'search' => 'nullable|string|max:120',
        ]);

        $applyFilters = function (Builder $query) use ($filters): void {
            $query
                ->when(
                    $filters['status'] ?? null,
                    fn(Builder $query, string $status) => $query->where('status', $status),
                )
                ->when(
                    $filters['purpose'] ?? null,
                    fn(Builder $query, string $purpose) => $query->where('purpose', $purpose),
                )
                ->when($filters['search'] ?? null, function (Builder $query, string $search): void {
                    $query->where(function (Builder $query) use ($search): void {
                        $query
                            ->where('tx_ref', 'like', "%{$search}%")
                            ->orWhere('gateway_transaction_id', 'like', "%{$search}%")
                            ->orWhere('buyer_email', 'like', "%{$search}%");
                    });
                });
        };

        $baseQuery = PaymentTransaction::query()->where('gateway', 'chapa');
        $summaryQuery = clone $baseQuery;
        $applyFilters($summaryQuery);

        $summary = [
            'total_count' => (clone $summaryQuery)->count(),
            'paid_count' => (clone $summaryQuery)->where('status', 'paid')->count(),
            'pending_count' => (clone $summaryQuery)->where('status', 'pending')->count(),
            'failed_count' => (clone $summaryQuery)->where('status', 'failed')->count(),
            'paid_total' => (float) ((clone $summaryQuery)->where('status', 'paid')->sum('amount') ?? 0),
        ];

        $transactions = $baseQuery
            ->with([
                'payable' => fn(MorphTo $morphTo) => $morphTo->morphWith([
                    StorefrontOrder::class => ['product', 'creator'],
                    Subscription::class => ['product', 'user'],
                ]),
            ])
            ->latest()
            ->tap($applyFilters)
            ->paginate(25)
            ->through(fn(PaymentTransaction $transaction) => [
                'id' => $transaction->id,
                'uuid' => $transaction->uuid,
                'tx_ref' => $transaction->tx_ref,
                'purpose' => $transaction->purpose,
                'amount' => (float) $transaction->amount,
                'currency' => $transaction->currency,
                'status' => $transaction->status,
                'gateway_transaction_id' => $transaction->gateway_transaction_id,
                'buyer_email' => $transaction->buyer_email,
                'buyer_name' => $transaction->buyer_name,
                'failure_reason' => data_get($transaction->verification_data, 'failure_reason'),
                'verified_at' => $transaction->verified_at?->toIso8601String(),
                'created_at' => $transaction->created_at?->toIso8601String(),
                'target' => $this->targetFor($transaction),
            ]);

        return response()->json([
            ...$transactions->toArray(),
            'summary' => $summary,
        ]);
    }

    private function targetFor(PaymentTransaction $transaction): array
    {
        $payable = $transaction->payable;

        if ($payable instanceof StorefrontOrder) {
            return [
                'type' => 'digital_product',
                'name' => $payable->product?->title,
                'customer' => $transaction->buyer_email,
            ];
        }

        if ($payable instanceof Subscription) {
            return [
                'type' => 'subscription',
                'name' => $payable->product?->name,
                'customer' => $payable->user?->email,
            ];
        }

        return [
            'type' => 'unknown',
            'name' => null,
            'customer' => $transaction->buyer_email,
        ];
    }
}
