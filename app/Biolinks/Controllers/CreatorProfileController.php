<?php

namespace App\Biolinks\Controllers;

use App\Biolinks\Actions\ConvertBiolinkToCreatorProfile;
use App\Biolinks\Actions\SanitizeCreatorAbout;
use App\Biolinks\Models\Biolink;
use App\Biolinks\Requests\UpdateCreatorProfileRequest;
use App\Biolinks\Resources\BiolinkResource;
use App\Storefront\DigitalProductVisibility;
use App\Storefront\Models\DigitalProduct;
use Common\Files\PublicMediaUrl;
use Dedoc\Scramble\Attributes\Group;
use Illuminate\Routing\Controller;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;

#[Group('Biolinks', weight: 4)]
class CreatorProfileController extends Controller
{
    /**
     * Update the fixed creator profile.
     *
     * @operationId updateCreatorProfile
     */
    public function update(
        mixed $id,
        UpdateCreatorProfileRequest $request,
    ): BiolinkResource {
        $biolink = $id instanceof Biolink || $id instanceof \App\Stores\Models\Store ? $id : Biolink::query()->findOrFail($id);
        Gate::authorize('update', $biolink);

        abort_unless(
            $biolink->isCreatorProfile(),
            422,
            __('Upgrade this page to a creator profile before editing it.'),
        );

        $validated = $request->validated();
        $validated['avatar_url'] = PublicMediaUrl::normalize($validated['avatar_url'] ?? null) ?? '';
        $validated['cover_url'] = PublicMediaUrl::normalize($validated['cover_url'] ?? null) ?? '';
        $validated['about_html'] = $request->exists('about_html')
            ? app(SanitizeCreatorAbout::class)->execute(
                $validated['about_html'] ?? null,
            )
            : ($biolink->profile_config['about_html'] ?? '');
        $featuredProductIds = $validated['featured_product_ids'];
        $featuredProducts = DigitalProduct::query()
            ->where('workspace_id', $biolink->workspace_id)
            ->where('user_id', $request->user()->id)
            ->where('status', 'approved')
            ->whereIn('id', $featuredProductIds)
            ->whereHas('files')
            ->get();

        abort_if(
            $featuredProducts->count() !== count($featuredProductIds),
            422,
            __('Every featured product must be approved, downloadable, and owned by you.'),
        );

        DB::transaction(function () use ($biolink, $validated, $featuredProductIds): void {
            $biolink->update([
                'profile_config' => [
                    ...Arr::except($validated, ['featured_product_ids']),
                    'source_widget_ids' => $biolink->creatorProfileSourceWidgetIds(),
                ],
            ]);

            app(DigitalProductVisibility::class)->syncForBiolink(
                $biolink,
                $featuredProductIds,
            );
        });

        return new BiolinkResource($biolink->fresh()->loadContent());
    }

    /**
     * Convert a legacy biolink without deleting its widget records.
     *
     * @operationId convertBiolinkToCreatorProfile
     */
    public function convert(mixed $id): BiolinkResource
    {
        $biolink = $id instanceof Biolink || $id instanceof \App\Stores\Models\Store ? $id : Biolink::query()->findOrFail($id);
        Gate::authorize('update', $biolink);

        $biolink = app(ConvertBiolinkToCreatorProfile::class)->execute(
            $biolink,
        );

        return new BiolinkResource($biolink->fresh()->loadContent());
    }
}
