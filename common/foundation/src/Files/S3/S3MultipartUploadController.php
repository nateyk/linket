<?php

namespace Common\Files\S3;

use Carbon\Carbon;
use Common\Files\Actions\FileUploadValidator;
use Common\Files\S3\InteractsWithS3Api;
use Common\Files\Uploads\Uploads;
use Common\Files\Uploads\SecureUpload;
use Common\Files\Uploads\UploadGrant;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

/**
 * @tags Files
 */
class S3MultipartUploadController extends Controller
{
    use InteractsWithS3Api;

    public function __construct()
    {
        $this->middleware('auth');
    }

    /**
     * Create s3 multipart upload
     *
     * @operationId createS3MultipartUpload
     */
    public function create(Request $request)
    {
        $data = $request->validate([
            'clientSize' => 'required|integer',
            'clientExtension' => 'required|string',
            'clientMime' => 'required|string',
            'uploadType' => 'required|string',
            'backendId' => 'required|string',
        ]);

        $secured = app(SecureUpload::class)->prepare($request, $request->all());
        $uploadType = $secured['payload']->uploadType;
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

        $result = $this->getClient()->createMultipartUpload([
            'Key' => $this->buildFileKey($secured['payload']),
            'Bucket' => $this->getBucket(),
            'ContentType' => $data['clientMime'],
            'ACL' => $uploadType->getS3ACL(),
        ]);

        $grant = app(UploadGrant::class)->issue($request, $secured['metadata'], $result['Key'], 'multipart', $result['UploadId']);

        return response()->json([
            'uploadGrant' => $grant,
            'key' => $result['Key'],
            'uploadId' => $result['UploadId'],
            'acl' => $uploadType->getS3ACL(),
        ]);
    }

    /**
     * Get s3 uploaded parts
     *
     * @operationId getS3UploadedParts
     */
    public function getUploadedParts(Request $request)
    {
        $this->authorizeMultipart($request);
        $data = $this->getClient()->listParts([
            'Bucket' => $this->getBucket(),
            'Key' => request('key'),
            'UploadId' => request('uploadId'),
            'PartNumberMarker' => 0,
        ]);

        return response()->json([
            'parts' => $data['Parts'],
        ]);
    }

    /**
     * Batch sign s3 part urls
     *
     * @operationId batchSignS3PartUrls
     */
    public function batchSignPartUrls(Request $request)
    {
        $this->authorizeMultipart($request);
        $partNumbers = request()->input('partNumbers');

        $urls = [];

        foreach ($partNumbers as $partNumber) {
            $url = $this->getPartUrl(
                $partNumber,
                request('uploadId'),
                request('key'),
            );
            $urls[] = ['url' => $url, 'partNumber' => $partNumber];
        }

        return response()->json([
            'urls' => $urls,
        ]);
    }

    /**
     * Complete s3 multipart upload
     *
     * @operationId completeS3MultipartUpload
     */
    public function complete(Request $request)
    {
        $this->authorizeMultipart($request);
        $data = $this->getClient()->completeMultipartUpload([
            'Bucket' => $this->getBucket(),
            'Key' => request()->input('key'),
            'UploadId' => request()->input('uploadId'),
            'MultipartUpload' => [
                'Parts' => request()->input('parts'),
            ],
        ]);

        return response()->json([
            'location' => $data['Location'],
        ]);
    }

    /**
     * Abort s3 multipart upload
     *
     * @operationId abortS3MultipartUpload
     */
    public function abort(Request $request)
    {
        $this->authorizeMultipart($request);
        $this->getClient()->abortMultipartUpload([
            'Bucket' => $this->getBucket(),
            'Key' => request()->input('key'),
            'UploadId' => request()->input('uploadId'),
        ]);

        return response()->noContent();
    }

    private function authorizeMultipart(Request $request): void
    {
        $resolved = app(UploadGrant::class)->resolve($request, (string) $request->input('uploadGrant'), 'multipart');
        $grant = $resolved['grant'];
        abort_unless(hash_equals((string) $grant['key'], (string) $request->input('key')) && hash_equals((string) $grant['uploadId'], (string) $request->input('uploadId')), 403, 'Upload key or identifier does not belong to grant.');
        $request->merge(['backendId' => $grant['metadata']['backendId'], 'uploadType' => $grant['metadata']['uploadType']]);
    }

    /**
     * Get s3 part url
     *
     * @operationId getS3PartUrl
     */
    protected function getPartUrl(
        string $partNumber,
        string $uploadId,
        string $key,
    ): string {
        $command = $this->getClient()->getCommand('UploadPart', [
            'Bucket' => $this->getBucket(),
            'Key' => $key,
            'UploadId' => $uploadId,
            'PartNumber' => $partNumber,
        ]);
        $s3Request = $this->getClient()->createPresignedRequest(
            $command,
            Carbon::now()->addMinutes(30),
        );

        return (string) $s3Request->getUri();
    }
}
