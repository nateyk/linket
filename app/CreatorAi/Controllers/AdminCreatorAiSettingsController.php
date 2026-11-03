<?php

namespace App\CreatorAi\Controllers;

use App\CreatorAi\Services\CreatorAiSettings;
use Common\Settings\Models\Setting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Gate;

final class AdminCreatorAiSettingsController extends Controller
{
    public function __construct(private readonly CreatorAiSettings $settings) {}

    public function show(): JsonResponse
    {
        $this->authorizeSettings();

        return $this->privateJson($this->settings->publicConfig());
    }

    public function update(Request $request): JsonResponse
    {
        $this->authorizeSettings();

        // Validation acts as a strict input allowlist. Provider credentials
        // are write-only and must never appear in API responses or logs.
        $data = $request->validate([
            'enabled' => ['sometimes', 'boolean'],
            'provider' => ['sometimes', 'in:openai'],
            'api_key' => ['sometimes', 'nullable', 'string', 'max:4096'],
            'free_monthly_limit' => ['sometimes', 'integer', 'min:0', 'max:100000'],
            'pro_monthly_limit' => ['sometimes', 'integer', 'min:0', 'max:100000'],
            'provider_monthly_budget_microusd' => ['sometimes', 'integer', 'min:0', 'max:1000000000000'],
            'per_request_reservation_microusd' => ['sometimes', 'integer', 'min:0', 'max:10000000000'],
            'endpoint_url' => ['prohibited'],
            'base_url' => ['prohibited'],
        ]);

        $this->settings->update($data);

        return $this->privateJson($this->settings->publicConfig());
    }

    private function authorizeSettings(): void
    {
        Gate::authorize('admin.access');
        Gate::authorize('update', Setting::class);
    }

    /** @param array<string, mixed> $data */
    private function privateJson(array $data): JsonResponse
    {
        return response()->json(['data' => $data])
            ->header('Cache-Control', 'private, no-store');
    }
}
