<?php

namespace App\LinkOverlays\Requests;

use Common\Workspaces\ActiveWorkspace;
use Dedoc\Scramble\Attributes\SchemaName;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

#[SchemaName('CrupdateLinkOverlayBody')]
class CrupdateLinkOverlayRequest extends FormRequest
{
    protected function isCreating(): bool
    {
        return $this->getMethod() === 'POST';
    }

    public function rules(): array
    {
        return [
            'name' => [
                Rule::when($this->isCreating(), 'required'),
                'string',
                'min:3',
                'max:250',
                Rule::unique('link_overlays')
                    ->where('workspace_id', ActiveWorkspace::get()->id)
                    ->ignore($this->route('id')),
            ],
            /**
             * @var 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
             */
            'position' => [
                Rule::when($this->isCreating(), 'required'),
                'string',
                Rule::in([
                    'top-left',
                    'top-right',
                    'bottom-left',
                    'bottom-right',
                ]),
            ],
            /**
             * @var 'default' | 'full-width' | 'rounded' | 'pill'
             */
            'theme' => [
                'nullable',
                'string',
                Rule::in(['default', 'full-width', 'rounded', 'pill']),
            ],
            'message' => [
                Rule::when($this->isCreating(), 'required'),
                'string',
                'max:250',
            ],
            'label' => 'nullable|string|max:250',
            'btn_link' => 'nullable|string|max:250',
            'btn_text' => 'nullable|string|max:250',
            /**
             * @var array{
             *   bg-image?: string,
             *   bg-color?: string,
             *   text-color?: string,
             *   btn-bg-color?: string,
             *   btn-text-color?: string,
             *   label-bg-color?: string,
             *   label-color?: string
             * }
             */
            'colors' => [Rule::when($this->isCreating(), 'required'), 'array'],
        ];
    }
}
