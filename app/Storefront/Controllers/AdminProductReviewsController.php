<?php

namespace App\Storefront\Controllers;

use App\Storefront\Models\ProductReview;
use App\Storefront\Resources\AdminProductReviewResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Routing\Controller;

class AdminProductReviewsController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $perPage = min(max($request->integer('per_page', 15), 1), 100);
        $query = ProductReview::query()
            ->with(['ratings', 'product']);

        if ($search = $request->string('search')->trim()) {
            $query->where(function ($q) use ($search) {
                $q->where('review', 'like', "%{$search}%")
                    ->orWhere('title', 'like', "%{$search}%")
                    ->orWhere('buyer_email', 'like', "%{$search}%")
                    ->orWhere('buyer_name', 'like', "%{$search}%");
            });
        }

        if (in_array($request->string('status')->toString(), ['hidden', 'visible'], true)) {
            $query->where('approved', $request->string('status')->is('visible'));
        }

        return AdminProductReviewResource::collection($query->latest()->paginate($perPage));
    }

    public function hide(Request $request, ProductReview $productReview): AdminProductReviewResource
    {
        $productReview->update([
            'approved' => false,
            'hidden_by' => $request->user()->id,
            'hidden_reason' => $request->string('reason')->trim() ?: null,
            'hidden_at' => now(),
        ]);

        return new AdminProductReviewResource($productReview->fresh(['ratings', 'product']));
    }

    public function unhide(Request $request, ProductReview $productReview): AdminProductReviewResource
    {
        $productReview->update([
            'approved' => true,
            'hidden_by' => null,
            'hidden_reason' => null,
            'hidden_at' => null,
        ]);

        return new AdminProductReviewResource($productReview->fresh(['ratings', 'product']));
    }

    public function destroy(Request $request, ProductReview $productReview)
    {
        $productReview->delete();

        return response()->noContent();
    }
}