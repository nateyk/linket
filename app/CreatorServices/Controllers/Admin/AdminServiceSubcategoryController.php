<?php

namespace App\CreatorServices\Controllers\Admin;

use App\CreatorServices\Models\ServiceCategory;
use App\CreatorServices\Models\ServiceSubcategory;
use App\CreatorServices\Resources\ServiceSubcategoryResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class AdminServiceSubcategoryController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        Gate::authorize('admin.access');

        return ServiceSubcategoryResource::collection(
            ServiceSubcategory::query()
                ->with('category')
                ->withCount('services')
                ->when(
                    $request->filled('service_category_id'),
                    fn ($query) => $query->where(
                        'service_category_id',
                        $request->integer('service_category_id'),
                    ),
                )
                ->orderBy('position')
                ->orderBy('name')
                ->get(),
        );
    }

    public function store(Request $request): JsonResponse
    {
        Gate::authorize('admin.access');

        $data = $this->validated($request);
        $data['slug'] = $data['slug'] ?? $this->uniqueSlug(
            $data['name'],
            $data['service_category_id'],
        );
        $data['status'] = $data['status'] ?? 'active';
        $data['position'] = $data['position']
            ?? ((int) ServiceSubcategory::query()
                ->where('service_category_id', $data['service_category_id'])
                ->max('position') + 1);

        $subcategory = ServiceSubcategory::query()->create($data);

        return response()->json(
            [
                'subcategory' => new ServiceSubcategoryResource(
                    $subcategory->load('category'),
                ),
            ],
            201,
        );
    }

    public function update(
        Request $request,
        ServiceSubcategory $subcategory,
    ): JsonResponse {
        Gate::authorize('admin.access');

        $data = $this->validated($request, $subcategory);
        $data['slug'] = $data['slug'] ?? $subcategory->slug;

        $subcategory->update($data);

        return response()->json([
            'subcategory' => new ServiceSubcategoryResource(
                $subcategory->load('category')->loadCount('services'),
            ),
        ]);
    }

    public function destroy(ServiceSubcategory $subcategory)
    {
        Gate::authorize('admin.access');

        $subcategory->delete();

        return response()->noContent();
    }

    /**
     * @return array<string, mixed>
     */
    private function validated(
        Request $request,
        ?ServiceSubcategory $subcategory = null,
    ): array {
        return $request->validate([
            'service_category_id' => [
                'required',
                'integer',
                Rule::exists('service_categories', 'id'),
            ],
            'name' => 'required|string|max:120',
            'slug' => [
                'nullable',
                'string',
                'max:140',
                'alpha_dash',
                Rule::unique('service_subcategories', 'slug')
                    ->where('service_category_id', $request->integer('service_category_id'))
                    ->ignore($subcategory?->id),
            ],
            'description' => 'nullable|string|max:2000',
            'featured' => 'boolean',
            'add_to_menu' => 'boolean',
            'status' => 'in:active,inactive',
            'position' => 'nullable|integer|min:0',
        ]);
    }

    private function uniqueSlug(string $name, int $categoryId): string
    {
        $base = Str::slug($name) ?: 'subcategory';
        $slug = $base;
        $suffix = 2;

        while (ServiceSubcategory::query()
            ->where('service_category_id', $categoryId)
            ->where('slug', $slug)
            ->exists()) {
            $slug = "{$base}-{$suffix}";
            $suffix++;
        }

        return $slug;
    }
}
