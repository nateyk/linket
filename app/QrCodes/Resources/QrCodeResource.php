<?php

namespace App\QrCodes\Resources;

use App\Links\Linkeable\LinkeableResource;
use App\QrCodes\Models\QrCode;
use Dedoc\Scramble\Attributes\SchemaName;

/**
 * @mixin QrCode
 */
#[SchemaName('QrCode')]
class QrCodeResource extends LinkeableResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'back_half' => $this->back_half,
            'name' => $this->name,
            'long_url' => $this->long_url,
            /** @var array{color?: string | null, bgColor?: string | null, showLogo?: boolean | null, logoUrl?: string | null} */
            'style' => $this->style,

            'scanned_at' => $this->scanned_at,
            'scans_count' => $this->scans_count,

            /** @var "qrCode" */
            'model_type' => $this->model_type,

            'deleted_at' => $this->deleted_at,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,

            ...$this->getExpirationFields($this->linkeable ?? $this->resource),
            ...$this->getTrackingFields($this->linkeable ?? $this->resource),
            ...$this->getPasswordFields($this->linkeable ?? $this->resource),
            ...$this->getDomainFields($this->linkeable ?? $this->resource),
            ...$this->getRetargetingFields($this->linkeable ?? $this->resource),
            ...$this->getTagsFields(),
            ...$this->getUserFields(),

            'linkeable' => $this->whenLoaded(
                'linkeable',
                fn() => [
                    'id' => $this->linkeable->id,
                    'name' => $this->linkeable->name ?? null,
                    'model_type' => $this->linkeable->model_type ?? null,
                    'short_url' => $this->linkeable->short_url ?? null,
                    'final_destination_url' => $this->linkeable->resource?->relationLoaded(
                        'rules',
                    )
                        ? $this->linkeable->getFinalDestinationUrl()
                        : $this->linkeable->long_url,
                ],
            ),
        ];
    }

    public function toWebhookArray(): array
    {
        return [
            'id' => $this->id,
            'back_half' => $this->back_half,
            'name' => $this->name,
            'long_url' => $this->long_url,
            'expires_at' => $this->expires_at,
            'activates_at' => $this->activates_at,
            'model_type' => $this->model_type,
        ];
    }
}
