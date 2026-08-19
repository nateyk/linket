<?php

namespace Tests\Unit;

use App\Actions\AppBootstrapData;
use Tests\TestCase;

class AppBootstrapDataTest extends TestCase
{
    public function testAuthenticatedUsersEnterThroughTheDashboardIndex(): void
    {
        $bootstrapData = new class extends AppBootstrapData
        {
            public function authRedirectUri(): string
            {
                return $this->getAuthRedirectUri();
            }
        };

        $this->assertSame('/dashboard', $bootstrapData->authRedirectUri());
    }
}
