<?php

namespace App\Storefront\Jobs;

use App\Storefront\Models\DigitalProduct;
use App\Storefront\Models\ProductReview;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\SerializesModels;
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

        Mail::raw(
            "Hello {$product->creator->name},\n\nYou received a new {$stars}-star review for \"{$product->title}\".\n\n{$review->review}\n\nView all reviews in your dashboard: {$dashboardUrl}",
            fn($message) => $message->to($product->creator->email)->subject(__('You received a new product review')),
        );
    }
}