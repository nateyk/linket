<?php

namespace App\Storefront\Controllers;

use App\Storefront\Models\DigitalProductWithdrawalMethod;
use App\Storefront\ChapaPayoutService;
use App\Storefront\Resources\DigitalProductWithdrawalMethodResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\ValidationException;

class DigitalProductWithdrawalMethodsController extends Controller
{
    public function index()
    {
        // Other historical method rows remain in the database but are not
        // payout choices for the current Chapa v1 integration.
        return DigitalProductWithdrawalMethodResource::collection(
            DigitalProductWithdrawalMethod::query()->active()
                ->whereIn('code', ['bank_transfer', ...ChapaPayoutService::WALLET_CODES])
                ->orderBy('position')->get()
        );
    }

    public function banks(): JsonResponse
    {
        try {
            return response()->json(['data' => app(ChapaPayoutService::class)->availableBankOptions()]);
        } catch (\Throwable $exception) {
            // Do not show unverified bank options or disclose merchant secrets
            // when Chapa's directory is unavailable.
            return response()->json(['message' => __('Chapa payout destinations are temporarily unavailable.')], 503);
        }
    }

    public function adminIndex()
    {
        Gate::authorize('admin.access');
        return DigitalProductWithdrawalMethodResource::collection(DigitalProductWithdrawalMethod::query()
            ->whereIn('code', ['bank_transfer', ...ChapaPayoutService::WALLET_CODES])
            ->orderBy('position')->get());
    }

    public function store(Request $request): DigitalProductWithdrawalMethodResource
    {
        Gate::authorize('admin.access');
        // Provider catalog is fixed to the Chapa v1 supported destinations.
        // Administrators may configure existing providers, not add fake ones.
        throw ValidationException::withMessages(['name' => __('Payout destinations are synchronized from Chapa and cannot be added manually.')]);
    }

    public function update(Request $request, DigitalProductWithdrawalMethod $withdrawalMethod): DigitalProductWithdrawalMethodResource
    {
        Gate::authorize('admin.access');
        if (!in_array($withdrawalMethod->code, ['bank_transfer', ...ChapaPayoutService::WALLET_CODES], true)) {
            throw ValidationException::withMessages(['is_active' => __('This legacy payout provider cannot be enabled.')]);
        }
        $data = $this->validated($request, false);
        $this->assertCoherentLimits($data, $withdrawalMethod);
        $withdrawalMethod->update($data);
        return new DigitalProductWithdrawalMethodResource($withdrawalMethod->fresh());
    }

    public function destroy(DigitalProductWithdrawalMethod $withdrawalMethod): JsonResponse
    {
        Gate::authorize('admin.access');
        // Payout requests and approved receiving accounts reference this method.
        // Keep the row for financial audit history; deletion would null those FKs.
        $withdrawalMethod->update(['is_active' => false]);

        return response()->json(['message' => __('Withdrawal method disabled. Historical payout records are preserved.')]);
    }

    /** @param array<string, mixed> $data */
    private function assertCoherentLimits(array $data, ?DigitalProductWithdrawalMethod $method = null): void
    {
        $minimum = (int) ($data['minimum_amount_cents'] ?? $method?->minimum_amount_cents ?? 0);
        $maximum = array_key_exists('maximum_amount_cents', $data)
            ? $data['maximum_amount_cents']
            : $method?->maximum_amount_cents;

        if ($maximum !== null && (int) $maximum < max(100, $minimum)) {
            throw ValidationException::withMessages([
                'maximum_amount_cents' => __('Maximum withdrawal must be at least the effective minimum (1.00 ETB or the configured minimum).'),
            ]);
        }
    }

    private function validated(Request $request, bool $create = true): array
    {
        return $request->validate([
            'name' => [$create ? 'required' : 'sometimes', 'string', 'max:120'],
            'destination_label' => [$create ? 'required' : 'sometimes', 'string', 'max:120'],
            'instructions' => ['nullable', 'string', 'max:2000'],
            'minimum_amount_cents' => ['nullable', 'integer', 'min:0'],
            'maximum_amount_cents' => ['nullable', 'integer', 'min:1'],
            'is_active' => ['nullable', 'boolean'],
            'position' => ['nullable', 'integer', 'min:0'],
        ]);
    }
}
