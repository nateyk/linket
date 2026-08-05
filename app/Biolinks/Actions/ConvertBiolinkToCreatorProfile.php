<?php

namespace App\Biolinks\Actions;

use App\Biolinks\Models\Biolink;
use App\Biolinks\Models\BiolinkWidget;

class ConvertBiolinkToCreatorProfile
{
    public function execute(Biolink $biolink): Biolink
    {
        if ($biolink->isCreatorProfile()) {
            return $biolink;
        }

        $biolink->loadMissing(['user', 'widgets', 'links']);
        $biolink->forceFill([
            'builder_mode' => Biolink::BUILDER_MODE_CREATOR_PROFILE,
            'profile_config' => $this->profileFor($biolink),
        ])->save();

        return $biolink;
    }

    /** @return array<string, mixed> */
    public function profileFor(Biolink $biolink): array
    {
        $avatar = $biolink->widgets->first(
            fn(BiolinkWidget $widget): bool =>
                $widget->type === 'image' &&
                ($widget->config['type'] ?? null) === 'avatar',
        );
        $cover = $biolink->widgets->first(
            fn(BiolinkWidget $widget): bool =>
                $widget->type === 'image' &&
                ($widget->config['type'] ?? null) !== 'avatar',
        );
        $text = $biolink->widgets->first(
            fn(BiolinkWidget $widget): bool => $widget->type === 'text',
        );
        $socials = $biolink->widgets->first(
            fn(BiolinkWidget $widget): bool => $widget->type === 'socials',
        );

        return [
            'display_name' => $biolink->user?->name ?: $biolink->name,
            'profile_title' => $text?->config['title'] ?? '',
            'bio' => $text?->config['description'] ?? '',
            'avatar_url' => $avatar?->config['url'] ?? $biolink->user?->image,
            'cover_url' => $cover?->config['url'] ?? null,
            'available_for_work' => false,
            'skills' => [],
            'follow_url' => null,
            'contact_url' => null,
            'social_links' => $socials?->config ?? [],
            'source_widget_ids' => collect([$avatar?->id, $cover?->id, $text?->id, $socials?->id])
                ->filter()
                ->values()
                ->all(),
        ];
    }
}
