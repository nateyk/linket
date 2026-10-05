<?php

namespace App\Links\Controllers;

use App\Http\Controllers\LandingPageController;
use App\QrCodes\Controllers\QrCodesController;
use App\Links\Actions\LinkeablePublicPolicy;
use App\Analytics\Actions\LogTrackedEvent;
use App\Entitlements\Entitlements;
use App\Biolinks\Models\Biolink;
use App\Folders\Models\Folder;
use App\Links\Models\Link;
use App\Links\Models\Linkeable;
use Common\Core\AppUrl;
use Common\Core\Rendering\RendersClientSideApp;
use Common\Domains\Actions\MaybeShowCustomDomainsConnectedMessage;
use Illuminate\Http\RedirectResponse;
use Illuminate\Routing\Controller;
use Illuminate\Support\Str;

class FallbackRouteController extends Controller
{
    use RendersClientSideApp;

    const CLIENT_ROUTES = [
        'dashboard',
        'folders',
        'admin',
        'billing',
        'workspace',
        'contact',
        'update',
        'pages',
        'login',
        'register',
        'forgot-password',
        'password',
    ];

    const LINKEABLE_ROUTES = ['qr', 'img', '+'];

    public function __invoke(string $path = '')
    {
        $parts = $this->parsePath($path);

        // if any linkeable matches the url, handle it
        if ($parts) {
            if ($linkeable = $this->findLinkeable($parts['backHalf'])) {
                return $this->handleLinkeable($linkeable, $parts['route']);
            }
        }

        // show custom domain connection message, if needed
        $msgResponse = (new MaybeShowCustomDomainsConnectedMessage())->execute();
        if ($msgResponse) {
            return $msgResponse;
        }

        // show landing page if we are on the root url
        if (!$path || $path === '/') {
            return app(LandingPageController::class)->show();
        }

        // fallback to client side app
        return $this->clientSideResponse();
    }

    protected function findLinkeable(string $backHalf): Linkeable|null
    {
        if ($link = Link::findForRendering($backHalf)) {
            return $link;
        } elseif ($biolink = Biolink::findForRendering($backHalf)) {
            return $biolink;
        } elseif ($folder = Folder::findForRendering($backHalf)) {
            return $folder;
        }

        return null;
    }

    public function handleLinkeable(
        Linkeable $linkeable,
        string|null $route = null,
    ) {
        $linkeable->loadRelationsForRendering();

        if (!app(LinkeablePublicPolicy::class)->isAccessible($linkeable)) {
            abort(403);
        }

        if (!$this->isOwnerPreview($linkeable)) {
            (new LogTrackedEvent())->execute($linkeable);
        }

        if ($route === 'qr' && ($qrCode = $linkeable->qrCode)) {
            return app(QrCodesController::class)->renderQrCode($qrCode);
        }

        if ($route === '+') {
            $uri = match ($linkeable::MODEL_TYPE) {
                Link::MODEL_TYPE => 'links',
                Biolink::MODEL_TYPE => 'biolinks',
                Folder::MODEL_TYPE => 'folders',
            };
            return redirect(url("dashboard/$uri/$linkeable->id"));
        }

        return $this->getLinkeableResponse($linkeable);
    }

    protected function getLinkeableResponse(Linkeable $linkeable)
    {
        $renderType = $linkeable->getRenderType();

        $redirectHeaders = [
            'Cache-Control' => 'no-cache, no-store',
            'Expires' => -1,
        ];

        if ($renderType === Linkeable::RENDER_TYPE_REDIRECT) {
            return new RedirectResponse(
                $linkeable->getFinalDestinationUrl(),
                301,
                $redirectHeaders,
            );
        } elseif ($renderType === Linkeable::RENDER_TYPE_REDIRECT_WITH_DELAY) {
            $data = $linkeable->getFrontendRenderData();
            $data['pixelsEnabled'] = $this->pixelsEnabledForLinkeable($linkeable);
            return response()->view(
                'redirects.direct',
                $data,
                301,
                $redirectHeaders,
            );
        }

        $data = $linkeable->getFrontendRenderData();
        return $this->clientSideOrPrerenderedResponse([
            'loader' => 'linkeablePage',
            // The editor frames this page with ?preview=1 — the crawler
            // prerender is for search/social scrapers, never for that
            // request, even when it arrives with a crawler user agent (A-20).
            'noPrerender' =>
                !!$linkeable->password || request()->boolean('preview'),
            ...$data,
        ]);
    }

    /**
     * The store editor frames this page (?preview=1) for its phone
     * preview; an owner viewing their own draft is not a click. Visitors
     * adding ?preview=1 still count — only the owner's session skips.
     */
    private function isOwnerPreview(Linkeable $linkeable): bool
    {
        if (!request()->boolean('preview') || !auth()->check()) {
            return false;
        }

        $ownerId = $linkeable->workspace_id
            ? \DB::table('workspaces')->where('id', $linkeable->workspace_id)->value('owner_id')
            : $linkeable->user_id;

        return $ownerId && (int) $ownerId === (int) auth()->id();
    }

    private function pixelsEnabledForLinkeable(Linkeable $linkeable): bool
    {
        $ownerId = $linkeable->workspace_id
            ? \DB::table('workspaces')->where('id', $linkeable->workspace_id)->value('owner_id')
            : $linkeable->user_id;
        $owner = $ownerId ? \App\Models\User::find($ownerId) : null;

        return $owner
            ? app(Entitlements::class)->enabled(
                $owner,
                'tracking_pixels_enabled',
            )
            : true;
    }

    protected function parsePath(string $path = ''): array|null
    {
        $host = request()->getHost();
        if (
            settings('links.subdomain_matching') &&
            !app(AppUrl::class)->envAndCurrentHostsAreEqual &&
            substr_count($host, '.') >= 2 &&
            (!$path || in_array($path, self::LINKEABLE_ROUTES))
        ) {
            return [
                'backHalf' => explode('.', $host)[0],
                'route' => $path,
            ];
        }

        if ($path) {
            $parts = explode('/', $path);
            // site.com/kd02lk+
            if (Str::endsWith($path, '+')) {
                $parts[0] = rtrim($parts[0], '+');
                $parts[1] = '+';
            }
            if (!$this->isClientRoute($parts)) {
                return [
                    'backHalf' => $parts[0],
                    'route' => $parts[1] ?? null,
                ];
            }
        }

        return null;
    }

    protected function isClientRoute(array $parts): bool
    {
        if (
            count($parts) === 2 &&
            in_array($parts[1], self::LINKEABLE_ROUTES)
        ) {
            return false;
        }

        return count($parts) != 1 || in_array($parts[0], self::CLIENT_ROUTES);
    }
}
