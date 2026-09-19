<?php

namespace App\Storefront\Controllers;

use App\Storefront\Models\DigitalProduct;
use App\Storefront\ProductReviewHistory;
use App\Storefront\Resources\AdminDigitalProductResource;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;

class AdminDigitalProductsController extends Controller
{
    public function index(Request $request)
    {
        Gate::authorize('admin.access');

        $search = $request->string('search');
        $status = $request->string('status');
        $sort = $request->string('sort');
        $scope = $request->string('scope')->toString();

        $query = DigitalProduct::query()
            ->with(['creator', 'cover', 'files', 'biolinks'])
            ->withCount([
                'reviews',
                'reviews as hidden_reviews_count' => fn ($q) => $q->where('approved', false),
            ]);

        $query->when($search->isNotEmpty(), function ($q) use ($search) {
            $q->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                    ->orWhereHas('creator', function ($uq) use ($search) {
                        $uq->where('name', 'like', "%{$search}%")
                            ->orWhere('username', 'like', "%{$search}%")
                            ->orWhere('email', 'like', "%{$search}%");
                    });
            });
        });

        $query->when($status->isNotEmpty(), fn($q) => $q->where('status', $status));

        $query->when($scope === 'updated', fn ($q) => $q
            ->where('status', 'approved')
            ->whereNotNull('review_requested_at'));

        // Handle sorting: sort=id:desc or price_cents:asc, etc.
        $allowedSorts = ['id', 'title', 'price_cents', 'created_at', 'status'];
        if ($sort->isNotEmpty()) {
            [$field, $direction] = array_pad(explode(':', (string) $sort, 2), 2, 'desc');
            $field = in_array($field, $allowedSorts, true) ? $field : 'created_at';
            $direction = strtolower($direction) === 'asc' ? 'asc' : 'desc';
            $query->orderBy($field, $direction);
        } else {
            $query->latest();
        }

        $counters = [
            'total' => ['total' => DigitalProduct::count()],
            'pending_approval' => ['total' => DigitalProduct::where('status', 'pending_approval')->count()],
            'approved' => ['total' => DigitalProduct::where('status', 'approved')->count()],
            'rejected' => ['total' => DigitalProduct::where('status', 'rejected')->count()],
            'draft' => ['total' => DigitalProduct::where('status', 'draft')->count()],
            'updated' => ['total' => DigitalProduct::where('status', 'approved')->whereNotNull('review_requested_at')->count()],
        ];

        $products = $query->paginate((int) $request->input('perPage', 15));
        $products->appends($request->only(['search', 'status', 'scope', 'perPage', 'sort']));

        $paginated = $products->toArray();
        $paginated['meta'] = array_merge($paginated['meta'] ?? [], ['counters' => $counters]);

        return response()->json($paginated);
    }

    public function show(DigitalProduct $digitalProduct)
    {
        Gate::authorize('admin.access');

        $digitalProduct->load([
            'creator',
            'cover',
            'files',
            'biolinks',
            'course' => fn ($q) => $q->withCount([
                'chapters',
                'lessons',
                'lessons as published_lessons_count' => fn ($q) => $q->where('status', 'published'),
            ]),
            'reviewEvents' => fn ($q) => $q
                ->with('actor')
                ->orderByDesc('created_at')
                ->orderByDesc('id')
                ->limit(50),
        ])->loadCount([
            'orders as sales_count' => fn ($q) => $q->where('status', 'paid'),
            'reviews',
        ]);

        return new AdminDigitalProductResource($digitalProduct);
    }

    public function approve(Request $request, DigitalProduct $digitalProduct)
    {
        Gate::authorize('admin.access');

        $locked = DB::transaction(function () use ($digitalProduct, $request): DigitalProduct {
            $product = DigitalProduct::query()
                ->whereKey($digitalProduct->getKey())
                ->lockForUpdate()
                ->firstOrFail();

            $isUpdate = $product->status === 'approved' && $product->review_requested_at !== null;
            abort_unless($product->status === 'pending_approval' || $isUpdate, 422);
            $from = $product->status;

            $product->update([
                'status' => 'approved',
                'approved_at' => now(),
                'rejection_reason' => null,
                'review_requested_at' => null,
                'review_requested_by' => null,
            ]);

            app(ProductReviewHistory::class)->record(
                $product,
                $isUpdate ? 'update_approved' : 'approved',
                $from,
                'approved',
                $request->user(),
                'admin',
            );

            return $product;
        });

        return $locked->fresh()->load(['creator', 'cover', 'files', 'biolinks']);
    }

    public function reject(Request $request, DigitalProduct $digitalProduct)
    {
        Gate::authorize('admin.access');

        $data = $request->validate(['reason' => 'nullable|string|max:2000']);

        $locked = DB::transaction(function () use ($digitalProduct, $data, $request): DigitalProduct {
            $product = DigitalProduct::query()
                ->whereKey($digitalProduct->getKey())
                ->lockForUpdate()
                ->firstOrFail();

            $isUpdate = $product->status === 'approved' && $product->review_requested_at !== null;
            abort_unless($product->status === 'pending_approval' || $isUpdate, 422);
            $from = $product->status;

            $product->update([
                'status' => 'rejected',
                'rejection_reason' => $data['reason'] ?? null,
                'review_requested_at' => null,
                'review_requested_by' => null,
            ]);

            app(ProductReviewHistory::class)->record(
                $product,
                $isUpdate ? 'update_rejected' : 'rejected',
                $from,
                'rejected',
                $request->user(),
                'admin',
                $data['reason'] ?? null,
            );

            return $product;
        });

        return $locked->fresh()->load(['creator', 'cover', 'files', 'biolinks']);
    }
}
