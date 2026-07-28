<?php

namespace App\LinkPages\Actions;

use App\LinkPages\Models\LinkPage;
use Common\Files\Actions\SyncFileEntryModels;
use Common\Workspaces\ActiveWorkspace;
use Illuminate\Support\Facades\Auth;

class CrupdateLinkPage
{
    public function execute(LinkPage $page, array $data): LinkPage
    {
        if (!$page->exists) {
            $data['user_id'] = Auth::id();
            $data['workspace_id'] = ActiveWorkspace::get()->id;
        }

        $page->fill($data)->save();

        if (array_key_exists('body', $data)) {
            (new SyncFileEntryModels())->fromHtml(
                $data['body'],
                $page->inlineImages(),
            );
        }

        return $page;
    }
}
