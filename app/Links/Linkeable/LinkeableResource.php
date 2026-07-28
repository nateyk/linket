<?php

namespace App\Links\Linkeable;

use App\Links\Models\Link;
use App\Links\Models\Linkeable;
use App\TrackingPixels\Models\TrackingPixel;
use App\Models\User;
use App\QrCodes\Models\QrCode;
use App\QrCodes\Resources\QrCodeResource;
use App\Tags\Models\Tag;
use Illuminate\Http\Resources\Json\JsonResource;

abstract class LinkeableResource extends JsonResource
{
    protected function getExpirationFields(
        Linkeable $linkeable,
        bool $show = true,
    ): array {
        return [
            'expires_at' => $this->when($show, fn() => $linkeable->expires_at),
            'activates_at' => $this->when(
                $show,
                fn() => $linkeable->activates_at,
            ),
        ];
    }

    protected function getPasswordFields(
        Linkeable $linkeable,
        bool $show = true,
    ): array {
        return [
            /**
             * If password is set, this will be a placeholder string to indicate that password exists, not the actual password.
             */
            'password' => $this->when(
                $show,
                fn() => $linkeable->password !== null
                    ? Link::PLACEHOLDER_PASSWORD
                    : null,
            ),
        ];
    }

    protected function getDomainFields(Linkeable $linkeable): array
    {
        return [
            /** @var int|null */
            'domain_id' => $linkeable->domain_id,
            /** @var array{id: int, host: string} | null */
            'domain' => $this->when(
                $linkeable->relationLoaded('domain') && $linkeable->domain,
                fn() => [
                    'id' => $linkeable->domain->id,
                    'host' => $linkeable->domain->host,
                ],
            ),
        ];
    }

    protected function getTrackingFields(
        Linkeable $linkeable,
        bool $show = true,
    ): array {
        return [
            /** @var array<int, array{id: int, name: string}> */
            'pixels' => $this->when(
                $linkeable->relationLoaded('pixels') && $show,
                fn() => $linkeable->pixels->map(
                    fn(TrackingPixel $pixel) => [
                        'id' => $pixel->id,
                        'name' => $pixel->name,
                    ],
                ),
            ),
            'utm' => $this->when($show, fn() => $linkeable->utm),
        ];
    }

    protected function getRetargetingFields(Linkeable $linkeable): array
    {
        return [
            /** @var array<int, array{id: int, type: 'geo' | 'device' | 'platform' | 'exp_clicks', key: string, value: string}> */
            'rules' => $this->when(
                $linkeable->relationLoaded('rules'),
                fn() => $linkeable->rules->map(
                    fn($rule) => [
                        'id' => $rule->id,
                        'type' => $rule->type,
                        'key' => $rule->key,
                        'value' => $rule->value,
                    ],
                ),
            ),
        ];
    }

    protected function getTagsFields(): array
    {
        return [
            'tags' => $this->whenLoaded(
                'tags',
                fn() => $this->tags->map(
                    fn(Tag $tag) => [
                        'id' => $tag->id,
                        'name' => $tag->name,
                    ],
                ),
            ),
        ];
    }

    protected function getQrCodeFields(): array
    {
        return [
            /** @var QrCodeResource */
            'qr_code' => $this->whenLoaded(
                'qrCode',
                fn(QrCode $qrCode) => [
                    'id' => $qrCode->id,
                    'back_half' => $qrCode->back_half,
                    'long_url' => $qrCode->long_url,
                    'style' => $qrCode->style,
                    'name' => $qrCode->name,
                ],
            ),
        ];
    }

    protected function getUserFields(): array
    {
        return [
            'user' => $this->whenLoaded(
                'user',
                fn(User $user) => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'image' => $user->image,
                ],
            ),
        ];
    }
}
