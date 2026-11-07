<?php

namespace App\Storefront\Controllers;

use App\Storefront\Models\DigitalProduct;
use App\Entitlements\Entitlements;
use App\Storefront\DigitalProductMutationService;
use App\Storefront\ProductReviewHistory;
use App\Storefront\Resources\DigitalProductResource;
use App\Storefront\DigitalProductVisibility;
use App\Storefront\ProductSettings;
use Common\Workspaces\ActiveWorkspace;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\DB;

class DigitalProductsController extends Controller
{
    public function __construct(private readonly DigitalProductMutationService $mutations) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $data = $request->validate([
            'search' => ['nullable', 'string', 'max:160'],
            'status' => ['nullable', 'in:draft,pending_approval,approved,rejected,archived'],
            'sort' => ['nullable', 'in:latest,oldest,title,sales,-sales,revenue,-revenue'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
            'page' => ['nullable', 'integer', 'min:1'],
        ]);
        $perPage = min(max((int) ($data['per_page'] ?? 15), 1), 100);
        $query = DigitalProduct::query()
            ->where('workspace_id', ActiveWorkspace::get()->id)
            ->where('user_id', $request->user()->id)
            ->withCount([
                'orders as sales_count' => fn (Builder $builder): Builder => $builder->where('status', 'paid'),
            ])
            ->withSum([
                'orders as gross_revenue_cents' => fn (Builder $builder): Builder => $builder->where('status', 'paid'),
            ], 'gross_amount_cents')
            ->with(['files', 'cover', 'biolinks', 'course', 'samples.file']);

        if (($search = trim((string) ($data['search'] ?? ''))) !== '') {
            $query->where(function (Builder $builder) use ($search): void {
                $builder->where('title', 'like', '%'.$search.'%')
                    ->orWhere('description', 'like', '%'.$search.'%');
            });
        }

        if (!empty($data['status'])) {
            $query->where('status', $data['status']);
        }

        match ($data['sort'] ?? 'latest') {
            'oldest' => $query->oldest(),
            'title' => $query->orderBy('title'),
            'sales' => $query->orderBy('sales_count')->orderByDesc('id'),
            '-sales' => $query->orderByDesc('sales_count')->orderByDesc('id'),
            'revenue' => $query->orderBy('gross_revenue_cents')->orderByDesc('id'),
            '-revenue' => $query->orderByDesc('gross_revenue_cents')->orderByDesc('id'),
            default => $query->latest(),
        };

        return DigitalProductResource::collection($query->paginate($perPage));
    }
    public function show(Request $request, DigitalProduct $digitalProduct) { $this->assertOwner($digitalProduct, $request); return new DigitalProductResource($digitalProduct->load(['files', 'cover', 'biolinks', 'course', 'samples.file'])); }

    public function store(Request $request)
    {
        abort_unless(app(\App\Storefront\Services\AccountMonetizationStatus::class)->canSell($request->user()), 403);
        $data = $this->validated($request);
        $creator = $request->user();
        $entitlements = app(Entitlements::class);
        abort_unless($entitlements->enabled($creator, 'course_creation_enabled') || ($data['type'] ?? 'digital') !== 'course', 403, __('Course creation is not enabled for your plan.'));
        $this->enforceProductLimitForType(
            $entitlements,
            $data['price_cents'],
            $data['type'] ?? 'digital',
            $creator,
            null,
        );

        $product = $this->mutations->create(
            $data,
            $creator,
            $entitlements->limit($creator, 'max_upload_bytes'),
        );

        return (new DigitalProductResource($product))->response()->setStatusCode(201);
    }

    public function update(Request $request, DigitalProduct $digitalProduct)
    {
        $this->assertOwner($digitalProduct, $request);
        abort_unless(app(\App\Storefront\Services\AccountMonetizationStatus::class)->canSell($request->user()), 403);
        $data = $this->validated($request, $digitalProduct);
        $creator = $request->user();
        $entitlements = app(Entitlements::class);
        $effectiveType = $data['type'] ?? $digitalProduct->type ?? 'digital';
        abort_unless($entitlements->enabled($creator, 'course_creation_enabled') || $effectiveType !== 'course', 403, __('Course creation is not enabled for your plan.'));
        $this->enforceProductLimitForType($entitlements, $data['price_cents'], $effectiveType, $creator, $digitalProduct->id);

        $product = $this->mutations->update(
            $digitalProduct,
            $data,
            $entitlements->limit($creator, 'max_upload_bytes'),
            $creator,
            $data['ai_copy_source_fingerprint'] ?? null,
        );

        return new DigitalProductResource($product);
    }

