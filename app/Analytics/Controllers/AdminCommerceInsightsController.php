<?php

namespace App\Analytics\Controllers;

use App\Analytics\Actions\BuildAdminCommerceInsights;
use App\Analytics\Requests\AdminCommerceInsightsRequest;
use Carbon\CarbonImmutable;
use Common\API\ExcludeRoutesFromPublicDocs;
use Illuminate\Http\JsonResponse;
use Illuminate\Routing\Controller;

#[ExcludeRoutesFromPublicDocs]
class AdminCommerceInsightsController extends Controller
{
    public function __invoke(
        AdminCommerceInsightsRequest $request,
        BuildAdminCommerceInsights $insights,
    ): JsonResponse {
        $validated = $request->validated();

        return response()->json([
            'data' => $insights->execute(
                CarbonImmutable::parse($validated['start_date'])->utc(),
                CarbonImmutable::parse($validated['end_date'])->utc(),
            ),
        ]);
    }
}
