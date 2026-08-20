<?php

namespace App\Analytics\Requests;

use Carbon\CarbonImmutable;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class AdminCommerceInsightsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('admin.access') === true;
    }

    /** @return array<string, list<string>> */
    public function rules(): array
    {
        return [
            'start_date' => ['required', 'date'],
            'end_date' => ['required', 'date', 'after_or_equal:start_date'],
            'timezone' => ['nullable', 'timezone'],
        ];
    }

    public function after(): array
    {
        return [
            function (Validator $validator): void {
                if ($validator->errors()->isNotEmpty()) {
                    return;
                }

                $start = CarbonImmutable::parse($this->string('start_date')->toString());
                $end = CarbonImmutable::parse($this->string('end_date')->toString());

                if ($start->diffInDays($end) > 366) {
                    $validator->errors()->add(
                        'end_date',
                        'The reporting period may not exceed 366 days.',
                    );
                }
            },
        ];
    }
}