    public function saveDraft(Request $request, DigitalProduct $digitalProduct)
    {
        $this->assertOwner($digitalProduct, $request);
        abort_unless(app(\App\Storefront\Services\AccountMonetizationStatus::class)->canSell($request->user()), 403);
        $data = $this->validatedDraft($request, $digitalProduct);
        $creator = $request->user();
        $entitlements = app(Entitlements::class);
        $effectiveType = $data['type'] ?? $digitalProduct->type ?? 'digital';
        abort_unless($entitlements->enabled($creator, 'course_creation_enabled') || $effectiveType !== 'course', 403, __('Course creation is not enabled for your plan.'));
        $this->enforceProductLimitForType($entitlements, $data['price_cents'] ?? (int) $digitalProduct->price_cents, $effectiveType, $creator, $digitalProduct->id);

        $product = $this->mutations->update(
            $digitalProduct,
            $data,
            $entitlements->limit($creator, 'max_upload_bytes'),
            $creator,
            $data['ai_copy_source_fingerprint'] ?? null,
        );

        return new DigitalProductResource($product);
    }

    public function submit(Request $request, DigitalProduct $digitalProduct)
    {
        $this->assertOwner($digitalProduct, $request);
        abort_unless(app(\App\Storefront\Services\AccountMonetizationStatus::class)->canSell($request->user()), 403);
        abort_unless(
            in_array($digitalProduct->status, ['draft', 'rejected'], true),
            422,
            __('Only draft or rejected products can be submitted for review.'),
        );

        $policy = app(ProductSettings::class);
        $wasApproved = $digitalProduct->approved_at !== null;

        if ($digitalProduct->isCourse()) {
            $course = $digitalProduct->course ?? app(\App\Courses\Services\CourseService::class)->ensureForProduct($digitalProduct);
            $hasPublished = \App\Courses\Models\Lesson::where('course_id', $course->id)->where('status', 'published')->exists();
            abort_unless($course->chapters()->exists() && $hasPublished, 422, __('Add at least one chapter and one published lesson before submitting.'));

            $requiresReview = $wasApproved
                ? $policy->updatingRequiresReviewForCourse()
                : $policy->addingRequiresReviewForCourse();

            $course->update(['published_at' => now()]);

            return new DigitalProductResource(
                $this->applySubmission($digitalProduct, $requiresReview, $wasApproved, $request)
                    ->load(['course', 'cover']),
            );
        }

        abort_if($digitalProduct->files()->doesntExist(), 422, __('Add at least one downloadable file before submitting.'));

        $requiresReview = $wasApproved
            ? $policy->updatingRequiresReview()
            : $policy->addingRequiresReview();

        return new DigitalProductResource(
            $this->applySubmission($digitalProduct, $requiresReview, $wasApproved, $request),
        );
    }

    private function applySubmission(
        DigitalProduct $product,
        bool $requiresReview,
        bool $wasApproved,
        Request $request,
    ): DigitalProduct {
        $from = $product->status;

        DB::transaction(function () use ($product, $requiresReview, $wasApproved, $from, $request): void {
            if ($requiresReview) {
                $product->update([
                    'status' => 'pending_approval',
                    'rejection_reason' => null,
                ]);
            } else {
                $product->update([
                    'status' => 'approved',
                    'approved_at' => now(),
                    'rejection_reason' => null,
                ]);
            }

            app(ProductReviewHistory::class)->record(
                $product,
                $wasApproved ? 'update_submitted' : 'submitted',
                $from,
                $product->status,
                $request->user(),
                'creator',
            );
        });

        return $product->fresh();
    }

