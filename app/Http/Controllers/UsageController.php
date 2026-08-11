<?php

namespace App\Http\Controllers;

use App\Analytics\Actions\GetMonthlyClicks;
use App\Biolinks\Models\Biolink;
use App\Folders\Models\Folder;
use App\Links\Models\Link;
use App\LinkOverlays\Models\LinkOverlay;
use App\LinkPages\Models\LinkPage;
use App\QrCodes\Models\QrCode;
use App\Storefront\Models\DigitalProduct;
use App\Storefront\StorefrontBenefits;
use App\TrackingPixels\Models\TrackingPixel;
use Common\Core\Policies\PolicyFailReason;
use Common\Domains\CustomDomain;
use Common\Workspaces\ActiveWorkspace;
use Common\Workspaces\Models\Workspace;
use Common\API\ExcludeRoutesFromPublicDocs;
use Illuminate\Auth\Access\Response;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\DB;
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
        $benefits = app(StorefrontBenefits::class)->forCreator($owner);
        $workspaceId = ActiveWorkspace::get()->id;

        $clickMaxCount = $owner->getRestrictionValue(
            'links.create',
            'click_count',
        );

        $digitalProducts = DigitalProduct::query()
            ->where('workspace_id', $workspaceId)
            ->whereNull('deleted_at')
            ->get();

        $freeProductsUsed = $digitalProducts->where('price_cents', '<=', 0)->count();
        $paidProductsUsed = $digitalProducts->where('price_cents', '>', 0)->count();

        $storageUsed = (int) DB::table('digital_product_files')
            ->join('file_entries', 'file_entries.id', '=', 'digital_product_files.file_entry_id')
            ->where('file_entries.workspace_id', $workspaceId)
            ->sum('file_entries.file_size');

        $storefrontsUsed = Biolink::query()
            ->where('workspace_id', $workspaceId)
            ->whereNull('deleted_at')
            ->count();

        $workspacesUsed = Workspace::where('owner_id', $owner->id)->count();

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
                    'used' => (new GetMonthlyClicks())->forUser($owner),
                    'total' => is_int($clickMaxCount) ? $clickMaxCount : null,
                ],
                'digital_products' => [
                    'used' => $digitalProducts->count(),
                    'total' => $benefits['max_products'] ?? null,
                    'create' => ['allowed' => $benefits['max_products'] === null || $digitalProducts->count() < $benefits['max_products']],
                    'delete' => ['allowed' => true],
                    'update' => ['allowed' => true],
                ],
                'free_products' => [
                    'used' => $freeProductsUsed,
                    'total' => $benefits['max_free_products'] ?? null,
                ],
                'paid_products' => [
                    'used' => $paidProductsUsed,
                    'total' => $benefits['max_paid_products'] ?? null,
                ],
                'storage' => [
                    'used' => $storageUsed,
                    'total' => $benefits['max_upload_bytes'] ?? null,
                ],
                'storefronts' => [
                    'used' => $storefrontsUsed,
                    'total' => $benefits['max_storefronts'] ?? null,
                ],
                'workspaces' => [
                    'used' => $workspacesUsed,
                    'total' => $benefits['max_workspaces'] ?? null,
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
