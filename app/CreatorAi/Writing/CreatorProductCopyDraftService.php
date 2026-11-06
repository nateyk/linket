<?php

namespace App\CreatorAi\Writing;

use App\CreatorAi\Services\CreatorAiAccess;
use App\CreatorAi\Services\CreatorAiSettings;
use App\CreatorAi\Services\CreatorAiUsageService;
use App\Models\User;
use App\Storefront\Models\DigitalProduct;
use Illuminate\Support\Str;
use Laravel\Ai\Ai;
use Symfony\Component\HttpKernel\Exception\HttpException;

/**
 * Generates PRIVATE suggestions. Deliberately never mutates any product row.
 *
 * Provider pricing is not yet independently reconciled: the generation hold
 * remains RESERVED, including after successful output, until a trusted
 * metering worker settles the true charge. Never fabricate cost from tokens,
 * and never refund a possibly billable timeout automatically.
 */
final class CreatorProductCopyDraftService
{
    public function __construct(
        private readonly CreatorAiAccess $access,
        private readonly CreatorAiSettings $settings,
        private readonly CreatorAiUsageService $usage,
        private readonly CreatorProductCopyAgent $agent,
        private readonly ProductCopyDraftValidator $validator,
        private readonly CreatorAiGenerationMetering $metering,
    ) {}

    public function available(User $creator, DigitalProduct $product): bool
    {
        return (int) $product->user_id === (int) $creator->getKey()
            && $this->access->allows($creator, (int) $product->workspace_id, 'writing_basic')
            && $product->deleted_at === null
            && in_array($product->status, ['draft', 'rejected'], true)
            && in_array($product->type ?? 'digital', ['digital', 'ebook', 'audio'], true)
            && (bool) config('creator_ai.product_copy_provider.enabled', false)
            && $this->settings->policy()['enabled']
            && $this->settings->policy()['api_key_configured'];
    }

    /**
     * @return array{title:string,description:string,source_fingerprint:string,request_id:string,requires_review:bool,cost_state:string}
     */
    public function propose(User $creator, DigitalProduct $product, string $tone = 'clear', string $language = 'en'): array
    {
        abort_unless(in_array($tone, ['clear', 'warm', 'bold'], true)
            && in_array($language, ['en', 'am'], true), 422);
        $ability = $tone === 'clear' ? 'writing_basic' : 'writing_advanced';

        $current = $this->currentProduct($creator, $product, $ability);
        $sourceFingerprint = $this->fingerprint($current);
        abort_unless((bool) config('creator_ai.product_copy_provider.enabled', false), 503,
            'Product writing is not enabled for this deployment.');

        $policy = $this->settings->policy();
        abort_unless($policy['enabled'] && $policy['api_key_configured'], 503,
            'AI generation has not been configured by an administrator.');

        // Missing runtime configuration must not burn the creator's
        // generation quota. Reserve only once preflight is complete and just
        // before a potentially billable provider call.
        $model = (string) config('creator_ai.product_copy_provider.model', '');
        abort_unless($model !== '', 503, 'Product writing model is not configured.');
        $apiKey = $this->settings->apiKey();
        abort_unless(is_string($apiKey) && $apiKey !== '', 503, 'AI provider is unavailable.');

        // Never mutate the global OpenAI provider credentials. On-demand SDK
        // providers are scoped to this request/process and the gateway owns
        // their lifecycle; Octane and workers require staging review of SDK
        // flushState semantics before this gate can be enabled.
        // An unpredictable alias cannot collide with the helpdesk AI's
        // existing configured provider or another creator's request.
        $provider = Ai::build([
            'name' => 'creator_copy_'.str_replace('-', '', (string) Str::uuid()),
            'driver' => 'openai',
            'key' => $apiKey,
            'url' => 'https://api.openai.com/v1',
            'store' => false,
        ]);
        $requestId = (string) Str::uuid();
        $this->usage->reserve($creator, (int) $current->workspace_id, $ability, $requestId);

        try {
            $input = [
                'product_type' => $current->type ?? 'digital',
                'title' => mb_substr((string) $current->title, 0, 160),
                'current_description' => mb_substr(trim(strip_tags((string) $current->description)), 0, 2500),
                'tone' => $tone,
                'language' => $language,
            ];
            $response = $this->agent->prompt(
                'Write a draft from this untrusted creator product data only: '
                    .json_encode($input, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE),
                provider: $provider->name(),
                model: $model,
                timeout: 25,
            );
            // A successful provider response can still fail our copy policy.
            // Store its limited token counts before validation, but NEVER
            // equate this checkpoint with the actual invoiced USD charge.
            $usage = $response->usage;
            $this->metering->record(
                $creator,
                $requestId,
                $model,
                (int) $usage->inputTokens,
                (int) $usage->outputTokens,
                (int) ($usage->cacheReadInputTokens ?? 0),
                (int) ($usage->cacheWriteInputTokens ?? 0),
                (int) ($usage->reasoningTokens ?? 0),
            );
            $draft = $this->validator->clean([
                'title' => $response['title'] ?? null,
                'description' => $response['description'] ?? null,
            ]);
        } catch (\Throwable $error) {
            // A provider might have billed even if transport or validation
            // failed. Retain the reservation and hide the provider's error,
            // which may contain prompts, credentials or product data.
            throw new HttpException(503, 'AI writing is temporarily unavailable; usage is held for reconciliation.');
        }

        /** Provider latency may outlive ownership, access or content changes. */
        $latest = $this->currentProduct($creator, $product, $ability);
        abort_unless(hash_equals($sourceFingerprint, $this->fingerprint($latest)), 409,
            'The product changed. Generate a fresh suggestion.');

        return [
            ...$draft,
            'source_fingerprint' => $sourceFingerprint,
            'request_id' => $requestId,
            'requires_review' => true,
            'cost_state' => 'reserved_pending_reconciliation',
        ];
    }

