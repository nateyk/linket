<?php

namespace Envato\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/** Phase 1 stub — always passes. */
class EnvatoSupportIsNotExpired implements ValidationRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
    }
}
