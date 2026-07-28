<?php

namespace App\Links\Linkeable;

use Common\Domains\Validation\ValidateLinkWithGoogleSafeBrowsing;
use Common\Domains\Validation\ValidateLinkWithPhishtank;
use Exception;
use Closure;
use Illuminate\Database\Query\Builder;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Unique;
use Illuminate\Validation\Validator;

abstract class CrupdateLinkeableRequest extends FormRequest
{
    protected function getTrackingRules(): array
    {
        return [
            /**
             * @var array{source?: string, medium?: string, campaign?: string, term?: string, content?: string}
             */
            'utm' => 'nullable|array',
            /**
             * @var array{key: string, value: string}[]
             */
            'utm_custom' => 'nullable|array',

            'pixels' => 'array',
            /**
             * @var array{'id': int, 'name'?: string} | int
             */
            'pixels.*' => 'required',
        ];
    }

    protected function getRetargetingRules(): array
    {
        return [
            'rules' => 'array',
            'rules.*.key' => ['nullable'],
            'rules.*.value' => ['nullable', 'string', 'max:250'],
            /**
             * @var 'geo' | 'device' | 'platform' | 'exp_clicks'
             */
            'rules.*.type' => [
                Rule::requiredIf($this->isCreating()),
                'string',
                'max:250',
            ],
        ];
    }

    protected function getExpirationAndPasswordRules(): array
    {
        return [
            'expires_at' => 'nullable|date',
            'activates_at' => 'nullable|date',
            'password' => 'nullable|string|max:40',
        ];
    }

    protected function getTagsRules(): array
    {
        return [
            'tags' => 'array',
            /**
             * @var array{'id': int, 'name'?: string} | int
             */
            'tags.*' => 'required',
        ];
    }

    protected function getQrCodeRules(): array
    {
        return [
            'create_qr_code' => 'nullable|boolean',
            /**
             * @var array{color?: string|null, bgColor?: string|null, showLogo?: boolean|null, logoUrl?: string|null} | null
             * @example {color: '#000000', bgColor: '#ffffff', showLogo: true, logoUrl: 'https://example.com/logo.png'}
             */
            'qr_code_style' => 'nullable|array',
        ];
    }

    protected function getBackHalfRule(
        bool $isCreating,
        int|null $domainId = null,
        int|null $ignoreLinkId = null,
        int|null $ignoreFolderId = null,
        int|null $ignoreBiolinkId = null,
    ): array {
        return [
            'nullable',
            Rule::string()
                ->min(settings('links.back_half_min', 5))
                ->max(settings('links.back_half_max', 10)),
            settings('links.back_half_content', 'alpha-dash'),
            function (string $attribute, mixed $value, Closure $fail) {
                $blacklist = collect(
                    explode(',', settings('links.blacklist.keywords')),
                );
                $blacklist->transform(fn($item) => trim($item));

                if (
                    $keyword = $blacklist->first(
                        fn($item) => Str::contains($value, $item),
                    )
                ) {
                    $fail(__("Back-half can't contain '$keyword'."));
                }
            },
            $this->getBackHalfUniqueRule(
                isCreating: $isCreating,
                table: 'links',
                ignoreId: $ignoreLinkId,
                domainId: $domainId,
            ),
            $this->getBackHalfUniqueRule(
                isCreating: $isCreating,
                table: 'folders',
                ignoreId: $ignoreFolderId,
                domainId: $domainId,
            ),
            $this->getBackHalfUniqueRule(
                isCreating: $isCreating,
                table: 'biolinks',
                ignoreId: $ignoreBiolinkId,
                domainId: $domainId,
            ),
        ];
    }

    protected function getBackHalfUniqueRule(
        bool $isCreating,
        string $table,
        int|null $ignoreId = null,
        int|null $domainId = null,
    ): Unique {
        return Rule::unique($table, 'back_half')
            ->when(
                !$isCreating && $ignoreId,
                fn($rule) => $rule->ignore($ignoreId),
            )
            ->where(function (Builder $builder) use ($domainId) {
                if ($domainId) {
                    $builder->where('domain_id', $domainId);
                } else {
                    $builder->whereNull('domain_id')->orWhere('domain_id', 0);
                }
            });
    }

    protected function runCustomValidationsForUrl(
        string $url,
        Validator $validator,
        string $errorKey,
    ): void {
        $this->validateAgainstBlacklist(
            $url,
            $validator,
            'keywords',
            $errorKey,
        );
        $this->validateAgainstBlacklist($url, $validator, 'domains', $errorKey);
        $this->validateAgainstGoogleSafeBrowsing($url, $validator, $errorKey);
        $this->validateAgainstPhishtank($url, $validator, $errorKey);
        $this->validateOriginPolicy($url, $validator, $errorKey);
    }

    private function validateOriginPolicy(
        string $url,
        Validator $validator,
        string $errorKey,
    ) {
        $type = $this->input('type') ?: $this->route('link.type');
        if ($type !== 'frame' && $type !== 'overlay') {
            return;
        }

        $blacklist = [
            'x-frame-options: deny',
            'x-frame-options: sameorigin',
            'x-frame-options: allow-from',
        ];

        try {
            $headers = get_headers($url);
        } catch (Exception $e) {
            $headers = [];
        }

        $cantIframe = collect($headers)->first(function ($header) use (
            $blacklist,
        ) {
            $header = strtolower($header);
            return in_array($header, $blacklist);
        });

        if ($cantIframe) {
            $start = $errorKey === 'long_url' ? 'This URL' : 'One of the urls';
            $validator
                ->errors()
                ->add(
                    $errorKey,
                    __(
                        "$start does not allow framing. Please select a different link type.",
                    ),
                );
        }
    }

    protected function validateAgainstBlacklist(
        string $url,
        Validator $validator,
        string $listName,
        string $errorKey,
    ): void {
        // key specified blacklist (keyword or domain)
        $list = collect(explode(',', settings("links.blacklist.$listName")));
        $list->transform(fn($item) => trim($item));

        // check if url matches any blacklist item
        $match = $list->first(fn($item) => Str::contains($url, $item));
        if ($match) {
            if ($listName === 'keywords') {
                $validator->errors()->add(
                    $errorKey,
                    __('URLs can\'t contain the word ":word".', [
                        'word' => $match,
                    ]),
                );
            } else {
                $validator->errors()->add(
                    $errorKey,
                    __('URLs from ":domain" domain can\'t be shortened.', [
                        'domain' => $match,
                    ]),
                );
            }
        }
    }

    protected function validateAgainstGoogleSafeBrowsing(
        string $url,
        Validator $validator,
        string $errorKey,
    ): void {
        $valid = (new ValidateLinkWithGoogleSafeBrowsing())->execute($url);

        if (!$valid) {
            $start = $errorKey === 'long_url' ? 'This URL' : 'One of the urls';
            $validator
                ->errors()
                ->add(
                    $errorKey,
                    __("$start can't be shortened, because it is unsafe."),
                );
        }
    }

    protected function validateAgainstPhishtank(
        string $url,
        Validator $validator,
        string $errorKey,
    ): void {
        $valid = (new ValidateLinkWithPhishtank())->execute($url);

        if (!$valid) {
            $start = $errorKey === 'long_url' ? 'This URL' : 'One of the urls';
            $validator
                ->errors()
                ->add(
                    $errorKey,
                    __(
                        "$start can't be shortened, because it is used for phising.",
                    ),
                );
        }
    }

    protected function isCreating(): bool
    {
        return $this->getMethod() === 'POST';
    }
}
