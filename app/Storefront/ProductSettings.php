<?php

namespace App\Storefront;

use Common\Files\Actions\FileUploadValidator;

final class ProductSettings
{
    public function minPriceCents(): ?int
    {
        $value = settings('product.min_price_cents');

        return $value === null || $value === '' ? null : (int) $value;
    }

    public function maxPriceCents(): ?int
    {
        $value = settings('product.max_price_cents');

        return $value === null || $value === '' ? null : (int) $value;
    }

    public function freeProductsAllowed(): bool
    {
        return $this->settingEnabled('product.allow_free_products', true);
    }

    public function addingRequiresReview(): bool
    {
        return $this->settingEnabled('product.adding_requires_review', true);
    }

    public function updatingRequiresReview(): bool
    {
        return $this->settingEnabled('product.updating_requires_review', true);
    }

    public function addingRequiresReviewForCourse(): bool
    {
        return $this->addingRequiresReview() || (bool) config('store.courses_require_approval');
    }

    public function updatingRequiresReviewForCourse(): bool
    {
        return $this->updatingRequiresReview() || (bool) config('store.courses_require_approval');
    }

    public function convertsCoversToWebp(): bool
    {
        return $this->settingEnabled('product.convert_covers_to_webp', true);
    }

    public function maxFileBytes(): ?int
    {
        $value = settings('product.max_file_bytes');

        return $value === null || $value === '' ? null : (int) $value;
    }

    public function enforceFileSizePolicy(int $fileSize): void
    {
        $max = $this->maxFileBytes();
        abort_if(
            $max !== null && $fileSize > $max,
            422,
            __('The file size may not be greater than :size', ['size' => FileUploadValidator::formatBytes($max)]),
        );
    }

    private function settingEnabled(string $key, bool $default): bool
    {
        // Stored as 1/0: the shared settings save path deletes PHP false
        // rows instead of persisting them, so a boolean toggle cannot
        // represent "off". Absent rows fall back to the default.
        $value = settings($key, $default);

        if ($value === null) {
            return $default;
        }

        if (is_string($value)) {
            return !in_array(strtolower(trim($value)), ['false', '0', 'no', ''], true);
        }

        return (bool) $value;
    }

    public function enforcePricePolicy(int $priceCents): void
    {
        if ($priceCents <= 0) {
            abort_unless(
                $this->freeProductsAllowed(),
                422,
                __('Free products are not allowed on this platform.'),
            );

            return;
        }

        $min = $this->minPriceCents();
        abort_if(
            $min !== null && $priceCents < $min,
            422,
            __('The price must be at least :amount ETB.', ['amount' => number_format($min / 100, 2)]),
        );

        $max = $this->maxPriceCents();
        abort_if(
            $max !== null && $priceCents > $max,
            422,
            __('The price may not be greater than :amount ETB.', ['amount' => number_format($max / 100, 2)]),
        );
    }
}
