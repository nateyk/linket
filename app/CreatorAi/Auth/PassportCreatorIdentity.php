<?php

namespace App\CreatorAi\Auth;

use Common\Auth\Models\BaseUser;
use Laravel\Passport\Contracts\OAuthenticatable;
use Laravel\Passport\HasApiTokens as PassportHasApiTokens;

/**
 * An OAuth-only Eloquent view of the same user row.
 *
 * Linket's App\Models\User deliberately retains Sanctum HasApiTokens.
 * Do NOT mix Sanctum and Passport token traits on one PHP class: they
 * declare incompatible token relationships and access-token properties.
 * Always resolve authenticated OAuth identity into the existing creator
 * policy layer, not into a separate set of entitlements.
 */
final class PassportCreatorIdentity extends BaseUser implements OAuthenticatable
{
    use PassportHasApiTokens;

    protected $table = 'users';
}
