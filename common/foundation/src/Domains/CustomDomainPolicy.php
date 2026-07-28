<?php

namespace Common\Domains;

use Common\Workspaces\Policies\WorkspacedResourcePolicy;

class CustomDomainPolicy extends WorkspacedResourcePolicy
{
    protected string $resource = CustomDomain::class;
}
