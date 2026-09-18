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
        $perPage = min(max($request->integer('per_page', 15), 1), 100);

        return DigitalProductResource::collection(
            DigitalProduct::query()
                ->where('workspace_id', ActiveWorkspace::get()->id)
                ->where('user_id', $request->user()->id)
                ->withCount([
                    'orders as sales_count' => fn (Builder $query): Builder => $query->where('status', 'paid'),
                ])
                ->withSum([
                    'orders as gross_revenue_cents' => fn (Builder $query): Builder => $query->where('status', 'paid'),
                ], 'gross_amount_cents')
                ->with(['files', 'cover', 'biolinks'])
                ->latest()
                ->paginate($perPage),
        );
    }
    public function show(Request $request, DigitalProduct $digitalProduct) { $this->assertOwner($digitalProduct, $request); return new DigitalProductResource($digitalProduct->load(['files', 'cover', 'biolinks', 'course'])); }

    public function store(Request $request)
    {
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
        );

        return new DigitalProductResource($product);
    }

    public function submit(Request $request, DigitalProduct $digitalProduct)
    {
        $this->assertOwner($digitalProduct, $request);
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
                ? ($policy->updatingRequiresReview() || (bool) config('store.courses_require_approval'))
                : $policy->addingRequiresReviewForCourse();

            $course->update(['published_at' => now()]);

            return new DigitalProductResource(
                $this->applySubmission($digitalProduct, $requiresReview, $wasApproved, $request),
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

    public function destroy(Request $request, DigitalProduct $digitalProduct) { $this->assertOwner($digitalProduct, $request); app(DigitalProductVisibility::class)->sync($digitalProduct, []); $digitalProduct->delete(); return response()->noContent(); }

    private function validated(Request $request, ?DigitalProduct $existing = null): array
    {
        $type = $request->input('type', $existing?->type ?? 'digital');
        $isCourse = $type === 'course';
        $rules = [
            'title' => 'required|string|max:160', 'description' => 'nullable|string|max:20000', 'price_cents' => 'required|integer|min:0',
            'currency' => 'nullable|in:etb,ETB', 'cover_file_entry_id' => 'nullable|integer|exists:file_entries,id',
            'type' => 'nullable|in:digital,ebook,audio,course',
            'biolink_ids' => 'nullable|array', 'biolink_ids.*' => 'integer|distinct|exists:biolinks,id',
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
