<?php

namespace App\Biolinks\Requests;

use App\Links\Linkeable\CrupdateLinkeableRequest;
use Common\Workspaces\ActiveWorkspace;
use Dedoc\Scramble\Attributes\SchemaName;
use Illuminate\Validation\Rule;

#[SchemaName('CrupdateBiolinkBody')]
class CrupdateBiolinkRequest extends CrupdateLinkeableRequest
{
    public function rules(): array
    {
        return [
            'name' => [
                Rule::when($this->isCreating(), 'required'),
                'min:3',
                'max:100',
                Rule::unique('biolinks')
                    ->where('workspace_id', ActiveWorkspace::get()->id)
                    ->ignore($this->route('id')),
            ],

            'domain_id' => 'nullable|integer',
            'back_half' => $this->getBackHalfRule(
                isCreating: $this->isCreating(),
                domainId: $this->input('domain_id'),
                ignoreBiolinkId: $this->route('id'),
            ),

            ...$this->getQrCodeRules(),
            ...$this->getTrackingRules(),
            ...$this->getRetargetingRules(),
            ...$this->getExpirationAndPasswordRules(),
            ...$this->getTagsRules(),
        ];
    }
}
