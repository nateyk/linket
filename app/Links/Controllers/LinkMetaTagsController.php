<?php

namespace App\Links\Controllers;

use App\Links\Actions\GetMetadataFromUrl;
use Common\API\ExcludeRoutesFromPublicDocs;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

/**
 * @tags Links
 */
#[ExcludeRoutesFromPublicDocs]
class LinkMetaTagsController extends Controller
{
    /**
     * Get metadata from URL.
     *
     * @operationId getMetadataFromUrl
     */
    public function __invoke(Request $request)
    {
        $data = $request->validate([
            'url' => 'required|string|url',
        ]);

        $metadata = (new GetMetadataFromUrl())->execute($data['url']);

        /** @var array{name?: string | null, description?: string | null, image?: string | null} */
        return response()->json($metadata);
    }
}
