<?php

namespace App\Storefront\Controllers;

use App\Storefront\Models\DigitalProduct;
use App\Storefront\ProductAnalytics;
use Common\Workspaces\ActiveWorkspace;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class DigitalProductStatisticsController extends Controller
{
    public function __invoke(Request $request, DigitalProduct $digitalProduct, ProductAnalytics $analytics): array
    {
        $user = $request->user();
        abort_unless($user, 401);
        abort_unless(
            $digitalProduct->workspace_id === ActiveWorkspace::get()->id &&
                $digitalProduct->user_id === $user->id,
            403,
        );

        [$from, $to] = $analytics->resolvePeriod($request);

        return $analytics->stats($digitalProduct, $from, $to);
    }
}