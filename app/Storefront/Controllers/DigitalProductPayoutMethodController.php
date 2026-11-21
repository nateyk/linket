<?php

declare(strict_types=1);

namespace App\Storefront\Controllers;

use App\Storefront\Models\DigitalProductPayoutMethod;
use App\Storefront\Models\DigitalProductWithdrawalMethod;
use App\Storefront\Models\PayoutRequest;
use App\Storefront\ChapaPayoutService;
use App\Storefront\Resources\DigitalProductPayoutMethodResource;
use Common\Workspaces\ActiveWorkspace;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\ValidationException;

class DigitalProductPayoutMethodController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $methods = DigitalProductPayoutMethod::query()
            ->with('withdrawalMethod')
            ->where('creator_id', $request->user()->id)
            ->where('is_active', true)
            ->orderByDesc('is_default')
            ->latest('id')
            ->get();

        return DigitalProductPayoutMethodResource::collection($methods);
    }

    public function show(Request $request): DigitalProductPayoutMethodResource
    {
        $method = DigitalProductPayoutMethod::query()
            ->with('withdrawalMethod')
            ->where('creator_id', $request->user()->id)
            ->where('is_active', true)
            ->orderByDesc('is_default')
            ->latest('id')
            ->firstOrFail();

        return new DigitalProductPayoutMethodResource($method);
    }

    public function showMethod(Request $request, DigitalProductPayoutMethod $payoutMethod): DigitalProductPayoutMethodResource
    {
        abort_unless($payoutMethod->creator_id === $request->user()->id, 404);

        return new DigitalProductPayoutMethodResource($payoutMethod->load('withdrawalMethod'));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validatePayload($request);
        $user = $request->user();
        $workspaceId = ActiveWorkspace::get()?->id ?? 1;

        $withdrawalMethod = $this->resolveWithdrawalMethod(
            $data['withdrawal_method_id'] ?? null,
            $data['type'] ?? null,
            $data['bank_code'] ?? null
        );

        $lastFour = $this->extractLastFour($data['destination']);
        $displayLabel = $this->formatDisplayLabel(
            $data['bank_name'] ?? null,
            $withdrawalMethod?->code ?? $data['type'] ?? 'bank_transfer',
            $data['destination']
        );

        $method = DB::transaction(function () use ($data, $user, $workspaceId, $withdrawalMethod, $lastFour, $displayLabel, $request): DigitalProductPayoutMethod {
            $hasExisting = DigitalProductPayoutMethod::query()
                ->where('creator_id', $user->id)
                ->where('is_active', true)
                ->exists();

            $isDefault = $request->boolean('is_default') || !$hasExisting;

            if ($isDefault) {
                DigitalProductPayoutMethod::query()
                    ->where('creator_id', $user->id)
                    ->update(['is_default' => false]);
            }

            return DigitalProductPayoutMethod::query()->create([
                'workspace_id' => $workspaceId,
                'creator_id' => $user->id,
                'withdrawal_method_id' => $withdrawalMethod?->id,
                'type' => $withdrawalMethod?->code ?? $data['type'] ?? 'bank_transfer',
                'bank_code' => $data['bank_code'] ?? null,
                'bank_name' => $data['bank_name'] ?? null,
                'account_holder' => $data['account_holder'],
                'destination' => $data['destination'],
                'account_number_last_four' => $lastFour,
                'display_label' => $displayLabel,
                'is_active' => true,
                'is_default' => $isDefault,
                'status' => DigitalProductPayoutMethod::STATUS_PENDING,
            ]);
        });

        return (new DigitalProductPayoutMethodResource($method->load('withdrawalMethod')))
            ->response()
            ->setStatusCode(201);
    }

    public function update(Request $request): DigitalProductPayoutMethodResource
    {
        $method = DigitalProductPayoutMethod::query()
            ->where('creator_id', $request->user()->id)
            ->where('is_active', true)
            ->orderByDesc('is_default')
            ->latest('id')
            ->first();

        if (!$method) {
            $created = $this->store($request)->getData(true);
            return new DigitalProductPayoutMethodResource(DigitalProductPayoutMethod::query()->findOrFail($created['data']['id']));
        }

        return $this->updateMethod($request, $method);
    }

    public function updateMethod(Request $request, DigitalProductPayoutMethod $payoutMethod): DigitalProductPayoutMethodResource
    {
        abort_unless($payoutMethod->creator_id === $request->user()->id, 404);
        $this->assertNoPendingWithdrawals($payoutMethod);

        $data = $this->validatePayload($request);
        $withdrawalMethod = $this->resolveWithdrawalMethod(
            $data['withdrawal_method_id'] ?? null,
            $data['type'] ?? null,
            $data['bank_code'] ?? null
        );

        $lastFour = $this->extractLastFour($data['destination']);
        $displayLabel = $this->formatDisplayLabel(
            $data['bank_name'] ?? null,
            $withdrawalMethod?->code ?? $data['type'] ?? 'bank_transfer',
            $data['destination']
        );

        DB::transaction(function () use ($request, $payoutMethod, $data, $withdrawalMethod, $lastFour, $displayLabel): void {
            if ($request->boolean('is_default')) {
                DigitalProductPayoutMethod::query()
                    ->where('creator_id', $payoutMethod->creator_id)
                    ->where('id', '!=', $payoutMethod->id)
                    ->update(['is_default' => false]);
            }

            $payoutMethod->update([
                'withdrawal_method_id' => $withdrawalMethod?->id,
                'type' => $withdrawalMethod?->code ?? $data['type'] ?? 'bank_transfer',
                'bank_code' => $data['bank_code'] ?? $payoutMethod->bank_code,
                'bank_name' => $data['bank_name'] ?? $payoutMethod->bank_name,
                'account_holder' => $data['account_holder'],
                'destination' => $data['destination'],
                'account_number_last_four' => $lastFour,
                'display_label' => $displayLabel,
                'status' => DigitalProductPayoutMethod::STATUS_PENDING,
                'approved_by' => null,
                'approved_at' => null,
                'review_note' => null,
                'is_default' => $request->has('is_default') ? $request->boolean('is_default') : $payoutMethod->is_default,
            ]);
        });

        return new DigitalProductPayoutMethodResource($payoutMethod->fresh('withdrawalMethod'));
    }

    public function setDefault(Request $request, DigitalProductPayoutMethod $payoutMethod): DigitalProductPayoutMethodResource
    {
        abort_unless($payoutMethod->creator_id === $request->user()->id, 404);
        abort_unless($payoutMethod->is_active, 422, __('Cannot set inactive payout method as default.'));

        DB::transaction(function () use ($payoutMethod): void {
            DigitalProductPayoutMethod::query()
                ->where('creator_id', $payoutMethod->creator_id)
                ->update(['is_default' => false]);

            $payoutMethod->update(['is_default' => true]);
        });

        return new DigitalProductPayoutMethodResource($payoutMethod->fresh('withdrawalMethod'));
    }

    public function destroy(Request $request, DigitalProductPayoutMethod $payoutMethod): Response
    {
        abort_unless($payoutMethod->creator_id === $request->user()->id, 404);
        $this->assertNoPendingWithdrawals($payoutMethod);

        DB::transaction(function () use ($payoutMethod): void {
            $wasDefault = $payoutMethod->is_default;
            $payoutMethod->update([
                'is_active' => false,
                'is_default' => false,
                'status' => DigitalProductPayoutMethod::STATUS_DEACTIVATED,
            ]);

            if ($wasDefault) {
                DigitalProductPayoutMethod::query()
                    ->where('creator_id', $payoutMethod->creator_id)
                    ->where('is_active', true)
                    ->latest('id')
                    ->first()
                    ?->update(['is_default' => true]);
            }
        });

        return response()->noContent();
    }

    /**
     * @return array<string, mixed>
     */
    private function validatePayload(Request $request): array
    {
        $data = $request->validate([
            'withdrawal_method_id' => 'nullable|integer|exists:digital_product_withdrawal_methods,id',
            'type' => 'nullable|string|max:64',
            'bank_code' => 'required|string|max:64',
            'bank_name' => 'nullable|string|max:160',
            'account_holder' => 'required|string|min:3|max:160',
            'destination' => ['required', 'string', 'max:100', 'regex:/^[0-9+ -]+$/'],
            'is_default' => 'nullable|boolean',
        ]);

        $code = strtolower(trim((string) $data['bank_code']));
        $data['bank_code'] = match ($code) {
            'm-pesa' => 'mpesa',
            'cbe_birr' => 'cbebirr',
            'yaya_wallet' => 'yaya',
            default => $code,
        };
        $data['account_holder'] = trim((string) $data['account_holder']);
        $data['destination'] = trim((string) $data['destination']);
        if (mb_strlen($data['account_holder']) < 3) {
            throw ValidationException::withMessages([
                'account_holder' => __('Enter the full payout account holder name.'),
            ]);
        }
        if (isset($data['bank_name'])) {
            $data['bank_name'] = trim((string) $data['bank_name']);
        }

        $code = $data['bank_code'];
        if (!array_key_exists($code, ChapaPayoutService::PAYOUT_BANK_OPTIONS)) {
            throw ValidationException::withMessages([
                'bank_code' => __('Select a supported Chapa v1 bank or wallet.'),
            ]);
        }
        // Labels come from our curated Chapa mapping, not arbitrary seller input.
        $data['bank_name'] = ChapaPayoutService::PAYOUT_BANK_OPTIONS[$code]['name'];
        $number = preg_replace('/[\s-]/', '', (string) $data['destination']);
        $valid = match ($code) {
            'telebirr', 'cbebirr', 'mpesa' => (bool) preg_match('/^(?:0[79]\d{8}|(?:\+?251)[79]\d{8})$/', $number),
            'yaya' => (bool) preg_match('/^\d{12}$/', $number),
            'cbe' => (bool) preg_match('/^\d{13}$/', $number),
            'boa' => (bool) preg_match('/^(?:\d{8}|\d{10}|\d{16})$/', $number),
            'other', 'coop' => false,
            default => (bool) preg_match('/^\d{8,20}$/', $number),
        };
        if (!$valid) {
            throw ValidationException::withMessages([
                'destination' => __('Enter a valid account or wallet number for the selected provider.'),
            ]);
        }

        return $data;
    }

    private function resolveWithdrawalMethod(?int $withdrawalMethodId, ?string $type, ?string $bankCode): DigitalProductWithdrawalMethod
    {
        $bankCode = strtolower(trim((string) $bankCode));
        $option = ChapaPayoutService::PAYOUT_BANK_OPTIONS[$bankCode] ?? null;
        if (!$option) {
            throw ValidationException::withMessages(['bank_code' => __('Select a supported Chapa v1 bank or wallet.')]);
        }
        $code = $option['method'];

        $query = DigitalProductWithdrawalMethod::query()->active()->where('code', $code);
        $method = $query->first();
        if (!$method || ($withdrawalMethodId !== null && $method->id !== $withdrawalMethodId)) {
            throw ValidationException::withMessages(['withdrawal_method_id' => __('This payout method is unavailable.')]);
        }

        try {
            $available = app(ChapaPayoutService::class)->availableBankOptions();
        } catch (\Throwable) {
            throw ValidationException::withMessages([
                'bank_code' => __('Unable to confirm this payout destination with Chapa. Retry when the provider is available.'),
            ]);
        }
        if (!in_array($bankCode, array_column($available, 'code'), true)) {
            throw ValidationException::withMessages([
                'bank_code' => __('This bank or wallet is currently unavailable for Chapa ETB payouts.'),
            ]);
        }

        return $method;
    }

    public function adminIndex(Request $request): AnonymousResourceCollection
    {
        Gate::authorize('admin.access');

        $filters = $request->validate([
            'status' => ['nullable', 'string', 'in:all,pending,active,rejected'],
            'search' => ['nullable', 'string', 'max:255'],
            'page' => ['nullable', 'integer', 'min:1'],
        ]);

        $status = $filters['status'] ?? 'all';
        $search = trim((string) ($filters['search'] ?? ''));

        $query = DigitalProductPayoutMethod::query()
            ->with(['creator', 'withdrawalMethod'])
            ->latest('id');

        if ($status === 'pending') {
            $query->whereNotIn('status', [
                DigitalProductPayoutMethod::STATUS_ACTIVE,
                DigitalProductPayoutMethod::STATUS_REJECTED,
            ]);
        } elseif ($status === 'active' || $status === 'rejected') {
            $query->where('status', $status);
        }

        if ($search !== '') {
            $like = '%'.$search.'%';
            $query->where(function ($builder) use ($like): void {
                $builder
                    ->where('account_holder', 'like', $like)
                    ->orWhere('display_label', 'like', $like)
                    ->orWhere('bank_code', 'like', $like)
                    ->orWhere('account_number_last_four', 'like', $like)
                    ->orWhereHas('creator', function ($creator) use ($like): void {
                        $creator
                            ->where('name', 'like', $like)
                            ->orWhere('email', 'like', $like);
                    });
            });
        }

        return DigitalProductPayoutMethodResource::collection(
            $query->paginate(50),
        );
    }

    public function review(Request $request, DigitalProductPayoutMethod $payoutMethod): DigitalProductPayoutMethodResource
    {
        Gate::authorize('admin.access');

        $data = $request->validate([
            'decision' => 'required|in:approve,reject',
            'note' => 'nullable|string|max:1000',
        ]);
        abort_unless($payoutMethod->is_active, 422, __('Inactive account cannot be approved.'));
        $this->assertNoPendingWithdrawals($payoutMethod);
        abort_unless($payoutMethod->withdrawalMethod?->is_active, 422, __('This withdrawal provider is disabled.'));
        abort_unless(ChapaPayoutService::canonicalBankCode((string) $payoutMethod->bank_code) !== null, 422, __('This legacy bank is not a Chapa payout destination.'));
        abort_unless($payoutMethod->status !== DigitalProductPayoutMethod::STATUS_DEACTIVATED, 422);

        $approved = $data['decision'] === 'approve';
        $payoutMethod->update([
            'status' => $approved ? DigitalProductPayoutMethod::STATUS_ACTIVE : DigitalProductPayoutMethod::STATUS_REJECTED,
            'approved_by' => $approved ? $request->user()->id : null,
            'approved_at' => $approved ? now() : null,
            'review_note' => $data['note'] ?? null,
        ]);

        return new DigitalProductPayoutMethodResource($payoutMethod->fresh('withdrawalMethod'));
    }

    private function assertNoPendingWithdrawals(DigitalProductPayoutMethod $method): void
    {
        $hasPending = PayoutRequest::query()
            ->where('digital_product_payout_method_id', $method->id)
            ->whereIn('status', ['requested', 'processing'])
            ->exists();

        if ($hasPending) {
            throw ValidationException::withMessages([
                'payout_method' => __('This account has an unsettled withdrawal. Wait for verified settlement before modifying it.'),
            ]);
        }
    }

    private function extractLastFour(string $destination): string
    {
        return Str::of($destination)->replaceMatches('/\s+/', '')->substr(-4)->value();
    }

    private function formatDisplayLabel(?string $bankName, string $type, string $destination): string
    {
        $suffix = $this->extractLastFour($destination);
        $masked = $suffix !== '' ? '•••• ' . $suffix : '••••';

        if (filled($bankName)) {
            return "{$bankName} ({$masked})";
        }

        return match ($type) {
            'telebirr' => "Telebirr ({$masked})",
            'paypal' => "PayPal ({$masked})",
            default => "Bank transfer ({$masked})",
        };
    }
}
