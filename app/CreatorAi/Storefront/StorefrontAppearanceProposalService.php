<?php

namespace App\CreatorAi\Storefront;

use App\CreatorAi\Services\CreatorAiAccess;
use App\Models\User;
use App\Stores\Models\Store;
use Illuminate\Support\Arr;

/**
 * PR-09 preview ONLY. No AI provider, budget spend, publication, or mutation.
 * This conservative starter deliberately does not propose arbitrary colors,
 * font family strings, section HTML, content URLs, or branding changes.
 */
final class StorefrontAppearanceProposalService
{
    private const PRESETS = [
        'calm' => [
            'layout' => 'default',
            'btnConfig' => [
                'variant' => 'outline',
                'radius' => 'rounded-sm',
                'shadow' => 'none',
            ],
        ],
        'clear' => [
            'layout' => 'default',
            'btnConfig' => [
                'variant' => 'solid',
                'radius' => 'rounded-lg',
                'shadow' => 'none',
            ],
        ],
        'profile' => [
            'layout' => 'profile-sidebar',
            'btnConfig' => [
                'variant' => 'solid',
                'radius' => 'rounded-sm',
                'shadow' => 'none',
            ],
        ],
    ];

    public function __construct(private readonly CreatorAiAccess $access) {}

    /** @return array{store_id:int,source_fingerprint:string,preset:string,changes:array,requires_review:bool,read_only:bool} */
    public function preview(User $creator, Store $store, string $preset): array
    {
        $current = $this->authorize($creator, $store);
        abort_unless(array_key_exists($preset, self::PRESETS), 422, 'Unsupported storefront preset.');

        // Diff only explicit, safe properties. Do not expose raw appearance
        // JSON, which could contain custom image URLs or other private data.
        $config = $current->appearance?->config ?? [];
        $config = is_array($config) ? $config : [];
        $selection = self::PRESETS[$preset];
        $priorButtons = $config['btnConfig'] ?? [];
        $priorButtons = is_array($priorButtons) ? $priorButtons : [];
        $changes = [];

        if (($config['layout'] ?? 'default') !== $selection['layout']) {
            $changes['layout'] = $selection['layout'];
        }

        foreach ($selection['btnConfig'] as $field => $value) {
            if (($priorButtons[$field] ?? null) !== $value) {
                $changes['btnConfig'][$field] = $value;
            }
        }

        return [
            'store_id' => (int) $current->id,
            'source_fingerprint' => $this->fingerprint($current),
            'preset' => $preset,
            'changes' => $changes,
            'requires_review' => true,
            'read_only' => true,
        ];
    }

    public function verifyRevision(User $creator, Store $store, string $fingerprint): void
    {
        $current = $this->authorize($creator, $store);
        abort_unless(preg_match('/^[a-f0-9]{64}$/D', $fingerprint) === 1
            && hash_equals($this->fingerprint($current), $fingerprint), 409,
            'Storefront appearance changed. Request a fresh preview.');
    }

    private function authorize(User $creator, Store $store): Store
    {
        $current = Store::query()->with('appearance')->findOrFail($store->getKey());
        // Ownership check first: never reveal an unrelated store via Pro
        // eligibility, feature gates, or a returned appearance fingerprint.
        abort_unless((int) $current->user_id === (int) $creator->getKey(), 404);
        $this->access->authorize($creator, (int) $current->workspace_id, 'storefront_drafts');
        abort_unless((bool) config('creator_ai.storefront_preview.enabled', false), 503,
            'AI storefront preview is disabled for this deployment.');

        return $current;
    }

    private function fingerprint(Store $store): string
    {
        $config = $store->appearance?->config ?? [];
        return hash('sha256', json_encode([
            'store_id' => (int) $store->getKey(),
            'workspace_id' => (int) $store->workspace_id,
            'creator_id' => (int) $store->user_id,
            'builder_mode' => $store->builder_mode,
            'appearance' => $config,
            'appearance_updated_at' => $store->appearance?->updated_at?->toISOString(),
            'store_updated_at' => $store->updated_at?->toISOString(),
        ], JSON_THROW_ON_ERROR));
    }
}
