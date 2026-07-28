<?php

namespace App\QrCodes\Requests;

use App\Links\Linkeable\CrupdateLinkeableRequest;
use Dedoc\Scramble\Attributes\SchemaName;
use Common\Validation\CaptchaTokenValid;
use Common\Workspaces\ActiveWorkspace;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

#[SchemaName('CrupdateQrCodeBody')]
class CrupdateQrCodeRequest extends CrupdateLinkeableRequest
{
    public function rules(): array
    {
        $rules = [
            'name' => [
                'string',
                'nullable',
                'min:3',
                'max:100',
                Rule::unique('qr_codes')
                    ->where('workspace_id', ActiveWorkspace::get()?->id)
                    ->ignore($this->route('id')),
            ],

            'long_url' => [
                Rule::string()
                    ->min(settings('links.min_len', 3))
                    ->max(settings('links.max_len', 1000)),
                Rule::when($this->isCreating(), 'required'),
            ],

            'short_link' => 'array',
            'short_link.create' => 'nullable|boolean',
            'short_link.back_half' => $this->getBackHalfRule(
                isCreating: $this->isCreating(),
                domainId: $this->input('domain_id'),
            ),
            'short_link.domain_id' => 'nullable|integer',

            'style' => 'array|nullable',
            'style.color' => 'nullable|string',
            'style.bgColor' => 'nullable|string',
            'style.showLogo' => 'nullable|boolean',
            'style.logoUrl' => 'nullable|string',

            ...$this->getTrackingRules(),
            ...$this->getRetargetingRules(),
            ...$this->getExpirationAndPasswordRules(),
            ...$this->getTagsRules(),
        ];

        if (array_key_exists('captcha_token', $this->request->all())) {
            $rules['captcha_token'] = new CaptchaTokenValid('landing_new_link');
        }

        return $rules;
    }

    protected function withValidator(Validator $validator)
    {
        return $validator->after(function (Validator $validator) {
            if ($longUrl = $this->input('long_url')) {
                $this->runCustomValidationsForUrl(
                    $longUrl,
                    $validator,
                    'long_url',
                );
            }
        });
    }

    protected function isCreating(): bool
    {
        return $this->getMethod() === 'POST';
    }
}
