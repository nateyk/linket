<?php

namespace Common\Files\S3;

use Carbon\Carbon;
use Common\Files\Actions\FileUploadValidator;
use Common\Files\Actions\AuthorizeUploadDestination;
use Common\Files\Actions\S3UploadGrant;
use Common\Files\FileEntryPayload;
use Illuminate\Support\Facades\Gate;
use Common\Files\S3\InteractsWithS3Api;
use Common\Files\Uploads\Uploads;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

/**
 * @tags Files
 */
class S3SimpleUploadController extends Controller
{
    use InteractsWithS3Api;

    public function __construct()
    {
        $this->middleware('auth');
    }

    /**
     * Presign s3 post url
     *
     * @operationId presignS3PostUrl
     */
    public function presignPost(Request $request)
    {
        $data = $request->validate([
            'clientSize' => 'required|integer',
            'clientExtension' => 'required|string',
            'clientMime' => 'required|string',
            'uploadType' => 'required|string',
            'backendId' => 'required|string',
        ]);

        $payload = new FileEntryPayload($request->all());
        app(AuthorizeUploadDestination::class)->execute($request, $payload);
        $fileKey = $this->buildFileKey($payload);
        $uploadType = $payload->uploadType;
        $errors = FileUploadValidator::validateForUploadType(
            uploadType: $uploadType,
            fileSize: $data['clientSize'],
            extension: $data['clientExtension'],
            mime: $data['clientMime'],
        );
        if ($errors) {
            abort(422, $errors->first());
        }

        $sampleError = \App\Storefront\ProductSamplePolicy::uploadError(
            $uploadType->name,
            $data['clientExtension'],
            $data['clientMime'],
            (int) $data['clientSize'],
        );
        if ($sampleError !== null) {
            abort(422, $sampleError);
        }

        $command = $this->getClient()->getCommand('PutObject', [
            'Bucket' => $this->getBucket(),
            'ContentType' => $data['clientMime'],
            'Key' => $fileKey,
            'ACL' => $uploadType->getS3ACL(),
        ]);

        $uri = $this->getClient()
            ->createPresignedRequest($command, Carbon::now()->addHour())
            ->getUri();

        app(S3UploadGrant::class)->issue($payload, $fileKey);

        return response()->json([
            'url' => $uri,
            'key' => $fileKey,
            'acl' => $uploadType->getS3ACL(),
        ]);
    }
}
