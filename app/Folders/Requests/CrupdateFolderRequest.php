<?php

namespace App\Folders\Requests;

use App\Links\Linkeable\CrupdateLinkeableRequest;
use Common\Workspaces\ActiveWorkspace;
use Dedoc\Scramble\Attributes\SchemaName;
use Illuminate\Validation\Rule;

#[SchemaName('CrupdateFolderBody')]
class CrupdateFolderRequest extends CrupdateLinkeableRequest
{
    public function rules(): array
    {
        return [
            'name' => [
                'required',
                'string',
                'min:3',
                'max:100',
                Rule::unique('folders')
                    ->where('workspace_id', ActiveWorkspace::get()->id)
                    ->ignore($this->route('id')),
            ],
            'image' => 'nullable|string',
            'description' => 'nullable|string|min:1|max:250',
            'rotator' => 'boolean',

            'back_half' => $this->getBackHalfRule(
                isCreating: $this->isCreating(),
                domainId: $this->input('domain_id'),
                ignoreFolderId: $this->route('id'),
            ),
            'domain_id' => 'nullable|integer',

            ...$this->getQrCodeRules(),
            ...$this->getTrackingRules(),
            ...$this->getRetargetingRules(),
            ...$this->getExpirationAndPasswordRules(),
            ...$this->getTagsRules(),
        ];
    }
}
