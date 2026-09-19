<?php

namespace App\Storefront\Controllers;

use App\Models\User;
use App\Storefront\Actions\SanitizeProductDescription;
use App\Storefront\Models\DigitalProduct;
use App\Storefront\Notifications\ProductModerationNotification;
use App\Storefront\Notifications\ProductModerationSummaryNotification;
use App\Storefront\ProductReviewHistory;
use App\Storefront\Resources\AdminDigitalProductResource;
use Common\Files\FileEntry;
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
        // Render-only sanitization: creator HTML is stored as authored, but the
        // admin list dialog injects descriptions, so emit safe HTML here.
        $sanitizer = app(SanitizeProductDescription::class);
        $paginated['data'] = array_map(static function (array $row) use ($sanitizer): array {
            if (array_key_exists('description', $row) && $row['description'] !== null) {
                $row['description'] = $sanitizer->execute($row['description']);
            }
            // Same semantics as DigitalProduct::hasPendingUpdate(): the list
            // badges and actions depend on this computed flag, and raw rows
            // do not carry model accessors.
            $row['has_pending_update'] = ($row['status'] ?? null) === 'approved'
                && !empty($row['review_requested_at']);

            return $row;
        }, $paginated['data']);
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
        /** @var array<int, array{creator: User, items: array<int, array{id: int, title: string, event: string}>}> $byCreator */
        $byCreator = [];

        foreach (array_unique($ids) as $id) {
            $result = $this->decide((int) $id, $approve, $reason, $actor);

            if ($result === null) {
                $skipped++;
                continue;
            }

            $processed++;

            $creator = $result['product']->creator;
            if ($creator) {
                $byCreator[$creator->id] ??= ['creator' => $creator, 'items' => []];
                $byCreator[$creator->id]['items'][] = [
                    'id' => $result['product']->id,
                    'title' => $result['product']->title,
                    'event' => $result['event'],
                ];
            }
        }

        // One notification per creator instead of one per product.
        foreach ($byCreator as $entry) {
            $this->notifyBulkCreator($entry['creator'], $approve, $entry['items'], $reason);
        }

        return [
            $approve ? 'approved' : 'rejected' => $processed,
            'skipped' => $skipped,
        ];
    }

    private function notifyBulkCreator(User $creator, bool $approve, array $items, ?string $reason): void
    {
        try {
            if (count($items) === 1) {
                $creator->notify(new ProductModerationNotification(
                    $items[0]['id'],
                    $items[0]['event'],
                    $reason,
                ));

                return;
            }

            $creator->notify(new ProductModerationSummaryNotification(
                $approve ? 'approved' : 'rejected',
                array_map(fn (array $item): string => $item['title'], $items),
                $reason,
            ));
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('Failed to queue bulk product moderation notification', [
                'creator_id' => $creator->id,
                'count' => count($items),
                'message' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Apply one moderation decision under a row lock. Returns null when the
     * product is missing or not actionable, so bulk calls can skip it.
     */
    private function applyDecision(int $id, bool $approve, ?string $reason, User $actor, bool $notify = true): ?DigitalProduct
    {
        $result = $this->decide($id, $approve, $reason, $actor);

        if ($result === null) {
            return null;
        }

        if ($notify) {
            try {
                $result['product']->creator?->notify(
                    new ProductModerationNotification($result['product']->id, $result['event'], $reason),
                );
            } catch (\Throwable $e) {
                \Illuminate\Support\Facades\Log::error('Failed to queue product moderation notification', [
                    'product_id' => $result['product']->id,
                    'event' => $result['event'],
                    'message' => $e->getMessage(),
                ]);
            }
        }

        return $result['product'];
    }

    /**
     * @return array{product: DigitalProduct, event: string}|null
     */
    private function decide(int $id, bool $approve, ?string $reason, User $actor): ?array
    {
        return DB::transaction(function () use ($id, $approve, $reason, $actor): ?array {
            $product = DigitalProduct::query()
                ->with('creator')
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
                $event = $isUpdate ? 'update_approved' : 'approved';

                $product->update([
                    'status' => 'approved',
                    'approved_at' => now(),
                    'rejection_reason' => null,
                    'review_requested_at' => null,
                    'review_requested_by' => null,
                    'pending_review_snapshot' => null,
                ]);

                app(ProductReviewHistory::class)->record(
                    $product,
                    $event,
                    $from,
                    'approved',
                    $actor,
                    'admin',
                );
            } else {
                $snapshot = $product->pending_review_snapshot;

                if ($isUpdate && is_array($snapshot)) {
                    $event = 'update_reverted';

                    $product->update([
                        'title' => $snapshot['title'] ?? $product->title,
                        'description' => array_key_exists('description', $snapshot)
                            ? $snapshot['description']
                            : $product->description,
                        'learning_outcomes' => array_key_exists('learning_outcomes', $snapshot)
                            ? $snapshot['learning_outcomes']
                            : $product->learning_outcomes,
                        'price_cents' => $snapshot['price_cents'] ?? $product->price_cents,
                        'currency' => $snapshot['currency'] ?? $product->currency,
                        'type' => $snapshot['type'] ?? $product->type,
                        'cover_file_entry_id' => array_key_exists('cover_file_entry_id', $snapshot)
                            ? $snapshot['cover_file_entry_id']
                            : $product->cover_file_entry_id,
                        'status' => 'approved',
                        'rejection_reason' => null,
                        'review_requested_at' => null,
                        'review_requested_by' => null,
                        'pending_review_snapshot' => null,
                    ]);

                    $fileIds = FileEntry::query()
                        ->whereIn('id', $snapshot['file_ids'] ?? [])
                        ->where('workspace_id', $product->workspace_id)
                        ->pluck('id')
                        ->all();
                    $product->files()->sync($fileIds);

                    app(ProductReviewHistory::class)->record(
                        $product,
                        $event,
                        $from,
                        'approved',
                        $actor,
                        'admin',
                        $reason,
                        ['restored' => array_keys($snapshot)],
                    );
                } else {
                    $event = $isUpdate ? 'update_rejected' : 'rejected';

                    $product->update([
                        'status' => 'rejected',
                        'rejection_reason' => $reason,
                        'review_requested_at' => null,
                        'review_requested_by' => null,
                        'pending_review_snapshot' => null,
                    ]);

                    app(ProductReviewHistory::class)->record(
                        $product,
                        $event,
                        $from,
                        'rejected',
                        $actor,
                        'admin',
                        $reason,
                    );
                }
            }

            return ['product' => $product, 'event' => $event];
        });
    }
}
