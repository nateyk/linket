<?php

namespace Common\Core\Middleware;

use Common\Domains\CustomDomainsController;
use Illuminate\Http\Middleware\TrustHosts as Middleware;

class TrustHosts extends Middleware
{
    public function hosts(): array
    {
        return [$this->allSubdomainsOfApplicationUrl()];
    }

    protected function shouldSpecifyTrustedHosts(): bool
    {
        // allow custom domain validation
        if (
            request()->path() ===
            CustomDomainsController::VALIDATE_CUSTOM_DOMAIN_PATH
        ) {
            return false;
        } else {
            return parent::shouldSpecifyTrustedHosts();
        }
    }
}
