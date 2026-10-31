<?php

namespace App\Storefront\Controllers;

use App\Models\User;
use App\Payments\Models\PaymentTransaction;
use App\Storefront\Models\CreatorPaymentMethod;
use App\Storefront\Models\DigitalProduct;
use App\Storefront\Models\DirectPaymentMethod;
use App\Storefront\Models\StorefrontOrder;
use App\Storefront\Models\StorefrontPaymentDispute;
use App\Storefront\Services\CreatorVerificationAllowance;
use App\Stores\Models\Store;
use Common\Billing\Subscription;
use Common\Core\BaseController;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;

final class AdminCreatorManagementController extends BaseController
{
    public function overview(): array
    {
        Gate::authorize('admin.access');

        $creatorsQuery = $this->creatorsQuery();
        $totalCreators = (clone $creatorsQuery)->count();
        $suspended = (clone $creatorsQuery)->whereNotNull('banned_at')->count();
        $active = $totalCreators - $suspended;

        $allowance = app(CreatorVerificationAllowance::class);
        $proCreators = (clone $creatorsQuery)->get()->filter(fn (User $user): bool => $allowance->isPro($user))->count();
        $freeCreators = max(0, $totalCreators - $proCreators);

        $verifiedSales = (int) DB::table('creator_verification_allowances')->where('status', 'consumed')->count();
        $creatorIds = (clone $creatorsQuery)->select('users.id');

        return [
            'data' => [
                'total_creators' => $totalCreators,
                'active_accounts' => $active,
                'suspended_accounts' => $suspended,
                'free_plan_creators' => $freeCreators,
                'pro_plan_creators' => $proCreators,
                'verified_sales_consumed' => $verifiedSales,
                'expiring_subscriptions' => $this->subscriptionQuery($creatorIds, 'expiring')->count(),
                'expired_subscriptions' => $this->subscriptionQuery($creatorIds, 'expired')->count(),
                'pending_renewal_subscriptions' => $this->subscriptionQuery($creatorIds, 'pending_renewal')->count(),
                'pending_receiving_reviews' => CreatorPaymentMethod::query()->where('status', 'pending')->count(),
                'creators_needing_attention' => (clone $creatorsQuery)->whereHas('creatorPaymentMethods', function (Builder $accounts): void {
                    $accounts->where('status', 'pending')
                        ->orWhere('is_suspended', true)
                        ->orWhere(fn (Builder $approved) => $approved->where('status', 'approved')->where('provider_registration_status', '!=', 'registered')->where('is_suspended', false));
                })->count(),
            ],
        ];
    }

    public function index(Request $request): array
    {
        Gate::authorize('admin.access');

        $data = $request->validate([
            'search' => ['nullable', 'string', 'max:255'],
            'plan' => ['nullable', 'in:free,pro'],
            'status' => ['nullable', 'in:active,suspended'],
            'subscription' => ['nullable', 'in:expiring,expired,pending_renewal'],
            'attention' => ['nullable', 'boolean'],
            'sort' => ['nullable', 'in:name,-name,created_at,-created_at'],
            'per_page' => ['nullable', 'integer', 'min:5', 'max:100'],
            'page' => ['nullable', 'integer', 'min:1'],
        ]);

        $query = $this->creatorsQuery()
            ->with(['subscriptions.product', 'subscriptions.price'])
            ->withCount([
                'creatorPaymentMethods as pending_receiving_accounts_count' => fn (Builder $accounts) => $accounts->where('status', 'pending'),
            ]);

        if (($search = trim((string) ($data['search'] ?? ''))) !== '') {
            $query->where(function (Builder $builder) use ($search): void {
                $builder->where('name', 'like', '%'.$search.'%')
                    ->orWhere('email', 'like', '%'.$search.'%')
                    ->orWhere('username', 'like', '%'.$search.'%');
            });
        }

        if (($data['status'] ?? null) === 'suspended') {
            $query->whereNotNull('banned_at');
        } elseif (($data['status'] ?? null) === 'active') {
            $query->whereNull('banned_at');
        }

        if (($data['plan'] ?? null) === 'pro') {
            $query->whereHas('subscriptions', fn (Builder $subscription) => $subscription
                ->whereHas('product', fn (Builder $product) => $product->where('free', false))
                ->where(fn (Builder $active) => $active->whereNull('ends_at')->orWhere('ends_at', '>', now())));
        } elseif (($data['plan'] ?? null) === 'free') {
            $query->whereDoesntHave('subscriptions', fn (Builder $subscription) => $subscription
                ->whereHas('product', fn (Builder $product) => $product->where('free', false))
                ->where(fn (Builder $active) => $active->whereNull('ends_at')->orWhere('ends_at', '>', now())));
        }

        if ($subscriptionFilter = $data['subscription'] ?? null) {
            $query->whereIn('id', $this->subscriptionQuery($this->creatorsQuery()->select('users.id'), $subscriptionFilter)->select('user_id'));
        }

        if ($request->boolean('attention')) {
            $query->whereHas('creatorPaymentMethods', function (Builder $accounts): void {
                $accounts->where('status', 'pending')
                    ->orWhere('is_suspended', true)
                    ->orWhere(fn (Builder $approved) => $approved->where('status', 'approved')->where('provider_registration_status', '!=', 'registered')->where('is_suspended', false));
            });
        }

        $sort = $data['sort'] ?? '-created_at';
        match ($sort) {
            'name' => $query->orderBy('name'),
            '-name' => $query->orderByDesc('name'),
            'created_at' => $query->orderBy('created_at'),
            default => $query->orderByDesc('created_at'),
        };

        return [
            'data' => $query->paginate($data['per_page'] ?? 25)->through(fn (User $user): array => $this->listResource($user)),
        ];
    }

