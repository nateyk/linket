<?php

namespace App\Links\Requests;

use App\Links\Linkeable\CrupdateLinkeableRequest;
use Common\Validation\CaptchaTokenValid;
use Dedoc\Scramble\Attributes\SchemaName;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

#[SchemaName('BulkCreateLinksBody')]
class BulkCreateLinksRequest extends CrupdateLinkeableRequest
{
    public function rules(): array
    {
        $rules = [
            'domain_id' => 'nullable|integer',
            /**
             * Multiple URLs. Maximum 10 URLs.
             *
             * @var string[]|string
             */
            'long_urls' => 'required|array',
            'long_urls.*' => [
                'required',
                Rule::string()
                    ->min(settings('links.min_len', 3))
                    ->max(settings('links.max_len', 1000)),
            ],

            ...$this->getTrackingRules(),
            ...$this->getRetargetingRules(),
            ...$this->getExpirationAndPasswordRules(),

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
            if ($validator->errors()->has('long_urls.*')) {
                $validator
                    ->errors()
                    ->add('long_urls', 'One of the urls is not valid.');
                // base "url" validation failed, can bail
                return;
            }

            $multipleUrls = $this->array('long_urls');

            foreach ($multipleUrls as $url) {
                $this->runCustomValidationsForUrl(
                    $url,
                    $validator,
                    'long_urls',
                );
            }
        });
    }
}
