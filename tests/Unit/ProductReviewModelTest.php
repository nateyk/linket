<?php

namespace Tests\Unit;

use App\Storefront\Models\DigitalProduct;
use App\Storefront\Models\ProductReview;
use Tests\TestCase;

class ProductReviewModelTest extends TestCase
{
    public function testProductReviewIncludesOrderTieAndBuyerColumnsInFillable(): void
    {
        $review = new ProductReview([
            'reviewable_id' => 1,
            'reviewable_type' => DigitalProduct::class,
            'review' => 'Great product',
            'approved' => true,
            'storefront_order_id' => 5,
            'buyer_email' => 'buyer@example.test',
            'buyer_name' => 'Jane Doe',
            'title' => 'Loved it',
        ]);

        $this->assertSame(5, $review->storefront_order_id);
        $this->assertSame('buyer@example.test', $review->buyer_email);
        $this->assertSame('Jane Doe', $review->buyer_name);
        $this->assertSame('Loved it', $review->title);
        $this->assertTrue($review->approved);
    }

    public function testDigitalProductUsesReviewRateableTrait(): void
    {
        $this->assertContains(
            'Codebyray\ReviewRateable\Traits\ReviewRateable',
            class_uses(DigitalProduct::class),
        );
    }
}
