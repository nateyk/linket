<?php

namespace App\CreatorAi\Auth;

use App\Models\User;
use Common\Workspaces\Models\Workspace;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Laravel\Passport\Passport;
use Symfony\Component\HttpFoundation\Response;

/**
 * Default-OFF browser-only consent. Never call Passport's built-in consent
 * controller, which can reuse pre-existing scope grants without Linket's
 * one-workspace approval.
 *
 * No OAuth access or refresh credentials are returned by these routes.
 */
final class CreatorMcpOAuthHttpConsentController
{
    public function __construct(
        private readonly CreatorMcpOAuthAuthorizationPolicy $policy,
        private readonly CreatorMcpOAuthConsentFlow $consent,
    ) {}

    public function authorize(Request $request): Response
    {
        $creator = Auth::guard('web')->user();
        abort_unless($creator instanceof User, 401);

        // Only validated, registered client metadata and original OAuth
        // parameters are persisted in the creator's own short-lived session.
        $parameters = $this->policy->validate($request->query());
        $pending = $this->consent->begin($request, $parameters);
        $client = Passport::client()->newQuery()->findOrFail($parameters['client_id']);

        $workspaces = Workspace::query()
            ->forUser((int) $creator->getKey())
            ->orderBy('name')
            ->limit(50)
            ->get(['id', 'name']);

        return response()->view('creator-ai.oauth-consent', [
            'clientName' => $client->name,
            'nonce' => $pending['nonce'],
            'workspaces' => $workspaces,
        ])->withHeaders($this->privateHeaders());
    }

    public function approve(Request $request): Response
    {
        $nonce = $request->input('nonce');
        $workspaceId = $request->input('workspace_id');

        abort_unless(
            is_string($nonce) && strlen($nonce) === 48
            && (is_string($workspaceId) || is_int($workspaceId))
            && ctype_digit((string) $workspaceId)
            && (int) $workspaceId > 0,
            403,
        );

        // This service revalidates the original OAuth params and the user's
        // current verified-Pro/workspace membership, consumes the nonce, then
        // issues the ACTUAL Passport/League authorization code in a transaction.
        $passport = app(CreatorMcpPassportCodeIssuer::class)->complete($request, $nonce, (int) $workspaceId);

        abort_unless($passport->getStatusCode() === 302, 503);

        $location = $passport->getHeaderLine('Location');
        abort_unless(
            $location !== '' && str_starts_with($location, 'https://'),
            503,
        );

        return response('', 302, [
            ...$this->privateHeaders(),
            'Location' => $location,
        ]);
    }

    public function deny(Request $request): Response
    {
        $nonce = $request->input('nonce');
        abort_unless(is_string($nonce) && strlen($nonce) === 48, 403);

        $this->consent->deny($request, $nonce);

        // Do not put client-supplied state or arbitrary return URLs into a
        // denial redirect. The denial page is an ordinary no-store response.
        return response('Connection denied', 200, $this->privateHeaders());
    }

    /** @return array<string,string> */
    private function privateHeaders(): array
    {
        return [
            'Cache-Control' => 'no-store',
            'Pragma' => 'no-cache',
            'Referrer-Policy' => 'no-referrer',
            'X-Content-Type-Options' => 'nosniff',
            'Content-Security-Policy' => "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'",
        ];
    }
}
