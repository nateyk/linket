<?php

namespace App\CreatorAi\Auth;

use Closure;

/**
 * Request-scoped and short-lived. Set only by the trusted code/refresh exchange
 * after verifying the original Passport code or refresh token and Linket grant.
 * Never accept this context from an HTTP body or model tool arguments.
 */
final class CreatorMcpPassportTokenIssuanceContext
{
    /** @var array{connection_id:string,creator_id:int,oauth_client_id:string,resource:string}|null */
    private ?array $grant = null;

    /** @param array{connection_id:string,creator_id:int,oauth_client_id:string,resource:string} $grant */
    public function withGrant(array $grant, Closure $callback): mixed
    {
        abort_unless($this->grant === null, 403);

        $this->grant = $grant;
        try {
            return $callback();
        } finally {
            $this->grant = null;
        }
    }

    /** @return array{connection_id:string,creator_id:int,oauth_client_id:string,resource:string}|null */
    public function current(): ?array
    {
        return $this->grant;
    }
}
