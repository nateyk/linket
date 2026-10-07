<?php

namespace App\Storefront\Controllers;

use App\Storefront\Models\DigitalProduct;
use App\Storefront\ProductAnalytics;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Gate;

class AdminDigitalProductStatisticsController extends Controller
{
    public function __invoke(Request $request, DigitalProduct $digitalProduct, ProductAnalytics $analytics): array
    {
        Gate::authorize('admin.access');

        [$from, $to] = $analytics->resolvePeriod($request);

        return $analytics->stats($digitalProduct, $from, $to);
    }
}