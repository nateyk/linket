<?php

namespace App\Storefront\Controllers;

use App\Models\User;
use App\Payments\VerifyEt\EthiopianNameNormalizer;
use App\Storefront\Models\CreatorPaymentMethod;
use App\Storefront\Models\DirectPaymentMethod;
use Common\Workspaces\ActiveWorkspace;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;

final class CreatorPaymentMethodsController extends Controller
{
    public function details(Request $request, CreatorPaymentMethod $method): JsonResponse
    {
        $this->assertOwner($request, $method);

        return response()->json(['data' => [
            ...$this->resource($method),
            'account_number' => $method->account_number,
        ]])->header('Cache-Control', 'no-store, private')->header('Pragma', 'no-cache');
    }

    public function index(Request $request): array
    {
        $catalog = DirectPaymentMethod::query()->get()->keyBy('code');
        $availability = app(\App\Storefront\Services\CheckoutAvailability::class);
        $creatorBlocker = $availability->creatorBlocker($request->user());
        return [
            'data' => CreatorPaymentMethod::query()
                ->where('workspace_id', ActiveWorkspace::get()->id)
                ->where('user_id', $request->user()->id)
                ->latest()->get()->map(fn (CreatorPaymentMethod $method): array => [
                    ...$this->resource($method),
                    'account_configured' => $method->isAvailable(),
                    'account_ready' => $availability->accountIsReady($method, $catalog->get($method->provider)),
                    'checkout_eligible' => ! $creatorBlocker && $availability->accountIsReady($method, $catalog->get($method->provider)),
                    'checkout_blocker' => $creatorBlocker ?? ($availability->accountIsReady($method, $catalog->get($method->provider)) ? null : 'account_unavailable'),
                ])->all(),
            'available_methods' => DirectPaymentMethod::query()
                ->where('creator_setup_enabled', true)
                ->where('operationally_suspended', false)
                ->orderBy('sort_order')
                ->get(['code', 'display_name'])
                ->map(fn (DirectPaymentMethod $method): array => ['code' => $method->code, 'name' => $method->display_name])
                ->all(),
        ];
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'provider' => ['required', 'string', 'max:32'],
            'account_number' => ['required', 'string', 'min:8', 'max:100', 'regex:/^[0-9+ -]+$/'],
            'account_name' => ['required', 'string', 'min:3', 'max:255'],
            'proof' => ['required', 'file', 'mimes:pdf,jpg,jpeg,png,webp', 'max:5120'],
        ]);
        $account = preg_replace('/[\s-]+/', '', $data['account_number']);
        $provider = $data['provider'];
        abort_unless(DirectPaymentMethod::query()->where('code', $provider)->where('creator_setup_enabled', true)->where('operationally_suspended', false)->exists(), 422, __('This payment method is unavailable.'));
        if (($provider === 'awash' && !preg_match('/^\d{14}$/', $account))
            || ($provider === 'boa' && !preg_match('/^(?:\d{8}|\d{16})$/', $account))
            || ($provider === 'telebirr' && !preg_match('/^(?:0\d{9}|\+251\d{9})$/', $account))) {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'account_number' => __('Enter a valid account or wallet number for this provider.'),
            ]);
        }
        $fingerprint = hash_hmac('sha256', $provider . ':' . $account, (string) config('app.key'));
        $method = CreatorPaymentMethod::query()->create([
            'workspace_id' => ActiveWorkspace::get()->id,
            'user_id' => $request->user()->id,
            'provider' => $provider,
            'account_number' => $account,
            'account_fingerprint' => $fingerprint,
            'account_name_raw' => $data['account_name'],
            'account_name_normalized' => implode(' ', app(EthiopianNameNormalizer::class)->normalizeTokens($data['account_name'])),
            'proof_path' => $request->file('proof')->store('creator-payment-proofs', 'local'),
        ]);

        return response()->json(['data' => $this->resource($method)], 201);
    }

    public function deactivate(Request $request, CreatorPaymentMethod $method): array
    {
        $this->assertOwner($request, $method);
        $method->update(['is_active' => false]);

        return ['data' => $this->resource($method)];
    }

    public function resubmit(Request $request, CreatorPaymentMethod $method): JsonResponse
    {
        $this->assertOwner($request, $method);
        try {
            return \Illuminate\Support\Facades\DB::transaction(function () use ($request, $method): JsonResponse {
            $method = CreatorPaymentMethod::query()->whereKey($method->id)->lockForUpdate()->firstOrFail();
            $this->assertOwner($request, $method);
            abort_if($method->is_suspended, 423);
            $data = $request->validate([
                'account_number' => ['required', 'string', 'min:8', 'max:100', 'regex:/^[0-9+ -]+$/'],
                'account_name' => ['required', 'string', 'min:3', 'max:255'],
                'proof' => ['required', 'file', 'mimes:pdf,jpg,jpeg,png,webp', 'max:5120'],
            ]);
            $account = preg_replace('/[\s-]+/', '', $data['account_number']);
            if (hash_equals($method->account_number, $account)) {
                abort_unless(DirectPaymentMethod::query()->where('code', $method->provider)->where('creator_setup_enabled', true)->where('operationally_suspended', false)->exists(), 422, __('This payment method is unavailable.'));
                $history = [
                    'status' => $method->status,
                    'proof_path' => $method->proof_path,
                    'approved_aliases' => $method->approved_aliases,
                    'reviewed_by' => $method->reviewed_by,
                    'verified_at' => $method->verified_at?->toIso8601String(),
                    'provider_registration_status' => $method->provider_registration_status,
                    'provider_registered_at' => $method->provider_registered_at?->toIso8601String(),
                    'provider_registered_by' => $method->provider_registered_by,
                    'account_name' => $method->account_name_raw,
                    'created_at' => $method->created_at?->toIso8601String(),
                    'updated_at' => $method->updated_at?->toIso8601String(),
                ];
                DB::table('creator_payment_method_audits')->insert([
                    'creator_payment_method_id' => $method->id,
                    'actor_id' => $request->user()->id,
                    'action' => 'resubmit_snapshot',
                    'encrypted_snapshot' => Crypt::encryptString(json_encode($history, JSON_THROW_ON_ERROR)),
                    'created_at' => now(), 'updated_at' => now(),
                ]);
                $method->forceFill([
                    'account_name_raw' => $data['account_name'],
                    'account_name_normalized' => implode(' ', app(EthiopianNameNormalizer::class)->normalizeTokens($data['account_name'])),
                    'proof_path' => $request->file('proof')->store('creator-payment-proofs', 'local'),
                    'status' => 'pending',
                    'is_active' => false,
                    'provider_registration_status' => 'pending',
                    'reviewed_by' => null,
                    'verified_at' => null,
                    'provider_registered_at' => null,
                    'provider_registered_by' => null,
                    'approved_aliases' => null,
                    'pending_alias' => null,
                ])->save();
                return response()->json(['data' => $this->resource($method)]);
            }
            $request->merge(['provider' => $method->provider]);
            $response = $this->store($request);
            $method->update(['is_active' => false]);
            return $response;
            });
        } catch (\Illuminate\Database\UniqueConstraintViolationException) {
            throw \Illuminate\Validation\ValidationException::withMessages(['account_number' => __('This account is already registered.')]);
        }
    }

    public function activate(Request $request, CreatorPaymentMethod $method): array
    {
        $this->assertOwner($request, $method);
        abort_unless($method->status === 'approved' && $method->provider_registration_status === 'registered', 409);
        abort_if($method->is_suspended, 423);
        $method->update(['is_active' => true]);

        return ['data' => $this->resource($method)];
    }

    public function requestAlias(Request $request, CreatorPaymentMethod $method): array
    {
        $this->assertOwner($request, $method);
        $data = $request->validate([
            'alias' => ['required', 'string', 'min:3', 'max:255'],
            'proof' => ['nullable', 'file', 'mimes:pdf,jpg,jpeg,png,webp', 'max:5120'],
        ]);
        $method->update([
            'pending_alias' => $data['alias'],
            'alias_proof_path' => $request->file('proof')?->store('creator-payment-aliases', 'local'),
        ]);

        return ['data' => $this->resource($method)];
    }

    public function adminIndex(Request $request): array
    {
        Gate::authorize('admin.access');

        $data = $request->validate([
            'search' => ['nullable', 'string', 'max:255'],
            'provider' => ['nullable', 'string', 'max:32'],
            'lifecycle' => ['nullable', 'string', 'in:pending_ownership_review,pending_provider_registration,provider_registered,active,suspended,rejected,attention'],
            'status' => ['nullable', 'string', 'in:pending,approved,rejected'],
            'sort' => ['nullable', 'string', 'in:created_at,-created_at,verified_at,-verified_at,provider,-provider'],
            'user_id' => ['nullable', 'integer'],
            'submitted_from' => ['nullable', 'date'],
            'submitted_to' => ['nullable', 'date'],
            'per_page' => ['nullable', 'integer', 'min:5', 'max:100'],
            'page' => ['nullable', 'integer', 'min:1'],
        ]);

        $catalog = DirectPaymentMethod::query()->get()->keyBy('code');
        $query = CreatorPaymentMethod::query()->with('creator:id,name,email');

        if (($search = trim((string) ($data['search'] ?? ''))) !== '') {
            $providerCodes = $catalog
                ->filter(fn (DirectPaymentMethod $method): bool => str_contains(strtolower($method->display_name), strtolower($search))
                    || str_contains(strtolower($method->code), strtolower($search)))
                ->keys()
                ->all();
            $query->where(function ($builder) use ($search, $providerCodes): void {
                $builder->where('account_name_raw', 'like', '%'.$search.'%')
                    ->orWhere('provider', 'like', '%'.$search.'%')
                    ->orWhereHas('creator', fn ($creator) => $creator
                        ->where('name', 'like', '%'.$search.'%')
                        ->orWhere('email', 'like', '%'.$search.'%'));
                if ($providerCodes !== []) {
                    $builder->orWhereIn('provider', $providerCodes);
                }
            });
        }

        if (! empty($data['provider'])) {
            $query->where('provider', $data['provider']);
        }

        if (! empty($data['user_id'])) {
            $query->where('user_id', $data['user_id']);
        }

        if (! empty($data['submitted_from'])) {
            $query->whereDate('created_at', '>=', $data['submitted_from']);
        }

        if (! empty($data['submitted_to'])) {
            $query->whereDate('created_at', '<=', $data['submitted_to']);
        }

        if (! empty($data['status'])) {
            $query->where('status', $data['status']);
        }

        if (! empty($data['lifecycle'])) {
            match ($data['lifecycle']) {
                'pending_ownership_review' => $query->where('status', 'pending'),
                'pending_provider_registration' => $query->where('status', 'approved')->where('provider_registration_status', '!=', 'registered')->where('is_suspended', false),
                'provider_registered' => $query->where('status', 'approved')->where('provider_registration_status', 'registered')->where('is_active', false)->where('is_suspended', false),
                'active' => $query->where('status', 'approved')->where('is_active', true)->where('is_suspended', false),
                'suspended' => $query->where('is_suspended', true),
                'rejected' => $query->where('status', 'rejected'),
                'attention' => $query->where(function ($builder): void {
                    $builder->where('status', 'pending')
                        ->orWhere(fn ($nested) => $nested->where('status', 'approved')->where('provider_registration_status', '!=', 'registered')->where('is_suspended', false));
                }),
            };
        }

        $sort = $data['sort'] ?? '-created_at';
        match ($sort) {
            'created_at' => $query->orderBy('created_at'),
            '-created_at' => $query->orderByDesc('created_at'),
            'verified_at' => $query->orderBy('verified_at'),
            '-verified_at' => $query->orderByDesc('verified_at'),
            'provider' => $query->orderBy('provider'),
            '-provider' => $query->orderByDesc('provider'),
            default => $query->latest(),
        };

        $summaryBase = CreatorPaymentMethod::query();
        if (! empty($data['user_id'])) {
            $summaryBase->where('user_id', $data['user_id']);
        }
        $summary = [
            'pending' => (clone $summaryBase)->where('status', 'pending')->count(),
            'approved' => (clone $summaryBase)->where('status', 'approved')->where('is_suspended', false)->count(),
            'rejected' => (clone $summaryBase)->where('status', 'rejected')->count(),
            'suspended' => (clone $summaryBase)->where('is_suspended', true)->count(),
        ];

        return [
            'summary' => $summary,
            'data' => $query->paginate($data['per_page'] ?? 25)->through(fn (CreatorPaymentMethod $method): array => $this->adminResource($method, $catalog)),
        ];
    }

    public function adminShow(CreatorPaymentMethod $method): array
    {
        Gate::authorize('admin.access');
        $method->load('creator:id,name,email');
        $catalog = DirectPaymentMethod::query()->get()->keyBy('code');

        return ['data' => [
            ...$this->adminResource($method, $catalog),
            'account_number' => $method->account_number,
            'audits' => $this->auditTimeline($method),
        ]];
    }

    public function catalog(): array
    {
        Gate::authorize('admin.access');
        $methods = DirectPaymentMethod::query()->orderBy('sort_order')->get();
        $counts = CreatorPaymentMethod::query()
            ->selectRaw('provider, count(*) as aggregate')
            ->groupBy('provider')
            ->pluck('aggregate', 'provider');
        $pendingCounts = CreatorPaymentMethod::query()
            ->where('status', 'pending')
            ->selectRaw('provider, count(*) as aggregate')
            ->groupBy('provider')
            ->pluck('aggregate', 'provider');

        return [
            'data' => $methods->map(fn (DirectPaymentMethod $method): array => [
                ...$method->toArray(),
                'accounts_count' => (int) ($counts[$method->code] ?? 0),
                'pending_accounts_count' => (int) ($pendingCounts[$method->code] ?? 0),
                'status_label' => $method->operationally_suspended
                    ? 'suspended'
                    : (($method->creator_setup_enabled || $method->checkout_enabled) ? 'available' : 'disabled'),
            ])->values()->all(),
        ];
    }

    public function updateCatalog(Request $request, DirectPaymentMethod $paymentMethod): array
    {
        Gate::authorize('admin.access');
        $data = $request->validate([
            'creator_setup_enabled' => ['sometimes', 'boolean'],
            'checkout_enabled' => ['sometimes', 'boolean'],
            'operationally_suspended' => ['sometimes', 'boolean'],
        ]);
        $paymentMethod->update($data);
        return ['data' => $paymentMethod->fresh()];
    }

    public function approve(Request $request, CreatorPaymentMethod $method): array
    {
        Gate::authorize('admin.access');
        abort_unless($method->status === 'pending', 409);
        $method->update([
            'status' => 'approved',
            'rejection_reason' => null,
            'is_active' => false,
            'reviewed_by' => $request->user()->id,
            'verified_at' => now(),
        ]);
        $this->recordAdminAudit($method, $request->user()->id, 'approved');

        return ['data' => $this->adminResource($method->fresh()->load('creator:id,name,email'))];
    }

    public function recordProviderRegistration(Request $request, CreatorPaymentMethod $method): array
    {
        Gate::authorize('admin.access');
        abort_unless($method->status === 'approved', 409);

        if ($method->provider_registration_status === 'registered') {
            return ['data' => $this->adminResource($method->load('creator:id,name,email'))];
        }

        $updated = CreatorPaymentMethod::query()->whereKey($method->id)
            ->where('status', 'approved')
            ->where('provider_registration_status', '!=', 'registered')
            ->update([
            'provider_registration_status' => 'registered',
            'provider_registered_at' => now(),
            'provider_registered_by' => $request->user()->id,
        ]);
        abort_unless($updated === 1, 409);
        $method->refresh();
        $this->recordAdminAudit($method, $request->user()->id, 'provider_registered');

        return ['data' => $this->adminResource($method->load('creator:id,name,email'))];
    }

    public function suspend(Request $request, CreatorPaymentMethod $method): array
    {
        Gate::authorize('admin.access');
        abort_unless($method->status === 'approved', 409);
        $payload = $request->validate(['reason' => ['required', 'string', 'min:3', 'max:2000']]);
        $method->forceFill([
            'is_suspended' => true,
            'is_active' => false,
            'suspension_reason' => $payload['reason'],
            'suspended_at' => now(),
            'suspended_by' => $request->user()->id,
        ])->save();
        $this->recordAdminAudit($method, $request->user()->id, 'suspended', $payload['reason']);

        return ['data' => $this->adminResource($method->load('creator:id,name,email'))];
    }

    public function restore(Request $request, CreatorPaymentMethod $method): array
    {
        Gate::authorize('admin.access');
        abort_unless($method->is_suspended && $method->status === 'approved' && $method->provider_registration_status === 'registered', 409);
        $method->forceFill(['is_suspended' => false, 'is_active' => false, 'suspension_reason' => null])->save();
        $this->recordAdminAudit($method, $request->user()->id, 'restored');

        return ['data' => $this->adminResource($method->load('creator:id,name,email'))];
    }

    public function reject(Request $request, CreatorPaymentMethod $method): array
    {
        Gate::authorize('admin.access');
        abort_unless($method->status === 'pending', 409);
        $payload = $request->validate(['reason' => ['required', 'string', 'min:3', 'max:2000']]);
        $method->update([
            'status' => 'rejected',
            'rejection_reason' => $payload['reason'],
            'is_active' => false,
            'reviewed_by' => $request->user()->id,
            'verified_at' => now(),
        ]);
        $this->recordAdminAudit($method, $request->user()->id, 'rejected', $payload['reason']);

        return ['data' => $this->adminResource($method->load('creator:id,name,email'))];
    }

    public function approveAlias(Request $request, CreatorPaymentMethod $method): array
    {
        Gate::authorize('admin.access');
        abort_unless($method->pending_alias, 422);
        $method->update([
            'approved_aliases' => array_values(array_unique([...($method->approved_aliases ?? []), $method->pending_alias])),
            'pending_alias' => null,
            'alias_proof_path' => null,
            'reviewed_by' => $request->user()->id,
        ]);

        return ['data' => $this->resource($method)];
    }

    public function proof(CreatorPaymentMethod $method): mixed
    {
        Gate::authorize('admin.access');
        $path = request()->boolean('alias') ? $method->alias_proof_path : $method->proof_path;
        abort_unless($path, 404);

        return Storage::disk('local')->response($path);
    }

    private function assertOwner(Request $request, CreatorPaymentMethod $method): void
    {
        abort_unless($method->user_id === $request->user()->id && $method->workspace_id === ActiveWorkspace::get()->id, 404);
    }

    /** @return array<string, mixed> */
    private function resource(CreatorPaymentMethod $method): array
    {
        return [
            'id' => $method->id,
            'provider' => $method->provider,
            'account_ending' => substr($method->account_number, -4),
            'account_name' => $method->account_name_raw,
            'status' => $method->status,
            'is_active' => $method->is_active,
            'is_suspended' => $method->is_suspended,
            'lifecycle_state' => $method->lifecycleState(),
            'provider_registration_status' => $method->provider_registration_status,
            'approved_aliases' => $method->approved_aliases ?? [],
            'pending_alias' => $method->pending_alias,
        ];
    }

    /** @param \Illuminate\Support\Collection<string, DirectPaymentMethod>|null $catalog */
    private function adminResource(CreatorPaymentMethod $method, ?\Illuminate\Support\Collection $catalog = null): array
    {
        $catalog ??= DirectPaymentMethod::query()->get()->keyBy('code');
        $providerCatalog = $catalog->get($method->provider);
        $availability = app(\App\Storefront\Services\CheckoutAvailability::class);
        $creatorBlocker = $method->creator ? $availability->creatorBlocker($method->creator) : 'creator_restricted';
        $checkoutEligible = ! $creatorBlocker && $availability->accountIsReady($method, $providerCatalog);

        return [
            ...$this->resource($method),
            'account_masked' => '•••• '.substr($method->account_number, -4),
            'creator_name' => $method->creator?->name,
            'creator_email' => $method->creator?->email,
            'provider_display_name' => $providerCatalog?->display_name ?? strtoupper($method->provider),
            'linket_approved' => $method->status === 'approved',
            'verify_et_registered' => $method->provider_registration_status === 'registered',
            'checkout_eligible' => $checkoutEligible,
            'checkout_blockers' => array_values(array_filter([...$this->checkoutBlockers($method, $providerCatalog), $creatorBlocker])),
            'submitted_at' => $method->created_at?->toIso8601String(),
            'reviewed_at' => $method->verified_at?->toIso8601String(),
            'reviewed_by' => $method->reviewed_by,
            'reviewer_name' => $method->reviewed_by
                ? User::query()->find($method->reviewed_by)?->name
                : null,
            'rejection_reason' => $method->rejection_reason,
            'suspension_reason' => $method->suspension_reason,
            'has_proof' => (bool) $method->proof_path,
            'creator_admin_url' => $method->user_id ? '/admin/creators/'.$method->user_id : null,
        ];
    }

    /** @return list<string> */
    private function checkoutBlockers(CreatorPaymentMethod $method, ?DirectPaymentMethod $providerCatalog): array
    {
        $blockers = [];
        if ($method->status !== 'approved') {
            $blockers[] = 'linket_approval';
        }
        if ($method->is_suspended) {
            $blockers[] = 'suspended';
        }
        if ($method->provider_registration_status !== 'registered') {
            $blockers[] = 'verify_et';
        }
        if (! $method->is_active) {
            $blockers[] = 'creator_activation';
        }
        if (! ($providerCatalog?->isAvailableForCheckout() ?? false)) {
            $blockers[] = 'bank_checkout';
        }

        return $blockers;
    }

    private function recordAdminAudit(CreatorPaymentMethod $method, int $actorId, string $action, ?string $note = null): void
    {
        DB::table('creator_payment_method_audits')->insert([
            'creator_payment_method_id' => $method->id,
            'actor_id' => $actorId,
            'action' => $action,
            'note' => $note,
            'encrypted_snapshot' => Crypt::encryptString(json_encode([
                'status' => $method->status,
                'is_active' => $method->is_active,
                'is_suspended' => $method->is_suspended,
                'provider_registration_status' => $method->provider_registration_status,
                'rejection_reason' => $method->rejection_reason,
                'suspension_reason' => $method->suspension_reason,
                'reviewed_by' => $method->reviewed_by,
                'verified_at' => $method->verified_at?->toIso8601String(),
            ], JSON_THROW_ON_ERROR)),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    /** @return list<array<string, mixed>> */
    private function auditTimeline(CreatorPaymentMethod $method): array
    {
        $rows = DB::table('creator_payment_method_audits')
            ->where('creator_payment_method_id', $method->id)
            ->orderByDesc('id')
            ->get();
        $actors = User::query()
            ->whereIn('id', $rows->pluck('actor_id')->filter()->unique()->all())
            ->get()
            ->mapWithKeys(fn (User $user): array => [$user->id => $user->name]);

        return $rows
            ->map(function (object $row) use ($actors): array {
                $entry = [
                    'id' => $row->id,
                    'action' => $row->action ?? 'resubmit_snapshot',
                    'note' => $row->note,
                    'actor_id' => $row->actor_id,
                    'actor_name' => $row->actor_id ? ($actors[$row->actor_id] ?? null) : null,
                    'created_at' => $row->created_at,
                ];
                if ($row->encrypted_snapshot) {
                    $entry['snapshot'] = json_decode(Crypt::decryptString($row->encrypted_snapshot), true, 512, JSON_THROW_ON_ERROR);
                }

                return $entry;
            })
            ->all();
    }
}
