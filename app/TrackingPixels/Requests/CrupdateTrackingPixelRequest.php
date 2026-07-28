<?php

namespace App\TrackingPixels\Requests;

use Common\Workspaces\ActiveWorkspace;
use Dedoc\Scramble\Attributes\SchemaName;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

#[SchemaName('CrupdateTrackingPixelBody')]
class CrupdateTrackingPixelRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'name' => [
                'required',
                'string',
                'min:3',
                Rule::unique('tracking_pixels')
                    ->ignore($this->route('id'))
                    ->where('workspace_id', ActiveWorkspace::get()->id),
            ],
            'type' => 'required|string|max:40',
            'pixel_id' => 'nullable|string|max:200',
            'head_code' => 'nullable|string',
            'body_code' => 'nullable|string',
        ];
    }
}
