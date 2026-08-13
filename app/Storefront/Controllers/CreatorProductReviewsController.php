<?php

namespace App\Storefront\Controllers;

use App\Storefront\Models\DigitalProduct;
use App\Storefront\Models\ProductReview;
use App\Storefront\Resources\CreatorProductReviewResource;
use Common\Workspaces\ActiveWorkspace;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Routing\Controller;

class CreatorProductReviewsController extends Controller
{
    public function index(Request $request, DigitalProduct $digitalProduct): AnonymousResourceCollection
    {
        $this->assertOwner($digitalProduct, $request);
        $perPage = min(max($request->integer('per_page', 15), 1), 100);

        return CreatorProductReviewResource::collection(
            ProductReview::query()
                ->where('reviewable_type', DigitalProduct::class)
                ->where('reviewable_id', $digitalProduct->id)
                ->with('ratings')
                ->latest()
                ->paginate($perPage),
        );
    }

    private function assertOwner(DigitalProduct $product, Request $request): void
    {
        abort_unless(
            $product->workspace_id === ActiveWorkspace::get()->id &&
                $product->user_id === $request->user()->id,
            403,
        );
    }
}