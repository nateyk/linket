<?php

namespace App\HelpCenter\Controllers;

use App\HelpCenter\Actions\ExportHelpCenter;
use App\HelpCenter\Actions\ImportHelpCenter;
use Common\Core\BaseController;
use Illuminate\Contracts\Cache\LockTimeoutException;
use Illuminate\Support\Facades\Cache;

class HcActionsController extends BaseController
{
    public function __construct()
    {
        $this->middleware('isAdmin');
    }

    public function export()
    {
        $filename = (new ExportHelpCenter())->execute();

        return response()
            ->download($filename, 'hc-export.zip', [
                'Content-Type' => 'application/zip',
            ])
            ->deleteFileAfterSend(true);
    }

    public function import()
    {
        $data = $this->validate(request(), [
            'file' => 'required|file|mimes:zip|max:51200',
        ]);

        $this->blockOnDemoSite();

        try {
            // Do not allow two concurrent replacements of the Help Center.
            Cache::lock('hc-import-exclusive', 600)->block(10, function () use ($data) {
                (new ImportHelpCenter())->execute($data['file']->getRealPath());
            });
        } catch (LockTimeoutException) {
            abort(409, 'Another Help Center import is already in progress.');
        }

        return $this->success();
    }
}
