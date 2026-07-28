<?php

namespace App\Http\Controllers;

use App\Analytics\Actions\GetMonthlyClicks;
use App\Biolinks\Models\Biolink;
use App\Folders\Models\Folder;
use App\Links\Models\Link;
use App\LinkOverlays\Models\LinkOverlay;
use App\LinkPages\Models\LinkPage;
use App\QrCodes\Models\QrCode;
use App\TrackingPixels\Models\TrackingPixel;
use Common\Core\Policies\PolicyFailReason;
use Common\Domains\CustomDomain;
use Common\Workspaces\ActiveWorkspace;
use Common\API\ExcludeRoutesFromPublicDocs;
use Illuminate\Auth\Access\Response;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Str;

/**
 * @tags Account
 */
#[ExcludeRoutesFromPublicDocs]
class UsageController extends Controller
{
    const CREATE_ACTION = 'create';
    const UPDATE_ACTION = 'update';
    const DELETE_ACTION = 'delete';

    public function __construct()
    {
        $this->middleware('auth');
    }

    /**
     * Get link usage for the current user.
     *
     * @operationId getUsage
     */
    public function __invoke()
    {
        $owner = ActiveWorkspace::get()->getOwnerUser();

        $clickMaxCount = $owner->getRestrictionValue(
            'links.create',
            'click_count',
        );

        return response()->json([
            'data' => [
                'links' => $this->getLinksUsage(),
                'qr_codes' => $this->getQrCodesUsage(),
                'folders' => $this->getUsage(Folder::class),
                'link_pages' => $this->getLinkPagesUsage(),
                'biolinks' => $this->getUsage(Biolink::class),
                'link_overlays' => $this->getUsage(LinkOverlay::class),
                'tracking_pixels' => $this->getUsage(TrackingPixel::class),
                'custom_domains' => $this->getUsage(CustomDomain::class),
                'tracked_events' => [
                    /** @var int */
                    'used' => (new GetMonthlyClicks())->forUser($owner),
                    /** @var int|null */
                    'total' => is_int($clickMaxCount) ? $clickMaxCount : null,
                ],
            ],
        ]);
    }

    protected function getLinksUsage(): array
    {
        $owner = ActiveWorkspace::get()->getOwnerUser();
        $default = $owner->hasPermission('admin');

        return [
            ...$this->getUsage(Link::class),
            'back_half' =>
                (bool) ($owner->getRestrictionValue(
                    'links.create',
                    'back_half',
                ) ?? $default),
            'password' =>
                (bool) ($owner->getRestrictionValue(
                    'links.create',
                    'password',
                ) ?? $default),
            'expiration' =>
                (bool) ($owner->getRestrictionValue(
                    'links.create',
                    'expiration',
                ) ?? $default),
            'utm' =>
                (bool) ($owner->getRestrictionValue('links.create', 'utm') ??
                    $default),
            'retargeting' =>
                (bool) ($owner->getRestrictionValue(
                    'links.create',
                    'retargeting',
                ) ?? $default),
        ];
    }

    protected function getQrCodesUsage(): array
    {
        $owner = ActiveWorkspace::get()->getOwnerUser();
        $default = $owner->hasPermission('admin');

        return [
            ...$this->getUsage(QrCode::class),
            'style' =>
                (bool) ($owner->getRestrictionValue(
                    'qr_codes.create',
                    'style',
                ) ?? $default),
        ];
    }

    protected function getLinkPagesUsage(): array
    {
        $owner = ActiveWorkspace::get()->getOwnerUser();
        $default = $owner->hasPermission('admin');

        return [
            ...$this->getUsage(LinkPage::class),
            'options' =>
                (bool) ($owner->getRestrictionValue(
                    'link_pages.create',
                    'options',
                ) ?? $default),
        ];
    }

    protected function getUsage(string $resource): array
    {
        $owner = ActiveWorkspace::get()->getOwnerUser();

        $name = (string) Str::of($resource::MODEL_TYPE)->snake()->plural();
        $relationName = Str::camel($name);
        $countName = $name . '_count';

        $count = is_null($owner->$countName)
            ? $owner->loadCount($relationName)->$countName
            : $owner->$countName;
        $maxCount = $owner->getRestrictionValue("$name.create", 'count');

        $store = Gate::inspect('store', $resource);

        return [
            /** @var int */
            'used' => $count,
            /** @var int|null */
            'total' => is_int($maxCount) ? $maxCount : null,
            'create' => $this->getPolicyCheckResult(
                $store,
                self::CREATE_ACTION,
            ),
            'delete' => $this->getPolicyCheckResult(
                Gate::inspect('destroy', $resource),
                self::DELETE_ACTION,
            ),
            'update' => $this->getPolicyCheckResult(
                Gate::inspect(
                    'update',
                    new $resource([
                        'workspace_id' => ActiveWorkspace::get()->id,
                    ]),
                ),
                self::UPDATE_ACTION,
            ),
        ];
    }

    protected function getPolicyCheckResult(
        Response $response,
        string $action,
    ): array {
        $owner = ActiveWorkspace::get()->getOwnerUser();

        if ($response->allowed() || $owner->hasPermission('admin')) {
            return ['allowed' => true];
        }

        if (
            $action === self::CREATE_ACTION &&
            $response->code() === PolicyFailReason::OVER_QUOTA
        ) {
            return [
                'allowed' => false,
                'reason' => PolicyFailReason::OVER_QUOTA,
            ];
        } elseif (
            $response->code() === PolicyFailReason::NO_WORKSPACE_PERMISSION
        ) {
            return [
                'allowed' => false,
                'reason' => PolicyFailReason::NO_WORKSPACE_PERMISSION,
            ];
        } else {
            return [
                'allowed' => false,
                'reason' => PolicyFailReason::NO_PERMISSION,
            ];
        }
    }
}
