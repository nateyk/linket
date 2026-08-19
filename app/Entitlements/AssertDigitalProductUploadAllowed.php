<?php

namespace App\Entitlements;

use Common\Workspaces\Models\Workspace;
use Illuminate\Support\Facades\DB;

class AssertDigitalProductUploadAllowed
{
    public function execute(int $fileSize, int $workspaceId): void
    {
        $workspace = Workspace::findOrFail($workspaceId);
        $workspace->loadMissing('members.user');
        $owner = $workspace->getOwnerUser();

        $limit = app(Entitlements::class)->limit($owner, 'max_upload_bytes');
        if ($limit === null) {
            return;
        }

        $used = (int) DB::table('digital_product_files')
            ->join('file_entries', 'file_entries.id', '=', 'digital_product_files.file_entry_id')
            ->where('file_entries.workspace_id', $workspaceId)
            ->sum('file_entries.file_size');

        abort_if(
            $used + $fileSize > $limit,
            422,
            __("Uploading this file would exceed your :size storage allowance.", [
                'size' => Entitlements::formatBytes($limit),
            ]),
        );
    }
}
