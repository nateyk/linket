<?php

namespace App\Analytics\Actions;

use App\Analytics\Resources\TrackedEventResource;
use App\Webhooks\Jobs\DispatchWebhooksForEvent;
use App\Links\Models\Linkeable;
use App\Analytics\Models\TrackedEvent;
use App\Folders\Models\Folder;
use App\QrCodes\Models\QrCode;
use App\Webhooks\Models\Webhook;
use Common\Core\AppUrl;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Jenssegers\Agent\Agent;
use Torann\GeoIP\Location;

class LogTrackedEvent
{
    public function execute(Linkeable $linkeable): TrackedEvent
    {
        $referrer = request()->server('HTTP_REFERER');
        $agent = app(Agent::class);
        $geo = ResolveVisitorLocation::resolve();
        $isRobot = $agent->isRobot();

        $eventType = $linkeable instanceof QrCode ? 'scan' : 'click';

        $attributes = [
            'location' => $geo['iso_code'],
            'city' => $geo['city'],
            'state' => $geo['state'],
            'ip' => request()->ip(),
            'platform' => static::getPlatform(),
            'device' => static::getDevice(),
            'crawler' => $isRobot,
            'browser' => strtolower($agent->browser()),
            'domain_id' => app(AppUrl::class)->matchedCustomDomain?->id ?? 0,
            'user_id' => $linkeable->user_id,
            'workspace_id' => $linkeable->workspace_id,
            // if referrer was any page from our site set referrer as null
            'referrer' => Str::contains($referrer, url(''))
                ? null
                : Str::limit($referrer, 190, ''),
            'event_type' => $eventType,
        ];

        $trackedEvent = $linkeable->trackedEvents()->create($attributes);

        if (!$isRobot) {
            if ($eventType === 'scan') {
                $linkeable->update([
                    'scans_count' => DB::raw('scans_count + 1'),
                    'scanned_at' => now(),
                ]);
            } else {
                $linkeable->update([
                    'clicks_count' => DB::raw('clicks_count + 1'),
                    'clicked_at' => now(),
                ]);

            }

            if ($linkeable->folder_id) {
                if ($folder = Folder::query()->find($linkeable->folder_id)) {
                    $folder->update([
                        'clicks_count' => DB::raw('clicks_count + 1'),
                    ]);
                }
            }

            DispatchWebhooksForEvent::dispatch(
                eventType: $eventType === 'scan'
                    ? Webhook::EVENT_SCANNED
                    : Webhook::EVENT_CLICKED,
                userId: $linkeable->user_id,
                payload: (new TrackedEventResource(
                    $trackedEvent,
                ))->toWebhookArray(),
            );
        }

        return $trackedEvent;
    }

    public static function getDevice(): string
    {
        $agent = app(Agent::class);
        if ($agent->isTablet()) {
            return 'tablet';
        } elseif ($agent->isMobile()) {
            return 'mobile';
        } else {
            return 'desktop';
        }
    }

    public static function getGeoData(): Location
    {
        return geoip(static::getIp());
    }

    public static function getLocation(): string
    {
        return strtolower(ResolveVisitorLocation::resolve()['iso_code'] ?? '');
    }

    public static function getPlatform(): string
    {
        $agent = app(Agent::class);
        return strtolower($agent->platform());
    }

    private static function getIp(): ?string
    {
        return ResolveVisitorLocation::publicIp();
    }
}
