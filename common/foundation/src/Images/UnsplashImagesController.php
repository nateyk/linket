<?php

namespace Common\images;

use Common\API\ExcludeRoutesFromPublicDocs;
use Illuminate\Routing\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

/**
 * @tags Unsplash
 */
#[ExcludeRoutesFromPublicDocs]
class UnsplashImagesController extends Controller
{
    /**
     * List Unsplash images.
     *
     * @operationId listUnsplashImages
     *
     * @response array{
     *     results: list<array{
     *         id: string,
     *         alt_description: string|null,
     *         description: string|null,
     *         urls: array{
     *             small: string,
     *             regular: string,
     *             full: string,
     *         },
     *         user?: array{
     *             name: string,
     *             links: array{html: string},
     *         },
     *     }>,
     *     total_pages: int,
     * }
     */
    public function index(Request $request)
    {
        $payload = $request->validate([
            'search' => 'nullable|string',
            'page' => 'integer|min:1',
        ]);

        $search = trim($payload['search'] ?? '');
        $page = $payload['page'] ?? 1;
        $perPage = 30;
        $response = $this->unsplashRequest()->get(
            $search
                ? 'https://api.unsplash.com/search/photos'
                : 'https://api.unsplash.com/photos',
            [
                ...$search ? ['query' => $search] : [],
                'page' => $page,
                'per_page' => $perPage,
            ],
        );

        if (!$response->successful()) {
            abort(500, 'Failed to fetch images from Unsplash.');
        }

        $json = $response->json();

        return response()->json([
            'results' => $search ? $json['results'] ?? [] : $json,
            'total_pages' => $search
                ? $json['total_pages'] ?? 1
                : (int) ceil(((int) $response->header('X-Total')) / $perPage),
        ]);
    }

    /**
     * Track an Unsplash image download.
     *
     * @operationId trackUnsplashDownload
     *
     * @response array{url: string}
     */
    public function trackDownload(string $id)
    {
        $response = $this->unsplashRequest()->get(
            sprintf(
                'https://api.unsplash.com/photos/%s/download',
                rawurlencode($id),
            ),
        );

        return response()->json($response->json(), $response->status());
    }

    private function unsplashRequest()
    {
        $apiKey = config('services.unsplash.access_key');

        abort_if(!$apiKey, 500, 'Unsplash API key is not configured.');

        return Http::withHeaders([
            'Authorization' => "Client-ID $apiKey",
        ]);
    }
}
