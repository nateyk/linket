<?php

namespace App\QrCodes\Actions;

use App\Biolinks\Models\Biolink;
use App\Folders\Models\Folder;
use App\Links\Actions\CrupdateLink;
use App\Links\Linkeable\CrupdateLinkeable;
use App\Links\Models\Link;
use App\QrCodes\Models\QrCode;
use Common\Workspaces\ActiveWorkspace;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;

class CrupdateQrCode extends CrupdateLinkeable
{
    public function execute(
        array $specifiedData,
        Link|Folder|Biolink|null $linkeable = null,
        QrCode|null $qrCode = null,
    ): QrCode {
        $isCreating = is_null($qrCode);

        $specifiedData = $this->filterOutDataBasedOnUserPermissions(
            $specifiedData,
        );

        $qrCodeInlineData = [
            ...Arr::only($specifiedData, ['style', 'name']),
            ...$this->getLongUrlInlineData($specifiedData),
        ];

        $linkeableInlineData = [
            ...Arr::only($specifiedData, ['name']),
            ...$this->getLongUrlInlineData($specifiedData),
            ...$this->getUtmInlineData($specifiedData),
            ...$this->getExpirationAndPasswordInlineData($specifiedData),
        ];

        if ($isCreating) {
            if (Arr::get($specifiedData, 'short_link.create')) {
                $linkeable = (new CrupdateLink())->execute([
                    ...$linkeableInlineData,
                    'back_half' =>
                        Arr::get($specifiedData, 'short_link.back_half') ??
                        Str::random(5),
                    'domain_id' =>
                        Arr::get($specifiedData, 'short_link.domain_id') ??
                        null,
                ]);
            }

            $qrCode = QrCode::create([
                ...$qrCodeInlineData,
                'back_half' => Str::random(5),
                'user_id' => Auth::id(),
                'workspace_id' => ActiveWorkspace::get()->id,
                'linkeable_id' => $linkeable?->id,
                'linkeable_type' => $linkeable?->model_type,
            ]);
        } else {
            $qrCode->fill($qrCodeInlineData)->save();
            $linkeable = $qrCode->linkeable;

            if ($linkeable) {
                $linkeable->fill($linkeableInlineData)->save();
            }
        }

        // if linkeable exist, then set all the linkeable data on that linkeable, otherwise set it on the qr code
        $this->saveLinkeableRules($linkeable ?? $qrCode, $specifiedData);
        $this->saveLinkeableTags($linkeable ?? $qrCode, $specifiedData);
        $this->saveLinkeableTrackingPixels(
            $linkeable ?? $qrCode,
            $specifiedData,
        );

        return $qrCode;
    }
}
