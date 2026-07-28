<?php

namespace Common\Core\Policies;

enum PolicyFailReason: string
{
    case NO_PERMISSION = 'noPermission';
    case NO_WORKSPACE_PERMISSION = 'noWorkspacePermission';
    case OVER_QUOTA = 'overQuota';
}
