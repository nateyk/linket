<?php

namespace App\Storefront\Controllers;

use App\Storefront\Models\DownloadEntitlement;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class DownloadController extends Controller
{
    public function show(Request $request, string $token)
    {
        abort_unless($request->hasValidSignature(), 403, __('This download link is invalid or has expired.'));
        $entitlement = DownloadEntitlement::query()->where('token', $token)->with('file')->firstOrFail();
        abort_if($entitlement->revoked_at, 410, __('This download is no longer available because the order was refunded.'));
        abort_if($entitlement->expires_at->isPast(), 410, __('This download link is no longer available.'));
        $file = $entitlement->file;
        abort_unless(
            $file && $file->getDisk()->exists($file->getStoragePath()),
            410,
            __('This download file is no longer available.'),
        );
        $wasCounted = DownloadEntitlement::query()
            ->whereKey($entitlement->id)
            ->whereColumn('download_count', '<', 'download_limit')
            ->increment('download_count');
        abort_if(!$wasCounted, 410, __('This download link is no longer available.'));
        return $file->getDisk()->download($file->getStoragePath(), $file->getNameWithExtension());
    }
}
