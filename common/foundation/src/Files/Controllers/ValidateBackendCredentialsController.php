<?php

namespace Common\Files\Controllers;

use Common\Core\Demo\BlockedOnDemoSite;
use Common\Files\Uploads\UploadBackend;
use Common\Files\Uploads\Uploads;
use Common\API\ExcludeRoutesFromPublicDocs;
use Exception;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Http;
use League\Flysystem\AwsS3V3\AwsS3V3Adapter;
use League\Flysystem\UnableToCreateDirectory;

/**
 * @tags Settings
 */
#[ExcludeRoutesFromPublicDocs]
class ValidateBackendCredentialsController extends Controller
{
    public function __construct()
    {
        $this->middleware('isAdmin');
    }

    /**
     * Validate backend credentials
     *
     * @operationId validateUploadBackendCredentials
     */
    #[BlockedOnDemoSite]
    public function __invoke(Request $request)
    {
        // validate payload
        $data = $request->validate([
            'id' => ['string', 'required'],
            'name' => ['string', 'required'],
            'type' => ['string', 'required'],
            'root' => ['string', 'nullable'],
            /** @var array<string, mixed> */
            'config' => ['array'],
        ]);

        // check if credentials are valid by trying to store and delete file on actual disk
        try {
            if ($data['type'] === 'api') {
                $disk = null;
                $this->validateApiCredentials($data);
            } else {
                $disk = Uploads::disk(
                    'brandingImages',
                    new UploadBackend($data),
                    throw: true,
                );

                $disk->files();
            }
        } catch (UnableToCreateDirectory $e) {
            abort(422, $e->getMessage());
        } catch (Exception $e) {
            if ($s3ErrorMessage = $this->tryToGetS3XmlErrorMessage($e)) {
                abort(422, $s3ErrorMessage);
            }

            abort(
                422,
                __(
                    'These credentials are invalid. Please double-check them and try again.',
                ),
            );
        }

        // if s3 and direct upload is enabled, configure cors
        if (
            $disk?->getAdapter() instanceof AwsS3V3Adapter &&
            Arr::get($data, 'config.direct_upload')
        ) {
            $cors = [
                [
                    'AllowedOrigins' => [config('app.url')],
                    'AllowedMethods' => ['GET', 'HEAD', 'POST', 'PUT'],
                    'MaxAgeSeconds' => 3000,
                    'AllowedHeaders' => ['*'],
                    'ExposeHeaders' => ['ETag'],
                ],
            ];

            try {
                $disk->getClient()->putBucketCors([
                    'Bucket' => $data['config']['bucket'],
                    'CORSConfiguration' => [
                        'CORSRules' => $cors,
                    ],
                ]);
            } catch (Exception $e) {
                abort(
                    422,
                    __(
                        'Could not configure bucket for direct upload. Make sure bucket exists and you have required permissions.',
                    ),
                );
            }
        }

        return response()->noContent();
    }

    protected function validateApiCredentials(array $data): bool
    {
        Http::throw()
            ->withHeaders([
                'Authorization' => 'Bearer ' . $data['config']['apiKey'],
            ])
            ->get($data['config']['domain'] . '/api/v1/file-entries');

        return true;
    }

    protected function tryToGetS3XmlErrorMessage(Exception $e): string|null
    {
        $message = $e->getMessage();
        $xmlStart = strrpos($message, '<?xml');

        if ($xmlStart !== false) {
            $xmlString = substr($message, $xmlStart);
            $xml = @simplexml_load_string($xmlString);

            if ($xml !== false && isset($xml->Message)) {
                return (string) $xml->Message;
            }
        }

        return null;
    }
}
