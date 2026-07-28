<?php

namespace Common\Admin;

use Common\Core\Demo\BlockedOnDemoSite;
use Common\API\ExcludeRoutesFromPublicDocs;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Artisan;

/**
 * @tags System
 */
#[ExcludeRoutesFromPublicDocs]
class CacheController extends Controller
{
    public function __construct()
    {
        $this->middleware('isAdmin');
    }

    /**
     * Flush the cache.
     *
     * @operationId flushCache
     */
    #[BlockedOnDemoSite]
    public function flush()
    {
        Artisan::call('optimize:clear');

        return response()->noContent();
    }
}
