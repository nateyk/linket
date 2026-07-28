<?php

namespace Common\Localizations\Resources;

use Common\Localizations\Localization;
use Dedoc\Scramble\Attributes\SchemaName;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Localization
 */
#[SchemaName('Localization')]
class LocalizationResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'language' => $this->language,
            /** @var 'ltr' | 'rtl' */
            'direction' => $this->direction ?? 'ltr',
            /**
             * Translation lines keyed by string identifier.
             *
             * @var array<string, string>|null
             */
            'lines' => $this->when(isset($this->lines), $this->lines),
            'created_at' => $this->created_at,
        ];
    }
}
