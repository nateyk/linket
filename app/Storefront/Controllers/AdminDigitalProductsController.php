<?php

namespace App\Storefront\Controllers;

use App\Models\User;
use App\Storefront\Models\DigitalProduct;
use App\Storefront\ProductReviewHistory;
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

    public function approve(Request $request, DigitalProduct $digitalProduct)
    {
        Gate::authorize('admin.access');

        abort_if(
            $this->applyDecision($digitalProduct->getKey(), true, null, $request->user()) === null,
            422,
        );

        return $digitalProduct->fresh()->load(['creator', 'cover', 'files', 'biolinks']);
    }

    public function reject(Request $request, DigitalProduct $digitalProduct)
    {
        Gate::authorize('admin.access');

        $data = $request->validate(['reason' => 'nullable|string|max:2000']);

        abort_if(
            $this->applyDecision($digitalProduct->getKey(), false, $data['reason'] ?? null, $request->user()) === null,
            422,
        );

        return $digitalProduct->fresh()->load(['creator', 'cover', 'files', 'biolinks']);
    }

    public function bulkApprove(Request $request)
    {
        Gate::authorize('admin.access');

        $data = $request->validate([
            'ids' => 'required|array|min:1|max:100',
            'ids.*' => 'integer',
        ]);

        return response()->json(
            $this->applyBulk($data['ids'], true, null, $request->user()),
        );
    }

    public function bulkReject(Request $request)
    {
        Gate::authorize('admin.access');

        $data = $request->validate([
            'ids' => 'required|array|min:1|max:100',
            'ids.*' => 'integer',
            'reason' => 'nullable|string|max:2000',
        ]);

        return response()->json(
            $this->applyBulk($data['ids'], false, $data['reason'] ?? null, $request->user()),
        );
    }

    /**
     * @return array{approved?: int, rejected?: int, skipped: int}
     */
    private function applyBulk(array $ids, bool $approve, ?string $reason, User $actor): array
    {
        $processed = 0;
        $skipped = 0;

        foreach (array_unique($ids) as $id) {
            if ($this->applyDecision((int) $id, $approve, $reason, $actor) === null) {
                $skipped++;
            } else {
                $processed++;
            }
        }

        return [
            $approve ? 'approved' : 'rejected' => $processed,
            'skipped' => $skipped,
        ];
    }

    /**
     * Apply one moderation decision under a row lock. Returns null when the
     * product is missing or not actionable, so bulk calls can skip it.
     */
    private function applyDecision(int $id, bool $approve, ?string $reason, User $actor): ?DigitalProduct
    {
        return DB::transaction(function () use ($id, $approve, $reason, $actor): ?DigitalProduct {
            $product = DigitalProduct::query()
                ->whereKey($id)
                ->lockForUpdate()
                ->first();

            if (!$product) {
                return null;
            }

            $isUpdate = $product->status === 'approved' && $product->review_requested_at !== null;
            if ($product->status !== 'pending_approval' && !$isUpdate) {
                return null;
            }

            $from = $product->status;

            if ($approve) {
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
                    $actor,
                    'admin',
                );
            } else {
                $product->update([
                    'status' => 'rejected',
                    'rejection_reason' => $reason,
                    'review_requested_at' => null,
                    'review_requested_by' => null,
                ]);

                app(ProductReviewHistory::class)->record(
                    $product,
                    $isUpdate ? 'update_rejected' : 'rejected',
                    $from,
                    'rejected',
                    $actor,
                    'admin',
                    $reason,
                );
            }

            return $product;
        });
    }
}