    public function show(User $user): array
    {
        Gate::authorize('admin.access');
        abort_unless($this->isCreator($user), 404);

        $user->load(['subscriptions.product', 'bans' => fn ($query) => $query->latest('id')->limit(20)]);

        $allowance = app(CreatorVerificationAllowance::class);
        $verification = $allowance->summary($user);
        $plan = app(\App\Entitlements\Entitlements::class)->planFor($user);
        $subscription = $user->subscriptions->first();

        $stores = Store::query()->where('user_id', $user->id)->latest('id')->limit(50)
            ->get(['id', 'name', 'back_half', 'created_at']);

        $products = DigitalProduct::query()->where('user_id', $user->id)->latest('id')->limit(50)
            ->get(['id', 'title', 'status', 'price_cents', 'currency', 'created_at']);

        $catalog = DirectPaymentMethod::query()->get()->keyBy('code');
        $paymentMethods = CreatorPaymentMethod::query()->where('user_id', $user->id)->latest('id')->get()
            ->map(function (CreatorPaymentMethod $method) use ($catalog): array {
                $providerCatalog = $catalog->get($method->provider);

                return [
                    'id' => $method->id,
                    'provider' => $method->provider,
                    'provider_display_name' => $providerCatalog?->display_name ?? strtoupper($method->provider),
                    'account_name' => $method->account_name_raw,
                    'account_masked' => '•••• '.substr((string) $method->account_number, -4),
                    'status' => $method->status,
                    'is_active' => $method->is_active,
                    'is_suspended' => $method->is_suspended,
                    'linket_approved' => $method->status === 'approved',
                    'verify_et_registered' => $method->provider_registration_status === 'registered',
                    'has_proof' => (bool) $method->proof_path,
                    'submitted_at' => $method->created_at?->toIso8601String(),
                    'reviewed_at' => $method->verified_at?->toIso8601String(),
                    'lifecycle_state' => $method->lifecycleState(),
                    'checkout_eligible' => $method->isAvailable() && ($providerCatalog?->isAvailableForCheckout() ?? false),
                ];
            });

        $sales = $this->salesQuery($user)
            ->limit(10)
            ->get()
            ->map(fn (StorefrontOrder $order): array => $this->saleResource($order));

        $disputes = StorefrontPaymentDispute::query()->where('creator_id', $user->id)->latest('id')->limit(25)
            ->get()
            ->map(fn (StorefrontPaymentDispute $dispute): array => [
                'uuid' => $dispute->uuid,
                'status' => $dispute->lifecycle_status,
                'reason' => $dispute->reason,
                'created_at' => $dispute->created_at?->toIso8601String(),
                'updated_at' => $dispute->updated_at?->toIso8601String(),
            ]);

        $conversations = DB::table('conversations')->where('user_id', $user->id)->count();

        $subscriptionPayments = PaymentTransaction::query()
            ->where('purpose', 'subscription')
            ->whereHasMorph('payable', [Subscription::class], fn (Builder $builder) => $builder->where('user_id', $user->id))
            ->latest('id')
            ->limit(20)
            ->get(['uuid', 'status', 'amount', 'currency', 'verified_at', 'created_at']);

        return [
            'data' => [
                'profile' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'username' => $user->username,
                    'created_at' => $user->created_at?->toIso8601String(),
                    'banned_at' => $user->banned_at?->toIso8601String(),
                    'is_suspended' => (bool) $user->banned_at,
                ],
                'plan' => [
                    'name' => $plan?->name,
                    'system_key' => $plan?->system_key,
                    'is_pro' => $verification['is_pro'],
                    'free' => (bool) ($plan?->free ?? true),
                ],
                'subscription' => $subscription ? [
                    'id' => $subscription->id,
                    'gateway_name' => $subscription->gateway_name,
                    'gateway_status' => $subscription->gateway_status,
                    'renews_at' => $subscription->renews_at?->toIso8601String(),
                    'ends_at' => $subscription->ends_at?->toIso8601String(),
                    'price' => $subscription->price ? [
                        'amount' => $subscription->price->amount,
                        'currency' => $subscription->price->currency,
                        'interval' => $subscription->price->interval,
                    ] : null,
                ] : null,
                'verified_sales' => $verification,
                'paid_orders_count' => StorefrontOrder::query()->where('creator_id', $user->id)->whereIn('status', ['paid', 'fulfilled'])->count(),
                'pending_orders_count' => StorefrontOrder::query()->where('creator_id', $user->id)->whereIn('status', ['pending_payment', 'verifying', 'manual_review'])->count(),
                'sales_total' => StorefrontOrder::query()->where('creator_id', $user->id)->count(),
                'stores' => $stores,
                'products' => $products,
                'receiving_accounts' => $paymentMethods,
                'receiving_accounts_admin_url' => '/admin/financial/withdrawal-methods',
                'sales' => $sales,
                'disputes' => $disputes,
                'support_conversations_count' => $conversations,
                'subscription_payments' => $subscriptionPayments,
                'audit' => $user->bans->map(fn ($ban): array => [
                    'id' => $ban->id,
                    'comment' => $ban->comment,
                    'expired_at' => $ban->expired_at?->toIso8601String(),
                    'created_at' => $ban->created_at?->toIso8601String(),
                    'created_by_id' => $ban->created_by_id,
                ]),
                'links' => [
                    'edit_user' => '/admin/users/'.$user->id,
                    'receiving_accounts' => '/admin/financial/withdrawal-methods',
                ],
            ],
        ];
    }

    private function listResource(User $user): array
    {
        $allowance = app(CreatorVerificationAllowance::class);
        $plan = app(\App\Entitlements\Entitlements::class)->planFor($user);
        $usage = $allowance->summary($user);
        $subscription = $user->subscriptions->first();

        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'username' => $user->username,
            'created_at' => $user->created_at?->toIso8601String(),
            'banned_at' => $user->banned_at?->toIso8601String(),
            'is_suspended' => (bool) $user->banned_at,
            'plan_name' => $plan?->name,
            'is_pro' => $usage['is_pro'],
            'subscription_lifecycle' => $this->subscriptionLifecycle($subscription),
            'subscription_renews_at' => $subscription?->renews_at?->toIso8601String(),
            'subscription_ends_at' => $subscription?->ends_at?->toIso8601String(),
            'verified_sales_consumed' => $usage['consumed'],
            'verified_sales_remaining' => $usage['remaining'],
            'stores_count' => Store::query()->where('user_id', $user->id)->count(),
            'products_count' => DigitalProduct::query()->where('user_id', $user->id)->count(),
            'pending_receiving_accounts_count' => (int) ($user->pending_receiving_accounts_count ?? 0),
            'needs_attention' => $this->creatorNeedsAttention($user),
        ];
    }

    public function sales(Request $request, User $user): array
    {
        Gate::authorize('admin.access');
        abort_unless($this->isCreator($user), 404);

        $data = $request->validate([
            'status' => [
                'nullable',
                'in:pending_payment,verifying,paid,fulfilled,failed_verification,manual_review,expired,cancelled,refunded',
            ],
            'per_page' => ['nullable', 'integer', 'min:5', 'max:100'],
            'page' => ['nullable', 'integer', 'min:1'],
        ]);

        $query = $this->salesQuery($user);
        if ($status = $data['status'] ?? null) {
            $query->where('status', $status);
        }

        return [
            'data' => $query->paginate($data['per_page'] ?? 15)
                ->through(fn (StorefrontOrder $order): array => $this->saleResource($order)),
        ];
    }

    /** @param Builder<User>|Builder<\Illuminate\Database\Query\Builder> $creatorIds */
    private function subscriptionQuery(Builder $creatorIds, string $lifecycle): Builder
    {
        $query = Subscription::query()
            ->whereIn('user_id', $creatorIds)
            ->whereHas('product', fn (Builder $product) => $product->where('free', false));

        return match ($lifecycle) {
            'expiring' => $query->whereNull('ends_at')
                ->whereNotNull('renews_at')
                ->where('renews_at', '>', now())
                ->where('renews_at', '<=', now()->addDays(7)),
            'expired' => $query->where(fn (Builder $builder) => $builder
                ->where('gateway_status', 'expired')
                ->orWhere(fn (Builder $ended) => $ended->whereNotNull('ends_at')->where('ends_at', '<=', now()))),
            'pending_renewal' => $query->whereNull('ends_at')->where(fn (Builder $builder) => $builder
                ->where('gateway_status', 'past_due')
                ->orWhere(fn (Builder $due) => $due->whereNotNull('renews_at')->where('renews_at', '<=', now()))),
            default => $query->whereRaw('1 = 0'),
        };
    }

    private function subscriptionLifecycle(?Subscription $subscription): ?string
    {
        if (!$subscription) {
            return null;
        }

        if ($subscription->gateway_status === 'expired' || ($subscription->ends_at && $subscription->ends_at->lte(now()))) {
            return 'expired';
        }

        if ($subscription->gateway_status === 'past_due' || ($subscription->renews_at && $subscription->renews_at->lte(now()) && !$subscription->ends_at)) {
            return 'pending_renewal';
        }

        if ($subscription->renews_at && $subscription->renews_at->gt(now()) && $subscription->renews_at->lte(now()->addDays(7)) && !$subscription->ends_at) {
            return 'expiring';
        }

        return $subscription->gateway_status;
    }

    private function isCreator(User $user): bool
    {
        return Store::query()->where('user_id', $user->id)->exists()
            || DigitalProduct::query()->where('user_id', $user->id)->exists()
            || CreatorPaymentMethod::query()->where('user_id', $user->id)->exists();
    }

    private function creatorNeedsAttention(User $user): bool
    {
        if ((int) ($user->pending_receiving_accounts_count ?? 0) > 0) {
            return true;
        }

        return CreatorPaymentMethod::query()
            ->where('user_id', $user->id)
            ->where(function (Builder $accounts): void {
                $accounts->where('is_suspended', true)
                    ->orWhere(fn (Builder $approved) => $approved
                        ->where('status', 'approved')
                        ->where('provider_registration_status', '!=', 'registered')
                        ->where('is_suspended', false));
            })
            ->exists();
    }

    /** @return Builder<StorefrontOrder> */
    private function salesQuery(User $user): Builder
    {
        return StorefrontOrder::query()
            ->where('creator_id', $user->id)
            ->latest('id')
            ->with('product:id,title')
            ->select([
                'id',
                'uuid',
                'status',
                'gross_amount_cents',
                'currency',
                'paid_at',
                'digital_product_id',
                'created_at',
            ]);
    }

    private function saleResource(StorefrontOrder $order): array
    {
        return [
            'uuid' => $order->uuid,
            'status' => $order->status,
            'product_title' => $order->product?->title,
            'product_id' => $order->digital_product_id,
            'gross_amount_cents' => $order->gross_amount_cents,
            'currency' => $order->currency,
            'paid_at' => $order->paid_at?->toIso8601String(),
            'created_at' => $order->created_at?->toIso8601String(),
            'counts_toward_verified_allowance' => in_array($order->status, ['paid', 'fulfilled'], true),
        ];
    }

    /** @return Builder<User> */
    private function creatorsQuery(): Builder
    {
        return User::query()->where(function (Builder $builder): void {
            $builder->whereHas('stores')
                ->orWhereIn('id', DigitalProduct::query()->select('user_id'))
                ->orWhereIn('id', CreatorPaymentMethod::query()->select('user_id'));
        });
    }
}
