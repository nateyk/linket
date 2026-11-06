<?php

namespace App\CreatorAi\Auth;

use DateTimeImmutable;
use Laravel\Passport\Bridge\AccessToken;
use Lcobucci\JWT\Configuration;
use Lcobucci\JWT\Signer\Key\InMemory;
use Lcobucci\JWT\Signer\Rsa\Sha256;
use League\OAuth2\Server\CryptKeyInterface;

/**
 * Only used inside a validated Linket MCP issuance context. Standard Passport
 * tokens for unrelated integrations retain their existing serialization.
 * OAuth aud[0] stays client ID for compatibility with League/Passport;
 * aud[1] is the exact, consented OAuth resource indicator.
 */
final class CreatorMcpPassportAccessToken extends AccessToken
{
    private CryptKeyInterface $linketPrivateKey;

    public function setPrivateKey(CryptKeyInterface $privateKey): void
    {
        $this->linketPrivateKey = $privateKey;
        parent::setPrivateKey($privateKey);
    }

    public function toString(): string
    {
        $issuer = config('creator_ai.oauth_issuer');
        $resource = config('creator_ai.mcp_resource_url');

        abort_unless(
            is_string($issuer) && str_starts_with($issuer, 'https://')
            && is_string($resource) && str_starts_with($resource, 'https://'),
            503,
        );

        $key = $this->linketPrivateKey;
        $config = Configuration::forAsymmetricSigner(
            new Sha256,
            InMemory::plainText($key->getKeyContents(), $key->getPassPhrase() ?? ''),
            InMemory::plainText('unneeded-public-verification-key'),
        );
        $now = new DateTimeImmutable;

        $scopes = array_map(
            static fn ($scope): string => $scope->getIdentifier(),
            $this->getScopes(),
        );

        return $config->builder()
            ->issuedBy($issuer)
            ->permittedFor($this->getClient()->getIdentifier(), $resource)
            ->identifiedBy($this->getIdentifier())
            ->issuedAt($now)
            ->canOnlyBeUsedAfter($now)
            ->expiresAt($this->getExpiryDateTime())
            ->relatedTo((string) $this->getUserIdentifier())
            ->withClaim('scopes', $scopes)
            ->getToken($config->signer(), $config->signingKey())
            ->toString();
    }
}
