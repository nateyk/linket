<?php

namespace App\CreatorAi\Auth;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Laravel\Passport\Bridge\User as PassportBridgeUser;
use League\OAuth2\Server\AuthorizationServer;
use League\OAuth2\Server\Entities\ScopeEntityInterface;
use Nyholm\Psr7\Response;
use Nyholm\Psr7\ServerRequest;
use Psr\Http\Message\ResponseInterface;

/**
 * Internal actual Passport authorization-code issuance after a fresh, explicit
 * Linket creator/workspace consent. This class must NOT be exposed directly
 * by an HTTP route while token exchange, client registration, refresh
 * rotation and JWT issuer/resource audience validation remain unreviewed.
 *
 * Unlike Passport's built-in AuthorizationController, it NEVER calls
 * skipsAuthorization()/hasGrantedScopes() to auto-approve prior scopes.
 */
final class CreatorMcpPassportCodeIssuer
{
    public function __construct(
        private readonly CreatorMcpOAuthConsentFlow $consent,
        private readonly CreatorMcpOAuthAuthorizationPolicy $policy,
        private readonly CreatorMcpPassportCodeIssuanceContext $context,
    ) {}

    public function complete(Request $browser, string $nonce, int $workspaceId): ResponseInterface
    {
        // Passport and Linket's consent metadata must use one DB connection
        // for atomic commit/rollback, including after the issuing hook fails.
        $passportConnection = config('passport.connection');
        abort_unless(
            $passportConnection === null || $passportConnection === config('database.default'),
            503,
            'MCP OAuth storage must share one transactional database.',
        );

        return DB::transaction(function () use ($browser, $nonce, $workspaceId): ResponseInterface {
            $approved = $this->consent->approve($browser, $nonce, $workspaceId);
            $creator = Auth::guard('web')->user();
            abort_unless($creator instanceof User && $creator->exists, 401);

            // Rebuild from server-validated ORIGINAL parameters, never from
            // POST-supplied redirect, client, scopes or workspace arguments.
            $parameters = $this->policy->validate($approved['authorization']);
            $request = (new ServerRequest(
                'GET',
                rtrim((string) config('app.url'), '/').'/oauth/authorize',
            ))->withQueryParams($parameters);

            // This IS Passport/League's actual authorization-code and PKCE
            // validation, not a hand-rolled substitute.
            $server = app(AuthorizationServer::class);
            $authorization = $server->validateAuthorizationRequest($request);
            $scopes = array_map(
                static fn (ScopeEntityInterface $scope): string => $scope->getIdentifier(),
                $authorization->getScopes(),
            );

            abort_unless(
                $authorization->getGrantTypeId() === 'authorization_code'
                && $authorization->getClient()->getIdentifier() === $parameters['client_id']
                && $authorization->getRedirectUri() === $parameters['redirect_uri']
                && $authorization->getCodeChallenge() === $parameters['code_challenge']
                && $authorization->getCodeChallengeMethod() === 'S256'
                && $authorization->getState() === $parameters['state']
                && $scopes === ['mcp:use'],
                403,
                'Passport authorization does not match the approved workspace consent.',
            );

            $authorization->setUser(new PassportBridgeUser((string) $creator->getKey()));
            $authorization->setAuthorizationApproved(true);

            // The custom Passport AuthCodeRepository persists the REAL
            // oauth_auth_codes row and its exact grant link in this transaction.
            return $this->context->withApprovedGrant([
                'connection_id' => $approved['connection']['id'],
                'creator_id' => (int) $creator->getKey(),
                'oauth_client_id' => $parameters['client_id'],
                'resource' => $parameters['resource'],
                'redirect_uri' => $parameters['redirect_uri'],
                'code_challenge' => $parameters['code_challenge'],
            ], fn (): ResponseInterface => $server->completeAuthorizationRequest(
                $authorization,
                new Response,
            ));
        }, 3);
    }
}
