<?php

namespace App\CreatorAi\Auth;

use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;

/**
 * Strict stateless OAuth 2.0 token HTTP adapter. Passport's generic token
 * controller and its other grant types remain unregistered.
 */
final class CreatorMcpOAuthHttpTokenController
{
    public function __construct(
        private readonly CreatorMcpPassportTokenExchange $tokens,
    ) {}

    public function __invoke(Request $request): Response
    {
        $contentType = strtolower(trim(explode(';', (string) $request->header('Content-Type'))[0]));
        if (
            $contentType !== 'application/x-www-form-urlencoded'
            || $request->query->count() !== 0
            || $request->headers->has('Authorization')
            || $request->headers->has('Cookie')
            || strlen($request->getContent()) > 20000
        ) {
            return $this->error('invalid_request');
        }

        // Only form-body fields are accepted. Never derive a creator or
        // workspace from OAuth input, browser cookies or API credentials.
        $fields = $request->request->all();
        $grant = $fields['grant_type'] ?? null;
        if (! is_string($grant)) {
            return $this->error('invalid_request');
        }
        if (! in_array($grant, ['authorization_code', 'refresh_token'], true)) {
            return $this->error('unsupported_grant_type');
        }

        $expected = $grant === 'authorization_code'
            ? ['grant_type', 'client_id', 'code', 'code_verifier', 'redirect_uri', 'resource']
            : ['grant_type', 'client_id', 'refresh_token', 'resource'];
        $actual = array_keys($fields);
        sort($expected);
        sort($actual);

        if ($actual !== $expected) {
            return $this->error('invalid_request');
        }

        foreach ($fields as $value) {
            if (! is_string($value) || $value === '') {
                return $this->error('invalid_request');
            }
        }

        $client = $fields['client_id'];
        $resource = $fields['resource'];
        if (
            ! Str::isUuid($client)
            || strlen($resource) > 2048
            || ! str_starts_with($resource, 'https://')
            || filter_var($resource, FILTER_VALIDATE_URL) === false
        ) {
            return $this->error('invalid_request');
        }

        if ($grant === 'authorization_code') {
            $redirect = $fields['redirect_uri'];
            $parts = strlen($redirect) <= 2048 ? parse_url($redirect) : false;
            if (
                ! is_array($parts)
                || ($parts['scheme'] ?? null) !== 'https'
                || empty($parts['host'])
                || isset($parts['user'])
                || isset($parts['pass'])
                || isset($parts['fragment'])
                || ! preg_match('/\A[A-Za-z0-9._~-]{43,128}\z/D', $fields['code_verifier'])
                || strlen($fields['code']) > 8192
            ) {
                return $this->error('invalid_request');
            }
        } elseif (strlen($fields['refresh_token']) > 8192) {
            return $this->error('invalid_request');
        }

        try {
            $response = $grant === 'authorization_code'
                ? $this->tokens->exchangeAuthorizationCode(
                    $fields['code'],
                    $client,
                    $fields['redirect_uri'],
                    $fields['code_verifier'],
                    $resource,
                )
                : $this->tokens->refresh(
                    $fields['refresh_token'],
                    $client,
                    $resource,
                );
        } catch (HttpExceptionInterface $error) {
            // Do not reveal whether a code, client, refresh token, workspace,
            // subscription or resource was invalid.
            return $error->getStatusCode() === 503
                ? $this->error('temporarily_unavailable', 503)
                : $this->error('invalid_grant');
        }

        return response((string) $response->getBody(), $response->getStatusCode(), [
            ...$this->headers(),
            'Content-Type' => 'application/json; charset=UTF-8',
        ]);
    }

    private function error(string $code, int $status = 400): Response
    {
        return response()->json(['error' => $code], $status, $this->headers());
    }

    /** @return array<string,string> */
    private function headers(): array
    {
        return [
            'Cache-Control' => 'no-store',
            'Pragma' => 'no-cache',
            'Referrer-Policy' => 'no-referrer',
            'X-Content-Type-Options' => 'nosniff',
        ];
    }
}
