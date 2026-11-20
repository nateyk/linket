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

    /**
     * One row per Chapa-supported ETB bank/wallet (including unavailable ones).
     * This is admin configuration; seller discovery uses availableBankOptions().
     */
    public function chapaDestinations(): JsonResponse
    {
        Gate::authorize('admin.access');

        $methods = DigitalProductWithdrawalMethod::query()
            ->whereIn('code', ['bank_transfer', ...ChapaPayoutService::WALLET_CODES])
            ->get()->keyBy('code');
        $provider = [];
        $providerError = false;

        try {
            foreach (app(ChapaPayoutService::class)->getBanks() as $bank) {
                if (!is_array($bank)) {
                    continue;
                }
                $code = ChapaPayoutService::canonicalBankCode((string) ($bank['slug'] ?? ''))
                    ?? ChapaPayoutService::canonicalBankCode((string) ($bank['name'] ?? ''));
                if ($code !== null && !isset($provider[$code])
                    && !empty($bank['active']) && !empty($bank['is_active'])
                    && strtoupper((string) ($bank['currency'] ?? '')) === 'ETB'
                    && filter_var($bank['id'] ?? null, FILTER_VALIDATE_INT)) {
                    $provider[$code] = (int) $bank['id'];
                }
            }
        } catch (\Throwable) {
            $providerError = true;
        }

        $rows = [];
        foreach (ChapaPayoutService::PAYOUT_BANK_OPTIONS as $code => $option) {
            $method = $methods->get($option['method']);
            $configured = $option['method'] === 'bank_transfer'
                ? ChapaPayoutService::bankEnabled($code)
                : (bool) ($method?->is_active ?? false);
            $available = isset($provider[$code]);

            $rows[] = [
                'code' => $code,
                'name' => $option['name'],
                'type' => $option['type'],
                'method' => $option['method'],
                'provider_available' => $available,
                'provider_bank_id' => $provider[$code] ?? null,
                'admin_enabled' => $configured && ($method?->is_active ?? false),
                'enabled' => $configured && ($method?->is_active ?? false) && $available,
                'minimum_amount_cents' => $method?->minimum_amount_cents,
                'maximum_amount_cents' => $method?->maximum_amount_cents,
            ];
        }

        return response()->json([
            'data' => $rows,
            'provider_unavailable' => $providerError,
        ]);
    }

    public function updateChapaDestination(Request $request, string $code): JsonResponse
    {
        Gate::authorize('admin.access');
        if (!isset(ChapaPayoutService::PAYOUT_BANK_OPTIONS[$code])) {
            throw ValidationException::withMessages(['code' => __('Unsupported Chapa payout bank or wallet.')]);
        }
        $data = $request->validate(['enabled' => ['required', 'boolean']]);
        $enabled = (bool) $data['enabled'];
        $option = ChapaPayoutService::PAYOUT_BANK_OPTIONS[$code];
        $method = DigitalProductWithdrawalMethod::query()->where('code', $option['method'])->first();
        if (!$method) {
            throw ValidationException::withMessages(['code' => __('The payout method has not been configured.')]);
        }

        if ($enabled) {
            // Never activate a destination Chapa does not currently offer.
            try {
                $banks = app(ChapaPayoutService::class)->getBanks();
                $active = collect($banks)->contains(function ($bank) use ($code): bool {
                    if (!is_array($bank)) return false;
                    $providerCode = ChapaPayoutService::canonicalBankCode((string) ($bank['slug'] ?? ''))
                        ?? ChapaPayoutService::canonicalBankCode((string) ($bank['name'] ?? ''));
                    return $providerCode === $code && !empty($bank['active'])
                        && !empty($bank['is_active']) && strtoupper((string) ($bank['currency'] ?? '')) === 'ETB'
                        && filter_var($bank['id'] ?? null, FILTER_VALIDATE_INT) !== false;
                });
                if (!$active) {
                    throw new \RuntimeException('Unavailable provider');
                }
            } catch (\Throwable) {
                throw ValidationException::withMessages([
                    'enabled' => __('Chapa does not currently offer this ETB payout destination.'),
                ]);
            }
        }

        if ($option['method'] === 'bank_transfer') {
            settings()->save(['marketplace.payout_bank.'.$code.'.enabled' => $enabled ? 1 : 0]);
            if ($enabled && !$method->is_active) {
                $method->update(['is_active' => true]);
            }
        } else {
            $method->update(['is_active' => $enabled]);
        }

        return response()->json(['data' => ['code' => $code, 'admin_enabled' => $enabled]]);
    }

    public function store(Request $request): DigitalProductWithdrawalMethodResource
    {
        Gate::authorize('admin.access');
        // Preserve limit validation for malformed requests, then fail closed:
        // administrators may configure existing providers, not add fake ones.
        $data = $this->validated($request);
        $this->assertCoherentLimits($data);
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
