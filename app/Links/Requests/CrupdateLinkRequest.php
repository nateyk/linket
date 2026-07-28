<?php

namespace App\Links\Requests;

use App\Links\Linkeable\CrupdateLinkeableRequest;
use Common\Validation\CaptchaTokenValid;
use Dedoc\Scramble\Attributes\SchemaName;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

#[SchemaName('CrupdateLinkBody')]
class CrupdateLinkRequest extends CrupdateLinkeableRequest
{
    protected function isCreating(): bool
    {
        return $this->getMethod() === 'POST';
    }

    public function rules(): array
    {
        $rules = [
            'back_half' => $this->getBackHalfRule(
                isCreating: $this->isCreating(),
                domainId: $this->input('domain_id'),
                ignoreLinkId: $this->route('id'),
            ),
            'domain_id' => 'nullable|integer',
            'long_url' => [
                Rule::string()
                    ->min(settings('links.min_len', 3))
                    ->max(settings('links.max_len', 1000)),
                Rule::when($this->isCreating(), 'required'),
            ],

            /**
             * @var 'direct' | 'frame' | 'overlay' | 'splash' | 'page'
             */
            'type' => 'nullable|string',
            'type_id' => 'nullable|integer',

            'name' => 'nullable|string|max:100',
            'description' => 'nullable|string|max:230',
            'image' => 'string|nullable|max:190',

            ...$this->getQrCodeRules(),
            ...$this->getTrackingRules(),
            ...$this->getRetargetingRules(),
            ...$this->getExpirationAndPasswordRules(),
            ...$this->getTagsRules(),

            'folder_id' => 'nullable|integer',
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
}
