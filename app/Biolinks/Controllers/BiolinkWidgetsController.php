<?php

namespace App\Biolinks\Controllers;

use App\Biolinks\Models\Biolink;
use App\Biolinks\Models\BiolinkWidget;
use App\Biolinks\Resources\BiolinkResource;
use Dedoc\Scramble\Attributes\Group;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

#[Group('Biolinks', weight: 6)]
class BiolinkWidgetsController extends Controller
{
    /**
     * Create a new widget for a biolink.
     *
     * @operationId createBiolinkWidget
     */
    public function store(int $biolinkId, Request $request)
    {
        $biolink = Biolink::findOrFail($biolinkId);

        Gate::authorize('update', $biolink);

        $data = $request->validate([
            'type' => [
                'required',
                'string',
                Rule::in([
                    'image', 'text', 'socials', 'youtube', 'soundcloud',
                    'vimeo', 'spotify', 'twitch', 'tiktok', 'shop',
                ]),
            ],
            'position' => 'int',
            /** @var array<string, string>|null */
            'config' => 'nullable|array',
        ]);

        abort_if(
            $biolink->isCreatorProfile(),
            422,
            __('Add approved Digital Products from the creator profile Work section.'),
        );

        $widget = $biolink->widgets()->create($data);

        $biolink->adjustPositions(
            direction: 'increment',
            anchor: $data['position'] ?? null,
            widgetToSkip: $widget->id,
        );

        return new BiolinkResource($biolink->fresh()->loadContent());
    }

    /**
     * Update a widget for a biolink.
     *
     * @operationId updateBiolinkWidget
     */
    public function update(int $biolinkId, int $widgetId, Request $request)
    {
        $biolink = Biolink::findOrFail($biolinkId);
        $widget = BiolinkWidget::findOrFail($widgetId);

        Gate::authorize('update', $biolink);

        $data = $request->validate([
            'type' => 'string',
            'active' => 'boolean',
            'pinned' => 'nullable|in:top,bottom',
            /** @var array<string, string> */
            'config' => 'array',
        ]);

        if (
            $biolink->isCreatorProfile() &&
            isset($data['type']) &&
            !in_array($data['type'], ['image', 'text'], true)
        ) {
            abort(422, __('Creator profiles only support image and text work items.'));
        }

        $widget->update($data);

        return new BiolinkResource($biolink->fresh()->loadContent());
    }

    /**
     * Delete a widget.
     *
     * @operationId deleteBiolinkWidget
     */
    public function destroy(int $biolinkId, int $widgetId)
    {
        $biolink = Biolink::findOrFail($biolinkId);
        $widget = BiolinkWidget::findOrFail($widgetId);

        Gate::authorize('update', $biolink);

        $biolink->widgets()->where('id', $widgetId)->delete();

        $biolink->adjustPositions(
            direction: 'decrement',
            anchor: $widget->position,
        );

        return new BiolinkResource($biolink->fresh()->loadContent());
    }
}
