<?php

namespace App\Listeners;

use App\Links\Actions\DeleteLinks;
use App\Folders\Actions\DeleteFolders;
use App\LinkOverlays\Actions\DeleteLinkOverlays;
use App\TrackingPixels\Actions\DeleteTrackingPixels;
use App\Biolinks\Actions\DeleteBiolinks;
use App\Biolinks\Models\Biolink;
use App\Links\Models\Link;
use App\Folders\Models\Folder;
use App\LinkOverlays\Models\LinkOverlay;
use App\TrackingPixels\Models\TrackingPixel;
use App\QrCodes\Actions\DeleteQrCodes;
use App\QrCodes\Models\QrCode;
use Common\Auth\Events\UsersDeleted;

class DeleteResourcesRelatedToUser
{
    public function handle(UsersDeleted $event)
    {
        $userIds = $event->users->pluck('id');
        $linkIds = Link::query()->whereIn('user_id', $userIds)->pluck('id');
        (new DeleteLinks())->execute($linkIds);

        $folderIds = Folder::query()->whereIn('user_id', $userIds)->pluck('id');
        (new DeleteFolders())->execute($folderIds);

        $qrCodeIds = QrCode::query()->whereIn('user_id', $userIds)->pluck('id');
        (new DeleteQrCodes())->execute($qrCodeIds->toArray());

        $biolinkIds = Biolink::query()
            ->whereIn('user_id', $userIds)
            ->pluck('id');
        (new DeleteBiolinks())->execute($biolinkIds);

        $pixelIds = TrackingPixel::query()
            ->whereIn('user_id', $userIds)
            ->pluck('id');
        (new DeleteTrackingPixels())->execute($pixelIds);

        $overlayIds = LinkOverlay::query()
            ->whereIn('user_id', $userIds)
            ->pluck('id');
        (new DeleteLinkOverlays())->execute($overlayIds);
    }
}
