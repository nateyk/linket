<?php

namespace App\Links\Requests;

use Dedoc\Scramble\Attributes\SchemaName;
use Illuminate\Foundation\Http\FormRequest;

#[SchemaName('BulkUpdateLinksBody')]
class BulkUpdateLinksRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            // Comma-separated list of link IDs to update. Maximum of 100 IDs. Non-existing IDs will be ignored.
            'ids' => 'required|array|min:1|max:100',
            'ids.*' => 'required|integer',
            'folder_id' => 'nullable|integer',
            'tags' => 'array',
            /**
             * @var array{'id': int, 'name'?: string} | int
             */
            'tags.*' => 'required',
            'archive' => 'boolean',
            'unarchive' => 'boolean',
        ];
    }
}
