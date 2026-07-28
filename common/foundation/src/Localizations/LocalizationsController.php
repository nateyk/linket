<?php

namespace Common\Localizations;

use Common\Core\Demo\BlockedOnDemoSite;
use Common\Localizations\Localization;
use Common\Localizations\LocalizationsRepository;
use Common\Localizations\Resources\LocalizationResource;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Gate;

/**
 * @tags Localizations, Admin
 */
class LocalizationsController extends Controller
{
    /**
     * List all localizations.
     *
     * @operationId listLocalizations
     */
    public function index()
    {
        Gate::authorize('index', Localization::class);

        $localizations = Localization::query()->orderBy('name')->get();

        return LocalizationResource::collection($localizations);
    }

    /**
     * Retrieve a localization.
     *
     * @operationId retrieveLocalization
     */
    public function show(int $id)
    {
        $localization = Localization::query()->findOrFail($id);

        Gate::authorize('show', $localization);

        $localization->loadLines();

        return new LocalizationResource($localization);
    }

    /**
     * Create a localization.
     *
     * @operationId createLocalization
     */
    #[BlockedOnDemoSite]
    public function store(Request $request)
    {
        Gate::authorize('store', Localization::class);

        $data = $request->validate([
            'name' => 'required|unique:localizations',
            'language' => 'string|min:2|max:5|unique:localizations',
            'direction' => 'string|in:ltr,rtl',
        ]);

        $localization = app(LocalizationsRepository::class)->create($data);

        return new LocalizationResource($localization);
    }

    /**
     * Update a localization.
     *
     * @operationId updateLocalization
     */
    #[BlockedOnDemoSite]
    public function update(int $id, Request $request)
    {
        $localization = Localization::query()->findOrFail($id);

        Gate::authorize('update', $localization);

        $data = $request->validate([
            'name' => 'string|min:1',
            'language' => 'string|min:2|max:5',
            'direction' => 'string|in:ltr,rtl',
            /** @var array<string, string> */
            'lines' => 'array|min:1',
        ]);

        $localization = app(LocalizationsRepository::class)->update(
            $id,
            $data,
            true,
        );

        return new LocalizationResource($localization);
    }

    /**
     * Delete a localization.
     *
     * @operationId deleteLocalization
     */
    #[BlockedOnDemoSite]
    public function destroy(int $id)
    {
        $localization = Localization::query()->findOrFail($id);

        Gate::authorize('destroy', $localization);

        abort_if(
            Localization::count() === 1,
            422,
            __('There must be at least one localization.'),
        );

        app(LocalizationsRepository::class)->delete($id);

        return response()->noContent();
    }

    /**
     * Download localization translation lines as a JSON file.
     *
     * @operationId downloadLocalization
     */
    public function download(int $id)
    {
        $localization = Localization::query()->findOrFail($id);

        Gate::authorize('show', $localization);

        return response()->download($localization->getLinesFilePath());
    }

    /**
     * Upload localization translation lines from a JSON file.
     *
     * @operationId uploadLocalization
     */
    #[BlockedOnDemoSite]
    public function upload(int $id, Request $request)
    {
        $localization = Localization::query()->findOrFail($id);

        Gate::authorize('update', $localization);

        $request->validate([
            'file' => 'required|file|mimes:json',
        ]);

        $lines = json_decode(
            file_get_contents($request->file('file')->getRealPath()),
            true,
        );

        app(LocalizationsRepository::class)->storeLocalizationLines(
            $localization,
            $lines,
            true,
        );

        $localization->loadLines();

        return new LocalizationResource($localization);
    }
}
