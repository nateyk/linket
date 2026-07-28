<?php

namespace Common\Files\Tus;

use Common\API\ExcludeRoutesFromPublicDocs;
use Illuminate\Routing\Controller;

/**
 * @tags Files
 */
#[ExcludeRoutesFromPublicDocs]
class TusServerController extends Controller
{
    public function __invoke()
    {
        return app(TusServer::class)->serve();
    }
}
