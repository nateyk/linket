<?php

namespace App\Storefront\Controllers;

use App\Storefront\Models\WorkspacePayoutConfig;
use App\Storefront\Resources\WorkspacePayoutConfigResource;
use Common\Workspaces\Models\Workspace;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Gate;

class WorkspacePayoutConfigController extends Controller
{
    public function show(int $workspaceId): WorkspacePayoutConfigResource
    {
        Gate::authorize('show', Workspace::findOrFail($workspaceId));

        $config = WorkspacePayoutConfig::query()
            ->where('workspace_id', $workspaceId)
            ->first();

        $config ??= new WorkspacePayoutConfig([
            'workspace_id' => $workspaceId,
            'withdrawal_method_id' => null,
            'withdrawal_account' => '',
        ]);

        return new WorkspacePayoutConfigResource($config);
    }

    public function update(Request $request, int $workspaceId): WorkspacePayoutConfigResource
    {
        Gate::authorize('update', Workspace::findOrFail($workspaceId));

        $data = $request->validate([
            'withdrawal_method_id' => 'required|integer|exists:digital_product_withdrawal_methods,id',
            'withdrawal_account' => 'required|string|max:500',
        ]);

        $config = WorkspacePayoutConfig::updateOrCreate(
            ['workspace_id' => $workspaceId],
            $data
        );

        return new WorkspacePayoutConfigResource($config);
    }
}
