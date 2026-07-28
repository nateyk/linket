<?php

namespace Common\Pages;

use Common\Core\Demo\BlockedOnDemoSite;
use Common\Core\Rendering\RendersClientSideApp;
use Common\Pages\CrupdatePage;
use Common\Pages\CustomPage;
use Common\API\ExcludeRoutesFromPublicDocs;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

/**
 * @tags Custom Pages, Admin
 */
class CustomPageController extends Controller
{
    use RendersClientSideApp;

    /**
     * List all custom pages.
     *
     * @operationId listCustomPages
     */
    public function index()
    {
        Gate::authorize('index', CustomPage::class);

        $pages = CustomPage::query()->orderBy('id', 'desc')->limit(50)->get();

        return CustomPageResource::collection($pages);
    }

    /**
     * Retrieve a custom page.
     *
     * @operationId retrieveCustomPage
     *
     * @return CustomPageResource
     */
    #[BlockedOnDemoSite]
    public function show(int|string $id)
    {
        if (
            $id === 'f7fy8bxf0e18' &&
            (request()->header('X-Settings-Preview') === 'true' ||
                request('settingsPreview') === 'true')
        ) {
            return [
                'page' => [
                    'id' => -1,
                    'title' => 'Preview',
                    'slug' => 'preview',
                    'type' => 'default',
                    'body' => file_get_contents(
                        app('path.common') .
                            '/resources/defaults/privacy-policy.html',
                    ),
                ],
            ];
        }

        $page = CustomPage::query()
            ->where('slug', $id)
            ->orWhere('id', $id)
            ->firstOrFail();

        Gate::authorize('show', $page);

        return $this->clientSideOrPrerenderedResponse([
            'pageName' => 'custom-page',
            'loader' => 'customPage',
            'data' => new CustomPageResource($page, 'show'),
        ]);
    }

    /**
     * Create a custom page.
     *
     * @operationId createCustomPage
     */
    #[BlockedOnDemoSite]
    public function store(Request $request)
    {
        Gate::authorize('store', CustomPage::class);

        $validatedData = $request->validate([
            'title' => [
                'string',
                'min:3',
                'max:200',
                Rule::unique('custom_pages'),
            ],
            'slug' => [
                'nullable',
                'string',
                'min:3',
                'max:250',
                Rule::unique('custom_pages'),
            ],
            'body' => 'required|string|min:1',
            'meta' => 'nullable|array',
        ]);

        $page = (new CrupdatePage())->execute(new CustomPage(), $validatedData);

        return new CustomPageResource($page);
    }

    /**
     * Update a custom page.
     *
     * @operationId updateCustomPage
     */
    #[BlockedOnDemoSite]
    public function update(int $id, Request $request)
    {
        $page = CustomPage::query()->findOrFail($id);

        Gate::authorize('update', $page);

        $validatedData = $request->validate([
            'title' => [
                'string',
                'min:3',
                'max:250',
                Rule::unique('custom_pages')->ignore($page->id),
            ],
            'slug' => [
                'nullable',
                'string',
                'min:3',
                'max:250',
                Rule::unique('custom_pages')->ignore($page->id),
            ],
            'body' => 'string|min:1',
            'meta' => 'nullable|array',
        ]);

        $page = (new CrupdatePage())->execute($page, $validatedData);

        return new CustomPageResource($page);
    }

    /**
     * Delete a custom page.
     *
     * @operationId deleteCustomPage
     */
    #[BlockedOnDemoSite]
    public function destroy(int $id)
    {
        $page = CustomPage::query()->findOrFail($id);

        Gate::authorize('destroy', $page);

        $page->inlineImages()->detach();
        $page->delete();

        return response()->noContent();
    }
}
