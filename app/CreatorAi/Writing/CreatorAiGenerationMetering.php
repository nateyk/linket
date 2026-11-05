<?php

namespace App\CreatorAi\Writing;

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use InvalidArgumentException;

/**
 * Audit-only usage checkpoint: provider token counts are evidence of usage,
 * NOT evidence of a charged price. There is deliberately no public route
 * and this class never settles/refunds the financial budget.
 */
final class CreatorAiGenerationMetering
{
    public function record(
        User $creator,
        string $requestId,
        string $model,
        int $inputTokens,
        int $outputTokens,
        int $cachedInputTokens = 0,
        int $cacheWriteTokens = 0,
        int $reasoningTokens = 0,
    ): void {
        if (! Str::isUuid($requestId)
            || preg_match('/^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/D', $model) !== 1) {
            throw new InvalidArgumentException('Invalid generation identity or model.');
        }

        if ($inputTokens < 0 || $outputTokens < 0 || $cachedInputTokens < 0
            || $cacheWriteTokens < 0 || $reasoningTokens < 0
            || $cachedInputTokens + $cacheWriteTokens > $inputTokens
            || $reasoningTokens > $outputTokens
            || $inputTokens > 10000000 || $outputTokens > 10000000) {
            throw new InvalidArgumentException('Invalid provider token counts.');
        }

        DB::transaction(function () use (
            $creator, $requestId, $model, $inputTokens, $outputTokens,
            $cachedInputTokens, $cacheWriteTokens, $reasoningTokens
        ): void {
            // Use the same creator -> attempt lock order as settlement.
            $owner = DB::table('users')->where('id', $creator->getKey())
                ->lockForUpdate()->first(['id']);
            abort_unless($owner, 404);
            $attempt = DB::table('creator_ai_generation_attempts')
                ->where('request_id', $requestId)->lockForUpdate()->first();
            abort_unless($attempt && (int) $attempt->creator_id === (int) $creator->getKey(), 404);
            abort_unless($attempt->status === 'reserved' && $attempt->provider === 'openai', 409);

            $same = [
                'provider_model' => $model,
                'input_tokens' => $inputTokens,
                'output_tokens' => $outputTokens,
                'cached_input_tokens' => $cachedInputTokens,
                'cache_write_input_tokens' => $cacheWriteTokens,
                'reasoning_tokens' => $reasoningTokens,
            ];
            $prior = DB::table('creator_ai_generation_metering')
                ->where('request_id', $requestId)->lockForUpdate()->first();

            if ($prior) {
                foreach ($same as $column => $value) {
                    abort_unless(
                        $column === 'provider_model' ? $prior->$column === $value : (int) $prior->$column === $value,
                        409,
                        'Provider usage checkpoint cannot be overwritten.'
                    );
                }

                return;
            }

            DB::table('creator_ai_generation_metering')->insert([
                'request_id' => $requestId,
                ...$same,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }, 3);
    }
}
