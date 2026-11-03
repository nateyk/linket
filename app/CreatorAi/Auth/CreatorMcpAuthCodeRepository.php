<?php

namespace App\CreatorAi\Auth;

use DateTimeZone;
use Illuminate\Support\Facades\DB;
use Laravel\Passport\Bridge\AuthCodeRepository as PassportAuthCodeRepository;
use League\OAuth2\Server\Entities\AuthCodeEntityInterface;

/**
 * Keep League/Passport responsible for issuing cryptographically protected
 * codes. Persist a code-to-workspace relationship in the same DB transaction
 * and forbid standalone Passport code issuance without Linket consent.
 */
final class CreatorMcpAuthCodeRepository extends PassportAuthCodeRepository
{
    public function __construct(
        private readonly CreatorMcpPassportCodeIssuanceContext $context,
    ) {}

    public function persistNewAuthCode(AuthCodeEntityInterface $code): void
    {
        $approved = $this->context->requireApprovedGrant();
        $scopes = array_map(static fn ($scope): string => $scope->getIdentifier(), $code->getScopes());

        abort_unless(
            $code->getUserIdentifier() !== null
            && (string) $code->getUserIdentifier() === (string) $approved['creator_id']
            && $code->getClient()->getIdentifier() === $approved['oauth_client_id']
            && $code->getRedirectUri() === $approved['redirect_uri']
            && $scopes === ['mcp:use'],
            403,
            'OAuth code is not associated with this consent.',
        );

        // The caller wraps both insertions in one database transaction.
        // A failing binding insert rolls back the Passport code as well.
        parent::persistNewAuthCode($code);

        DB::table('creator_ai_mcp_oauth_code_bindings')->insert([
            'auth_code_id' => $code->getIdentifier(),
            'connection_id' => $approved['connection_id'],
            'creator_id' => $approved['creator_id'],
            'oauth_client_id' => $approved['oauth_client_id'],
            'resource' => $approved['resource'],
            'redirect_uri' => $approved['redirect_uri'],
            'code_challenge' => $approved['code_challenge'],
            'expires_at' => $code->getExpiryDateTime()
                ->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s'),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }
}
