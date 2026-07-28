<?php

namespace Common\Core\Controllers;

use Common\Core\Bootstrap\BootstrapData;
use Common\Core\Bootstrap\MobileBootstrapData;
use Common\API\ExcludeRoutesFromPublicDocs;
use Illuminate\Routing\Controller;

/**
 * @tags System
 */
#[ExcludeRoutesFromPublicDocs]
class BootstrapController extends Controller
{
    /**
     * Get data needed to bootstrap the app.
     *
     * @operationId getBootstrapData
     */
    public function getBootstrapData(BootstrapData $bootstrapData)
    {
        return response()->json([
            'data' => $bootstrapData->init()->getEncoded(),
        ]);
    }

    /**
     * Get data needed to bootstrap the mobile app.
     *
     * @operationId getMobileBootstrapData
     */
    public function getMobileBootstrapData(MobileBootstrapData $bootstrapData)
    {
        return response()->json($bootstrapData->init()->get());
    }
}
