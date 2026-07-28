<?php

namespace Common\Admin;

use App\Models\User;
use Common\Users\Resources\UserResource;
use Common\API\ExcludeRoutesFromPublicDocs;
use Common\Core\Demo\BlockedOnDemoSite;
use Illuminate\Contracts\Auth\StatefulGuard;
use Illuminate\Routing\Controller;
use Laravel\Fortify\LoginRateLimiter;

/**
 * @tags Users
 */
#[ExcludeRoutesFromPublicDocs]
class ImpersonateUserController extends Controller
{
    public function __construct(
        protected StatefulGuard $guard,
        protected LoginRateLimiter $limiter,
    ) {
        $this->middleware('isAdmin');
    }

    /**
     * Impersonate a user.
     *
     * @operationId impersonateUser
     */
    #[BlockedOnDemoSite]
    public function impersonate(int $userId)
    {
        $impersonated = User::findOrFail($userId);

        abort_if(
            $impersonated->id === $this->guard->id(),
            422,
            __('You are already logged in as this user.'),
        );

        $impersonatorId = $this->guard->id();

        $this->guard->logout();
        if (request()->hasSession()) {
            request()->session()->invalidate();
            request()->session()->regenerateToken();
        }

        $this->guard->login($impersonated, true);
        request()->session()->regenerate();
        $this->limiter->clear(request());

        session()->put('impersonator_id', $impersonatorId);

        return new UserResource($impersonated);
    }
}
