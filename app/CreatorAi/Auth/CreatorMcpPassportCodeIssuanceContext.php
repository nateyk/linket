<?php

namespace App\CreatorAi\Auth;

use Closure;

/**
 * Request-scoped context populated ONLY by an explicitly approved Linket
 * browser consent. Passport's auth-code repository refuses to persist a
 * code when no context is set. Reset in finally even after exceptions.
 *
 * The context must not contain plaintext bearer/refresh credentials.
 */
final class CreatorMcpPassportCodeIssuanceContext
{
    /** @var array<string, int|string>|null */
    private ?array $approved = null;

    /**
     * @template TResult
     * @param array<string, int|string> $approved
     * @param Closure():TResult $issue
     * @return TResult
     */
    public function withApprovedGrant(array $approved, Closure $issue): mixed
    {
        abort_if($this->approved !== null, 403, 'Nested OAuth code issuance is forbidden.');

        $this->approved = $approved;

        try {
            return $issue();
        } finally {
            $this->approved = null;
        }
    }

    /** @return array<string, int|string> */
    public function requireApprovedGrant(): array
    {
        abort_unless($this->approved !== null, 403, 'OAuth consent required.');

        return $this->approved;
    }
}
