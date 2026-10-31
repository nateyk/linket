<?php

namespace Common\Files\Uploads;

use Common\Files\FileEntryPayload;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

/**
 * Short-lived, single-use upload grants. All S3 operations must resolve
 * a server-issued grant and must not accept independent client key/owner data.
 */
final class UploadGrant
{
    public function issue(Request $request, array $metadata, string $key, string $strategy, ?string $uploadId = null): string
    {
        $token = Str::random(64);
        cache()->put($this->cacheKey($token), [
            'userId' => (int) $request->user()->id,
            'metadata' => $metadata,
            'key' => $key,
            'strategy' => $strategy,
            'uploadId' => $uploadId,
        ], now()->addHours(2));
        return $token;
    }

    public function resolve(Request $request, string $token, string $strategy, bool $consume = false): array
    {
        abort_unless(preg_match('/^[A-Za-z0-9]{64}$/D', $token) === 1, 403);
        $key = $this->cacheKey($token);
        $grant = cache()->get($key);
        abort_unless(is_array($grant) && $grant['userId'] === (int) $request->user()?->id && $grant['strategy'] === $strategy, 403, 'Upload grant expired or not owned by user.');

        $payload = new FileEntryPayload($grant['metadata']);
        app(SecureUpload::class)->assertAuthorized($request, $payload);

        if ($consume) {
            abort_unless(cache()->pull($key) !== null, 409, 'Upload grant already used.');
        }
        return ['grant' => $grant, 'payload' => $payload];
    }

    private function cacheKey(string $token): string
    {
        return 'secure-upload-grant:' . hash('sha256', $token);
    }
}
