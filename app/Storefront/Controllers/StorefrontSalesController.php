<?php

namespace App\Storefront\Controllers;

use App\Storefront\Models\StorefrontOrder;
use App\Storefront\Resources\StorefrontOrderResource;
use App\Storefront\StorefrontEarnings;
use Common\Workspaces\ActiveWorkspace;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class StorefrontSalesController extends Controller
{
    public function index(Request $request): array
    {
        $workspaceId = ActiveWorkspace::get()->id;
        $creatorId = $request->user()->id;
        $orders = StorefrontOrder::query()
            ->where('creator_id', $creatorId)
            ->whereHas('product', fn($query) => $query->where('workspace_id', $workspaceId))
            ->with('product')
            ->latest()
            ->paginate();

        return [
            'summary' => [
                ...app(StorefrontEarnings::class)->forCreator($creatorId, $workspaceId),
                'currency' => config('storefront.currency'),
            ],
            'orders' => StorefrontOrderResource::collection($orders),
        ];
    }
}
