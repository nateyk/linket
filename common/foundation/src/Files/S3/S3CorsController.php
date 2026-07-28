<?php

namespace Common\Files\S3;

use Common\Core\Demo\BlockedOnDemoSite;
use Common\Files\S3\InteractsWithS3Api;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

/**
 * @tags Files
 */
class S3CorsController extends Controller
{
    use InteractsWithS3Api;

    public function __construct()
    {
        $this->middleware('isAdmin');
    }

    /**
     * Upload CORS configuration for S3
     *
     * @operationId uploadCors
     */
    #[BlockedOnDemoSite]
    public function uploadCors(Request $request)
    {
        $request->validate([
            'uploadType' => 'required|string',
            'backendId' => 'required|string',
        ]);

        $cors = [
            [
                'AllowedOrigins' => [config('app.url')],
                'AllowedMethods' => ['GET', 'HEAD', 'POST', 'PUT'],
                'MaxAgeSeconds' => 3000,
                'AllowedHeaders' => ['*'],
                'ExposeHeaders' => ['ETag'],
            ],
        ];

        $this->getClient()->putBucketCors([
            'Bucket' => $this->getBucket(),
            'CORSConfiguration' => [
                'CORSRules' => $cors,
            ],
        ]);

        return response()->noContent();
    }
}
