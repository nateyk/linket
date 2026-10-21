<?php

namespace App\CreatorServices\Controllers;

use App\CreatorServices\Models\ServiceCategory;
use App\CreatorServices\Resources\ServiceCategoryResource;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Routing\Controller;

class PublicServiceCategoriesController extends Controller
{
    public function __invoke(): AnonymousResourceCollection
    {
        return ServiceCategoryResource::collection(
            ServiceCategory::query()
                ->where('status', 'active')
                ->with([
                    'subcategories' => fn ($query) => $query->where(
                        'status',
                        'active',
                    ),
                ])
                ->orderBy('position')
                ->orderBy('name')
                ->get(),
        );
    }
}
