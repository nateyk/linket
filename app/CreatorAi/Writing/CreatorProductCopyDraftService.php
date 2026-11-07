<?php

namespace App\CreatorAi\Writing;

use App\CreatorAi\Services\CreatorAiAccess;
use App\CreatorAi\Services\CreatorAiSettings;
use App\CreatorAi\Services\CreatorAiUsageService;
use App\Models\User;
use App\Storefront\Models\DigitalProduct;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Validation\ValidationException;
use Laravel\Ai\Ai;
use PromptPHP\Intercept\InjectionGuard\Exceptions\PromptInjectionGuardException;
use PromptPHP\Intercept\PIIRedactor\Exceptions\PIIRedactorException;
use PromptPHP\Intercept\Support\Exceptions\InterceptException;
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
     * @return array<string, mixed>
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
            if ($error instanceof ValidationException
                || $error instanceof AuthenticationException
                || $error instanceof HttpResponseException) {
                throw $error;
            }
            if ($intercept = $this->interceptBlockedMessage($error)) {
                $this->usage->fail($creator, $requestId);

                throw new HttpException(422, $intercept);
            }
            // A provider might have billed even if transport or validation
            // failed. Retain the reservation and hide the provider's error,
            // which may contain prompts, credentials or product data.
            throw new HttpException(503, 'AI writing is temporarily unavailable; usage is held for reconciliation.');
        }

        return DB::transaction(function () use ($creator, $product, $ability, $sourceFingerprint, $requestId, $draft): array {
            $latest = DigitalProduct::query()->whereKey($product->getKey())->lockForUpdate()->firstOrFail();
            $this->currentProduct($creator, $latest, $ability);
            abort_unless(hash_equals($sourceFingerprint, $this->fingerprint($latest)), 409,
                'The product changed. Generate a fresh suggestion.');
            DB::table('creator_ai_copy_drafts')->insert([
                'id' => $requestId,
                'creator_id' => $creator->getKey(),
                'workspace_id' => $latest->workspace_id,
                'digital_product_id' => $latest->id,
                'source_fingerprint' => $sourceFingerprint,
                'state' => 'proposed',
                'version' => 0,
                'encrypted_content' => Crypt::encryptString(json_encode([...$draft, 'generated_description' => $draft['description']], JSON_THROW_ON_ERROR)),
                'expires_at' => now()->addDays(7),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            return [...$draft, 'draft_id' => $requestId, 'draft_version' => 0, 'state' => 'proposed',
                'source_fingerprint' => $sourceFingerprint, 'request_id' => $requestId,
                'requires_review' => true, 'cost_state' => 'reserved_pending_reconciliation'];
        });
    }

    /** @return array<string, mixed> */
    public function read(User $creator, DigitalProduct $product, ?string $id = null): array
    {
        return DB::transaction(function () use ($creator, $product, $id): array {
            $locked = $this->lockOwnedProduct($creator, $product);
            $query = $this->draftQuery($creator, $locked);
            if ($id === null) {
                $row = $query->whereIn('state', ['proposed', 'reviewed', 'expired', 'invalidated'])
                    ->latest('created_at')->orderByDesc('id')->lockForUpdate()->first();
            } else {
                $row = $query->where('id', $id)->lockForUpdate()->first();
                abort_unless($row, 404);
            }
            if (! $row) {
                return [];
            }
            $this->refreshState($row, $locked);

            return $this->serialize($row);
        });
    }

    /** @return array<string, mixed> */
    public function review(User $creator, DigitalProduct $product, string $id, int $version, string $description, bool $discard = false): array
    {
        return DB::transaction(function () use ($creator, $product, $id, $version, $description, $discard): array {
            $locked = $this->lockOwnedProduct($creator, $product);
            $row = $this->draftQuery($creator, $locked)->where('id', $id)->lockForUpdate()->first();
            abort_unless($row, 404);
            $content = $this->serialize($row);
            if ($discard && $row->state === 'discarded') {
                return $content;
            }
            if (! $discard && $row->state === 'reviewed' && (int) $row->version === $version + 1
                && $content['description'] === trim($description)) {
                return $content;
            }
            abort_unless((int) $row->version === $version && ! in_array($row->state, ['applied', 'discarded'], true), 409,
                'This draft changed in another tab. Your text is preserved; reopen the saved draft.');
            if ($discard) {
                $row->state = 'discarded';
            } else {
                $safe = $this->validator->clean(['title' => $content['title'], 'description' => $description]);
                $row->encrypted_content = Crypt::encryptString(json_encode([...$safe, 'generated_description' => $content['generated_description'] ?? $content['description']], JSON_THROW_ON_ERROR));
                $row->state = 'reviewed';
                $this->refreshState($row, $locked);
            }
            $row->version++;
            DB::table('creator_ai_copy_drafts')->where('id', $id)->update([
                'state' => $row->state, 'version' => $row->version,
                'encrypted_content' => $row->encrypted_content, 'updated_at' => now(),
            ]);

            return $this->serialize($row);
        });
    }

    /** The caller owns the product lock and transaction. Returns true for an identical committed retry.
     * @param array<string, mixed> $data
     */
    public function prepareApply(User $creator, DigitalProduct $product, array $data): bool
    {
        $this->authorizeOwner($creator, $product);
        $row = $this->draftQuery($creator, $product)->where('id', $data['ai_copy_draft_id'])->lockForUpdate()->first();
        abort_unless($row, 404);
        abort_unless((int) $row->version === (int) $data['ai_copy_draft_version']
            && hash_equals($row->source_fingerprint, $data['ai_copy_source_fingerprint']), 409);
        if ($row->state === 'applied') {
            abort_unless(hash_equals($row->applied_payload_hash, $this->payloadHash($data))
                && (int) $product->content_revision === (int) $row->applied_product_revision, 409,
                'This product changed after the draft was applied. Refresh before saving again.');

            return true;
        }
        abort_unless($row->state === 'reviewed' && now()->lt($row->expires_at), 409,
            'This draft is no longer available to apply. Your private text is preserved.');
        abort_unless($this->serialize($row)['description'] === ($data['description'] ?? null), 409,
            'Review and save the edited suggestion before applying it.');
        $this->verifyLockedRevision($creator, $product, $row->source_fingerprint);

        return false;
    }

    /** @param array<string, mixed> $data */
    public function finishApply(DigitalProduct $product, array $data): void
    {
        DB::table('creator_ai_copy_drafts')->where('id', $data['ai_copy_draft_id'])->update([
            'state' => 'applied', 'applied_product_revision' => $product->content_revision,
            'applied_payload_hash' => $this->payloadHash($data), 'updated_at' => now(),
        ]);
    }

    /** @param array<string, mixed> $data */
    private function payloadHash(array $data): string
    {
        ksort($data);

        return hash('sha256', json_encode($data, JSON_THROW_ON_ERROR));
    }

    private function authorizeOwner(User $creator, DigitalProduct $product): void
    {
        abort_unless((int) $product->user_id === (int) $creator->getKey(), 404);
        $this->access->authorize($creator, (int) $product->workspace_id, 'writing_basic');
    }

    private function lockOwnedProduct(User $creator, DigitalProduct $product): DigitalProduct
    {
        $locked = DigitalProduct::query()->whereKey($product->getKey())->lockForUpdate()->firstOrFail();
        $this->authorizeOwner($creator, $locked);

        return $locked;
    }

    private function draftQuery(User $creator, DigitalProduct $product): \Illuminate\Database\Query\Builder
    {
        return DB::table('creator_ai_copy_drafts')->where('creator_id', $creator->getKey())
            ->where('workspace_id', $product->workspace_id)->where('digital_product_id', $product->id);
    }

    private function refreshState(object $row, DigitalProduct $product): void
    {
        if (! in_array($row->state, ['proposed', 'reviewed'], true)) {
            return;
        }
        if (now()->gte($row->expires_at)) {
            $row->state = 'expired';
        } elseif (! hash_equals($row->source_fingerprint, $this->fingerprint($product))) {
            $row->state = 'invalidated';
        }
        DB::table('creator_ai_copy_drafts')->where('id', $row->id)->update(['state' => $row->state]);
    }

    /** @return array<string, mixed> */
    private function serialize(object $row): array
    {
        return [...json_decode(Crypt::decryptString($row->encrypted_content), true, 512, JSON_THROW_ON_ERROR),
            'draft_id' => $row->id, 'draft_version' => (int) $row->version, 'state' => $row->state,
            'source_fingerprint' => $row->source_fingerprint];
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

    /**
     * Laravel AI may wrap the original throwable; unwrap the chain so a local
     * Intercept block before the provider still maps to HTTP 422 + fail().
     */
    private function interceptBlockedMessage(\Throwable $error): ?string
    {
        $current = $error;

        for ($depth = 0; $depth < 16 && $current !== null; $depth++) {
            if ($current instanceof PromptInjectionGuardException) {
                return 'This suggestion request could not be sent because it looks like it contains unsafe instructions.';
            }
            if ($current instanceof PIIRedactorException) {
                return 'This suggestion request could not be sent because it appears to contain sensitive data that must not be processed here.';
            }
            if ($current instanceof InterceptException) {
                return 'This suggestion request could not be sent for automated safety review.';
            }
            $current = $current->getPrevious();
        }

        return null;
    }
}
