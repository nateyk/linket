<?php

namespace App\Storefront\Jobs;

use App\Storefront\Models\DigitalProduct;
use App\Storefront\Models\ProductReview;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\SerializesModels;
use App\Mail\ReactEmailMessage;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\URL;

class SendStorefrontReviewNotification implements ShouldQueue
{
    use Dispatchable, Queueable, SerializesModels;

    public int $tries = 3;

    /** @var array<int, int> */
    public array $backoff = [60, 300, 900];

    public function __construct(private readonly int $reviewId)
    {
        $this->onQueue('mail');
    }

    public function handle(): void
    {
        $review = ProductReview::query()
            ->with(['reviewable.creator', 'ratings'])
            ->find($this->reviewId);

        if (!$review?->reviewable instanceof DigitalProduct || !$review->reviewable->creator?->email) {
            return;
        }

        $product = $review->reviewable;
        $stars = $review->ratings->firstWhere('key', 'overall')?->value ?? 0;
        $dashboardUrl = URL::to('/dashboard/items/' . $product->id . '/reviews');

        $subject = __('You received a new product review');
        Mail::to($product->creator->email)->send(ReactEmailMessage::make(
            $subject,
            $subject,
            __('Hello, :name', ['name' => $product->creator->name]),
            [
                __('You received a new :stars-star review for ":title".', [
                    'stars' => $stars,
                    'title' => $product->title,
                ]),
                (string) $review->review,
            ],
            __('View reviews'),
            $dashboardUrl,
        ));
    }
}