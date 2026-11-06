<?php

namespace App\CreatorAi\Auth;

use App\Models\User;
use Illuminate\Contracts\Events\Dispatcher;
use Laravel\Passport\Bridge\AccessTokenRepository as PassportAccessTokenRepository;
use League\OAuth2\Server\Entities\AccessTokenEntityInterface;
use League\OAuth2\Server\Entities\ClientEntityInterface;

/**
 * Passport's singleton AuthorizationServer retains this repository across
 * Laravel request lifecycles. Resolve a NEW scoped context on each operation;
 * never persist stale creator/connection data in a repository instance.
 * On a strictly scoped Linket OAuth exchange, persist + bind the token ID
 * within the same transaction. Ordinary Passport token issuance is unchanged.
 */
final class CreatorMcpPassportAccessTokenRepository extends PassportAccessTokenRepository
{
    public function __construct(
        Dispatcher $events,
        private readonly CreatorMcpPassportTokenBindings $bindings,
    ) {
        parent::__construct($events);
    }

    public function getNewToken(
        ClientEntityInterface $clientEntity,
        array $scopes,
        ?string $userIdentifier = null
    ): AccessTokenEntityInterface {
        $grant = app(CreatorMcpPassportTokenIssuanceContext::class)->current();

        if ($grant === null) {
            return parent::getNewToken($clientEntity, $scopes, $userIdentifier);
        }

        $scopeNames = array_map(static fn ($scope): string => $scope->getIdentifier(), $scopes);
        abort_unless(
            $userIdentifier !== null
            && $userIdentifier === (string) $grant['creator_id']
            && $clientEntity->getIdentifier() === $grant['oauth_client_id']
            && $scopeNames === ['mcp:use'],
            403,
            'OAuth token does not match approved workspace consent.',
        );

        return new CreatorMcpPassportAccessToken($userIdentifier, $scopes, $clientEntity);
    }

    public function persistNewAccessToken(AccessTokenEntityInterface $accessToken): void
    {
        parent::persistNewAccessToken($accessToken);

        $grant = app(CreatorMcpPassportTokenIssuanceContext::class)->current();
        if ($grant === null) {
            return;
        }

        abort_unless(
            $accessToken instanceof CreatorMcpPassportAccessToken
            && $accessToken->getUserIdentifier() === (string) $grant['creator_id']
            && $accessToken->getClient()->getIdentifier() === $grant['oauth_client_id'],
            403,
        );

        $user = User::query()->find($grant['creator_id']);
        abort_unless($user instanceof User, 403);

        $this->bindings->bindIssuedAccessToken(
            $user,
            $grant['connection_id'],
            $grant['oauth_client_id'],
            $accessToken->getIdentifier(),
            $grant['resource'],
        );
    }
}
