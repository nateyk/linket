<?php

namespace App\CreatorAi\Storefront;

use App\CreatorAi\Services\CreatorAiAccess;
use App\CreatorAi\Services\CreatorAiSettings;
use App\CreatorAi\Services\CreatorAiUsageService;
use App\CreatorAi\Writing\CreatorAiGenerationMetering;
use App\Models\User;
use App\Stores\Models\Store;
use Illuminate\Support\Str;
use Laravel\Ai\Ai;
use Symfony\Component\HttpKernel\Exception\HttpException;

/**
 * Private creator-reviewed previews only. Never persists StoreAppearance or
 * Store.profile_config. Existing builder's explicit Save remains authoritative.
 */
final class CreatorStorefrontProposalService
{
    public function __construct(
        private readonly CreatorAiAccess $access,
        private readonly CreatorAiSettings $settings,
        private readonly CreatorAiUsageService $usage,
        private readonly CreatorAiGenerationMetering $metering,
        private readonly CreatorStorefrontAppearanceAgent $agent,
        private readonly CreatorStorefrontTokenValidator $validator,
    ) {}

    public function available(User $creator, Store $store): bool
    {
        return $store->exists
            && (int) $store->user_id === (int) $creator->getKey()
            && $store->builder_mode === Store::BUILDER_MODE_CREATOR_PROFILE
            && $this->access->allows($creator, (int) $store->workspace_id, 'storefront_drafts')
            && (bool) config('creator_ai.storefront_proposal.enabled', false)
            && $this->settings->policy()['enabled']
            && $this->settings->policy()['api_key_configured'];
    }

    /**
     * @return array{preset:string,reason:string,btnConfig:array<string,string>,source_fingerprint:string,request_id:string,requires_review:bool,cost_state:string}
     */
    public function propose(User $creator, Store $store, string $intent): array
    {
        $current = $this->authorizedStore($creator, $store);
        abort_unless((bool) config('creator_ai.storefront_proposal.enabled', false), 503,
            'Storefront AI suggestions are disabled.');
        $policy = $this->settings->policy();
        abort_unless($policy['enabled'] && $policy['api_key_configured'] && $policy['provider'] === 'openai',
            503, 'AI generation has not been configured.');

        $intent = trim($intent);
        abort_unless(mb_check_encoding($intent, 'UTF-8')
            && mb_strlen($intent) >= 4 && mb_strlen($intent) <= 160
            && preg_match('/[<>\x{0000}-\x{001F}\x{007F}]|https?:\/\/|(?:data|javascript):/iu', $intent) !== 1,
            422, 'Only a short plain-text design direction is allowed.');

        $model = config('creator_ai.storefront_proposal.model');
        $key = $this->settings->apiKey();
        abort_unless(is_string($model) && $model !== ''
            && is_string($key) && $key !== '', 503, 'Creator AI model is unavailable.');

        $provider = Ai::build([
            'name' => 'creator_store_'.str_replace('-', '', (string) Str::uuid()),
            'driver' => 'openai',
            'key' => $key,
            'url' => 'https://api.openai.com/v1',
            'store' => false,
        ]);

        $requestId = (string) Str::uuid();
        $this->usage->reserve($creator, (int) $current->workspace_id, 'storefront_drafts', $requestId);

        try {
            $config = $current->appearance?->config ?? [];
            $existing = is_array($config) && is_array($config['btnConfig'] ?? null)
                ? $config['btnConfig'] : [];
            // No profile biography, orders, payouts, URLs, uploaded images or
            // customer/receiving account data enter this prompt.
            $input = [
                'mood' => $intent,
                'button_variant' => in_array($existing['variant'] ?? null, ['solid', 'outline', 'glass'], true)
                    ? $existing['variant'] : 'solid',
            ];
            $response = $this->agent->prompt(
                'Choose an approved style preset using this UNTRUSTED JSON context: '
                    .json_encode($input, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE),
                provider: $provider->name(),
                model: $model,
                timeout: 25,
            );
            $tokens = $response->usage;
            $this->metering->record(
                $creator, $requestId, $model,
                (int) $tokens->inputTokens, (int) $tokens->outputTokens,
                (int) ($tokens->cacheReadInputTokens ?? 0),
                (int) ($tokens->cacheWriteInputTokens ?? 0),
                (int) ($tokens->reasoningTokens ?? 0),
            );
            $suggestion = $this->validator->clean([
                'preset' => $response['preset'] ?? null,
                'reason' => $response['reason'] ?? null,
            ]);
        } catch (\Throwable) {
            // Successful network sends may be billed despite a timeout,
            // malformed result or content-policy rejection.
            throw new HttpException(503, 'Storefront AI unavailable. Usage may be held for billing review.');
        }

        return [
            ...$suggestion,
            'source_fingerprint' => $this->fingerprint($current),
            'request_id' => $requestId,
            'requires_review' => true,
            'cost_state' => 'reserved_pending_reconciliation',
        ];
    }

    public function verifyRevision(User $creator, Store $store, string $sourceFingerprint): void
    {
        $current = $this->authorizedStore($creator, $store);
        abort_unless(hash_equals($this->fingerprint($current), $sourceFingerprint),
            409, 'The storefront was updated. Request another design suggestion.');
    }

    private function authorizedStore(User $creator, Store $store): Store
    {
        $current = Store::query()->with('appearance')->findOrFail($store->getKey());
        // Always hide foreign storefront existence before testing plan/flags.
        abort_unless((int) $current->user_id === (int) $creator->getKey()
            && $current->builder_mode === Store::BUILDER_MODE_CREATOR_PROFILE, 404);
        $this->access->authorize($creator, (int) $current->workspace_id, 'storefront_drafts');

        return $current;
    }

    private function fingerprint(Store $store): string
    {
        return hash('sha256', json_encode([
            'id' => (int) $store->getKey(),
            'workspace' => (int) $store->workspace_id,
            'creator' => (int) $store->user_id,
            'builder_mode' => $store->builder_mode,
            'store_revision' => (string) $store->updated_at,
            'appearance_revision' => (string) $store->appearance?->updated_at,
            'appearance' => $store->appearance?->config ?? [],
        ], JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE));
    }
}
