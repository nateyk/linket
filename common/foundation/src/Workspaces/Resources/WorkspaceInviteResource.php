<?php

namespace Common\Workspaces\Resources;

use Common\Workspaces\Models\WorkspaceInvite;
use Dedoc\Scramble\Attributes\SchemaName;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin WorkspaceInvite
 */
#[SchemaName('WorkspaceInvite')]
class WorkspaceInviteResource extends JsonResource
{
    public function toArray($request)
    {
        return [
            'id' => $this->id,
            'image' => $this->image,
            'workspace_id' => $this->workspace_id,
            'user_id' => $this->user_id,
            'email' => $this->email,
            'role_id' => $this->role_id,
            'role_name' => $this->role_name,
            'name' => $this->name,
            'model_type' => $this->model_type,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
