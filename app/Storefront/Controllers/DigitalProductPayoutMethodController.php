<?php

declare(strict_types=1);

namespace App\Storefront\Controllers;

use App\Storefront\Models\DigitalProductPayoutMethod;
use App\Storefront\Models\DigitalProductWithdrawalMethod;
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
        return $request->validate([
            'withdrawal_method_id' => 'nullable|integer|exists:digital_product_withdrawal_methods,id',
            'type' => 'nullable|string|max:64',
            'bank_code' => 'nullable|string|max:64',
            'bank_name' => 'nullable|string|max:160',
            'account_holder' => 'required|string|max:160',
            'destination' => ['required', 'string', 'max:100', 'regex:/^[0-9+ -]+$/'],
            'is_default' => 'nullable|boolean',
        ]);
    }

    private function resolveWithdrawalMethod(?int $withdrawalMethodId, ?string $type, ?string $bankCode): DigitalProductWithdrawalMethod
    {
        $wallets = ['telebirr', 'mpesa', 'yaya', 'cbebirr'];
        $bankCode = strtolower(trim((string) $bankCode));
        $code = in_array($bankCode, $wallets, true) ? $bankCode : 'bank_transfer';
        if ($code === 'bank_transfer' && ($bankCode === '' || $bankCode === 'other')) {
            throw ValidationException::withMessages(['bank_code' => __('Select a supported bank or wallet.')]);
        }

        $query = DigitalProductWithdrawalMethod::query()->active()->where('code', $code);
        $method = $query->first();
        if (!$method || ($withdrawalMethodId !== null && $method->id !== $withdrawalMethodId)) {
            throw ValidationException::withMessages(['withdrawal_method_id' => __('This payout method is unavailable.')]);
        }

        return $method;
    }

    public function adminIndex(): AnonymousResourceCollection
    {
        Gate::authorize('admin.access');

        return DigitalProductPayoutMethodResource::collection(
            DigitalProductPayoutMethod::query()
                ->with(['creator', 'withdrawalMethod'])
                ->latest('id')
                ->paginate(50),
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
        abort_unless($payoutMethod->withdrawalMethod?->is_active, 422, __('This withdrawal provider is disabled.'));
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
