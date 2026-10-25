<?php

namespace Livechat\Widget\Middleware;

use Closure;
use Common\Core\Rendering\CrawlerDetector;
use Illuminate\Contracts\Auth\Factory as AuthFactory;
use Illuminate\Contracts\Auth\Middleware\AuthenticatesRequests;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Livechat\Widget\Users\ResolveWidgetCustomer;

class AuthenticateWidget implements AuthenticatesRequests
{
    public const widgetCustomerKey = 'lcWidgetCustomerId';

    public function __construct(protected AuthFactory $auth) {}

    public function handle(Request $request, Closure $next, ...$guards)
    {
        $this->authenticate($request, $guards);

        return $next($request);
    }

    protected function authenticate(Request $request, array $guards)
    {
        $mainSessionUserId = Auth::id();
        config()->set('sanctum.guard', ['chatWidget']);
        config()->set('auth.defaults.guard', 'chatWidget');

        if ((new CrawlerDetector())->isCrawler()) {
            $this->unauthenticated($request, $guards);
            return;
        }

        (new ResolveWidgetCustomer())->execute($mainSessionUserId);

        if (!auth('chatWidget')->check()) {
            $this->unauthenticated($request, $guards);
        }

        $user = auth('chatWidget')->user();

        if (!$user->relationLoaded('roles') || $user->roles->isEmpty()) {
            // make sure guest role permissions are inherited
            $user->setRelation('roles', collect([app('guestRole')]));
        }
    }

    protected function unauthenticated()
    {
        abort(401);
    }
}
