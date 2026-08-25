<?php

namespace App\Stores\Requests;

use App\Biolinks\Requests\CrupdateBiolinkRequest;
use App\Stores\Models\Store;
use Common\Workspaces\ActiveWorkspace;
use Dedoc\Scramble\Attributes\SchemaName;
use Illuminate\Validation\Rule;

/**
 * Canonical store create/update request.
 * Alias for CrupdateBiolinkRequest with proper store route handling.
 * Keeps legacy biolink table until config('stores.table_rename_done').
 */
#[SchemaName('CrupdateStoreBody')]
class CrupdateStoreRequest extends CrupdateBiolinkRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        // Resolve ignore ID from either store, biolink, or id param (supports legacy routes)
        $ignoreId = $this->route('store') ?? $this->route('biolink') ?? $this->route('id') ?? $this->route('biolinkId');
        if ($ignoreId instanceof Store) {
            $ignoreId = $ignoreId->id;
        } elseif ($ignoreId instanceof \App\Biolinks\Models\Biolink) {
            $ignoreId = $ignoreId->id;
        }

        $table = Store::isTableRenameDone() ? 'stores' : 'biolinks';

        return [
            'name' => [
                Rule::when($this->isCreating(), 'required'),
                'min:3',
                'max:100',
                Rule::unique($table)
                    ->where('workspace_id', ActiveWorkspace::get()->id)
                    ->ignore($ignoreId),
            ],

            'domain_id' => 'nullable|integer',
            'back_half' => $this->getBackHalfRule(
                isCreating: $this->isCreating(),
                domainId: $this->input('domain_id'),
                ignoreBiolinkId: $ignoreId,
            ),

            ...$this->getQrCodeRules(),
            ...$this->getTrackingRules(),
            ...$this->getRetargetingRules(),
            ...$this->getExpirationAndPasswordRules(),
            ...$this->getTagsRules(),
        ];
    }

    /**
     * Override isCreating to handle store routes as well
     */
    protected function isCreating(): bool
    {
        return $this->getMethod() === 'POST';
    }
}
