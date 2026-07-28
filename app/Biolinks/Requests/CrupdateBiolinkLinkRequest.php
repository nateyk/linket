<?php

namespace App\Biolinks\Requests;

use App\Links\Requests\CrupdateLinkRequest;
use Dedoc\Scramble\Attributes\SchemaName;

#[SchemaName('CrupdateBiolinkLinkBody')]
class CrupdateBiolinkLinkRequest extends CrupdateLinkRequest
{
    public function rules(): array
    {
        return [
            ...parent::rules(),
            /** Indicates whether link is publicly visible. True by default. */
            'active' => 'nullable|boolean',
            /** Indicates where link should appear in the list. By default this will be the last position. */
            'position' => 'nullable|integer',
            'animation' => 'nullable|string',
            'leap_until' => 'nullable|date',
            'pinned' => 'nullable|in:top,bottom',
        ];
    }
}
