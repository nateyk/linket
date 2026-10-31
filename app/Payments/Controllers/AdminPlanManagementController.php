<?php

namespace App\Payments\Controllers;

use App\Payments\Models\PlanChangeAudit;
use Common\Billing\Models\Product;
use Common\Billing\Subscription;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Gate;

final class AdminPlanManagementController extends Controller
{
    public function subscribers(Request $request, Product $product): array
    {
        Gate::authorize('update', Product::class);
        $data = $request->validate([
            'status' => ['nullable', 'in:active,past_due,expired,cancelled,pending'],
            'page' => ['nullable', 'integer', 'min:1'],
        ]);

        $query = Subscription::query()->where('product_id', $product->id)
            ->with(['user:id,name,email', 'price:id,amount,currency,interval,interval_count'])
            ->latest('id');
        if (($data['status'] ?? null) === 'active') {
            $query->whereNull('ends_at')->where(fn ($builder) => $builder->whereNull('renews_at')->orWhere('renews_at', '>', now()));
        } elseif (($data['status'] ?? null) === 'expired') {
            $query->where(fn ($builder) => $builder->whereNotNull('ends_at')->where('ends_at', '<=', now())->orWhere('gateway_status', 'expired'));
        } elseif (isset($data['status'])) {
            $query->where('gateway_status', $data['status']);
        }

        return ['data' => $query->paginate(20)->through(fn (Subscription $subscription): array => [
            'id' => $subscription->id,
            'user' => ['id' => $subscription->user?->id, 'name' => $subscription->user?->name, 'email' => $subscription->user?->email],
            'status' => $subscription->gateway_status ?? ($subscription->ends_at ? 'cancelled' : 'active'),
            'gateway' => $subscription->gateway_name,
            'price' => $subscription->price ? [
                'amount' => $subscription->price->amount,
                'currency' => $subscription->price->currency,
                'interval' => $subscription->price->interval,
                'interval_count' => $subscription->price->interval_count,
            ] : null,
            'renews_at' => $subscription->renews_at?->toIso8601String(),
            'ends_at' => $subscription->ends_at?->toIso8601String(),
        ])];
    }

    public function audit(Product $product): array
    {
        Gate::authorize('update', Product::class);

        return ['data' => PlanChangeAudit::query()->where('product_id', $product->id)
            ->with('actor:id,name,email')->latest('id')->paginate(20)
            ->through(fn (PlanChangeAudit $audit): array => [
                'id' => $audit->id,
                'product_name' => $audit->product_name,
                'change_type' => $audit->change_type,
                'before' => $audit->before,
                'after' => $audit->after,
                'actor' => $audit->actor ? ['id' => $audit->actor->id, 'name' => $audit->actor->name] : null,
                'created_at' => $audit->created_at?->toIso8601String(),
            ])];
    }
}