    public function duplicate(Request $request, DigitalProduct $digitalProduct): \Illuminate\Http\JsonResponse
    {
        $this->assertOwner($digitalProduct, $request);
        abort_unless(app(\App\Storefront\Services\AccountMonetizationStatus::class)->canSell($request->user()), 403);
        $creator = $request->user();
        $entitlements = app(Entitlements::class);
        $this->enforceProductLimitForType(
            $entitlements,
            (int) $digitalProduct->price_cents,
            $digitalProduct->type ?? 'digital',
            $creator,
            null,
        );

        $copy = $this->mutations->duplicate(
            $digitalProduct,
            $creator,
            $entitlements->limit($creator, 'max_upload_bytes'),
        );

        return (new DigitalProductResource($copy))->response()->setStatusCode(201);
    }

    public function archive(Request $request, DigitalProduct $digitalProduct): DigitalProductResource
    {
        $this->assertOwner($digitalProduct, $request);
        abort_if($digitalProduct->status === 'archived', 422, __('This product is already archived.'));

        $from = $digitalProduct->status;
        DB::transaction(function () use ($digitalProduct, $from, $request): void {
            app(DigitalProductVisibility::class)->sync($digitalProduct, []);
            $digitalProduct->update([
                'status' => 'archived',
                'review_requested_at' => null,
                'review_requested_by' => null,
            ]);
            app(ProductReviewHistory::class)->record(
                $digitalProduct,
                'archived',
                $from,
                'archived',
                $request->user(),
                'creator',
            );
        });

        return new DigitalProductResource($digitalProduct->fresh()->load(['files', 'cover', 'biolinks', 'course', 'samples.file']));
    }

    public function unarchive(Request $request, DigitalProduct $digitalProduct): DigitalProductResource
    {
        $this->assertOwner($digitalProduct, $request);
        abort_unless($digitalProduct->status === 'archived', 422, __('Only archived products can be restored to draft.'));

        DB::transaction(function () use ($digitalProduct, $request): void {
            $digitalProduct->update([
                'status' => 'draft',
                'rejection_reason' => null,
                'approved_at' => null,
                'review_requested_at' => null,
                'review_requested_by' => null,
            ]);
            app(ProductReviewHistory::class)->record(
                $digitalProduct,
                'unarchived',
                'archived',
                'draft',
                $request->user(),
                'creator',
            );
        });

        return new DigitalProductResource($digitalProduct->fresh()->load(['files', 'cover', 'biolinks', 'course', 'samples.file']));
    }

    public function destroy(Request $request, DigitalProduct $digitalProduct)
    {
        $this->assertOwner($digitalProduct, $request);
        abort_if(
            $digitalProduct->orders()->whereIn('status', ['paid', 'fulfilled'])->exists(),
            409,
            __('Products with paid orders cannot be deleted. Archive them instead so buyers keep their downloads.'),
        );

        app(DigitalProductVisibility::class)->sync($digitalProduct, []);
        $digitalProduct->delete();

        return response()->noContent();
    }

    private function validated(Request $request, ?DigitalProduct $existing = null): array
    {
        $type = $request->input('type', $existing?->type ?? 'digital');
        $isCourse = $type === 'course';
        $rules = [
            'title' => 'required|string|max:160', 'description' => 'nullable|string|max:20000', 'price_cents' => 'required|integer|min:0',
            'currency' => 'nullable|in:etb,ETB', 'cover_file_entry_id' => 'nullable|integer|exists:file_entries,id',
            'type' => 'nullable|in:digital,ebook,audio,course',
            'ai_copy_draft_id' => ['uuid', 'required_with:ai_copy_draft_version'],
            'ai_copy_draft_version' => ['integer', 'min:0', 'required_with:ai_copy_draft_id'],
            'ai_copy_source_fingerprint' => ['required_with:ai_copy_draft_id', 'string', 'regex:/\\A[a-f0-9]{64}\\z/'],
            'biolink_ids' => 'nullable|array', 'biolink_ids.*' => 'integer|distinct|exists:biolinks,id',
            'sample_file_ids' => 'sometimes|array',
            'sample_file_ids.*' => 'integer|distinct|exists:file_entries,id',
            'sample_titles' => 'sometimes|array',
            'sample_titles.*' => 'nullable|string|max:160',
            'sample_durations' => 'sometimes|array',
            'sample_durations.*' => 'nullable|integer|min:0|max:86400000',
        ];
        if ($isCourse) {
            $rules['file_ids'] = 'nullable|array';
            $rules['file_ids.*'] = 'integer|distinct|exists:file_entries,id';
        } else {
            $rules['file_ids'] = 'required|array|min:1';
            $rules['file_ids.*'] = 'integer|distinct|exists:file_entries,id';
        }
        $data = $request->validate($rules);
        app(\App\Storefront\ProductSettings::class)->enforcePricePolicy($data['price_cents']);

        return $data;
    }

