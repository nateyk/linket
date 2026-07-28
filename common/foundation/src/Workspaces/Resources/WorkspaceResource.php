<?php

namespace Common\Workspaces\Resources;

use Common\Workspaces\Models\Workspace;
use Dedoc\Scramble\Attributes\SchemaName;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Workspace
 */
#[SchemaName('Workspace')]
class WorkspaceResource extends JsonResource
{
    public function toArray($request)
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'image' => $this->image,
            'is_personal' => $this->is_personal,
            'owner_id' => $this->owner_id,
            'members_count' => $this->whenCounted('members'),
            'members' => WorkspaceMemberResource::collection(
                $this->whenLoaded('members'),
            ),
            'invites' => WorkspaceInviteResource::collection(
                $this->whenLoaded('invites'),
            ),
            'created_at' => $this->created_at,
        ];
    }
}