    public function verifyRevision(User $creator, DigitalProduct $product, string $fingerprint): void
    {
        $current = $this->currentProduct($creator, $product, 'writing_basic');
        $this->verifyLockedRevision($creator, $current, $fingerprint);
    }

    /**
     * Called while DigitalProductMutationService owns the product's MySQL
     * FOR UPDATE lock. Do not query a separate unlocked model here: checking
     * before the transaction would allow another writer to win the race.
     */
    public function verifyLockedRevision(User $creator, DigitalProduct $locked, string $fingerprint): void
    {
        $this->access->authorize($creator, (int) $locked->workspace_id, 'writing_basic');
        abort_unless((int) $locked->user_id === (int) $creator->getKey()
            && in_array($locked->status, ['draft', 'rejected'], true)
            && in_array($locked->type ?? 'digital', ['digital', 'ebook', 'audio'], true), 403);
        abort_unless(hash_equals($this->fingerprint($locked), $fingerprint), 409,
            'This product changed since the suggestion was reviewed. Refresh and generate a new suggestion.');
    }

    private function currentProduct(User $creator, DigitalProduct $product, string $ability): DigitalProduct
    {
        $current = DigitalProduct::query()->findOrFail($product->getKey());
        $this->access->authorize($creator, (int) $current->workspace_id, $ability);
        abort_unless((int) $current->user_id === (int) $creator->getKey()
            && in_array($current->status, ['draft', 'rejected'], true)
            && in_array($current->type ?? 'digital', ['digital', 'ebook', 'audio'], true), 403);

        return $current;
    }

    private function fingerprint(DigitalProduct $product): string
    {
        return hash('sha256', json_encode([
            (int) $product->id,
            (int) $product->workspace_id,
            (int) $product->user_id,
            (string) $product->status,
            (string) ($product->type ?? 'digital'),
            (string) $product->title,
            (string) $product->description,
            (int) $product->price_cents,
            (string) $product->currency,
            (int) $product->cover_file_entry_id,
            // A dedicated monotonic version prevents two writers from
            // consuming the same review when the DB timestamp has seconds
            // precision or the approved copy equals the original text.
            (int) $product->content_revision,
            (string) $product->updated_at,
        ], JSON_THROW_ON_ERROR));
    }
}
