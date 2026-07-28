<?php

namespace Common\Users\Controllers;

use Common\Users\Resources\UserResource;
use Common\API\ExcludeRoutesFromPublicDocs;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Auth;

/**
 * @tags Account
 */
#[ExcludeRoutesFromPublicDocs]
class AccountSettingsController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth');
    }

    /**
     * Get account settings.
     *
     * @operationId getAccountSettings
     */
    public function __invoke()
    {
        request()->merge(['fields_preset' => 'account_settings']);
        return new UserResource(Auth::user());
    }
}
