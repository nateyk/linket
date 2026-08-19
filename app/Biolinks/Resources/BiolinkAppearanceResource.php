<?php

namespace App\Biolinks\Resources;

use App\Biolinks\Models\BiolinkAppearance;
use Dedoc\Scramble\Attributes\SchemaName;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin BiolinkAppearance
 */
#[SchemaName('BiolinkAppearance')]
class BiolinkAppearanceResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            /**
             * @var array{
             *   bgConfig?: array{
             *     backgroundColor?: string,
             *     backgroundAttachment?: 'scroll'|'fixed'|'local'|'initial'|'inherit'|string,
             *     backgroundSize?: 'auto'|'cover'|'contain'|'initial'|'inherit'|string,
             *     backgroundRepeat?: 'repeat'|'no-repeat'|'repeat-x'|'repeat-y'|string,
             *     backgroundPosition?: string,
             *     backgroundImage?: string,
             *     color?: string,
             *     tint?: int,
             *     noise?: bool,
             *     imageEffect?: 'mono'|'blur'|'halftone',
             *   },
             *   btnConfig?: array{
             *     variant?: 'outline'|'solid'|'glass',
             *     radius?: 'rounded-none'|'rounded-sm'|'rounded-lg'|'rounded-full',
             *     shadow?: 'none'|'soft'|'strong'|'hard',
             *     color?: string,
             *     textColor?: string
             *   },
             *   fontConfig?: array{
             *     family: string
             *   },
             *   hideBranding?: bool,
             *   layout?: 'default'|'profile-sidebar'
             * }
             */
            'config' => $this->config,
        ];
    }
}