    /** Draft autosave rules: relax exactly validated()'s two hard requirements
     *  (title required, file_ids min:1) and skip ProductSettings::enforcePricePolicy —
     *  price policy is enforced by update()/submit(), not by keystroke saves. */
    private function validatedDraft(Request $request, DigitalProduct $existing): array
    {
        $data = $request->validate([
            'title' => 'sometimes|nullable|string|max:160',
            'description' => 'sometimes|nullable|string|max:20000',
            'price_cents' => 'sometimes|nullable|integer|min:0',
            'currency' => 'sometimes|nullable|in:etb,ETB',
            'cover_file_entry_id' => 'sometimes|nullable|integer|exists:file_entries,id',
            'type' => 'sometimes|nullable|in:digital,ebook,audio,course',
            'ai_copy_draft_id' => ['uuid', 'required_with:ai_copy_draft_version'],
            'ai_copy_draft_version' => ['integer', 'min:0', 'required_with:ai_copy_draft_id'],
            'ai_copy_source_fingerprint' => ['required_with:ai_copy_draft_id', 'string', 'regex:/\\A[a-f0-9]{64}\\z/'],
            'file_ids' => 'sometimes|nullable|array',
            'file_ids.*' => 'integer|distinct|exists:file_entries,id',
            'biolink_ids' => 'sometimes|nullable|array',
            'biolink_ids.*' => 'integer|distinct|exists:biolinks,id',
            'sample_file_ids' => 'sometimes|array',
            'sample_file_ids.*' => 'integer|distinct|exists:file_entries,id',
            'sample_titles' => 'sometimes|array',
            'sample_titles.*' => 'nullable|string|max:160',
            'sample_durations' => 'sometimes|array',
            'sample_durations.*' => 'nullable|integer|min:0|max:86400000',
        ]);
        // Drop nulls so partial saves keep existing column values; KEEP 0 and [] (meaningful).
        return array_filter($data, static fn ($v) => $v !== null);
    }

    private function enforceProductLimitForType(Entitlements $entitlements, int $priceCents, string $type, \App\Models\User $creator, ?int $existingId): void
    {
        if ($type === 'course') {
            $limit = $entitlements->limit($creator, 'max_courses') ?? $entitlements->limit($creator, 'max_products');
            if ($limit === null) return;
            $query = DigitalProduct::query()->where('workspace_id', ActiveWorkspace::get()->id)->whereNull('deleted_at')->where('type', 'course');
            if ($existingId) $query->where('id', '!=', $existingId);
            abort_if($query->count() >= $limit, 422, __("You've reached your :plan limit of :count courses.", ['plan' => $entitlements->planFor($creator)?->name ?? 'plan', 'count' => $limit]));
            return;
        }
        $this->enforceProductLimit($entitlements->limit($creator, 'max_free_products'), $entitlements->limit($creator, 'max_paid_products'), $priceCents, $entitlements->planFor($creator)?->name, $existingId);
    }
    private function enforceProductLimit(
        ?int $freeLimit,
        ?int $paidLimit,
        int $priceCents,
        ?string $planName,
        ?int $existingId,
    ): void {
        $isFree = $priceCents <= 0;
        $limit = $isFree ? $freeLimit : $paidLimit;
        if ($limit === null) {
            return;
        }
        $query = DigitalProduct::query()
            ->where('workspace_id', ActiveWorkspace::get()->id)
            ->whereNull('deleted_at');
        if ($existingId !== null) {
            $query->where('id', '!=', $existingId);
        }
        $query->where('price_cents', $isFree ? '<=' : '>', 0);
        $count = $query->count();
        abort_if($count >= $limit, 422, $isFree
            ? __("You've reached your :plan limit of :count free products.", ['plan' => $planName ?? 'plan', 'count' => $limit])
            : __("You've reached your :plan limit of :count paid products.", ['plan' => $planName ?? 'plan', 'count' => $limit]));
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
