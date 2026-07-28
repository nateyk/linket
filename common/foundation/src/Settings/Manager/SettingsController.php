<?php

namespace Common\Settings\Manager;

use Common\Core\Demo\BlockedOnDemoSite;
use Common\Files\Actions\GetServerMaxUploadSize;
use Common\Settings\Models\Setting;
use Common\API\ExcludeRoutesFromPublicDocs;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Gate;

/**
 * @tags Settings
 */
#[ExcludeRoutesFromPublicDocs]
class SettingsController extends Controller
{
    /**
     * List all settings.
     *
     * @operationId listSettings
     */
    public function index()
    {
        Gate::authorize('index', Setting::class);

        $settings = (new LoadSettingsManagerData())->execute();

        if (config('app.demo')) {
            $settings = (new RedactSensitiveSettings())->execute($settings);
        }

        /** @var array<string, mixed> $settings */
        return response()->json($settings);
    }

    /**
     * Update settings.
     *
     * @operationId updateSettings
     * @requestMediaType multipart/form-data
     */
    #[BlockedOnDemoSite]
    public function update()
    {
        Gate::authorize('update', Setting::class);

        $data = (new ValidateSettingsManagerData())->execute();

        (new StoreSettingsManagerData())->execute($data);

        return response()->noContent();
    }

    /**
     * Load SEO tags.
     *
     * @operationId loadSeoTags
     */
    public function loadSeoTags()
    {
        Gate::authorize('index', Setting::class);

        return response()->json([
            'tags' => (new LoadSettingsManagerData())->loadSeoTags(),
        ]);
    }

    /**
     * Load menu editor config.
     *
     * @operationId loadMenuEditorConfig
     */
    public function loadMenuEditorConfig()
    {
        Gate::authorize('index', Setting::class);

        return (new LoadSettingsManagerData())->loadMenuEditorConfig();
    }

    /**
     * Get server max upload size.
     *
     * @operationId getServerMaxUploadSize
     */
    public function getServerMaxUploadSize()
    {
        return response()->json([
            'maxSize' => app(GetServerMaxUploadSize::class)->execute()[
                'original'
            ],
        ]);
    }
}
