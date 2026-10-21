<?php

namespace App\CreatorServices\Controllers\Admin;

use App\CreatorServices\Models\ServiceCategory;
use App\CreatorServices\Resources\ServiceCategoryResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class AdminServiceCategoryController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        Gate::authorize('admin.access');

        return ServiceCategoryResource::collection(
            ServiceCategory::query()
                ->with('subcategories')
                ->withCount('services')
                ->orderBy('position')
                ->orderBy('name')
                ->get(),
        );
    }

    public function show(ServiceCategory $category): ServiceCategoryResource
    {
        Gate::authorize('admin.access');

        return new ServiceCategoryResource(
            $category->load('subcategories')->loadCount('services'),
        );
    }

    public function store(Request $request): JsonResponse
    {
        Gate::authorize('admin.access');

        $data = $this->validated($request);
        $data['slug'] = $data['slug'] ?? $this->uniqueSlug($data['name']);
        $data['status'] = $data['status'] ?? 'active';
        $data['position'] = $data['position']
            ?? ((int) ServiceCategory::query()->max('position') + 1);

        $category = ServiceCategory::query()->create($data);

        return response()->json(
            ['category' => new ServiceCategoryResource($category)],
            201,
        );
    }

    public function update(
        Request $request,
        ServiceCategory $category,
    ): JsonResponse {
        Gate::authorize('admin.access');

        $data = $this->validated($request, $category);
        $data['slug'] = $data['slug'] ?? $category->slug;

        $category->update($data);

        return response()->json([
            'category' => new ServiceCategoryResource(
                $category->load('subcategories')->loadCount('services'),
            ),
        ]);
    }

    public function destroy(ServiceCategory $category)
    {
        Gate::authorize('admin.access');

        $category->delete();

        return response()->noContent();
    }

    /**
     * @return array<string, mixed>
     */
    private function validated(
        Request $request,
        ?ServiceCategory $category = null,
    ): array {
        return $request->validate([
            'name' => 'required|string|max:120',
            'slug' => [
                'nullable',
                'string',
                'max:140',
                'alpha_dash',
                Rule::unique('service_categories', 'slug')->ignore(
                    $category?->id,
                ),
            ],
            'description' => 'nullable|string|max:2000',
            'featured' => 'boolean',
            'add_to_menu' => 'boolean',
            'status' => 'in:active,inactive',
            'position' => 'nullable|integer|min:0',
        ]);
    }

    private function uniqueSlug(string $name): string
    {
        $base = Str::slug($name) ?: 'category';
        $slug = $base;
        $suffix = 2;

        while (ServiceCategory::query()->where('slug', $slug)->exists()) {
            $slug = "{$base}-{$suffix}";
            $suffix++;
        }

        return $slug;
    }
}
