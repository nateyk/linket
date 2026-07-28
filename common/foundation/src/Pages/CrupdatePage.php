<?php

namespace Common\Pages;

use Common\Files\Actions\SyncFileEntryModels;
use Common\Pages\CustomPage;
use Common\Workspaces\ActiveWorkspace;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Auth;

class CrupdatePage
{
    public function execute(CustomPage $page, array $data): CustomPage
    {
        if (!$page->exists) {
            $data['user_id'] = Auth::id();
            $data['slug'] = $data['slug'] ?? slugify(Arr::get($data, 'title'));
            $data['workspace_id'] = app(ActiveWorkspace::class)->id ?? 0;
        }

        $page->fill($data)->save();

        // sync inline image entries
        if ($page->body !== Arr::get($data, 'body')) {
            (new SyncFileEntryModels())->fromHtml(
                Arr::get($data, 'body'),
                $page->inlineImages(),
            );
        }

        return $page;
    }
}
