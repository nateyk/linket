<?php

namespace App\QrCodes\Policies;

use App\QrCodes\Models\QrCode;
use Common\Workspaces\Policies\WorkspacedResourcePolicy;

class QrCodePolicy extends WorkspacedResourcePolicy
{
    protected string $resource = QrCode::class;
}
