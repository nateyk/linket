<?php

namespace Common\Auth\Controllers;

use Common\Auth\Fortify\ValidateLoginCredentials;
use Common\Core\Bootstrap\MobileBootstrapData;
use Common\API\ExcludeRoutesFromPublicDocs;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Auth;
use Laravel\Fortify\Contracts\CreatesNewUsers;
use Laravel\Fortify\Contracts\EmailVerificationNotificationSentResponse;
use Laravel\Fortify\Contracts\RegisterResponse;
use Laravel\Fortify\Fortify;

#[ExcludeRoutesFromPublicDocs]
class MobileAuthController extends Controller
{
    public function login(Request $request)
    {
        $request->validate([
            Fortify::username() => 'required|string',
            'password' => 'required|string',
            'token_name' => 'required|string|min:3|max:100',
        ]);

        $validator = app(ValidateLoginCredentials::class);
        $user = $validator->execute($request);

        if (!$user) {
            $validator->throwFailedAuthenticationException(
                $request,
                trans('auth.failed'),
            );
        }

        if (settings('single_device_login')) {
            Auth::logoutOtherDevices($request->get('password'));
        }

        Auth::login($user);

        $bootstrapData = app(MobileBootstrapData::class)
            ->init()
            ->refreshToken($request->get('token_name'))
            ->get();

        return response()->json($bootstrapData);
    }

    public function register(
        Request $request,
        CreatesNewUsers $creator,
    ): RegisterResponse {
        event(new Registered(($user = $creator->create($request->all()))));

        Auth::login($user);

        return app(RegisterResponse::class);
    }

    public function sendEmailVerificationNotification()
    {
        $this->middleware('auth');

        if (request()->user()->hasVerifiedEmail()) {
            return request()->wantsJson()
                ? new JsonResponse('', 204)
                : redirect()->intended(
                    Fortify::redirects('email-verification'),
                );
        }

        request()->user()->sendEmailVerificationNotification();

        return app(EmailVerificationNotificationSentResponse::class);
    }
}
